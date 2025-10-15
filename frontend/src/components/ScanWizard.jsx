import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  LocateFixed,
  Circle,
  DollarSign,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { leadAPI } from '../services/api';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

const normalizePolygonPoints = (points) => {
  if (!Array.isArray(points)) {
    return [];
  }
  return points
    .map((point) => {
      const latitude = Number(point?.latitude);
      const longitude = Number(point?.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }
      return {
        latitude: parseFloat(latitude.toFixed(6)),
        longitude: parseFloat(longitude.toFixed(6)),
      };
    })
    .filter(Boolean);
};

const polygonToGeoJson = (points) => {
  // Mapbox expects at least three unique points (plus an implicit closing point) to render a polygon.
  const normalized = normalizePolygonPoints(points);
  const uniqueKeyCount = new Set(normalized.map((point) => `${point.longitude},${point.latitude}`)).size;
  if (normalized.length < 3 || uniqueKeyCount < 3) {
    return null;
  }
  const coordinates = normalized.map((point) => [point.longitude, point.latitude]);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coordinates.push([...first]);
  }
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
};

const circleToGeoJson = (center, radiusMiles) => {
  const latitude = Number(center?.latitude ?? center?.lat);
  const longitude = Number(center?.longitude ?? center?.lon);
  const miles = Number(radiusMiles);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(miles) || miles <= 0) {
    return null;
  }

  const points = 64;
  const radians = Math.PI / 180;
  const cosLat = Math.cos(latitude * radians);
  const radiusLatDegrees = miles / 69.0;
  const radiusLonDegrees = cosLat ? miles / (Math.abs(cosLat) * 69.0) : 0;

  if (!Number.isFinite(radiusLonDegrees) || radiusLonDegrees <= 0) {
    return null;
  }

  const wrapLongitude = (value) => {
    if (!Number.isFinite(value)) {
      return value;
    }
    const wrapped = ((value + 180) % 360 + 360) % 360 - 180;
    return wrapped;
  };

  const coordinates = [];
  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2;
    const latOffset = radiusLatDegrees * Math.sin(angle);
    const lonOffset = radiusLonDegrees * Math.cos(angle);
    const nextLat = Math.max(-90, Math.min(90, latitude + latOffset));
    const nextLon = wrapLongitude(longitude + lonOffset);
    coordinates.push([
      parseFloat(nextLon.toFixed(6)),
      parseFloat(nextLat.toFixed(6)),
    ]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties: {
      radiusMiles: miles,
    },
  };
};

const defaultPolicy = {
  order: ['naip', 'mapbox', 'google'],
  qualityThreshold: 0.4,
  maxTiles: 24,
  zoom: 18,
  perProviderCaps: {
    mapbox: 1500,
    google: 2500,
  },
  dailyCaps: {
    mapbox: 4000,
    google: 8000,
  },
};

const defaultFilters = {
  minRoofAge: 10,
  minPropertyValue: 250000,
  includePermits: true,
  includeInsuranceFlags: true,
};

const defaultEnrichment = {
  contact: true,
  imageryQuality: true,
  aiNarratives: true,
};

const steps = ['Area', 'Providers', 'Filters', 'Review'];

const initialViewState = {
  latitude: 30.2672,
  longitude: -97.7431,
  zoom: 11,
  bearing: 0,
  pitch: 0,
};

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const ScanWizard = ({ onScanCreated, isDark = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [areaType, setAreaType] = useState('polygon');
  const [polygonPoints, setPolygonPoints] = useState([]);
  const [bbox, setBbox] = useState({
    minLat: 30.20,
    minLon: -97.82,
    maxLat: 30.33,
    maxLon: -97.64,
  });
  const [providerPolicy, setProviderPolicy] = useState(defaultPolicy);
  const [filters, setFilters] = useState(defaultFilters);
  const [enrichment, setEnrichment] = useState(defaultEnrichment);
  const [budgetUsd, setBudgetUsd] = useState(25);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [job, setJob] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('Austin, TX');
  const [viewState, setViewState] = useState(initialViewState);
  const [centerPoint, setCenterPoint] = useState(null);
  const [radiusMiles, setRadiusMiles] = useState(10);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
  }, []);

  const polygonPointsSafe = useMemo(() => normalizePolygonPoints(polygonPoints), [polygonPoints]);
  const polygonGeoJson = useMemo(() => polygonToGeoJson(polygonPointsSafe), [polygonPointsSafe]);
  const centerGeoJson = useMemo(() => {
    if (areaType !== 'center' || !centerPoint) {
      return null;
    }
    return circleToGeoJson(centerPoint, radiusMiles);
  }, [areaType, centerPoint, radiusMiles]);

  const budgetCents = Math.round(Math.max(0, parseFloat(budgetUsd || 0) * 100));

  useEffect(() => {
    if (areaType === 'center' && !centerPoint) {
      setCenterPoint({
        latitude: parseFloat((viewState.latitude ?? initialViewState.latitude).toFixed(6)),
        longitude: parseFloat((viewState.longitude ?? initialViewState.longitude).toFixed(6)),
      });
    }
  }, [areaType, centerPoint, viewState.latitude, viewState.longitude]);

  const handleMapClick = useCallback(
    (event) => {
      if (activeStep !== 0) return;
      const { lngLat } = event;
      const lat = Number(lngLat?.lat);
      const lon = Number(lngLat?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return;
      }
      const normalizedPoint = {
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lon.toFixed(6)),
      };

      if (areaType === 'polygon') {
        setPolygonPoints((prev) => {
          const sanitized = normalizePolygonPoints(prev);
          if (sanitized.length > 2) {
            const first = sanitized[0];
            const last = sanitized[sanitized.length - 1];
            if (first.latitude === last.latitude && first.longitude === last.longitude) {
              sanitized.pop();
            }
          }
          return [...sanitized, normalizedPoint];
        });
        return;
      }

      if (areaType === 'center') {
        setCenterPoint(normalizedPoint);
        setViewState((prev) => ({ ...prev, latitude: normalizedPoint.latitude, longitude: normalizedPoint.longitude }));
        return;
      }

      if (areaType === 'bbox') {
        const delta = 0.05;
        setBbox({
          minLat: parseFloat((lat - delta).toFixed(6)),
          maxLat: parseFloat((lat + delta).toFixed(6)),
          minLon: parseFloat((lon - delta).toFixed(6)),
          maxLon: parseFloat((lon + delta).toFixed(6)),
        });
      }
    },
    [activeStep, areaType]
  );

  const removeLastPoint = () => {
    setPolygonPoints((prev) => prev.slice(0, -1));
  };

  const resetPolygon = () => {
    setPolygonPoints([]);
  };

  const closePolygon = () => {
    const normalized = normalizePolygonPoints(polygonPoints);
    if (normalized.length < 3) {
      return;
    }
    const first = normalized[0];
    const last = normalized[normalized.length - 1];
    const alreadyClosed = first.latitude === last.latitude && first.longitude === last.longitude;
    const finalPoints = alreadyClosed ? normalized : [...normalized, first];
    setPolygonPoints(finalPoints);
  };

  const derivedAreaPayload = useMemo(() => {
    const resolveSpacing = () => {
      const maybeSpacing = Number(providerPolicy.spacing);
      if (Number.isFinite(maybeSpacing) && maybeSpacing > 0) {
        return Math.max(0.005, Math.min(maybeSpacing, 0.1));
      }
      return 0.02;
    };

    if (areaType === 'polygon') {
      if (polygonPointsSafe.length < 3) {
        return null;
      }
      const coordinates = polygonPointsSafe.map((pt) => [pt.longitude, pt.latitude]);
      const [firstLon, firstLat] = coordinates[0];
      const [lastLon, lastLat] = coordinates[coordinates.length - 1];
      if (firstLon !== lastLon || firstLat !== lastLat) {
        coordinates.push([firstLon, firstLat]);
      }
      return { coordinates: [coordinates], spacing: resolveSpacing() };
    }

    if (areaType === 'bbox') {
      const values = [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].map((value) => Number(value));
      if (values.some((value) => !Number.isFinite(value))) {
        return null;
      }
      const [minLon, minLat, maxLon, maxLat] = values;
      if (minLon >= maxLon || minLat >= maxLat) {
        return null;
      }
      return {
        bbox: [minLon, minLat, maxLon, maxLat],
        spacing: resolveSpacing(),
      };
    }

    // Center
    const lat = Number(centerPoint?.latitude ?? viewState.latitude);
    const lon = Number(centerPoint?.longitude ?? viewState.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    const miles = Math.max(0.5, Math.min(Number(radiusMiles) || 0, 200));
    const radiusLatDegrees = miles / 69.0;
    const spacing = Math.max(0.005, Math.min(resolveSpacing(), Math.max(radiusLatDegrees / 4, 0.005)));

    return {
      center: { lat, lon },
      radius: radiusLatDegrees,
      radiusMiles: miles,
      spacing,
    };
  }, [
    areaType,
    polygonPointsSafe,
    bbox,
    providerPolicy.spacing,
    centerPoint,
    viewState.latitude,
    viewState.longitude,
    radiusMiles,
  ]);

  const nextDisabled = useMemo(() => {
    if (activeStep === 0) {
      if (areaType === 'polygon') {
        return polygonPointsSafe.length < 3;
      }
    }
    if (activeStep === 1) {
      return providerPolicy.order.length === 0;
    }
    return false;
  }, [activeStep, areaType, polygonPointsSafe.length, providerPolicy.order.length]);

  const handleAdvance = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const moveProvider = (fromIndex, direction) => {
    setProviderPolicy((prev) => {
      const order = [...prev.order];
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= order.length) return prev;
      [order[fromIndex], order[toIndex]] = [order[toIndex], order[fromIndex]];
      return { ...prev, order };
    });
  };

  const toggleProvider = (provider) => {
    setProviderPolicy((prev) => {
      if (prev.order.includes(provider)) {
        return { ...prev, order: prev.order.filter((p) => p !== provider) };
      }
      return { ...prev, order: [...prev.order, provider] };
    });
  };

  const runJob = async () => {
    if (!derivedAreaPayload) {
      toast.error('Define an area before running the scan');
      return;
    }
    setIsSubmitting(true);
    setJob(null);
    setJobStatus(null);
    setJobResults(null);
    try {
      const payload = {
        area_type: areaType,
        area_payload: derivedAreaPayload,
        provider_policy: providerPolicy,
        filters,
        enrichment_options: enrichment,
        budget_cents: budgetCents,
      };
      const jobResponse = await leadAPI.createScanJob(payload);
      setJob(jobResponse);
      toast.success('Scan job queued. We will fetch imagery shortly.');
      onScanCreated?.(jobResponse);
      pollJob(jobResponse.id);
    } catch (error) {
      console.error('Failed to create scan job', error);
      toast.error('Unable to create scan job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollJob = useCallback(
    (jobId) => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      setIsPolling(true);
      const interval = setInterval(async () => {
        try {
          const status = await leadAPI.getScanJob(jobId);
          setJobStatus(status);
          if (status.status === 'completed' || status.status === 'budget_exhausted' || status.status === 'failed') {
            clearInterval(interval);
            pollingRef.current = null;
            setIsPolling(false);
            const results = await leadAPI.getScanJobResults(jobId);
            setJobResults(results);
          }
        } catch (error) {
          console.error('Failed to poll scan job status', error);
        }
      }, 2500);
      pollingRef.current = interval;
    },
    []
  );

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    if (!MAPBOX_TOKEN) {
      toast.error('Mapbox token is missing. Set REACT_APP_MAPBOX_TOKEN to enable search.');
      return;
    }
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm)}.json?limit=1&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      const feature = data.features?.[0];
      if (!feature) {
        toast.error('Location not found');
        return;
      }
      const [lon, lat] = feature.center;
      setViewState((prev) => ({ ...prev, latitude: lat, longitude: lon }));
      if (areaType === 'bbox') {
        const bboxData = feature.bbox || [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05];
        setBbox({ minLon: bboxData[0], minLat: bboxData[1], maxLon: bboxData[2], maxLat: bboxData[3] });
      }
      if (areaType === 'center') {
        setCenterPoint({
          latitude: parseFloat(lat.toFixed(6)),
          longitude: parseFloat(lon.toFixed(6)),
        });
      }
      toast.success(`Centered map on ${feature.place_name}`);
    } catch (error) {
      console.error('Failed to search location', error);
      toast.error('Unable to search location right now');
    }
  };

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const normalized = {
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
        };
        setCenterPoint(normalized);
        setAreaType('center');
        setViewState((prev) => ({
          ...prev,
          latitude: normalized.latitude,
          longitude: normalized.longitude,
          zoom: Math.max(prev.zoom, 13),
        }));
        setIsLocating(false);
        toast.success('Centered map on your current location.');
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error('Location access denied. Update browser permissions to use this feature.');
        } else {
          toast.error('Unable to determine your location right now.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [setAreaType, setCenterPoint, setViewState]);

  const summaryItems = useMemo(() => {
    const items = [
      {
        label: 'Area type',
        value: areaType,
      },
      {
        label: 'Provider order',
        value: providerPolicy.order.join(' → ') || 'No providers selected',
      },
      {
        label: 'Quality threshold',
        value: `${Math.round(providerPolicy.qualityThreshold * 100)}%`,
      },
      {
        label: 'Budget',
        value: budgetCents ? formatCurrency(budgetCents / 100) : 'Free imagery only',
      },
      {
        label: 'Enrichment',
        value: Object.entries(enrichment)
          .filter(([, enabled]) => enabled)
          .map(([key]) => key)
          .join(', ') || 'None',
      },
    ];

    if (areaType === 'center' && centerPoint) {
      items.push({ label: 'Radius', value: `${radiusMiles.toFixed(1)} miles` });
      items.push({ label: 'Center', value: `${centerPoint.latitude.toFixed(4)}, ${centerPoint.longitude.toFixed(4)}` });
    }

    if (areaType === 'polygon') {
      items.push({ label: 'Polygon points', value: `${polygonPointsSafe.length}` });
    }

    if (areaType === 'bbox') {
      const values = [bbox.minLat, bbox.minLon, bbox.maxLat, bbox.maxLon];
      const hasAll = values.every((value) => Number.isFinite(value));
      items.push({
        label: 'Bounds',
        value: hasAll
          ? `${bbox.minLat.toFixed(2)}, ${bbox.minLon.toFixed(2)} → ${bbox.maxLat.toFixed(2)}, ${bbox.maxLon.toFixed(2)}`
          : 'Set min/max lat & lon',
      });
    }

    return items;
  }, [
    areaType,
    providerPolicy.order,
    providerPolicy.qualityThreshold,
    budgetCents,
    enrichment,
    radiusMiles,
    centerPoint,
    polygonPointsSafe.length,
    bbox,
  ]);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className={`overflow-hidden rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-gray-200 bg-white'}`}>
                <Map
                  mapboxAccessToken={MAPBOX_TOKEN || undefined}
                  initialViewState={initialViewState}
                  {...viewState}
                  style={{ width: '100%', height: 360 }}
                  mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                  onMove={(event) => setViewState(event.viewState)}
                  onClick={handleMapClick}
                >
                  {centerGeoJson && (
                    <Source id="scan-radius" type="geojson" data={centerGeoJson}>
                      <Layer
                        id="scan-radius-fill"
                        type="fill"
                        paint={{ 'fill-color': '#0ea5e9', 'fill-opacity': 0.18 }}
                      />
                      <Layer
                        id="scan-radius-outline"
                        type="line"
                        paint={{ 'line-color': '#0284c7', 'line-width': 2, 'line-dasharray': [2, 2] }}
                      />
                    </Source>
                  )}
                  {polygonGeoJson && (
                    <Source id="scan-polygon" type="geojson" data={polygonGeoJson}>
                      <Layer
                        id="scan-polygon-fill"
                        type="fill"
                        paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.24 }}
                      />
                      <Layer
                        id="scan-polygon-outline"
                        type="line"
                        paint={{ 'line-color': '#1d4ed8', 'line-width': 2 }}
                      />
                    </Source>
                  )}
                  {areaType === 'center' && centerPoint && (
                    <Marker latitude={centerPoint.latitude} longitude={centerPoint.longitude}>
                      <div className="rounded-full bg-blue-600 p-1.5 shadow">
                        <div className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </Marker>
                  )}
                  {polygonPointsSafe.map((point, index) => (
                    <Marker key={`poly-point-${index}`} latitude={point.latitude} longitude={point.longitude}>
                      <div className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 shadow">{index + 1}</div>
                    </Marker>
                  ))}
                </Map>
              </div>

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-700'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="polygon"
                      name="areaType"
                      checked={areaType === 'polygon'}
                      onChange={() => setAreaType('polygon')}
                    />
                    <label htmlFor="polygon" className="text-sm font-medium">Draw polygon</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="bbox"
                      name="areaType"
                      checked={areaType === 'bbox'}
                      onChange={() => setAreaType('bbox')}
                    />
                    <label htmlFor="bbox" className="text-sm font-medium">Bounding box</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="center"
                      name="areaType"
                      checked={areaType === 'center'}
                      onChange={() => setAreaType('center')}
                    />
                    <label htmlFor="center" className="text-sm font-medium">Center point</label>
                  </div>
                </div>

                <p className="text-sm mt-4 flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 text-blue-500" />
                  Click on the map to drop polygon points. Close the shape for the most accurate coverage. Use bounding box mode for quick rectangular scans.
                </p>

                {areaType === 'center' && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>Radius</span>
                      <span className="text-xs text-gray-500">{radiusMiles.toFixed(1)} miles</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="100"
                      step="0.5"
                      value={radiusMiles}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value)) {
                          setRadiusMiles(Math.max(0.5, Math.min(value, 200)));
                        }
                      }}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.5"
                        step="0.1"
                        value={radiusMiles}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          if (Number.isFinite(value)) {
                            setRadiusMiles(Math.max(0.5, Math.min(value, 200)));
                          }
                        }}
                        className={`w-28 rounded-lg border px-3 py-2 text-sm ${
                          isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-800'
                        }`}
                      />
                      <span className="text-xs text-gray-500">Adjust coverage radius</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Tap the map, search for an address, or use Find my location to drop the center point.
                    </p>
                    {centerPoint && (
                      <p className="text-xs text-gray-500">
                        Current center: {centerPoint.latitude.toFixed(4)}, {centerPoint.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                )}

                {areaType === 'polygon' && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={closePolygon}
                      disabled={polygonPointsSafe.length < 3}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        polygonPointsSafe.length < 3
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      <Layers size={16} /> Close polygon
                    </button>
                    <button
                      onClick={removeLastPoint}
                      disabled={!polygonPointsSafe.length}
                      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        !polygonPointsSafe.length
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                    >
                      <Circle size={16} /> Undo point
                    </button>
                    <button
                      onClick={resetPolygon}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      <Trash2 size={16} /> Reset
                    </button>
                  </div>
                )}

                {areaType === 'bbox' && (
                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Min latitude</span>
                      <input
                        type="number"
                        step="0.001"
                        value={bbox.minLat}
                        onChange={(event) => setBbox((prev) => ({ ...prev, minLat: parseFloat(event.target.value) }))}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Max latitude</span>
                      <input
                        type="number"
                        step="0.001"
                        value={bbox.maxLat}
                        onChange={(event) => setBbox((prev) => ({ ...prev, maxLat: parseFloat(event.target.value) }))}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Min longitude</span>
                      <input
                        type="number"
                        step="0.001"
                        value={bbox.minLon}
                        onChange={(event) => setBbox((prev) => ({ ...prev, minLon: parseFloat(event.target.value) }))}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium">Max longitude</span>
                      <input
                        type="number"
                        step="0.001"
                        value={bbox.maxLon}
                        onChange={(event) => setBbox((prev) => ({ ...prev, maxLon: parseFloat(event.target.value) }))}
                        className="rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className={`space-y-4 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <form onSubmit={handleSearchSubmit} className="space-y-3">
                <label className="text-sm font-medium block">Search ZIP, city, or county</label>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-gray-300 bg-white text-gray-900'
                    }`}
                    placeholder="e.g. Travis County, TX"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <RefreshCw size={16} /> Center map
                  </button>
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isLocating
                        ? 'cursor-wait bg-slate-200 text-slate-500'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
                    {isLocating ? 'Locating…' : 'Find my location'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  We will center the map on the first matching result. Drawing polygons uses the current view for accurate tiles. Granting location access switches to the center-point workflow automatically.
                </p>
              </form>

              <div className={`rounded-2xl border p-4 text-sm ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-200 bg-gray-50'}`}>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" /> Coverage tips
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Drop polygon points clockwise to avoid self-intersections.</li>
                  <li>Use a tighter spacing (0.01) for dense neighbourhood scans.</li>
                  <li>Bounding boxes are faster but may include non-target parcels.</li>
                </ul>
              </div>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`space-y-4 rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <Layers size={16} /> Provider priority
              </h4>
              <p className="text-sm">
                We always attempt the lowest-cost provider first. Remove or reorder providers to fine-tune spend.
              </p>
              <div className="space-y-3">
                {['naip', 'mapbox', 'google'].map((provider, index) => {
                  const enabled = providerPolicy.order.includes(provider);
                  return (
                    <div key={provider} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${enabled ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-600'}`}>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleProvider(provider)}
                        />
                        <span className="text-sm font-medium uppercase">{provider}</span>
                      </div>
                      {enabled && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-full bg-white p-1 text-blue-600 hover:bg-blue-100"
                            onClick={() => moveProvider(providerPolicy.order.indexOf(provider), -1)}
                          >
                            <ArrowLeft size={14} />
                          </button>
                          <button
                            type="button"
                            className="rounded-full bg-white p-1 text-blue-600 hover:bg-blue-100"
                            onClick={() => moveProvider(providerPolicy.order.indexOf(provider), 1)}
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={`space-y-4 rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck size={16} /> Quality & spend controls
              </h4>
              <label className="flex flex-col gap-2 text-sm">
                <span>Quality threshold</span>
                <input
                  type="range"
                  min="0.2"
                  max="0.9"
                  step="0.05"
                  value={providerPolicy.qualityThreshold}
                  onChange={(event) =>
                    setProviderPolicy((prev) => ({ ...prev, qualityThreshold: parseFloat(event.target.value) }))
                  }
                />
                <span className="text-xs text-gray-500">
                  Current: {(providerPolicy.qualityThreshold * 100).toFixed(0)}% imagery confidence requirement.
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span>Maximum tiles</span>
                <input
                  type="number"
                  min="4"
                  max="120"
                  value={providerPolicy.maxTiles}
                  onChange={(event) =>
                    setProviderPolicy((prev) => ({ ...prev, maxTiles: parseInt(event.target.value, 10) || 0 }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <label className="flex flex-col gap-2">
                  <span>Zoom level</span>
                  <input
                    type="number"
                    min="16"
                    max="21"
                    value={providerPolicy.zoom}
                    onChange={(event) =>
                      setProviderPolicy((prev) => ({ ...prev, zoom: parseInt(event.target.value, 10) || 18 }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Tile spacing</span>
                  <input
                    type="number"
                    min="0.005"
                    max="0.08"
                    step="0.005"
                    value={providerPolicy.spacing || 0.02}
                    onChange={(event) =>
                      setProviderPolicy((prev) => ({ ...prev, spacing: parseFloat(event.target.value) || 0.02 }))
                    }
                    className="rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className={`space-y-4 rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign size={16} /> Budget controls
              </h4>
              <label className="flex flex-col gap-2 text-sm">
                <span>Daily budget (USD)</span>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={budgetUsd}
                  onChange={(event) => setBudgetUsd(event.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
                <span className="text-xs text-gray-500">
                  Set to 0 to use free imagery only. Cached tiles never consume budget.
                </span>
              </label>

              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                <strong>Tip:</strong> NAIP tiles are always free. Place them first in the provider order to minimize spend on Mapbox or Google.
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`space-y-4 rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="text-sm font-semibold">Lead filters</h4>
              <label className="flex flex-col gap-2 text-sm">
                <span>Minimum roof age (years)</span>
                <input
                  type="number"
                  min="0"
                  value={filters.minRoofAge}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minRoofAge: parseInt(event.target.value, 10) || 0 }))}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span>Minimum property value</span>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={filters.minPropertyValue}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, minPropertyValue: parseInt(event.target.value, 10) || 0 }))
                  }
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.includePermits}
                  onChange={(event) => setFilters((prev) => ({ ...prev, includePermits: event.target.checked }))}
                />
                <span>Include recent permit activity</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.includeInsuranceFlags}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, includeInsuranceFlags: event.target.checked }))
                  }
                />
                <span>Flag policies in renewal window</span>
              </label>
            </div>

            <div className={`space-y-4 rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="text-sm font-semibold">Enrichment</h4>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrichment.contact}
                  onChange={(event) => setEnrichment((prev) => ({ ...prev, contact: event.target.checked }))}
                />
                <span>Verify phone/email with SMTP + carrier lookup</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrichment.imageryQuality}
                  onChange={(event) => setEnrichment((prev) => ({ ...prev, imageryQuality: event.target.checked }))}
                />
                <span>Store imagery quality diagnostics</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enrichment.aiNarratives}
                  onChange={(event) => setEnrichment((prev) => ({ ...prev, aiNarratives: event.target.checked }))}
                />
                <span>Generate AI follow-up narratives</span>
              </label>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                Leads will be enriched only after imagery passes the configured quality threshold. This keeps enrichment spend aligned with viable roofs.
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/60 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="text-sm font-semibold mb-3">Launch summary</h4>
              <ul className="space-y-2 text-sm">
                {summaryItems.map((item) => (
                  <li key={item.label} className="flex items-center gap-2">
                    <ChevronRight size={16} className="text-blue-500" />
                    <span className="font-medium">{item.label}:</span>
                    <span>{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/40 text-slate-100' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
              <h4 className="text-sm font-semibold mb-2">What happens next?</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>We fetch cached NAIP tiles first to minimize spend.</li>
                <li>High-quality tiles trigger Mapbox/Google only if within budget.</li>
                <li>Leads include confidence, imagery URLs, and why they passed quality gating.</li>
              </ol>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" /> Ensure your wallet has headroom before including premium providers.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <h3 className={`text-2xl font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Scan Wizard</h3>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
          Define your footprint, optimise imagery costs, and launch scans that return confidence-rated leads and roofing insights.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {steps.map((step, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;
          return (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isComplete
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isComplete ? <CheckCircle size={16} /> : index + 1}
              </div>
              <span className={`${isActive ? 'font-semibold text-blue-600' : isDark ? 'text-slate-300' : 'text-gray-700'}`}>{step}</span>
              {index < steps.length - 1 && <span className="text-gray-400">/</span>}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        {renderStep()}

        <div className="mt-6 flex items-center justify-between border-t pt-4">
          <button
            onClick={handleBack}
            disabled={activeStep === 0}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              activeStep === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {activeStep === steps.length - 1 ? (
            <button
              onClick={runJob}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              Launch scan
            </button>
          ) : (
            <button
              onClick={handleAdvance}
              disabled={nextDisabled}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                nextDisabled ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>

      {(jobStatus || jobResults) && (
        <div className="space-y-4">
          {jobStatus && (
            <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-700 bg-slate-900/70 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Loader2 size={16} className={isPolling ? 'animate-spin text-blue-500' : 'text-blue-500'} /> Job status
              </h4>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="font-medium capitalize">{jobStatus.status.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Tiles processed</dt>
                  <dd className="font-medium">
                    {jobStatus.tiles_processed} / {jobStatus.tiles_total}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Cached tiles</dt>
                  <dd className="font-medium">{jobStatus.tiles_cached}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Budget used</dt>
                  <dd className="font-medium">{formatCurrency(jobStatus.budget_spent_cents / 100)}</dd>
                </div>
              </dl>
            </div>
          )}

          {jobResults && (
            <div className={`rounded-2xl border p-5 ${isDark ? 'border-slate-700 bg-slate-900/70 text-slate-100' : 'border-gray-200 bg-white text-gray-800'}`}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-500" /> Leads ready
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {jobResults.leads.length} opportunities located. Each lead captures imagery confidence, provider source, and why it passed quality gating.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                      <th className="py-2 pr-4">Lead</th>
                      <th className="py-2 pr-4">Confidence</th>
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">Cached</th>
                      <th className="py-2 pr-4">Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobResults.leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-gray-100">
                        <td className="py-3 pr-4 font-medium">{lead.centroid.lat.toFixed(4)}, {lead.centroid.lon.toFixed(4)}</td>
                        <td className="py-3 pr-4">{(lead.confidence * 100).toFixed(0)}%</td>
                        <td className="py-3 pr-4 capitalize">{lead.provider}</td>
                        <td className="py-3 pr-4">{lead.cached ? 'Yes' : 'No'}</td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{lead.reasons.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanWizard;

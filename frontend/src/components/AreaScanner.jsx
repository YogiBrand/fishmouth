import React, { useEffect, useMemo, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AlertCircle, ArrowRight, Compass, DollarSign, Loader, MapPin, Shield, Target, Waves } from 'lucide-react';
import toast from 'react-hot-toast';

import { leadAPI } from '../services/api';
import { formatApiError } from '../utils/errorHandling';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const EARTH_RADIUS_MILES = 3958.8;

const EXAMPLE_SPOTS = [
  {
    label: 'West Austin, TX',
    areaName: 'Austin, TX 78746',
    latitude: 30.285,
    longitude: -97.832,
  },
  {
    label: 'Frisco, TX',
    areaName: 'Frisco, TX',
    latitude: 33.1543,
    longitude: -96.8217,
  },
  {
    label: 'Marietta, GA',
    areaName: 'Marietta, GA 30062',
    latitude: 33.9807,
    longitude: -84.5120,
  },
  {
    label: 'Orlando, FL',
    areaName: 'Orlando, FL 32828',
    latitude: 28.5443,
    longitude: -81.1910,
  },
];

const defaultCoords = EXAMPLE_SPOTS[0];

const SCAN_WORKFLOW_STEPS = [
  { id: 1, label: 'Enter address', active: true },
  { id: 2, label: 'AI analysis', sub: '$4.50 per roof', active: false },
  { id: 3, label: 'Generate report', sub: 'Share with crews', active: false },
];

const AreaScanner = ({ onScanStarted, isDark = false }) => {
  const [areaName, setAreaName] = useState(defaultCoords.areaName);
  const [scanType, setScanType] = useState('city');
  const [radiusMiles, setRadiusMiles] = useState(1.2);
  const [propertyCap, setPropertyCap] = useState(400);
  const [coordinates, setCoordinates] = useState({
    latitude: defaultCoords.latitude,
    longitude: defaultCoords.longitude,
  });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [costAcknowledged, setCostAcknowledged] = useState(false);

  const circleGeoJson = useMemo(() => {
    if (!coordinates.latitude || !coordinates.longitude) {
      return null;
    }
    return buildCircleGeometry(coordinates.longitude, coordinates.latitude, radiusMiles);
  }, [coordinates.latitude, coordinates.longitude, radiusMiles]);

  useEffect(() => {
    let cancelled = false;
    setEstimating(true);
    const timer = setTimeout(async () => {
      try {
        const response = await leadAPI.estimateScan({
          areaName,
          scanType,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radiusMiles,
          propertyCap,
        });
        if (!cancelled) {
          setEstimate(response);
          setCostAcknowledged(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to estimate scan cost', error);
          toast.error('Unable to estimate scan cost right now');
        }
      } finally {
        if (!cancelled) {
          setEstimating(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [areaName, scanType, coordinates.latitude, coordinates.longitude, radiusMiles, propertyCap]);

  const handleStartScan = async (event) => {
    event.preventDefault();

    if (!areaName.trim()) {
      toast.error('Please provide a city or neighbourhood name');
      return;
    }

    if (estimate?.warnings?.length && !costAcknowledged) {
      toast.error('Please acknowledge the spend warning before launching the scan.');
      return;
    }

    setIsLoading(true);
    try {
      const scan = await leadAPI.startAreaScan({
        areaName: areaName.trim(),
        scanType,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMiles,
        estimatedCost: estimate?.estimated_cost,
        propertyCap,
      });
      toast.success(`Scanning ${scan.area_name} for qualified roofs…`);
      onScanStarted?.(scan);
    } catch (error) {
      console.error('Error starting scan', error);
      toast.error(formatApiError(error, 'Unable to start scan'));
    } finally {
      setIsLoading(false);
    }
  };

  const onExampleSelect = (spot) => {
    setAreaName(spot.areaName);
    setCoordinates({ latitude: spot.latitude, longitude: spot.longitude });
  };

  const headingClass = isDark ? 'text-slate-100' : 'text-gray-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const cardFrame = isDark ? 'bg-slate-900/60 border border-slate-800 text-slate-100' : 'bg-white border border-gray-200 text-gray-900';
  const secondaryCardFrame = isDark ? 'bg-slate-900/50 border border-slate-800 text-slate-200' : 'bg-gray-50 border border-gray-200 text-gray-600';
  const cardShadow = isDark ? 'shadow-[0_18px_40px_rgba(7,12,24,0.55)]' : 'shadow-sm';
  const pillPrimary = isDark ? 'bg-blue-500/20 text-blue-200' : 'bg-blue-100 text-blue-600';
  const primaryButton = isDark
    ? 'bg-blue-500 hover:bg-blue-400 text-white disabled:bg-slate-700'
    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400';
  const inputBase = 'w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none transition-colors';
  const inputClass = isDark
    ? `${inputBase} bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-blue-400 focus:border-blue-400`
    : `${inputBase} bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500`;

  const costBadgeTone = estimate
    ? estimate.estimated_cost > 400
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'
    : 'bg-gray-100 text-gray-600';

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${pillPrimary}`}>
            <Target size={18} />
          </div>
          <div>
            <h3 className={`text-2xl font-semibold ${headingClass}`}>AI Area Scanner</h3>
            <p className={`text-sm ${mutedClass}`}>Draw your target footprint, preview spend, and launch high-precision roof scans in seconds.</p>
          </div>
        </div>
      </header>

      <div
        className={`rounded-2xl p-4 ${
          isDark ? 'bg-blue-500/10 border border-blue-500/30 text-blue-100' : 'bg-blue-50 border border-blue-200 text-blue-900'
        }`}
      >
        <h3 className="text-sm font-semibold mb-3">Roof scan workflow</h3>
        <div className="flex flex-wrap items-center gap-4">
          {SCAN_WORKFLOW_STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step.active
                      ? isDark
                        ? 'bg-blue-500 text-white'
                        : 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-slate-900/60 text-slate-200 border border-blue-500/30'
                      : 'bg-white text-slate-600 border border-blue-200'
                  }`}
                >
                  {step.id}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{step.label}</span>
                  {step.sub && (
                    <span className={`text-xs ${isDark ? 'text-blue-200/80' : 'text-blue-600/80'}`}>
                      {step.sub}
                    </span>
                  )}
                </div>
              </div>
              {index < SCAN_WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className={`w-4 h-4 ${isDark ? 'text-blue-300' : 'text-blue-400'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
        <div className={`${cardFrame} ${cardShadow} rounded-2xl p-6 space-y-5`}>
          <form className="space-y-4" onSubmit={handleStartScan}>
            <div className="grid md:grid-cols-[2fr,1fr] gap-4">
              <div>
                <label className={`text-sm font-medium flex items-center gap-2 mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  <MapPin size={14} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
                  City / Neighbourhood / Zip
                </label>
                <input
                  value={areaName}
                  onChange={(event) => setAreaName(event.target.value)}
                  placeholder="e.g., Austin, TX 78746"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Scan Type</label>
                <select
                  value={scanType}
                  onChange={(event) => setScanType(event.target.value)}
                  className={inputClass}
                >
                  <option value="city">City / Large Neighbourhood</option>
                  <option value="zip_code">Zip Code</option>
                  <option value="custom_radius">Map Radius</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <SliderField
                label="Radius (miles)"
                icon={Compass}
                value={radiusMiles}
                min={0.25}
                max={5}
                step={0.25}
                unit="mi"
                onChange={setRadiusMiles}
                isDark={isDark}
              />
              <SliderField
                label="Property Cap"
                icon={Shield}
                value={propertyCap}
                min={100}
                max={1000}
                step={50}
                unit="homes"
                onChange={setPropertyCap}
                isDark={isDark}
              />
              <div>
                <label className={`text-sm font-medium mb-1 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                  <Waves size={14} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
                  Spend acknowledgement
                </label>
                <div className={`${secondaryCardFrame} rounded-lg p-3 space-y-2 text-sm`}>
                  <p className={mutedClass}>
                    Estimated spend:{' '}
                    <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${costBadgeTone}`}>
                      {estimate ? `$${estimate.estimated_cost.toFixed(2)}` : '—'}
                    </span>
                  </p>
                  {estimate?.warnings?.length ? (
                    <label className="flex items-start gap-2 text-amber-500 text-xs font-medium">
                      <input
                        type="checkbox"
                        className="mt-0.5 accent-amber-500"
                        checked={costAcknowledged}
                        onChange={(event) => setCostAcknowledged(event.target.checked)}
                      />
                      I confirm this spend is approved.
                    </label>
                  ) : (
                    <p className="text-xs text-emerald-500">Spend within safe range</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || estimating}
              className={`w-full inline-flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-xl transition-colors disabled:cursor-not-allowed ${primaryButton}`}
            >
              {isLoading ? <Loader className="animate-spin" size={18} /> : <Target size={18} />}
              {isLoading ? 'Launching scan…' : 'Start Scan with AI'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className={`${cardFrame} ${cardShadow} rounded-2xl`}>
            {MAPBOX_TOKEN ? (
              <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                initialViewState={{
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  zoom: 12,
                }}
                onMove={(evt) =>
                  setCoordinates((prev) => ({
                    ...prev,
                    latitude: evt.viewState.latitude,
                    longitude: evt.viewState.longitude,
                  }))
                }
                mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
                style={{ width: '100%', height: 320, borderRadius: '1rem' }}
                onClick={(event) => {
                  setCoordinates({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
                }}
              >
                <Marker
                  latitude={coordinates.latitude}
                  longitude={coordinates.longitude}
                  draggable
                  onDragEnd={(event) => {
                    setCoordinates({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
                  }}
                >
                  <div className="p-2 rounded-full bg-blue-600 shadow-lg border-2 border-white dark:border-slate-900">
                    <MapPin size={18} className="text-white" />
                  </div>
                </Marker>
                {circleGeoJson && (
                  <Source id="selection-circle" type="geojson" data={circleGeoJson}>
                    <Layer
                      id="selection-fill"
                      type="fill"
                      paint={{
                        'fill-color': '#2563eb',
                        'fill-opacity': 0.12,
                      }}
                    />
                    <Layer
                      id="selection-outline"
                      type="line"
                      paint={{
                        'line-color': '#2563eb',
                        'line-width': 2,
                      }}
                    />
                  </Source>
                )}
              </Map>
            ) : (
              <div
                className={`h-80 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center p-6 ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 border-blue-500/40 text-slate-200'
                    : 'bg-gradient-to-br from-blue-100 via-white to-blue-200 border-blue-300 text-gray-600'
                }`}
              >
                <MapPin size={28} className="text-blue-500 mb-3" />
                <p className="text-sm">
                  Add a <code>REACT_APP_MAPBOX_TOKEN</code> to enable interactive map selection. For now, radius and coordinates are applied using the controls above.
                </p>
              </div>
            )}
          </div>

          <div className={`${cardFrame} ${cardShadow} rounded-2xl p-5 space-y-4`}>
            <header className="flex items-center justify-between">
              <h4 className={`font-semibold flex items-center gap-2 ${headingClass}`}>
                <DollarSign size={16} className="text-emerald-500" />
                Spend Preview
              </h4>
              {estimating && (
                <span className={`text-xs flex items-center gap-1 ${mutedClass}`}>
                  <Loader className="animate-spin" size={12} />
                  Recalculating
                </span>
              )}
            </header>

            <div className="grid grid-cols-2 gap-3">
              <CostStat label="Properties" value={estimate ? estimate.estimated_properties.toLocaleString() : '—'} sub="Processed" isDark={isDark} />
              <CostStat
                label="Cap"
                value={propertyCap.toLocaleString()}
                sub={estimate ? `${estimate.estimated_properties_before_cap.toLocaleString()} identified` : 'Estimated'}
                isDark={isDark}
              />
              <CostStat label="Est. Spend" value={estimate ? `$${estimate.estimated_cost.toFixed(2)}` : '—'} sub="Total" accent isDark={isDark} />
              <CostStat
                label="Per Property"
                value={estimate ? `$${(estimate.estimated_cost / Math.max(estimate.estimated_properties || 1, 1)).toFixed(2)}` : '—'}
                sub="Avg cost"
                isDark={isDark}
              />
            </div>

            {estimate?.warnings?.length > 0 && (
              <div className="space-y-2">
                {estimate.warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 text-xs bg-amber-50/80 border border-amber-300 rounded-lg p-3 ${
                      isDark ? 'text-amber-300' : 'text-amber-600'
                    }`}
                  >
                    <AlertCircle size={14} className="mt-0.5" />
                    <span>{warning}</span>
                  </div>
                ))}
                {estimate.suggested_radius && (
                  <button
                    onClick={() => setRadiusMiles(estimate.suggested_radius)}
                    className="text-xs text-blue-500 hover:text-blue-400 underline"
                  >
                    Use suggested radius ({estimate.suggested_radius} mi)
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={`${cardFrame} ${cardShadow} rounded-2xl p-5`}>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Quick-start locations</h4>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_SPOTS.map((spot) => (
                <button
                  key={spot.label}
                  onClick={() => onExampleSelect(spot)}
                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {spot.label}
                </button>
              ))}
            </div>
            <p className={`text-xs mt-3 ${mutedClass}`}>
              Drag the marker or click another point on the map to fine-tune your scan footprint. Only properties inside the radius will be analyzed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SliderField = ({ label, icon: Icon, value, min, max, step, unit, onChange, isDark }) => {
  const display = unit === 'homes' ? Math.round(value) : value.toFixed(2);
  const labelClass = isDark ? 'text-slate-200' : 'text-gray-700';
  const valueClass = isDark ? 'text-slate-200' : 'text-gray-700';
  const unitClass = isDark ? 'text-slate-400' : 'text-gray-400';
  return (
    <div>
      <label className={`text-sm font-medium flex items-center gap-2 mb-1 ${labelClass}`}>
        <Icon size={14} className={isDark ? 'text-slate-400' : 'text-gray-400'} />
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(parseFloat(event.target.value))}
          className="w-full accent-blue-600"
        />
        <span className={`text-sm font-semibold min-w-[56px] text-right ${valueClass}`}>
          {display}
          <span className={`text-xs ml-1 ${unitClass}`}>{unit}</span>
        </span>
      </div>
    </div>
  );
};

const CostStat = ({ label, value, sub, accent = false, isDark }) => (
  <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-900/40 border border-slate-800 text-slate-200' : 'bg-gray-50 border border-gray-200 text-gray-800'}`}>
    <p className={`text-[11px] uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
    <p className={`text-base font-semibold ${accent ? 'text-emerald-600' : isDark ? 'text-slate-100' : 'text-gray-800'}`}>{value}</p>
    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{sub}</p>
  </div>
);

function buildCircleGeometry(lon, lat, radiusMiles, points = 64) {
  const coords = [];
  const distanceRadians = radiusMiles / EARTH_RADIUS_MILES;

  for (let i = 0; i <= points; i += 1) {
    const bearing = (i / points) * (2 * Math.PI);
    const latRadians = (lat * Math.PI) / 180;
    const lonRadians = (lon * Math.PI) / 180;

    const newLat = Math.asin(
      Math.sin(latRadians) * Math.cos(distanceRadians) +
        Math.cos(latRadians) * Math.sin(distanceRadians) * Math.cos(bearing)
    );

    const newLon =
      lonRadians +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distanceRadians) * Math.cos(latRadians),
        Math.cos(distanceRadians) - Math.sin(latRadians) * Math.sin(newLat)
      );

    coords.push([(newLon * 180) / Math.PI, (newLat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
  };
}

export default AreaScanner;

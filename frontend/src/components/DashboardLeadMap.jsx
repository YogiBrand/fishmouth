import React, { useEffect, useMemo, useRef, useState } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Eye, Image as ImageIcon, Mail, MapPin, Phone, Sparkles } from 'lucide-react';

const ACTION_POINT_VALUES = {
  inspect: 5,
  sequence: 25,
  call: 15,
  email: 10,
};

const TOTAL_ACTION_POINTS = Object.values(ACTION_POINT_VALUES).reduce((sum, value) => sum + value, 0);

const URGENCY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Warm',
  normal: 'Fresh',
  unknown: 'Queued',
};

const URGENCY_BADGES = {
  critical: 'bg-red-500/20 text-red-200 border border-red-500/40',
  high: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
  medium: 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40',
  normal: 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35',
  unknown: 'bg-slate-500/20 text-slate-200 border border-slate-500/35',
};

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const BASE_MAP_STYLE = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token=${MAPBOX_TOKEN}`
  : {
      version: 8,
      name: 'esri-satellite',
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Imagery © Esri & contributors',
        },
      },
      layers: [
        {
          id: 'esri-satellite',
          type: 'raster',
          source: 'esri-satellite',
        },
      ],
    };

const DEFAULT_VIEW = {
  latitude: 30.2672,
  longitude: -97.7431,
  zoom: 4,
};

const markerUrgencyThemes = {
  critical: 'bg-red-600 text-white hover:bg-red-500',
  high: 'bg-orange-500 text-white hover:bg-orange-400',
  medium: 'bg-amber-500 text-white hover:bg-amber-400',
  normal: 'bg-emerald-500 text-white hover:bg-emerald-400',
  unknown: 'bg-slate-800/90 text-white hover:bg-slate-700',
};

const asNumber = (value) => {
  if (value == null) return null;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(num) ? num : null;
};

const hashString = (value) => {
  const string = String(value ?? '');
  let hash = 0;
  for (let index = 0; index < string.length; index += 1) {
    hash = (hash * 31 + string.charCodeAt(index)) & 0xffffffff;
  }
  return hash >>> 0;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const extractCoordinates = (entity, options = {}) => {
  if (!entity || typeof entity !== 'object') {
    return null;
  }

  const latCandidates = [
    entity.latitude,
    entity.lat,
    entity.lat_deg,
    entity.latitud,
    entity.geo?.lat,
    entity.geo?.latitude,
    entity.location?.lat,
    entity.location?.latitude,
    entity.coordinates?.[1],
    Array.isArray(entity.center) ? entity.center[1] : null,
    entity.position?.lat,
    entity.centroid?.lat,
  ];

  const lonCandidates = [
    entity.longitude,
    entity.lon,
    entity.lng,
    entity.long,
    entity.geo?.lng,
    entity.geo?.lon,
    entity.geo?.longitude,
    entity.location?.lng,
    entity.location?.lon,
    entity.location?.longitude,
    entity.coordinates?.[0],
    Array.isArray(entity.center) ? entity.center[0] : null,
    entity.position?.lng,
    entity.centroid?.lng,
  ];

  const latitude = latCandidates.map(asNumber).find((value) => value != null && Math.abs(value) <= 90);
  const longitude = lonCandidates.map(asNumber).find((value) => value != null && Math.abs(value) <= 180);

  if (latitude == null || longitude == null) {
    const fallbackSeed =
      options.seed ??
      [
        entity.address,
        entity.city,
        entity.state,
        entity.zip_code,
        entity.area_name,
        entity.id,
      ]
        .filter(Boolean)
        .join('|');

    if (!fallbackSeed) {
      return null;
    }

    const hash = hashString(fallbackSeed);
    const latSpread = options.latSpread ?? 0.45;
    const lonSpread = options.lonSpread ?? 0.6;

    const latOffset = ((hash % 200000) / 100000 - 1) * latSpread;
    const lonOffset = ((((hash / 200000) | 0) % 200000) / 100000 - 1) * lonSpread;

    const fallbackLat = clamp(DEFAULT_VIEW.latitude + latOffset, -89.9, 89.9);
    const fallbackLon = clamp(DEFAULT_VIEW.longitude + lonOffset, -179.9, 179.9);

    return {
      latitude: parseFloat(fallbackLat.toFixed(6)),
      longitude: parseFloat(fallbackLon.toFixed(6)),
      generated: true,
    };
  }

  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6)),
    generated: false,
  };
};

const getEnvelope = (points) => {
  if (!points.length) return null;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;

  points.forEach((point) => {
    if (point.latitude < minLat) minLat = point.latitude;
    if (point.latitude > maxLat) maxLat = point.latitude;
    if (point.longitude < minLon) minLon = point.longitude;
    if (point.longitude > maxLon) maxLon = point.longitude;
  });

  return {
    bounds: [
      [minLon, minLat],
      [maxLon, maxLat],
    ],
    spanLat: Math.abs(maxLat - minLat),
    spanLon: Math.abs(maxLon - minLon),
    center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
  };
};

const formatLocation = (lead) => {
  if (!lead) return '';
  const parts = [lead.address, lead.city, lead.state].filter(Boolean);
  return parts.join(', ');
};

const getPreviewImage = (lead) => {
  if (!lead) return null;
  return (
    lead?.roof_intelligence?.roof_view?.image_url ||
    lead?.ai_analysis?.imagery?.normalized_view_url ||
    lead?.roof_intelligence?.overview?.image_url ||
    lead?.primary_image_url ||
    lead?.aerial_image_url ||
    lead?.image_url ||
    null
  );
};

const getHeatmapImage = (lead) => {
  if (!lead) return null;
  return (
    lead?.roof_intelligence?.heatmap?.url ||
    lead?.ai_analysis?.imagery?.heatmap_url ||
    lead?.heatmap_image_url ||
    null
  );
};

const DashboardLeadMap = ({
  leadEntries = [],
  clusters = [],
  onSelectLead,
  selectedLeadId,
  onOpenLead,
  onStartSequence,
  onCallLead,
  onSendEmail,
  maxVisible = 12,
  recentlyRewardedLeadId,
  isDark = false,
}) => {
  const entryList = useMemo(
    () => (leadEntries || []).filter((entry) => entry?.lead),
    [leadEntries]
  );

  const visibleEntries = useMemo(
    () => entryList.slice(0, Math.max(1, Math.min(entryList.length, maxVisible))),
    [entryList, maxVisible]
  );

  const featuredEntries = useMemo(() => visibleEntries.slice(0, 4), [visibleEntries]);
  const supplementalEntries = useMemo(() => visibleEntries.slice(4), [visibleEntries]);

  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const lastFitBoundsKeyRef = useRef(null);
  const lastSelectionKeyRef = useRef(null);

  const mapEntries = useMemo(
    () =>
      featuredEntries
        .map((entry) => {
          const coords = extractCoordinates(entry.lead);
          if (!coords) return null;
          return {
            entry,
            lead: entry.lead,
            latitude: coords.latitude,
            longitude: coords.longitude,
            urgency: entry.urgency?.level || entry.lead.replacement_urgency || 'unknown',
            score: Math.round(entry.lead?.lead_score || entry.lead?.score || 0),
          };
        })
        .filter(Boolean),
    [featuredEntries]
  );

  const clusterEntries = useMemo(
    () =>
      (clusters || [])
        .map((cluster) => {
          const coords = extractCoordinates(cluster, {
            seed: cluster.area_name || cluster.city || cluster.id,
            latSpread: 1.2,
            lonSpread: 1.4,
          });
          if (!coords) return null;
          return {
            id: cluster.id ?? cluster.area_name ?? cluster.city ?? `${coords.latitude}:${coords.longitude}`,
            latitude: coords.latitude,
            longitude: coords.longitude,
            intensity:
              asNumber(cluster.hot_leads) ??
              asNumber(cluster.deal_count) ??
              asNumber(cluster.density) ??
              asNumber(cluster.score) ??
              1,
          };
        })
        .filter(Boolean),
    [clusters]
  );

  const mapFeatureCollection = useMemo(
    () =>
      mapEntries.length
        ? {
            type: 'FeatureCollection',
            features: mapEntries.map((point) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [point.longitude, point.latitude],
              },
              properties: {
                leadId: point.lead?.id,
                urgency: point.urgency,
                score: point.score,
              },
            })),
          }
        : null,
    [mapEntries]
  );

  const clusterFeatureCollection = useMemo(
    () =>
      clusterEntries.length
        ? {
            type: 'FeatureCollection',
            features: clusterEntries.map((cluster) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [cluster.longitude, cluster.latitude],
              },
              properties: {
                id: cluster.id,
                intensity: cluster.intensity,
              },
            })),
          }
        : {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.7419, 30.2637] },
                properties: { id: 'demo-0', intensity: 11 },
              },
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.7812, 30.2732] },
                properties: { id: 'demo-1', intensity: 9 },
              },
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.7208, 30.2934] },
                properties: { id: 'demo-2', intensity: 12 },
              },
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.705, 30.215] },
                properties: { id: 'demo-3', intensity: 8 },
              },
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.8, 30.325] },
                properties: { id: 'demo-4', intensity: 7 },
              },
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-97.67, 30.255] },
                properties: { id: 'demo-5', intensity: 10 },
              },
            ],
          },
    [clusterEntries]
  );

  const mapEnvelope = useMemo(() => getEnvelope(mapEntries), [mapEntries]);

  const selectedEntry = useMemo(() => {
    if (!visibleEntries.length) return null;
    if (!selectedLeadId) return visibleEntries[0];
    return (
      visibleEntries.find((entry) => Number(entry.lead?.id) === Number(selectedLeadId)) ||
      visibleEntries[0]
    );
  }, [visibleEntries, selectedLeadId]);

  const selectedLead = selectedEntry?.lead || null;
  const selectedMapEntry = useMemo(() => {
    if (!selectedLead) return null;
    return (
      mapEntries.find((point) => Number(point.lead?.id) === Number(selectedLead.id)) || null
    );
  }, [mapEntries, selectedLead]);

  const selectedHighlightCollection = useMemo(
    () =>
      selectedMapEntry
        ? {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [selectedMapEntry.longitude, selectedMapEntry.latitude],
                },
              },
            ],
          }
        : null,
    [selectedMapEntry]
  );

  const mapEntriesKey = useMemo(
    () => mapEntries.map((point) => `${point.longitude.toFixed(4)}:${point.latitude.toFixed(4)}`).join('|'),
    [mapEntries]
  );

  const selectedMapEntryKey = selectedMapEntry
    ? `${selectedMapEntry.lead?.id ?? 'lead'}:${selectedMapEntry.longitude.toFixed(4)}:${selectedMapEntry.latitude.toFixed(4)}`
    : null;

  const initialViewState = useMemo(() => {
    if (selectedMapEntry) {
      return {
        longitude: selectedMapEntry.longitude,
        latitude: selectedMapEntry.latitude,
        zoom: 12,
        bearing: 0,
        pitch: 0,
      };
    }
    if (mapEntries.length) {
      const first = mapEntries[0];
      return {
        longitude: first.longitude,
        latitude: first.latitude,
        zoom: mapEntries.length === 1 ? 12 : 10,
        bearing: 0,
        pitch: 0,
      };
    }
    return {
      longitude: DEFAULT_VIEW.longitude,
      latitude: DEFAULT_VIEW.latitude,
      zoom: DEFAULT_VIEW.zoom,
      bearing: 0,
      pitch: 0,
    };
  }, [mapEntries, selectedMapEntry]);

  const selectedIndex = selectedLead
    ? visibleEntries.findIndex((entry) => Number(entry.lead?.id) === Number(selectedLead.id))
    : -1;
  const selectedRank = selectedIndex >= 0 ? selectedIndex + 1 : null;

  const totalVisible = visibleEntries.length;

  const surfacePrimary = isDark ? 'border-slate-800 bg-slate-950/70 text-slate-100' : 'border-slate-200 bg-white';
  const surfaceSecondary = isDark ? 'border-slate-800 bg-slate-900/70 text-slate-100' : 'border-slate-200 bg-white';
  const subTextClass = isDark ? 'text-slate-400' : 'text-gray-500';
  const headerTextClass = isDark ? 'text-slate-100' : 'text-gray-900';

  useEffect(() => {
    if (!mapLoaded || !mapEnvelope || !mapEntries.length) {
      return;
    }
    const mapInstance = mapRef.current?.getMap?.();
    if (!mapInstance) return;

    const boundsKey = `${mapEntriesKey}|${mapEnvelope.bounds[0][0].toFixed(4)}|${mapEnvelope.bounds[0][1].toFixed(4)}|${mapEnvelope.bounds[1][0].toFixed(4)}|${mapEnvelope.bounds[1][1].toFixed(4)}`;
    if (lastFitBoundsKeyRef.current === boundsKey) return;
    lastFitBoundsKeyRef.current = boundsKey;

    if (mapEntries.length === 1 || (mapEnvelope.spanLat < 0.01 && mapEnvelope.spanLon < 0.01)) {
      mapInstance.easeTo({
        center: mapEnvelope.center,
        zoom: Math.max(mapInstance.getZoom(), 12),
        duration: 800,
        essential: true,
      });
    } else {
      mapInstance.fitBounds(mapEnvelope.bounds, {
        padding: 80,
        duration: 800,
        maxZoom: 13,
      });
    }
  }, [mapLoaded, mapEnvelope, mapEntries.length, mapEntriesKey]);

  useEffect(() => {
    if (!mapLoaded || !selectedMapEntry || !selectedMapEntryKey) {
      return;
    }
    const mapInstance = mapRef.current?.getMap?.();
    if (!mapInstance) return;
    if (lastSelectionKeyRef.current === selectedMapEntryKey) return;
    lastSelectionKeyRef.current = selectedMapEntryKey;
    mapInstance.easeTo({
      center: [selectedMapEntry.longitude, selectedMapEntry.latitude],
      zoom: Math.max(mapInstance.getZoom(), 11.5),
      duration: 600,
      essential: true,
    });
  }, [mapLoaded, selectedMapEntry, selectedMapEntryKey]);

  useEffect(() => {
    if (!mapEntries.length) {
      lastFitBoundsKeyRef.current = null;
    }
  }, [mapEntries.length]);

  useEffect(() => {
    if (!selectedMapEntryKey) {
      lastSelectionKeyRef.current = null;
    }
  }, [selectedMapEntryKey]);

  const insightLines = useMemo(() => {
    if (!selectedLead) return [];
    const insights = [];
    if (selectedEntry?.urgency?.message) insights.push(selectedEntry.urgency.message);
    if (selectedLead.ai_analysis?.summary) insights.push(selectedLead.ai_analysis.summary);
    if (selectedLead.ai_analysis?.recommendation) insights.push(selectedLead.ai_analysis.recommendation);
    if (selectedLead.ai_analysis?.next_steps) insights.push(selectedLead.ai_analysis.next_steps);
    if (Array.isArray(selectedLead.roof_intelligence?.alerts)) {
      insights.push(
        ...selectedLead.roof_intelligence.alerts
          .map((alert) => alert?.message)
          .filter(Boolean)
      );
    }
    return insights.filter(Boolean).slice(0, 4);
  }, [selectedLead, selectedEntry]);

  const handleSelectEntry = (entry) => {
    if (!entry?.lead) return;
    onSelectLead?.(entry.lead);
  };

  return (
    <section className={`rounded-[32px] border ${surfacePrimary} shadow-xl`}>
      <div className="px-6 py-6 lg:px-8 lg:py-7 space-y-4">
        <h3 className={`text-sm font-semibold uppercase tracking-wide ${headerTextClass}`}>Lead Spotlight</h3>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] items-stretch">
          <div
            className={`relative rounded-3xl overflow-hidden border h-full min-h-[220px] ${
              isDark ? 'border-slate-800/70' : 'border-slate-200/80'
            } shadow-lg`}
          >
            <Map
              ref={mapRef}
              mapLib={maplibregl}
              initialViewState={initialViewState}
              mapStyle={BASE_MAP_STYLE}
              style={{ width: '100%', height: '100%' }}
              onLoad={() => setMapLoaded(true)}
              dragRotate={false}
            >
              {clusterFeatureCollection && (
                <Source id="hot-lead-clusters" type="geojson" data={clusterFeatureCollection}>
                  <Layer
                    id="hot-lead-clusters-glow"
                    type="circle"
                    paint={{
                      'circle-radius': [
                        'interpolate', ['linear'], ['get', 'intensity'],
                        1, 18,
                        5, 34,
                        10, 52,
                      ],
                      'circle-color': 'rgba(248,113,113,0.22)',
                      'circle-stroke-width': 0,
                    }}
                  />
                  <Layer
                    id="hot-lead-clusters-heat"
                    type="heatmap"
                    paint={{
                      'heatmap-weight': [
                        'interpolate', ['linear'], ['get', 'intensity'],
                        1, 0.2,
                        5, 0.6,
                        10, 1,
                      ],
                      'heatmap-intensity': [
                        'interpolate', ['linear'], ['zoom'],
                        6, 0.4,
                        10, 0.9,
                        13, 1.4,
                      ],
                      'heatmap-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        6, 24,
                        10, 40,
                        13, 60,
                      ],
                      'heatmap-color': [
                        'interpolate', ['linear'], ['heatmap-density'],
                        0, 'rgba(2,132,199,0)',
                        0.2, 'rgba(56,189,248,0.35)',
                        0.4, 'rgba(59,130,246,0.55)',
                        0.6, 'rgba(99,102,241,0.65)',
                        0.8, 'rgba(192,38,211,0.75)',
                        1, 'rgba(244,63,94,0.85)',
                      ],
                      'heatmap-opacity': 0.65,
                    }}
                  />
                </Source>
              )}
              {mapFeatureCollection && (
                <Source id="hot-leads" type="geojson" data={mapFeatureCollection}>
                  <Layer
                    id="hot-leads-halo"
                    type="circle"
                    paint={{
                      'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        6, 4,
                        11, 10,
                        14, 18,
                      ],
                      'circle-color': [
                        'match',
                        ['get', 'urgency'],
                        'critical', 'rgba(239,68,68,0.35)',
                        'high', 'rgba(249,115,22,0.32)',
                        'medium', 'rgba(250,204,21,0.28)',
                        'normal', 'rgba(16,185,129,0.25)',
                        'rgba(59,130,246,0.25)',
                      ],
                      'circle-opacity': 0.6,
                    }}
                  />
                </Source>
              )}
              {selectedHighlightCollection && (
                <Source id="selected-hot-lead" type="geojson" data={selectedHighlightCollection}>
                  <Layer
                    id="selected-hot-lead-ring"
                    type="circle"
                    paint={{
                      'circle-radius': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        6, 8,
                        11, 16,
                        14, 26,
                      ],
                      'circle-color': 'rgba(59,130,246,0.18)',
                      'circle-stroke-width': 2,
                      'circle-stroke-color': '#0ea5e9',
                      'circle-opacity': 0.7,
                    }}
                  />
                </Source>
              )}
              {mapEntries.map((item) => {
                const { lead, entry, longitude, latitude, urgency } = item;
                const isActive = selectedLead && Number(selectedLead.id) === Number(lead?.id);
                const isRewarded =
                  recentlyRewardedLeadId != null &&
                  Number(recentlyRewardedLeadId) === Number(lead?.id);
                const toneClass = markerUrgencyThemes[urgency] || markerUrgencyThemes.unknown;
                const markerClass = isActive
                  ? 'bg-blue-600 text-white scale-110 shadow-blue-400/40 hover:bg-blue-500'
                  : toneClass;

                return (
                  <Marker
                    key={`map-lead-${lead?.id ?? `${longitude}-${latitude}`}`}
                    longitude={longitude}
                    latitude={latitude}
                    anchor="bottom"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectEntry(entry)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg transition transform ${
                        markerClass
                      } ${
                        isRewarded ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-transparent' : ''
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
                      title={lead?.address || lead?.homeowner_name || lead?.name || 'Lead'}
                    >
                      <MapPin className="w-3 h-3" />
                      <span className="max-w-[140px] truncate text-left">
                        {lead?.homeowner_name || lead?.name || lead?.address || `Lead ${lead?.id}`}
                      </span>
                    </button>
                  </Marker>
                );
              })}
            </Map>
            <div className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.55),_transparent_65%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-15 mix-blend-soft-light bg-[radial-gradient(circle_at_bottom,_rgba(34,197,94,0.45),_transparent_65%)]" />
            {!mapEntries.length && (
              <div
                className={`absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs font-semibold ${
                  isDark ? 'text-slate-200 bg-slate-950/90' : 'text-slate-600 bg-white/85'
                } backdrop-blur-sm`}
              >
                <MapPin className="w-5 h-5 opacity-70" />
                <span>No geocoded leads to plot yet.</span>
                <span className="text-[11px] font-normal opacity-70">
                  Run a scan or add coordinates to visualize hot leads.
                </span>
              </div>
            )}
          </div>

          {selectedLead && (
            <div className={`rounded-3xl border ${surfaceSecondary} p-5 shadow-lg flex flex-col gap-4 h-full`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide font-semibold">
                    {selectedLead.status || 'Hot lead'}
                  </p>
                  <h3 className="text-xl font-semibold truncate">
                    {selectedLead.homeowner_name || selectedLead.name || selectedLead.address}
                  </h3>
                  <p className={`text-xs ${subTextClass}`}>
                    {formatLocation(selectedLead)}{' '}
                    {selectedLead.zip_code ? `· ${selectedLead.zip_code}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-[11px] uppercase tracking-wide ${subTextClass}`}>Damage likelihood</span>
                  <p className="text-2xl font-bold text-amber-500">
                    {Math.round(
                      selectedLead.ai_analysis?.deal_probability ||
                        selectedLead.lead_score ||
                        selectedLead.score ||
                        0
                    )}
                    %
                  </p>
                  <p className={`text-[11px] ${subTextClass}`}>
                    Score {Math.round(selectedLead.lead_score || selectedLead.score || 0)}
                  </p>
                </div>
              </div>

              <div className="relative h-40 rounded-2xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 bg-slate-900/30">
                {(() => {
                  const previewImage = getPreviewImage(selectedLead);
                  const heatmapImage = getHeatmapImage(selectedLead);
                  if (!previewImage) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-sm opacity-80">
                        <ImageIcon className="w-5 h-5" />
                        Imagery syncing…
                      </div>
                    );
                  }
                  return (
                    <>
                      <img
                        src={previewImage}
                        alt={selectedLead.address || 'Lead imagery'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {heatmapImage && (
                        <img
                          src={heatmapImage}
                          alt="Damage heatmap overlay"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                          loading="lazy"
                        />
                      )}
                    </>
                  );
                })()}
                {selectedRank && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                    #{selectedRank} priority
                  </span>
                )}
              </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-2`}>
                  <p className={`uppercase tracking-wide ${subTextClass}`}>Roof intel</p>
                  <p className="mt-1 font-semibold">
                    {(selectedLead.roof_condition || selectedLead.roof_condition_score != null)
                      ? `${selectedLead.roof_condition || ''} ${selectedLead.roof_condition_score ?? ''}`.trim()
                      : 'Awaiting scan'}
                  </p>
                </div>
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-2`}>
                  <p className={`uppercase tracking-wide ${subTextClass}`}>Urgency</p>
                  <p className="mt-1 font-semibold capitalize">
                    {selectedEntry?.urgency?.level || selectedLead.replacement_urgency || 'Pending'}
                  </p>
                </div>
              </div>

              {insightLines.length > 0 && (
                <div className={`rounded-2xl border ${surfaceSecondary} px-3 py-3`}>
                  <p className={`text-xs uppercase tracking-wide font-semibold ${subTextClass}`}>AI insights</p>
                  <ul className="mt-2 space-y-1.5 text-xs">
                    {insightLines.map((line, index) => (
                      <li key={`insight-${index}`} className={isDark ? 'text-slate-200' : 'text-slate-700'}>
                        • {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  {
                    key: 'inspect',
                    label: 'Inspect lead',
                    icon: <Eye className="w-3.5 h-3.5" />,
                    action: () => onOpenLead?.(selectedLead),
                    disabled: false,
                    points: ACTION_POINT_VALUES.inspect,
                    tone: 'amber',
                  },
                  {
                    key: 'sequence',
                    label: 'Sequence',
                    icon: <Sparkles className="w-3.5 h-3.5" />,
                    action: () => onStartSequence?.(selectedLead),
                    disabled: false,
                    points: ACTION_POINT_VALUES.sequence,
                    tone: 'indigo',
                  },
                  {
                    key: 'call',
                    label: 'Call',
                    icon: <Phone className="w-3.5 h-3.5" />,
                    action: () => onCallLead?.(selectedLead),
                    disabled: !selectedLead.homeowner_phone && !selectedLead.phone,
                    points: ACTION_POINT_VALUES.call,
                    tone: 'emerald',
                  },
                  {
                    key: 'email',
                    label: 'Email',
                    icon: <Mail className="w-3.5 h-3.5" />,
                    action: () => onSendEmail?.(selectedLead),
                    disabled: !selectedLead.homeowner_email && !selectedLead.email,
                    points: ACTION_POINT_VALUES.email,
                    tone: 'blue',
                  },
                ].map((action) => (
                  <LeadAction
                    key={`detail-action-${action.key}`}
                    label={action.label}
                    icon={action.icon}
                    onClick={action.action}
                    disabled={action.disabled}
                    points={action.points}
                    tone={action.tone}
                    isDark={isDark}
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                    isDark ? 'bg-slate-800/80 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Potential +{TOTAL_ACTION_POINTS} pts today
                </span>
                {selectedLead.damage_estimate && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                      isDark ? 'bg-slate-800/70 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Est. value ${Number(selectedLead.damage_estimate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {featuredEntries.length > 0 && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {featuredEntries.map((entry, idx) => {
              const lead = entry.lead;
              if (!lead) return null;
              const previewImage = getPreviewImage(lead);
              const heatmapImage = getHeatmapImage(lead);
              const isActive =
                selectedLead && Number(selectedLead.id) === Number(lead.id);
              const isRewarded =
                recentlyRewardedLeadId != null &&
                Number(recentlyRewardedLeadId) === Number(lead.id);
              const urgencyLevel = entry.urgency?.level || 'unknown';
              const urgencyTone = URGENCY_BADGES[urgencyLevel] || URGENCY_BADGES.unknown;
              const urgencyLabel = URGENCY_LABELS[urgencyLevel] || URGENCY_LABELS.unknown;
              const score = Math.round(lead.lead_score || lead.score || 0);
              const probability = Math.round(
                lead.ai_analysis?.deal_probability || lead.lead_score || lead.score || 0
              );

              return (
                <article
                  key={`featured-card-${lead.id || idx}`}
                  tabIndex={0}
                  onClick={() => handleSelectEntry(entry)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSelectEntry(entry);
                    }
                  }}
                  className={`rounded-3xl border ${surfaceSecondary} text-left shadow-lg transition hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex flex-col h-full min-h-[250px] ${
                    isActive ? 'ring-2 ring-blue-400/60' : ''
                  } ${isRewarded ? 'ring-2 ring-emerald-400/60' : ''}`}
                >
                  <div className="relative h-32 w-full overflow-hidden rounded-t-3xl">
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={lead.address || 'Lead imagery'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] opacity-70">
                        Imagery syncing…
                      </div>
                    )}
                    {heatmapImage && (
                      <img
                        src={heatmapImage}
                        alt="Heatmap overlay"
                        className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-semibold text-white">
                        #{idx + 1}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${urgencyTone}`}
                      >
                        {urgencyLabel}
                      </span>
                    </div>
                    <span
                      className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isDark ? 'bg-amber-500/25 text-amber-200' : 'bg-amber-100 text-amber-700'
                      } ${isRewarded ? 'animate-point-drain' : ''}`}
                    >
                      <Sparkles className="w-3 h-3" /> +{TOTAL_ACTION_POINTS}
                    </span>
                  </div>
                  <div className="p-5 space-y-3 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${headerTextClass} truncate`}>
                          {lead.homeowner_name || lead.name || lead.address}
                        </p>
                        <p className={`text-xs ${subTextClass} truncate`}>
                          {formatLocation(lead) || 'Address syncing'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[11px] uppercase tracking-wide ${subTextClass}`}>Score</p>
                        <p className="text-base font-semibold text-amber-500">{score}</p>
                      </div>
                    </div>
                    <p className={`text-xs ${subTextClass} line-clamp-2`}>
                      {entry.urgency?.message || 'Line up crews now—this homeowner is ready for next steps.'}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className={`inline-flex items-center gap-1 ${subTextClass}`}>
                        Likelihood {probability}%
                      </span>
                      {lead.damage_estimate && (
                        <span className={`inline-flex items-center gap-1 ${subTextClass}`}>
                          Est. ${Number(lead.damage_estimate).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
                      {[
                        {
                          key: 'inspect',
                          label: 'Inspect',
                          icon: <Eye className="w-3.5 h-3.5" />,
                          action: () => onOpenLead?.(lead),
                          disabled: false,
                          points: ACTION_POINT_VALUES.inspect,
                          tone: 'amber',
                        },
                        {
                          key: 'sequence',
                          label: 'Sequence',
                          icon: <Sparkles className="w-3.5 h-3.5" />,
                          action: () => onStartSequence?.(lead),
                          disabled: false,
                          points: ACTION_POINT_VALUES.sequence,
                          tone: 'indigo',
                        },
                        {
                          key: 'call',
                          label: 'Call',
                          icon: <Phone className="w-3.5 h-3.5" />,
                          action: () => onCallLead?.(lead),
                          disabled: !lead.homeowner_phone && !lead.phone,
                          points: ACTION_POINT_VALUES.call,
                          tone: 'emerald',
                        },
                        {
                          key: 'email',
                          label: 'Email',
                          icon: <Mail className="w-3.5 h-3.5" />,
                          action: () => onSendEmail?.(lead),
                          disabled: !lead.homeowner_email && !lead.email,
                          points: ACTION_POINT_VALUES.email,
                          tone: 'blue',
                        },
                      ].map((action) => (
                        <LeadAction
                          key={`${lead.id}-${action.key}`}
                          label={action.label}
                          icon={action.icon}
                          onClick={action.action}
                          disabled={action.disabled}
                          points={action.points}
                          tone={action.tone}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {supplementalEntries.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
            <p className={`text-xs uppercase tracking-wide ${subTextClass}`}>More hot leads</p>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {supplementalEntries.map((entry, idx) => {
                const lead = entry.lead;
                if (!lead) return null;
                const previewImage = getPreviewImage(lead);
                const heatmapImage = getHeatmapImage(lead);
                const score = Math.round(lead.lead_score || lead.score || 0);
                return (
                  <button
                    type="button"
                    key={`supplemental-card-${lead.id || idx}`}
                    onClick={() => handleSelectEntry(entry)}
                    className={`w-60 flex-shrink-0 rounded-3xl border ${surfaceSecondary} text-left shadow-sm transition hover:shadow-lg`}
                  >
                    <div className="relative h-28 w-full overflow-hidden rounded-t-3xl">
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={lead.address || 'Lead imagery'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[11px] opacity-70">
                          Imagery syncing…
                        </div>
                      )}
                      {heatmapImage && (
                        <img
                          src={heatmapImage}
                          alt="Heatmap overlay"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-screen opacity-70"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <p className={`text-sm font-semibold ${headerTextClass} truncate`}>
                        {lead.homeowner_name || lead.name || lead.address}
                      </p>
                      <p className={`text-[11px] ${subTextClass} truncate`}>
                        Score {score} • {URGENCY_LABELS[entry.urgency?.level || 'unknown']}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

function LeadAction({ label, icon, onClick, disabled, points, tone, isDark }) {
  const toneClasses = {
    amber: isDark
      ? 'bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
      : 'bg-amber-100 text-amber-700 hover:bg-amber-200',
    indigo: isDark
      ? 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    emerald: isDark
      ? 'bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
    blue: isDark
      ? 'bg-blue-500/15 text-blue-200 hover:bg-blue-500/25'
      : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  };

  const disabledClasses = isDark
    ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
    : 'bg-gray-100 text-gray-400 cursor-not-allowed';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
        disabled
          ? disabledClasses
          : toneClasses[tone] ||
            (isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      {typeof points === 'number' && <span className="text-[11px] font-semibold">+{points}</span>}
    </button>
  );
}

export default DashboardLeadMap;

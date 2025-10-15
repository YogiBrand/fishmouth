import React, { useMemo } from 'react';
import Map, { Layer, Marker, Source } from 'react-map-gl/maplibre';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';
const BASE_STYLE = MAPBOX_TOKEN
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${MAPBOX_TOKEN}`
  : {
      version: 8,
      name: 'carto-light',
      sources: {
        carto: {
          type: 'raster',
          tiles: ['https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        },
      },
      layers: [
        {
          id: 'carto-base',
          type: 'raster',
          source: 'carto',
        },
      ],
    };

const GeoScatterMap = ({
  center,
  bounds,
  points = [],
  height = 360,
  isDark = false,
}) => {
  const viewState = useMemo(() => {
    if (bounds && Number.isFinite(bounds.minLat) && Number.isFinite(bounds.maxLat) && Number.isFinite(bounds.minLon) && Number.isFinite(bounds.maxLon)) {
      const latitude = (bounds.minLat + bounds.maxLat) / 2;
      const longitude = (bounds.minLon + bounds.maxLon) / 2;
      const latDiff = Math.abs(bounds.maxLat - bounds.minLat);
      const lonDiff = Math.abs(bounds.maxLon - bounds.minLon);
      const zoom = Math.max(3, 12 - Math.max(latDiff, lonDiff) * 40);
      return {
        latitude,
        longitude,
        zoom,
        bearing: 0,
        pitch: 0,
      };
    }
    return {
      latitude: center?.latitude ?? 30.2672,
      longitude: center?.longitude ?? -97.7431,
      zoom: 10,
      bearing: 0,
      pitch: 0,
    };
  }, [bounds, center]);

  const featureCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: points.map((point) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          lead_score: point.lead_score,
          priority: point.priority,
        },
      })),
    }),
    [points]
  );

  return (
    <div className={`w-full overflow-hidden rounded-2xl border ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`} style={{ height }}>
      <Map
        mapLib={maplibregl}
        mapStyle={BASE_STYLE}
        initialViewState={viewState}
        reuseMaps
        dragRotate={false}
        touchZoomRotate={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <Source id="scan-points" type="geojson" data={featureCollection}>
          <Layer
            id="heat-intensity"
            type="heatmap"
            paint={{
              'heatmap-weight': ['interpolate', ['linear'], ['get', 'lead_score'], 0, 0, 100, 1],
              'heatmap-radius': 24,
              'heatmap-intensity': 1,
              'heatmap-opacity': 0.55,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(56,189,248,0)',
                0.2,
                'rgba(56,189,248,0.4)',
                0.4,
                'rgba(251,146,60,0.6)',
                0.7,
                'rgba(244,63,94,0.8)',
                1,
                'rgba(220,38,38,0.9)'
              ],
            }}
          />
        </Source>
        {points.map((point) => (
          <Marker key={point.id} latitude={point.latitude} longitude={point.longitude} anchor="center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-white shadow-lg ${
                point.priority === 'hot'
                  ? 'border-red-500 bg-red-500'
                  : point.priority === 'warm'
                  ? 'border-amber-500 bg-amber-500'
                  : 'border-sky-500 bg-sky-500'
              }`}
            >
              <MapPin className="h-4 w-4" />
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
};

export default GeoScatterMap;

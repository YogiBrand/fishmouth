import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Draw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import api from '../../services/api/client';

export default function LeadMap({ initialCenter=[-96, 37.8], initialZoom=4, onPolygon }){
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const leadsSourceId = 'lead-points';
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  useEffect(()=>{
    // Mapbox GL Draw expects a global mapboxgl namespace; provide maplibre for compatibility.
    if (typeof window !== 'undefined' && !window.mapboxgl) {
      window.mapboxgl = maplibregl;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          // Raster basemap: user can configure to Bing/Google via server proxy or allowed URLs
          'raster-tiles': {
            type: 'raster',
            tiles: [
              // Example placeholder: OpenStreetMap raster (replace with imagery proxy if allowed)
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap'
          }
        },
        layers: [
          // Ensure a dark-friendly background instead of default white
          { id: 'background', type: 'background', paint: { 'background-color': isDark ? '#0f172a' : '#ffffff' } },
          { id: 'basemap', type: 'raster', source: 'raster-tiles' }
        ]
      },
      center: initialCenter,
      zoom: initialZoom
    });
    mapRef.current = map;

    const drawCtl = new Draw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true }
    });
    map.addControl(drawCtl, 'top-left');
    // Keep Draw control reference within closure

    const ensureSource = () => {
      if (!map.getSource(leadsSourceId)) {
        map.addSource(leadsSourceId, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        map.addLayer({
          id: 'lead-circles',
          type: 'circle',
          source: leadsSourceId,
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['get', 'lead_score'],
              40, 4,
              80, 8,
              100, 11,
            ],
            'circle-color': [
              'match', ['get', 'tier'],
              'hot', '#ef4444',
              'warm', '#f97316',
              'cold', '#22c55e',
              '#0ea5e9',
            ],
            'circle-opacity': 0.75,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    };

    const fetchLeadsForViewport = async () => {
      if (!map || !map.getBounds()) {
        return;
      }
      ensureSource();
      const bounds = map.getBounds();
      try {
        const payload = await api.get('/api/v1/maps/leads', {
          params: {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
            tiers: 'hot,warm,cold',
          },
        });
        const source = map.getSource(leadsSourceId);
        if (source && payload?.type === 'FeatureCollection') {
          source.setData(payload);
        }
      } catch (error) {
        console.error('map:fetch-leads failed', error);
      }
    };

    const notifyPolygonChange = () => {
      if (!onPolygon) return;
      try {
        const collection = drawCtl.getAll();
        onPolygon(collection);
      } catch (error) {
        console.error('map-draw:getAll failed', error);
      }
    };

    map.on('draw.create', notifyPolygonChange);
    map.on('draw.update', notifyPolygonChange);
    map.on('draw.delete', notifyPolygonChange);
    map.on('load', fetchLeadsForViewport);
    map.on('moveend', fetchLeadsForViewport);

    return () => {
      map.off('draw.create', notifyPolygonChange);
      map.off('draw.update', notifyPolygonChange);
      map.off('draw.delete', notifyPolygonChange);
        map.off('load', fetchLeadsForViewport);
        map.off('moveend', fetchLeadsForViewport);
      map.remove();
    };
  }, [initialCenter, initialZoom, isDark, onPolygon]);

  return <div className="w-full h-[70vh] rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70" ref={containerRef} />;
}

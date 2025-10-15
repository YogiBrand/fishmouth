import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import Draw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

export default function LeadMap({ initialCenter=[-96, 37.8], initialZoom=4, onPolygon }){
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [draw, setDraw] = useState(null);

  useEffect(()=>{
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
    setDraw(drawCtl);

    map.on('draw.create', e => { if(onPolygon) onPolygon(drawCtl.getAll()); });
    map.on('draw.update', e => { if(onPolygon) onPolygon(drawCtl.getAll()); });
    map.on('draw.delete', e => { if(onPolygon) onPolygon(drawCtl.getAll()); });

    return ()=> map.remove();
  }, []);

  return <div className="w-full h-[70vh] rounded border" ref={containerRef} />;
}

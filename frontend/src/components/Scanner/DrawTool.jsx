import React, { useState } from 'react';
import LeadMap from '../Map/LeadMap';

export default function DrawTool({ onAreaChange }) {
  const [featureCollection, setFeatureCollection] = useState(null);

  const handlePolygonChange = (collection) => {
    setFeatureCollection(collection);
    if (!onAreaChange) return;
    if (!collection || !collection.features || collection.features.length === 0) {
      onAreaChange(null);
      return;
    }
    const feature = collection.features[0];
    onAreaChange({
      type: 'Feature',
      properties: feature.properties || {},
      geometry: feature.geometry,
    });
  };

  return (
    <div className="space-y-3">
      <LeadMap onPolygon={handlePolygonChange} />
      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
        {featureCollection ? JSON.stringify(featureCollection, null, 2).slice(0, 600) + '…' : 'Draw a polygon to define the scan area.'}
      </pre>
    </div>
  );
}

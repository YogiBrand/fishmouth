import React, { useState } from 'react';
import LeadMap from '../Map/LeadMap';

export default function DrawTool({ onAreaChange }){
  const [geojson, setGeojson] = useState(null);
  return (
    <div className="space-y-3">
      <LeadMap onPolygon={(g)=>{ setGeojson(g); onAreaChange && onAreaChange(g); }} />
      <pre className="text-xs bg-gray-50 p-2 rounded">{geojson ? JSON.stringify(geojson).slice(0,500)+'…' : 'Draw polygon to define area.'}</pre>
    </div>
  );
}

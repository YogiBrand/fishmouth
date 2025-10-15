-- GeoJSON helpers via SQL views
CREATE VIEW IF NOT EXISTS v_leads_geojson AS
SELECT jsonb_build_object(
  'type','Feature',
  'geometry', ST_AsGeoJSON(p.geom)::jsonb,
  'properties', jsonb_build_object(
    'lead_id', l.id,
    'tier', l.tier,
    'priority', l.priority_score,
    'confidence', l.confidence,
    'address', p.normalized_address
  )
) AS feature
FROM leads l JOIN properties p ON p.id=l.property_id;

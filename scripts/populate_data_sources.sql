-- Populate data_sources table with real scraping URLs for major cities
-- Austin, TX Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Austin Building Permits', 'permit', 'Austin', 'TX', 'https://abc.austintexas.gov', '/web/permit/public-search-other', 
 '{"permit_number": ".permit-number", "address": ".address", "work_description": ".work-desc", "issue_date": ".issue-date", "contractor": ".contractor-name"}', true),

('Austin Property Records', 'property', 'Austin', 'TX', 'https://propaccess.tcad.org', '/ClientDB', 
 '{"owner_name": ".owner-name", "property_value": ".market-value", "year_built": ".year-built", "sqft": ".living-area"}', true),

('Austin Code Violations', 'inspection', 'Austin', 'TX', 'https://abc.austintexas.gov', '/web/permit/public-search-violations', 
 '{"violation_type": ".violation-type", "status": ".status", "date_issued": ".issue-date"}', true);

-- Dallas, TX Data Sources  
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Dallas Building Permits', 'permit', 'Dallas', 'TX', 'https://buildinginspection.dallascityhall.com', '/PermitStatus', 
 '{"permit_number": "#PermitNumber", "address": "#Address", "work_type": "#WorkType", "issue_date": "#IssueDate"}', true),

('Dallas County Property Records', 'property', 'Dallas', 'TX', 'https://www.dallascad.org', '/AcctDetailRes.aspx', 
 '{"owner_name": "#owner_name", "market_value": "#market_value", "year_built": "#year_built"}', true);

-- Houston, TX Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Houston Building Permits', 'permit', 'Houston', 'TX', 'https://cohweb.houstontx.gov', '/ActiveWeb/SearchDPA.aspx', 
 '{"permit_id": ".permit-id", "address": ".property-address", "work_description": ".work-desc", "contractor_name": ".contractor"}', true),

('Harris County Property Records', 'property', 'Houston', 'TX', 'https://hcad.org', '/records', 
 '{"account_number": "#account", "owner_name": "#owner", "property_value": "#value", "land_area": "#land_area"}', true);

-- San Antonio, TX Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('San Antonio Building Permits', 'permit', 'San Antonio', 'TX', 'https://www.sanantonio.gov', '/DSD/PermitSearch', 
 '{"permit_number": ".permit-num", "address": ".address", "permit_type": ".type", "issue_date": ".date"}', true),

('Bexar County Property Records', 'property', 'San Antonio', 'TX', 'https://bcad.org', '/property-search', 
 '{"property_id": "#prop_id", "owner": "#owner_name", "market_value": "#market_val"}', true);

-- Fort Worth, TX Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Fort Worth Building Permits', 'permit', 'Fort Worth', 'TX', 'https://fortworthtexas.gov', '/departments/development-services/permits', 
 '{"permit_id": ".permit-id", "address": ".address", "work_type": ".work-type"}', true);

-- Phoenix, AZ Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Phoenix Building Permits', 'permit', 'Phoenix', 'AZ', 'https://www.phoenix.gov', '/pdd/permits/search', 
 '{"permit_number": ".permit-number", "address": ".address", "permit_type": ".type"}', true),

('Maricopa County Property Records', 'property', 'Phoenix', 'AZ', 'https://mcassessor.maricopa.gov', '/property-search', 
 '{"parcel_number": "#parcel", "owner": "#owner", "assessed_value": "#assessed_val"}', true);

-- Denver, CO Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Denver Building Permits', 'permit', 'Denver', 'CO', 'https://www.denvergov.org', '/content/denvergov/en/community-planning-development/applications-forms', 
 '{"permit_id": ".permit-id", "address": ".property-address", "work_description": ".work-desc"}', true);

-- Miami, FL Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Miami-Dade Building Permits', 'permit', 'Miami', 'FL', 'https://www.miamidade.gov', '/permits', 
 '{"permit_number": ".permit-num", "address": ".address", "permit_type": ".type"}', true),

('Miami-Dade Property Records', 'property', 'Miami', 'FL', 'https://www.miamidade.gov', '/pa/', 
 '{"folio_number": "#folio", "owner_name": "#owner", "market_value": "#market_value"}', true);

-- Atlanta, GA Data Sources  
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('Atlanta Building Permits', 'permit', 'Atlanta', 'GA', 'https://aca3.accela.com/atlanta', '/Default.aspx', 
 '{"permit_number": "#permit_id", "address": "#address", "work_type": "#work_type"}', true);

-- Los Angeles, CA Data Sources
INSERT INTO data_sources (name, source_type, city, state, base_url, search_endpoint, extraction_rules, enabled) VALUES
('LA Building Permits', 'permit', 'Los Angeles', 'CA', 'https://data.lacity.org', '/dataset/building-and-safety-permit-information', 
 '{"permit_number": ".permit-number", "address": ".address", "work_description": ".description"}', true);

-- Now populate city-specific configurations
INSERT INTO city_scrape_configs (city, state, priority, scrape_frequency, max_records_per_run, enabled, parameters) VALUES
('Austin', 'TX', 1, 'daily', 1000, true, '{"focus_areas": ["downtown", "south_austin", "north_austin"], "permit_types": ["roofing", "residential", "commercial"]}'),
('Dallas', 'TX', 1, 'daily', 1000, true, '{"focus_areas": ["downtown", "uptown", "deep_ellum"], "permit_types": ["roofing", "residential"]}'),
('Houston', 'TX', 1, 'daily', 1500, true, '{"focus_areas": ["downtown", "heights", "montrose"], "permit_types": ["roofing", "residential", "commercial"]}'),
('San Antonio', 'TX', 2, 'daily', 800, true, '{"focus_areas": ["downtown", "southtown", "stone_oak"], "permit_types": ["roofing", "residential"]}'),
('Fort Worth', 'TX', 2, 'weekly', 500, true, '{"permit_types": ["roofing", "residential"]}'),
('Phoenix', 'AZ', 2, 'daily', 1000, true, '{"focus_areas": ["phoenix", "scottsdale", "tempe"], "permit_types": ["roofing", "residential"]}'),
('Denver', 'CO', 2, 'weekly', 500, true, '{"permit_types": ["roofing", "residential"]}'),
('Miami', 'FL', 1, 'daily', 800, true, '{"focus_areas": ["miami", "coral_gables", "kendall"], "permit_types": ["roofing", "residential", "hurricane_repair"]}'),
('Atlanta', 'GA', 2, 'weekly', 600, true, '{"permit_types": ["roofing", "residential"]}'),
('Los Angeles', 'CA', 1, 'daily', 1200, true, '{"focus_areas": ["downtown", "hollywood", "santa_monica"], "permit_types": ["roofing", "residential"]}');
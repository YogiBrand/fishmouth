"""
City processing workflow coordinator
"""
import logging
import httpx
from typing import Dict, Any, List
import asyncio

logger = logging.getLogger(__name__)

class CityProcessor:
    """Coordinates processing of individual cities through complete workflow"""
    
    def __init__(self):
        self.service_urls = {
            'scraper': 'http://scraper-service:8002',
            'enrichment': 'http://enrichment-service:8004',
            'lead_generator': 'http://lead-generator:8008'
        }
        
        # Common permit portal URLs for major Texas cities
        self.city_urls = {
            'austin_tx': [
                'https://abc.austintexas.gov/web/permit/public-search-other',
                'https://www.austintexas.gov/department/development-services'
            ],
            'dallas_tx': [
                'https://dallascityhall.com/departments/sustainabledevelopment/Pages/default.aspx',
                'https://cityofdallas.com/permit-search'
            ],
            'houston_tx': [
                'https://edocs.houstontx.gov/public/',
                'https://www.houstontx.gov/planning/DevelReview/'
            ],
            'san_antonio_tx': [
                'https://www.sanantonio.gov/DSD/Permit',
                'https://www.sanantonio.gov/development-services'
            ]
        }
    
    async def process_city(
        self,
        city: str,
        state: str,
        scrape_types: List[str],
        priority: int = 2
    ) -> Dict[str, Any]:
        """
        Process a city through the complete data acquisition pipeline
        
        Phase 1: Scraping
        Phase 2: Enrichment  
        Phase 3: Lead Generation
        """
        try:
            logger.info(f"🏙️  Starting complete processing for {city}, {state}")
            
            result = {
                'city': city,
                'state': state,
                'phases_completed': [],
                'properties_processed': 0,
                'leads_generated': 0,
                'errors': []
            }
            
            # Phase 1: Data Scraping
            if "permit" in scrape_types or "property" in scrape_types:
                scraping_result = await self._run_scraping_phase(city, state, scrape_types)
                result['phases_completed'].append('scraping')
                result['properties_processed'] = scraping_result.get('records_found', 0)
                
                if scraping_result.get('errors'):
                    result['errors'].extend(scraping_result['errors'])
            
            # Phase 2: Data Enrichment  
            if result['properties_processed'] > 0:
                enrichment_result = await self._run_enrichment_phase(city, state)
                result['phases_completed'].append('enrichment')
                
                if enrichment_result.get('errors'):
                    result['errors'].extend(enrichment_result['errors'])
            
            # Phase 3: Lead Generation
            if 'enrichment' in result['phases_completed']:
                lead_result = await self._run_lead_generation_phase(city, state)
                result['phases_completed'].append('lead_generation')
                result['leads_generated'] = lead_result.get('leads_generated', 0)
                
                if lead_result.get('errors'):
                    result['errors'].extend(lead_result['errors'])
            
            logger.info(f"✅ Completed processing {city}, {state}. {result['properties_processed']} properties, {result['leads_generated']} leads")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ City processing failed for {city}, {state}: {e}")
            return {
                'city': city,
                'state': state,
                'phases_completed': [],
                'properties_processed': 0,
                'leads_generated': 0,
                'errors': [str(e)]
            }
    
    async def _run_scraping_phase(self, city: str, state: str, scrape_types: List[str]) -> Dict[str, Any]:
        """Run the data scraping phase"""
        try:
            logger.info(f"🕷️  Phase 1: Scraping data for {city}, {state}")
            
            # Get URLs for this city
            city_key = f"{city.lower()}_{state.lower()}"
            urls = self.city_urls.get(city_key, [])
            
            if not urls:
                # Generate common URL patterns for unknown cities
                urls = [
                    f"https://www.{city.lower().replace(' ', '')}.gov/permits",
                    f"https://www.{city.lower().replace(' ', '')}permits.com",
                    f"https://permits.{city.lower().replace(' ', '')}.gov"
                ]
            
            total_records = 0
            errors = []
            
            # Create scraping jobs for each type
            for scrape_type in scrape_types:
                if scrape_type in ['permit', 'property', 'contractor']:
                    try:
                        job_request = {
                            'job_type': scrape_type,
                            'city': city,
                            'state': state,
                            'urls': urls,
                            'metadata': {
                                'priority': 2,
                                'automated': True
                            }
                        }
                        
                        async with httpx.AsyncClient(timeout=30.0) as client:
                            response = await client.post(
                                f"{self.service_urls['scraper']}/jobs",
                                json=job_request
                            )
                            
                            if response.status_code == 200:
                                job_data = response.json()
                                logger.info(f"✅ Created {scrape_type} scraping job: {job_data.get('id')}")
                                
                                # Wait for job completion (with timeout)
                                await self._wait_for_job_completion(
                                    'scraper',
                                    job_data['id'],
                                    timeout_minutes=30
                                )
                                
                                # Get final job status
                                status_response = await client.get(
                                    f"{self.service_urls['scraper']}/jobs/{job_data['id']}"
                                )
                                
                                if status_response.status_code == 200:
                                    job_status = status_response.json()
                                    total_records += job_status['progress'].get('records_succeeded', 0)
                                    
                            else:
                                errors.append(f"Failed to create {scrape_type} job: {response.status_code}")
                                
                    except Exception as e:
                        errors.append(f"Scraping {scrape_type} failed: {str(e)}")
            
            return {
                'records_found': total_records,
                'errors': errors
            }
            
        except Exception as e:
            logger.error(f"Scraping phase failed: {e}")
            return {'records_found': 0, 'errors': [str(e)]}
    
    async def _run_enrichment_phase(self, city: str, state: str) -> Dict[str, Any]:
        """Run the data enrichment phase"""
        try:
            logger.info(f"🔍 Phase 2: Enriching data for {city}, {state}")
            
            errors = []
            
            # Trigger batch enrichment for this city's properties
            enrichment_request = {
                'source_table': 'raw_properties',
                'enrichment_types': ['email_lookup', 'address_validation', 'property_enrichment'],
                'limit': 200  # Process up to 200 properties per city
            }
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.service_urls['enrichment']}/enrich/batch",
                    params=enrichment_request
                )
                
                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✅ Queued enrichment for {result.get('records_queued', 0)} properties")
                    
                    # Wait for enrichment jobs to complete
                    await asyncio.sleep(120)  # Give enrichment time to process
                    
                else:
                    errors.append(f"Enrichment request failed: {response.status_code}")
            
            return {'errors': errors}
            
        except Exception as e:
            logger.error(f"Enrichment phase failed: {e}")
            return {'errors': [str(e)]}
    
    async def _run_lead_generation_phase(self, city: str, state: str) -> Dict[str, Any]:
        """Run the lead generation phase"""
        try:
            logger.info(f"📊 Phase 3: Generating leads for {city}, {state}")
            
            errors = []
            leads_generated = 0
            
            # Trigger background scoring
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Start background scoring
                scoring_response = await client.post(
                    f"{self.service_urls['lead_generator']}/score/background"
                )
                
                if scoring_response.status_code != 200:
                    errors.append(f"Lead scoring failed: {scoring_response.status_code}")
                
                # Wait for scoring to complete
                await asyncio.sleep(60)
                
                # Create clusters for this city
                cluster_request = {
                    'city': city,
                    'state': state,
                    'max_cluster_radius_miles': 2.5,
                    'min_cluster_size': 3
                }
                
                cluster_response = await client.post(
                    f"{self.service_urls['lead_generator']}/cluster",
                    json=cluster_request
                )
                
                if cluster_response.status_code == 200:
                    cluster_result = cluster_response.json()
                    clusters = cluster_result.get('clusters', [])
                    leads_generated = sum(len(c.get('properties', [])) for c in clusters)
                    
                    logger.info(f"✅ Generated {len(clusters)} clusters with {leads_generated} leads")
                else:
                    errors.append(f"Clustering failed: {cluster_response.status_code}")
            
            return {
                'leads_generated': leads_generated,
                'errors': errors
            }
            
        except Exception as e:
            logger.error(f"Lead generation phase failed: {e}")
            return {'leads_generated': 0, 'errors': [str(e)]}
    
    async def _wait_for_job_completion(
        self,
        service: str,
        job_id: str,
        timeout_minutes: int = 30
    ):
        """Wait for a job to complete with timeout"""
        try:
            start_time = asyncio.get_event_loop().time()
            timeout_seconds = timeout_minutes * 60
            
            while True:
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > timeout_seconds:
                    logger.warning(f"Job {job_id} timed out after {timeout_minutes} minutes")
                    break
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        f"{self.service_urls[service]}/jobs/{job_id}"
                    )
                    
                    if response.status_code == 200:
                        job_status = response.json()
                        status = job_status.get('status')
                        
                        if status in ['completed', 'failed']:
                            logger.info(f"Job {job_id} {status}")
                            break
                
                # Wait before next check
                await asyncio.sleep(30)
                
        except Exception as e:
            logger.error(f"Failed to wait for job {job_id}: {e}")
    
    async def get_city_processing_stats(self, city: str, state: str) -> Dict[str, Any]:
        """Get processing statistics for a city"""
        try:
            # This would query database for city-specific stats
            # For now, return basic structure
            return {
                'city': city,
                'state': state,
                'total_properties': 0,
                'enriched_properties': 0,
                'scored_leads': 0,
                'clusters_created': 0,
                'last_processed': None
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats for {city}: {e}")
            return {}
"""
Intelligent scraper using Crawl4AI + Local LLM
"""
import asyncio
from crawl4ai import AsyncWebCrawler
from crawl4ai.extraction_strategy import LLMExtractionStrategy
import logging
from typing import Optional, Dict, Any, List
import random
import hashlib
from datetime import datetime, timedelta

import sys
sys.path.append('../../../..')
from shared.redis_client import redis_client
from app.utils.llm import llm

logger = logging.getLogger(__name__)

class SmartScraper:
    """
    Intelligent scraper using Crawl4AI + Local LLM
    """
    
    def __init__(self):
        self.crawler = None
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ]
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.crawler = AsyncWebCrawler(
            headless=True,
            verbose=False
        )
        await self.crawler.__aenter__()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.crawler:
            await self.crawler.__aexit__(exc_type, exc_val, exc_tb)
    
    def _get_cache_key(self, url: str) -> str:
        """Generate cache key for URL"""
        return f"scrape:{hashlib.md5(url.encode()).hexdigest()}"
    
    async def _get_cached(self, url: str) -> Optional[str]:
        """Get cached response"""
        cache_key = self._get_cache_key(url)
        return await redis_client.get(cache_key)
    
    async def _cache_response(self, url: str, content: str, expire_hours: int = 24):
        """Cache response"""
        cache_key = self._get_cache_key(url)
        await redis_client.set(cache_key, content, expire=expire_hours * 3600)
    
    def _get_random_user_agent(self) -> str:
        """Get random user agent"""
        return random.choice(self.user_agents)
    
    async def _smart_delay(self, min_delay: float = 1.0, max_delay: float = 3.0):
        """Smart delay between requests"""
        delay = random.uniform(min_delay, max_delay)
        await asyncio.sleep(delay)
    
    async def scrape_with_ai(
        self,
        url: str,
        extraction_prompt: str,
        use_cache: bool = True,
        wait_for: Optional[str] = None,
        js_code: Optional[str] = None,
        css_selector: Optional[str] = None,
        max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape URL with AI extraction
        
        Args:
            url: URL to scrape
            extraction_prompt: Prompt for AI extraction
            use_cache: Whether to use cached responses
            wait_for: CSS selector to wait for
            js_code: JavaScript code to execute
            css_selector: CSS selector for content extraction
            max_retries: Maximum retry attempts
            
        Returns:
            Extracted data or None if failed
        """
        
        # Check cache first
        if use_cache:
            cached = await self._get_cached(url)
            if cached:
                logger.info(f"✅ Using cached response for {url}")
                return llm.extract_json(cached, extraction_prompt)
        
        for attempt in range(max_retries):
            try:
                logger.info(f"🕷️  Scraping {url} (attempt {attempt + 1})")
                
                # Add delay between requests
                if attempt > 0:
                    await self._smart_delay(2 ** attempt, 2 ** (attempt + 1))
                
                # Configure crawl parameters
                crawl_params = {
                    'url': url,
                    'user_agent': self._get_random_user_agent(),
                    'bypass_cache': not use_cache,
                    'timeout': 30
                }
                
                # Add optional parameters
                if wait_for:
                    crawl_params['wait_for'] = wait_for
                if js_code:
                    crawl_params['js_code'] = js_code
                if css_selector:
                    crawl_params['css_selector'] = css_selector
                
                # Perform crawl
                result = await self.crawler.arun(**crawl_params)
                
                if result.success:
                    content = result.markdown if result.markdown else result.html
                    
                    # Cache successful response
                    if use_cache:
                        await self._cache_response(url, content)
                    
                    # Extract data using AI
                    extracted_data = llm.extract_json(content, extraction_prompt)
                    
                    if extracted_data:
                        logger.info(f"✅ Successfully scraped and extracted data from {url}")
                        return extracted_data
                    else:
                        logger.warning(f"⚠️  AI extraction failed for {url}")
                        return None
                else:
                    logger.error(f"❌ Crawl failed for {url}: {result.error_message}")
            
            except Exception as e:
                logger.error(f"❌ Scraping attempt {attempt + 1} failed for {url}: {e}")
                
                if attempt < max_retries - 1:
                    await self._smart_delay(2 ** attempt, 2 ** (attempt + 1))
        
        logger.error(f"❌ All scraping attempts failed for {url}")
        return None
    
    async def scrape_permits(
        self,
        url: str,
        wait_for: Optional[str] = None,
        js_code: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Scrape permit data from URL
        """
        
        extraction_prompt = """Extract ALL roofing permits from this page.
        
        Return a JSON array with permits containing:
        - permit_number
        - address  
        - city
        - state
        - zip
        - issue_date (YYYY-MM-DD)
        - permit_type
        - work_description
        - contractor_name
        - contractor_license
        - estimated_value (number only)
        
        Use null for missing fields."""
        
        result = await self.scrape_with_ai(url, extraction_prompt, wait_for=wait_for, js_code=js_code)
        
        if result and isinstance(result, list):
            return result
        elif result and isinstance(result, dict):
            return [result]
        else:
            return []
    
    async def scrape_property(
        self,
        url: str,
        wait_for: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape property data from tax assessor page
        """
        
        extraction_prompt = """Extract property information from this tax assessor page.
        
        Return JSON object with:
        - owner_name
        - owner_address
        - owner_city
        - owner_state
        - owner_zip
        - property_value (number)
        - year_built (number)
        - sqft (number)
        - lot_size (number)
        - beds (number)
        - baths (number)
        - property_type
        
        Use null for missing fields."""
        
        return await self.scrape_with_ai(url, extraction_prompt, wait_for=wait_for)
    
    async def scrape_contractor(
        self,
        url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Scrape contractor information
        """
        
        extraction_prompt = """Extract roofing contractor information.
        
        Return JSON object with:
        - company_name
        - owner_name
        - address
        - city
        - state
        - zip
        - phone
        - email
        - website
        - license_number
        - years_in_business (number)
        - services (array)
        - certifications (array)
        
        Use null for missing fields."""
        
        return await self.scrape_with_ai(url, extraction_prompt)

# Helper function for batch scraping
async def scrape_urls_batch(
    urls: List[str],
    scraper_method: str = "scrape_permits",
    max_concurrent: int = 5
) -> List[Dict[str, Any]]:
    """
    Scrape multiple URLs concurrently
    """
    
    async def scrape_single(url: str) -> List[Dict[str, Any]]:
        async with SmartScraper() as scraper:
            if scraper_method == "scrape_permits":
                return await scraper.scrape_permits(url)
            elif scraper_method == "scrape_property":
                result = await scraper.scrape_property(url)
                return [result] if result else []
            elif scraper_method == "scrape_contractor":
                result = await scraper.scrape_contractor(url)
                return [result] if result else []
            else:
                return []
    
    # Limit concurrency to avoid overwhelming servers
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def scrape_with_semaphore(url: str):
        async with semaphore:
            return await scrape_single(url)
    
    # Execute all scraping tasks
    tasks = [scrape_with_semaphore(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Flatten results and filter out exceptions
    all_results = []
    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Batch scraping error: {result}")
        elif isinstance(result, list):
            all_results.extend(result)
    
    return all_results
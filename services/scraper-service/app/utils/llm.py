"""
Local LLM for data extraction using Ollama
"""
import ollama
import json
import logging
from typing import Optional, Dict, Any, List
import time
from functools import wraps

logger = logging.getLogger(__name__)

class LocalLLM:
    """
    Local LLM for data extraction using Ollama
    """
    
    def __init__(
        self,
        model: str = "llama3.2:3b",
        fallback_model: str = "mistral:7b-instruct"
    ):
        self.model = model
        self.fallback_model = fallback_model
        self.client = ollama.Client()
        
        # Verify model is available
        self._ensure_model_available()
    
    def _ensure_model_available(self):
        """Ensure model is downloaded and available"""
        try:
            # Check if model exists
            models = self.client.list()
            model_names = [m['name'] for m in models['models']]
            
            if self.model not in model_names:
                logger.info(f"Downloading model {self.model}...")
                self.client.pull(self.model)
                logger.info(f"✅ Model {self.model} downloaded")
        
        except Exception as e:
            logger.error(f"Failed to ensure model availability: {e}")
            raise
    
    def extract_json(
        self,
        text: str,
        prompt: str,
        max_retries: int = 3
    ) -> Optional[Dict[str, Any]]:
        """
        Extract structured data from text using LLM
        
        Args:
            text: The text to extract from (HTML, PDF, etc.)
            prompt: Instructions for extraction
            max_retries: Number of retry attempts
        
        Returns:
            Extracted data as dictionary, or None if failed
        """
        
        for attempt in range(max_retries):
            try:
                # Create full prompt
                full_prompt = f"""{prompt}

TEXT TO EXTRACT FROM:
{text[:10000]}  # Limit to 10k chars

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, just JSON.
"""
                
                # Call LLM
                response = self.client.generate(
                    model=self.model,
                    prompt=full_prompt,
                    options={
                        'temperature': 0.1,  # Low temperature for consistency
                        'top_p': 0.9,
                    }
                )
                
                response_text = response['response']
                
                # Try to parse JSON
                # Remove markdown code blocks if present
                response_text = response_text.strip()
                if response_text.startswith('```'):
                    # Extract JSON from markdown
                    lines = response_text.split('\n')
                    response_text = '\n'.join(lines[1:-1])
                
                # Parse JSON
                data = json.loads(response_text)
                
                logger.info(f"✅ LLM extraction successful on attempt {attempt + 1}")
                return data
            
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse LLM response as JSON (attempt {attempt + 1}): {e}")
                
                if attempt < max_retries - 1:
                    # Try with fallback model
                    if attempt == max_retries - 2:
                        logger.info(f"Trying fallback model: {self.fallback_model}")
                        old_model = self.model
                        self.model = self.fallback_model
                        continue
                
                time.sleep(2 ** attempt)  # Exponential backoff
            
            except Exception as e:
                logger.error(f"LLM extraction failed (attempt {attempt + 1}): {e}")
                
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
        
        logger.error("❌ All LLM extraction attempts failed")
        return None
    
    def extract_permits(self, html: str) -> List[Dict[str, Any]]:
        """
        Extract permit data from HTML
        """
        
        prompt = """You are extracting roofing permit data from a webpage.

Extract ALL permits visible in the HTML. For each permit, extract:
- permit_number: The permit/application number
- address: Full street address
- city: City name
- state: State code (2 letters)
- zip: ZIP code
- issue_date: Date permit was issued (YYYY-MM-DD format)
- permit_type: Type of permit
- work_description: Description of work
- contractor_name: Contractor company name
- contractor_license: Contractor license number
- estimated_value: Estimated cost of work (number only)

Return a JSON array of permits:
[
  {
    "permit_number": "...",
    "address": "...",
    ...
  }
]

If a field is not available, use null."""
        
        result = self.extract_json(html, prompt)
        
        if result and isinstance(result, list):
            return result
        elif result and isinstance(result, dict):
            # Single permit returned as dict
            return [result]
        else:
            return []
    
    def extract_property_data(self, html: str) -> Optional[Dict[str, Any]]:
        """
        Extract property data from HTML
        """
        
        prompt = """You are extracting property data from a county tax assessor webpage.

Extract the following information:
- owner_name: Property owner full name
- owner_address: Owner mailing address
- owner_city: Owner city
- owner_state: Owner state
- owner_zip: Owner ZIP
- property_value: Assessed property value (number only)
- year_built: Year property was built (number)
- sqft: Square footage (number)
- lot_size: Lot size in acres (number)
- beds: Number of bedrooms (number)
- baths: Number of bathrooms (number)
- property_type: Type (Single Family, Condo, etc.)

Return JSON object with these fields. Use null for missing values."""
        
        return self.extract_json(html, prompt)
    
    def extract_contractor_info(self, html: str) -> Optional[Dict[str, Any]]:
        """
        Extract contractor information from webpage
        """
        
        prompt = """You are extracting roofing contractor information from a webpage.

Extract:
- company_name: Business name
- owner_name: Owner or contact person name
- address: Street address
- city: City
- state: State
- zip: ZIP
- phone: Phone number
- email: Email address
- website: Website URL
- license_number: Contractor license
- years_in_business: Years in business (number)
- services: Array of services offered
- certifications: Array of certifications

Return JSON object. Use null for missing values."""
        
        return self.extract_json(html, prompt)

# Global LLM instance
llm = LocalLLM()
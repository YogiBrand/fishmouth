"""
Address validation and geocoding service
"""
import httpx
import logging
from typing import Dict, Any, Optional
import os
import re
from geopy.geocoders import GoogleV3, Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

logger = logging.getLogger(__name__)

class AddressValidator:
    """Validates and standardizes addresses using multiple providers"""
    
    def __init__(self):
        self.google_api_key = os.getenv('GOOGLE_MAPS_API_KEY')
        self.mapbox_token = os.getenv('MAPBOX_API_KEY')
        
        # Initialize geocoders
        if self.google_api_key:
            self.google_geocoder = GoogleV3(api_key=self.google_api_key)
        else:
            self.google_geocoder = None
            
        self.nominatim_geocoder = Nominatim(user_agent="roofing_lead_generator")
    
    async def validate_address(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate and standardize address using multiple providers
        """
        full_address = f"{address}, {city}, {state}"
        if zip_code:
            full_address += f" {zip_code}"
        
        result = {
            'input_address': full_address,
            'formatted_address': None,
            'latitude': None,
            'longitude': None,
            'components': {},
            'confidence': 0.0,
            'provider': None,
            'cost': 0.0
        }
        
        # Try Google Geocoding first (most accurate)
        if self.google_geocoder:
            google_result = await self._validate_with_google(full_address)
            if google_result and google_result['confidence'] > 0.8:
                return google_result
        
        # Try Mapbox as backup
        if self.mapbox_token:
            mapbox_result = await self._validate_with_mapbox(full_address)
            if mapbox_result and mapbox_result['confidence'] > 0.7:
                return mapbox_result
        
        # Try Nominatim as free fallback
        nominatim_result = await self._validate_with_nominatim(full_address)
        if nominatim_result:
            return nominatim_result
        
        # Return best result or basic parsing
        return self._basic_address_parsing(address, city, state, zip_code)
    
    async def _validate_with_google(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Validate address using Google Geocoding API
        """
        try:
            if not self.google_api_key:
                return None
                
            url = "https://maps.googleapis.com/maps/api/geocode/json"
            params = {
                'address': address,
                'key': self.google_api_key
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('results') and len(data['results']) > 0:
                    result = data['results'][0]
                    location = result['geometry']['location']
                    
                    # Extract address components
                    components = {}
                    for component in result.get('address_components', []):
                        for comp_type in component['types']:
                            if comp_type in ['street_number', 'route', 'locality', 
                                           'administrative_area_level_1', 'postal_code', 'country']:
                                components[comp_type] = component['long_name']
                    
                    return {
                        'input_address': address,
                        'formatted_address': result['formatted_address'],
                        'latitude': location['lat'],
                        'longitude': location['lng'],
                        'components': components,
                        'confidence': 0.9,  # Google is generally very accurate
                        'provider': 'google',
                        'cost': 0.005  # Google charges ~$0.005 per request
                    }
                    
        except Exception as e:
            logger.error(f"Google geocoding failed: {e}")
            
        return None
    
    async def _validate_with_mapbox(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Validate address using Mapbox Geocoding API
        """
        try:
            if not self.mapbox_token:
                return None
                
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
            params = {
                'access_token': self.mapbox_token,
                'country': 'us',
                'types': 'address',
                'limit': 1
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get('features') and len(data['features']) > 0:
                    feature = data['features'][0]
                    coords = feature['center']
                    
                    # Extract address components from context
                    components = {}
                    for context_item in feature.get('context', []):
                        if context_item['id'].startswith('postcode'):
                            components['postal_code'] = context_item['text']
                        elif context_item['id'].startswith('region'):
                            components['administrative_area_level_1'] = context_item['text']
                        elif context_item['id'].startswith('place'):
                            components['locality'] = context_item['text']
                    
                    return {
                        'input_address': address,
                        'formatted_address': feature['place_name'],
                        'latitude': coords[1],  # Mapbox returns [lon, lat]
                        'longitude': coords[0],
                        'components': components,
                        'confidence': feature.get('relevance', 0.8),
                        'provider': 'mapbox',
                        'cost': 0.0  # Mapbox has generous free tier
                    }
                    
        except Exception as e:
            logger.error(f"Mapbox geocoding failed: {e}")
            
        return None
    
    async def _validate_with_nominatim(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Validate address using OpenStreetMap Nominatim (free)
        """
        try:
            # Use asyncio to run blocking geocoder
            import asyncio
            
            location = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.nominatim_geocoder.geocode(
                    address, 
                    country_codes='us',
                    timeout=10
                )
            )
            
            if location:
                return {
                    'input_address': address,
                    'formatted_address': location.address,
                    'latitude': location.latitude,
                    'longitude': location.longitude,
                    'components': {},  # Nominatim doesn't provide structured components
                    'confidence': 0.6,  # Lower confidence for free service
                    'provider': 'nominatim',
                    'cost': 0.0  # Free service
                }
                
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.error(f"Nominatim geocoding failed: {e}")
        except Exception as e:
            logger.error(f"Nominatim geocoding error: {e}")
            
        return None
    
    def _basic_address_parsing(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: Optional[str]
    ) -> Dict[str, Any]:
        """
        Basic address parsing when all geocoding services fail
        """
        try:
            # Clean up the inputs
            address = re.sub(r'\s+', ' ', address.strip())
            city = city.strip().title()
            state = state.strip().upper()
            
            full_address = f"{address}, {city}, {state}"
            if zip_code:
                zip_code = re.sub(r'[^0-9-]', '', zip_code.strip())
                full_address += f" {zip_code}"
            
            # Extract basic components
            components = {
                'route': address,
                'locality': city,
                'administrative_area_level_1': state
            }
            
            if zip_code:
                components['postal_code'] = zip_code
            
            # Extract house number if possible
            house_number_match = re.match(r'^(\d+)', address)
            if house_number_match:
                components['street_number'] = house_number_match.group(1)
                components['route'] = address[len(house_number_match.group(1)):].strip()
            
            return {
                'input_address': f"{address}, {city}, {state}" + (f" {zip_code}" if zip_code else ""),
                'formatted_address': full_address,
                'latitude': None,  # No coordinates available
                'longitude': None,
                'components': components,
                'confidence': 0.3,  # Low confidence for basic parsing
                'provider': 'basic_parser',
                'cost': 0.0
            }
            
        except Exception as e:
            logger.error(f"Basic address parsing failed: {e}")
            return {
                'input_address': f"{address}, {city}, {state}",
                'formatted_address': None,
                'latitude': None,
                'longitude': None,
                'components': {},
                'confidence': 0.0,
                'provider': 'failed',
                'cost': 0.0
            }
    
    async def batch_validate(self, addresses: list) -> list:
        """
        Validate multiple addresses in batch
        """
        results = []
        for addr_data in addresses:
            if isinstance(addr_data, dict):
                result = await self.validate_address(
                    addr_data.get('address', ''),
                    addr_data.get('city', ''),
                    addr_data.get('state', ''),
                    addr_data.get('zip_code')
                )
            elif isinstance(addr_data, str):
                # Try to parse full address string
                result = await self.validate_address(addr_data, '', '')
            else:
                continue
                
            results.append(result)
        
        return results
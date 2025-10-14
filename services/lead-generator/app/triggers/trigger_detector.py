"""
Trigger detection for identifying urgent roofing leads
"""
import logging
from typing import Dict, Any, List
import asyncio
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class TriggerDetector:
    """Detects buying triggers and urgency signals for roofing leads"""
    
    def __init__(self):
        # Define trigger types and their urgency scores
        self.trigger_types = {
            'storm_damage': {'urgency': 95, 'timeframe_days': 30},
            'roof_replacement_due': {'urgency': 85, 'timeframe_days': 90},
            'insurance_claim': {'urgency': 90, 'timeframe_days': 60},
            'permit_activity': {'urgency': 70, 'timeframe_days': 14},
            'seasonal_opportunity': {'urgency': 60, 'timeframe_days': 45},
            'neighborhood_trend': {'urgency': 50, 'timeframe_days': 120},
            'property_sale': {'urgency': 75, 'timeframe_days': 30},
            'age_threshold': {'urgency': 65, 'timeframe_days': 180}
        }
    
    async def detect_triggers(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect all triggers for a property
        
        Returns:
            List of trigger dictionaries with type, urgency, and details
        """
        if not enrichment_data:
            enrichment_data = {}
        
        triggers = []
        
        # Check for storm damage triggers
        storm_triggers = await self._detect_storm_triggers(property_data, enrichment_data)
        triggers.extend(storm_triggers)
        
        # Check for age-based triggers
        age_triggers = await self._detect_age_triggers(property_data)
        triggers.extend(age_triggers)
        
        # Check for permit activity triggers
        permit_triggers = await self._detect_permit_triggers(property_data)
        triggers.extend(permit_triggers)
        
        # Check for seasonal triggers
        seasonal_triggers = await self._detect_seasonal_triggers(property_data)
        triggers.extend(seasonal_triggers)
        
        # Check for neighborhood triggers
        neighborhood_triggers = await self._detect_neighborhood_triggers(property_data, enrichment_data)
        triggers.extend(neighborhood_triggers)
        
        # Check for property sale triggers
        sale_triggers = await self._detect_property_sale_triggers(property_data, enrichment_data)
        triggers.extend(sale_triggers)
        
        # Sort triggers by urgency (highest first)
        triggers.sort(key=lambda x: x['urgency'], reverse=True)
        
        logger.info(f"Detected {len(triggers)} triggers for property {property_data.get('id', 'unknown')}")
        
        return triggers
    
    async def _detect_storm_triggers(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect storm damage triggers"""
        triggers = []
        
        try:
            # Get property coordinates
            address_data = enrichment_data.get('address', {})
            latitude = address_data.get('latitude')
            longitude = address_data.get('longitude')
            
            if not latitude or not longitude:
                return triggers
            
            # In real implementation, this would query weather events database
            # For now, using mock storm detection
            
            # Check for recent storm events within 50 miles
            # This would query the weather_events table
            recent_storms = []  # Would be populated from database query
            
            for storm in recent_storms:
                triggers.append({
                    'type': 'storm_damage',
                    'urgency': self.trigger_types['storm_damage']['urgency'],
                    'timeframe_days': self.trigger_types['storm_damage']['timeframe_days'],
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'storm_type': storm.get('event_type'),
                        'storm_date': storm.get('event_date'),
                        'distance_miles': storm.get('distance'),
                        'severity': storm.get('severity')
                    },
                    'message': f"Recent {storm.get('event_type')} activity detected within {storm.get('distance')} miles"
                })
                
        except Exception as e:
            logger.error(f"Storm trigger detection failed: {e}")
        
        return triggers
    
    async def _detect_age_triggers(self, property_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect age-based triggers"""
        triggers = []
        
        try:
            year_built = property_data.get('year_built')
            if not year_built:
                return triggers
            
            current_year = datetime.now().year
            property_age = current_year - int(year_built)
            
            # Trigger based on typical roof lifespans
            if property_age >= 25:
                triggers.append({
                    'type': 'roof_replacement_due',
                    'urgency': 95,
                    'timeframe_days': 30,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'property_age': property_age,
                        'year_built': year_built,
                        'estimated_roof_age': property_age
                    },
                    'message': f"Roof likely needs replacement - property built in {year_built} ({property_age} years old)"
                })
            elif property_age >= 20:
                triggers.append({
                    'type': 'age_threshold',
                    'urgency': 75,
                    'timeframe_days': 90,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'property_age': property_age,
                        'year_built': year_built
                    },
                    'message': f"Roof approaching replacement age - built in {year_built}"
                })
            elif property_age >= 15:
                triggers.append({
                    'type': 'age_threshold',
                    'urgency': 60,
                    'timeframe_days': 180,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'property_age': property_age,
                        'year_built': year_built
                    },
                    'message': f"Roof maintenance likely needed - built in {year_built}"
                })
                
        except (ValueError, TypeError) as e:
            logger.error(f"Age trigger detection failed: {e}")
        
        return triggers
    
    async def _detect_permit_triggers(self, property_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect permit activity triggers"""
        triggers = []
        
        try:
            # Check for recent roofing permits in the neighborhood
            # This would query raw_permits table for nearby addresses
            
            city = property_data.get('city')
            state = property_data.get('state')
            
            if not city or not state:
                return triggers
            
            # In real implementation, query for recent permits:
            # - Same ZIP code
            # - Last 30 days
            # - Roofing/repair permits
            
            recent_permit_count = 0  # Would be populated from database query
            
            if recent_permit_count >= 3:
                triggers.append({
                    'type': 'permit_activity',
                    'urgency': 70,
                    'timeframe_days': 14,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'recent_permits': recent_permit_count,
                        'area': f"{city}, {state}",
                        'timeframe': '30 days'
                    },
                    'message': f"High roofing permit activity in {city} - {recent_permit_count} permits in last 30 days"
                })
                
        except Exception as e:
            logger.error(f"Permit trigger detection failed: {e}")
        
        return triggers
    
    async def _detect_seasonal_triggers(self, property_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect seasonal opportunity triggers"""
        triggers = []
        
        try:
            current_date = datetime.now()
            current_month = current_date.month
            
            # Spring roofing season (March-May)
            if current_month in [3, 4, 5]:
                triggers.append({
                    'type': 'seasonal_opportunity',
                    'urgency': 65,
                    'timeframe_days': 45,
                    'detected_at': current_date.isoformat(),
                    'details': {
                        'season': 'spring',
                        'month': current_month,
                        'optimal_timing': True
                    },
                    'message': "Spring roofing season - optimal time for roof inspections and repairs"
                })
            
            # Fall roofing season (September-October)
            elif current_month in [9, 10]:
                triggers.append({
                    'type': 'seasonal_opportunity',
                    'urgency': 70,
                    'timeframe_days': 30,
                    'detected_at': current_date.isoformat(),
                    'details': {
                        'season': 'fall',
                        'month': current_month,
                        'pre_winter': True
                    },
                    'message': "Fall roofing season - critical time to prepare roof for winter"
                })
            
            # Pre-storm season (early summer)
            elif current_month in [6, 7]:
                triggers.append({
                    'type': 'seasonal_opportunity',
                    'urgency': 55,
                    'timeframe_days': 60,
                    'detected_at': current_date.isoformat(),
                    'details': {
                        'season': 'pre_storm',
                        'month': current_month,
                        'storm_prep': True
                    },
                    'message': "Pre-storm season - good time for roof inspections before severe weather"
                })
                
        except Exception as e:
            logger.error(f"Seasonal trigger detection failed: {e}")
        
        return triggers
    
    async def _detect_neighborhood_triggers(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect neighborhood trend triggers"""
        triggers = []
        
        try:
            neighborhood_data = enrichment_data.get('neighborhood', {})
            
            if not neighborhood_data:
                return triggers
            
            # Check for established neighborhood (more likely to need roof work)
            neighborhood = neighborhood_data.get('neighborhood', '').lower()
            district = neighborhood_data.get('district', '').lower()
            
            # Established neighborhoods have higher roof replacement probability
            established_keywords = ['estate', 'heights', 'park', 'manor', 'hills', 'grove']
            if any(keyword in neighborhood or keyword in district for keyword in established_keywords):
                triggers.append({
                    'type': 'neighborhood_trend',
                    'urgency': 50,
                    'timeframe_days': 120,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'neighborhood': neighborhood,
                        'district': district,
                        'trend': 'established_area'
                    },
                    'message': f"Located in established neighborhood ({neighborhood}) - higher probability of roof maintenance needs"
                })
                
        except Exception as e:
            logger.error(f"Neighborhood trigger detection failed: {e}")
        
        return triggers
    
    async def _detect_property_sale_triggers(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Detect property sale/ownership change triggers"""
        triggers = []
        
        try:
            # In real implementation, this would check:
            # - Recent property sales in area
            # - Property ownership changes
            # - Real estate activity
            
            # For now, using basic heuristics
            owner_name = property_data.get('owner_name', '')
            owner_address = property_data.get('owner_address', '')
            property_address = property_data.get('address', '')
            
            # If owner address differs from property address, might be recent sale/rental
            if owner_address and property_address and owner_address.lower() not in property_address.lower():
                triggers.append({
                    'type': 'property_sale',
                    'urgency': 45,
                    'timeframe_days': 90,
                    'detected_at': datetime.utcnow().isoformat(),
                    'details': {
                        'owner_name': owner_name,
                        'different_addresses': True,
                        'likely_rental': True
                    },
                    'message': "Non-owner occupied property - potential for deferred maintenance"
                })
                
        except Exception as e:
            logger.error(f"Property sale trigger detection failed: {e}")
        
        return triggers
    
    async def get_trigger_summary(self, triggers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get summary statistics for detected triggers"""
        try:
            if not triggers:
                return {
                    'total_triggers': 0,
                    'max_urgency': 0,
                    'primary_trigger': None,
                    'recommended_action': 'Monitor for future triggers'
                }
            
            # Calculate statistics
            max_urgency = max(trigger['urgency'] for trigger in triggers)
            avg_urgency = sum(trigger['urgency'] for trigger in triggers) / len(triggers)
            
            # Find primary trigger (highest urgency)
            primary_trigger = max(triggers, key=lambda x: x['urgency'])
            
            # Group triggers by type
            trigger_types = {}
            for trigger in triggers:
                trigger_type = trigger['type']
                if trigger_type not in trigger_types:
                    trigger_types[trigger_type] = 0
                trigger_types[trigger_type] += 1
            
            # Determine recommended action
            if max_urgency >= 90:
                recommended_action = 'Immediate outreach - high urgency triggers detected'
            elif max_urgency >= 75:
                recommended_action = 'Priority follow-up - strong buying signals present'
            elif max_urgency >= 60:
                recommended_action = 'Scheduled outreach - moderate opportunity'
            else:
                recommended_action = 'Long-term nurture - low urgency signals'
            
            return {
                'total_triggers': len(triggers),
                'max_urgency': max_urgency,
                'avg_urgency': round(avg_urgency, 1),
                'primary_trigger': {
                    'type': primary_trigger['type'],
                    'urgency': primary_trigger['urgency'],
                    'message': primary_trigger['message']
                },
                'trigger_types': trigger_types,
                'recommended_action': recommended_action,
                'timeframe_priority': primary_trigger.get('timeframe_days', 90)
            }
            
        except Exception as e:
            logger.error(f"Trigger summary failed: {e}")
            return {
                'total_triggers': len(triggers),
                'max_urgency': 0,
                'primary_trigger': None,
                'recommended_action': 'Analysis error - manual review required'
            }
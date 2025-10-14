"""
Lead scoring algorithm for roofing prospects
"""
import logging
from typing import Dict, Any, List
import asyncio
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class LeadScorer:
    """Scores roofing leads based on multiple factors"""
    
    def __init__(self):
        # Scoring weights (total should equal 100)
        self.weights = {
            'roof_age': 0.25,           # 25% - Age of roof
            'property_value': 0.20,     # 20% - Property value range  
            'storm_activity': 0.20,     # 20% - Recent storm damage
            'neighborhood': 0.15,       # 15% - Neighborhood factors
            'owner_match': 0.15,        # 15% - Owner contact quality
            'urgency': 0.05            # 5% - Time-sensitive factors
        }
        
        # Pricing tiers and base prices
        self.pricing_tiers = {
            'premium': {'min_score': 85, 'base_price': 200.0},
            'standard': {'min_score': 70, 'base_price': 150.0}, 
            'budget': {'min_score': 50, 'base_price': 100.0}
        }
    
    async def score_property(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Score a property for roofing lead quality
        
        Returns:
            Dict with overall score, component scores, buying signals, pricing
        """
        if not enrichment_data:
            enrichment_data = {}
        
        # Calculate component scores
        component_scores = {}
        
        # 1. Roof Age Score (0-100)
        component_scores['roof_age'] = await self._score_roof_age(property_data)
        
        # 2. Property Value Score (0-100)
        component_scores['property_value'] = await self._score_property_value(property_data)
        
        # 3. Storm Activity Score (0-100)
        component_scores['storm_activity'] = await self._score_storm_activity(property_data, enrichment_data)
        
        # 4. Neighborhood Score (0-100)
        component_scores['neighborhood'] = await self._score_neighborhood(property_data, enrichment_data)
        
        # 5. Owner Match Score (0-100)
        component_scores['owner_match'] = await self._score_owner_match(property_data, enrichment_data)
        
        # 6. Urgency Score (0-100)
        component_scores['urgency'] = await self._score_urgency(property_data, enrichment_data)
        
        # Calculate weighted overall score
        overall_score = sum(
            component_scores[component] * self.weights[component]
            for component in component_scores
        )
        overall_score = max(0, min(100, int(overall_score)))
        
        # Identify buying signals
        buying_signals = await self._identify_buying_signals(property_data, enrichment_data, component_scores)
        
        # Determine pricing tier and price
        pricing_tier = self._determine_pricing_tier(overall_score)
        estimated_price = self._calculate_price(overall_score, buying_signals, property_data)
        
        return {
            'overall_score': overall_score,
            'component_scores': component_scores,
            'buying_signals': buying_signals,
            'pricing_tier': pricing_tier,
            'estimated_price': estimated_price,
            'scored_at': datetime.utcnow().isoformat()
        }
    
    async def _score_roof_age(self, property_data: Dict[str, Any]) -> int:
        """Score based on estimated roof age"""
        try:
            year_built = property_data.get('year_built')
            if not year_built:
                return 50  # Default score if no data
            
            current_year = datetime.now().year
            property_age = current_year - int(year_built)
            
            # Assume roof was replaced/installed when built or 15 years ago (whichever is more recent)
            roof_age = min(property_age, property_age)
            
            # Scoring based on typical roof lifespan
            if roof_age >= 20:  # Needs replacement soon
                return 95
            elif roof_age >= 15:  # Getting old
                return 80
            elif roof_age >= 10:  # Middle age
                return 60
            elif roof_age >= 5:   # Still good
                return 30
            else:  # New roof
                return 10
                
        except (ValueError, TypeError):
            return 50
    
    async def _score_property_value(self, property_data: Dict[str, Any]) -> int:
        """Score based on property value (higher value = better lead)"""
        try:
            property_value = property_data.get('property_value')
            if not property_value:
                return 40
            
            value = float(property_value)
            
            # Score based on property value ranges
            if value >= 500000:     # Premium properties
                return 95
            elif value >= 350000:   # Upper middle class
                return 85
            elif value >= 250000:   # Middle class
                return 75
            elif value >= 150000:   # Lower middle class
                return 60
            elif value >= 100000:   # Budget range
                return 45
            else:                   # Very low value
                return 20
                
        except (ValueError, TypeError):
            return 40
    
    async def _score_storm_activity(self, property_data: Dict[str, Any], enrichment_data: Dict[str, Any]) -> int:
        """Score based on recent storm activity in the area"""
        try:
            # Get property coordinates
            address_data = enrichment_data.get('address', {})
            latitude = address_data.get('latitude')
            longitude = address_data.get('longitude')
            
            if not latitude or not longitude:
                return 30  # Default if no coordinates
            
            # Query recent weather events near this property
            # This would connect to weather database or API
            # For now, using mock scoring
            
            # In real implementation, you'd query:
            # - Hail events within 50 miles in last 2 years
            # - Wind damage events
            # - Insurance claims data if available
            
            # Mock scoring based on general storm activity
            return 40  # Placeholder
            
        except Exception as e:
            logger.error(f"Storm activity scoring failed: {e}")
            return 30
    
    async def _score_neighborhood(self, property_data: Dict[str, Any], enrichment_data: Dict[str, Any]) -> int:
        """Score based on neighborhood characteristics"""
        try:
            neighborhood_data = enrichment_data.get('neighborhood', {})
            
            # Factors that increase lead quality:
            score = 50  # Base score
            
            # Established neighborhoods tend to have older roofs
            if neighborhood_data.get('neighborhood'):
                score += 10
            
            # Suburban areas typically better for roofing leads
            district = neighborhood_data.get('district', '').lower()
            if any(word in district for word in ['suburb', 'residential', 'estate']):
                score += 15
            elif any(word in district for word in ['urban', 'downtown', 'city']):
                score += 5
                
            return min(100, score)
            
        except Exception as e:
            logger.error(f"Neighborhood scoring failed: {e}")
            return 50
    
    async def _score_owner_match(self, property_data: Dict[str, Any], enrichment_data: Dict[str, Any]) -> int:
        """Score based on owner contact information quality"""
        try:
            score = 0
            
            # Owner name available
            if property_data.get('owner_name'):
                score += 30
            
            # Owner address matches property (owner-occupied)
            owner_address = property_data.get('owner_address', '').lower()
            property_address = property_data.get('address', '').lower()
            if owner_address and property_address and owner_address in property_address:
                score += 25  # Owner-occupied is valuable
            
            # Email found
            email_data = enrichment_data.get('email', {})
            if email_data.get('emails'):
                score += 30
                # Bonus for high confidence email
                if email_data.get('confidence', 0) > 0.7:
                    score += 10
            
            # Phone number available (would be from enrichment)
            if enrichment_data.get('phone'):
                score += 15
            
            return min(100, score)
            
        except Exception as e:
            logger.error(f"Owner match scoring failed: {e}")
            return 30
    
    async def _score_urgency(self, property_data: Dict[str, Any], enrichment_data: Dict[str, Any]) -> int:
        """Score based on urgency factors"""
        try:
            score = 20  # Base urgency score
            
            # Recent permit activity in neighborhood (indicates active market)
            # This would query recent permits in same ZIP code
            
            # Seasonal factors
            current_month = datetime.now().month
            if current_month in [3, 4, 5, 9, 10]:  # Spring/Fall roofing seasons
                score += 30
            elif current_month in [6, 7, 8]:  # Summer (peak season)
                score += 20
                
            return min(100, score)
            
        except Exception as e:
            logger.error(f"Urgency scoring failed: {e}")
            return 20
    
    async def _identify_buying_signals(
        self,
        property_data: Dict[str, Any],
        enrichment_data: Dict[str, Any],
        component_scores: Dict[str, int]
    ) -> List[str]:
        """Identify specific buying signals for this lead"""
        signals = []
        
        # High roof age
        if component_scores.get('roof_age', 0) >= 85:
            signals.append('roof_replacement_due')
        
        # High property value
        if component_scores.get('property_value', 0) >= 80:
            signals.append('high_value_property')
        
        # Owner-occupied
        owner_address = property_data.get('owner_address', '').lower()
        property_address = property_data.get('address', '').lower()
        if owner_address and property_address and owner_address in property_address:
            signals.append('owner_occupied')
        
        # Email available
        if enrichment_data.get('email', {}).get('emails'):
            signals.append('email_contact_available')
        
        # Recent storm activity
        if component_scores.get('storm_activity', 0) >= 70:
            signals.append('recent_storm_activity')
        
        # Seasonal urgency
        current_month = datetime.now().month
        if current_month in [3, 4, 5]:
            signals.append('spring_season')
        elif current_month in [9, 10]:
            signals.append('fall_season')
        
        return signals
    
    def _determine_pricing_tier(self, overall_score: int) -> str:
        """Determine pricing tier based on overall score"""
        if overall_score >= self.pricing_tiers['premium']['min_score']:
            return 'premium'
        elif overall_score >= self.pricing_tiers['standard']['min_score']:
            return 'standard'
        elif overall_score >= self.pricing_tiers['budget']['min_score']:
            return 'budget'
        else:
            return 'budget'  # Minimum tier
    
    def _calculate_price(
        self,
        overall_score: int,
        buying_signals: List[str],
        property_data: Dict[str, Any]
    ) -> float:
        """Calculate lead price based on quality factors"""
        pricing_tier = self._determine_pricing_tier(overall_score)
        base_price = self.pricing_tiers[pricing_tier]['base_price']
        
        # Adjust price based on buying signals
        price_multiplier = 1.0
        
        # Premium signals increase price
        premium_signals = ['high_value_property', 'owner_occupied', 'roof_replacement_due']
        premium_count = sum(1 for signal in buying_signals if signal in premium_signals)
        price_multiplier += premium_count * 0.1
        
        # Contact availability increases price
        if 'email_contact_available' in buying_signals:
            price_multiplier += 0.15
        
        # Property value adjustment
        property_value = property_data.get('property_value', 0)
        if property_value:
            if property_value >= 500000:
                price_multiplier += 0.2
            elif property_value >= 350000:
                price_multiplier += 0.1
        
        final_price = base_price * price_multiplier
        return round(final_price, 2)
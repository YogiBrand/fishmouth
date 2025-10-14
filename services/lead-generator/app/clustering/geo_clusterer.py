"""
Geographic clustering of properties for efficient lead delivery
"""
import logging
from typing import Dict, Any, List, Tuple
import asyncio
from sklearn.cluster import DBSCAN
from geopy.distance import geodesic
import numpy as np
import json

logger = logging.getLogger(__name__)

class GeoClusterer:
    """Creates geographic clusters of properties for lead packages"""
    
    def __init__(self):
        pass
    
    async def create_clusters(
        self,
        properties: List[Dict[str, Any]],
        max_radius_miles: float = 2.0,
        min_cluster_size: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Create geographic clusters of properties
        
        Args:
            properties: List of property dictionaries with lat/lon
            max_radius_miles: Maximum radius for clusters
            min_cluster_size: Minimum properties per cluster
            
        Returns:
            List of cluster dictionaries
        """
        try:
            if len(properties) < min_cluster_size:
                return []
            
            # Extract coordinates
            coordinates = []
            valid_properties = []
            
            for prop in properties:
                lat = prop.get('latitude')
                lon = prop.get('longitude')
                
                if lat and lon and lat != 0 and lon != 0:
                    coordinates.append([float(lat), float(lon)])
                    valid_properties.append(prop)
            
            if len(valid_properties) < min_cluster_size:
                logger.warning(f"Not enough properties with valid coordinates: {len(valid_properties)}")
                return []
            
            coordinates = np.array(coordinates)
            
            # Convert max radius to approximate degrees
            # 1 degree lat ≈ 69 miles, 1 degree lon ≈ 54.6 miles (at 45° lat)
            epsilon_lat = max_radius_miles / 69.0
            epsilon_lon = max_radius_miles / 54.6
            
            # Use average epsilon for DBSCAN
            epsilon = (epsilon_lat + epsilon_lon) / 2
            
            # Perform DBSCAN clustering
            clustering = DBSCAN(
                eps=epsilon,
                min_samples=min_cluster_size,
                metric='euclidean'
            ).fit(coordinates)
            
            # Group properties by cluster
            clusters = {}
            noise_points = []
            
            for idx, cluster_id in enumerate(clustering.labels_):
                if cluster_id == -1:  # Noise point
                    noise_points.append(valid_properties[idx])
                else:
                    if cluster_id not in clusters:
                        clusters[cluster_id] = []
                    clusters[cluster_id].append({
                        'property': valid_properties[idx],
                        'coordinates': coordinates[idx]
                    })
            
            # Convert to output format
            cluster_list = []
            for cluster_id, cluster_properties in clusters.items():
                cluster_info = await self._analyze_cluster(cluster_id, cluster_properties)
                cluster_list.append(cluster_info)
            
            # Sort clusters by quality score (descending)
            cluster_list.sort(key=lambda x: x['quality_score'], reverse=True)
            
            logger.info(f"Created {len(cluster_list)} clusters from {len(valid_properties)} properties")
            
            return cluster_list
            
        except Exception as e:
            logger.error(f"Clustering failed: {e}")
            return []
    
    async def _analyze_cluster(
        self,
        cluster_id: int,
        cluster_properties: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze a cluster and calculate metrics
        """
        try:
            properties = [item['property'] for item in cluster_properties]
            coordinates = [item['coordinates'] for item in cluster_properties]
            
            # Calculate cluster center
            center_lat = np.mean([coord[0] for coord in coordinates])
            center_lon = np.mean([coord[1] for coord in coordinates])
            
            # Calculate cluster radius
            center = (center_lat, center_lon)
            max_distance = 0
            
            for coord in coordinates:
                distance = geodesic(center, (coord[0], coord[1])).miles
                max_distance = max(max_distance, distance)
            
            # Calculate quality metrics
            total_score = sum(prop.get('overall_score', 0) for prop in properties)
            avg_score = total_score / len(properties)
            
            # Calculate property value statistics
            property_values = [prop.get('property_value', 0) for prop in properties if prop.get('property_value')]
            avg_property_value = np.mean(property_values) if property_values else 0
            
            # Calculate cluster quality score
            quality_score = await self._calculate_cluster_quality(properties, coordinates, avg_score)
            
            # Identify cluster characteristics
            characteristics = await self._identify_cluster_characteristics(properties)
            
            return {
                'cluster_id': f"cluster_{cluster_id}_{len(properties)}props",
                'property_count': len(properties),
                'center_coordinates': {
                    'latitude': center_lat,
                    'longitude': center_lon
                },
                'radius_miles': round(max_distance, 2),
                'avg_lead_score': round(avg_score, 1),
                'avg_property_value': round(avg_property_value, 0),
                'quality_score': round(quality_score, 1),
                'characteristics': characteristics,
                'properties': properties,
                'estimated_revenue': len(properties) * 150,  # Estimate $150 per lead
                'recommended_contractor_count': min(3, max(1, len(properties) // 5))
            }
            
        except Exception as e:
            logger.error(f"Cluster analysis failed: {e}")
            return {
                'cluster_id': f"cluster_{cluster_id}_error",
                'property_count': len(cluster_properties),
                'quality_score': 0,
                'properties': []
            }
    
    async def _calculate_cluster_quality(
        self,
        properties: List[Dict[str, Any]],
        coordinates: List[List[float]],
        avg_score: float
    ) -> float:
        """
        Calculate overall cluster quality score
        """
        try:
            quality_factors = []
            
            # Factor 1: Average lead score (0-100)
            quality_factors.append(avg_score)
            
            # Factor 2: Cluster density (higher is better)
            if len(coordinates) >= 2:
                # Calculate average distance between properties
                total_distance = 0
                pair_count = 0
                
                for i in range(len(coordinates)):
                    for j in range(i + 1, len(coordinates)):
                        distance = geodesic(
                            (coordinates[i][0], coordinates[i][1]),
                            (coordinates[j][0], coordinates[j][1])
                        ).miles
                        total_distance += distance
                        pair_count += 1
                
                avg_distance = total_distance / pair_count if pair_count > 0 else 5
                
                # Convert to density score (closer properties = higher score)
                density_score = max(0, 100 - (avg_distance * 20))  # 5 miles = 0 points
                quality_factors.append(density_score)
            
            # Factor 3: Property count bonus
            count_bonus = min(50, len(properties) * 5)  # Up to 50 points for 10+ properties
            quality_factors.append(count_bonus)
            
            # Factor 4: Property value consistency
            property_values = [p.get('property_value', 0) for p in properties if p.get('property_value')]
            if len(property_values) >= 2:
                value_std = np.std(property_values)
                avg_value = np.mean(property_values)
                if avg_value > 0:
                    consistency_score = max(0, 100 - (value_std / avg_value * 100))
                    quality_factors.append(consistency_score)
            
            # Calculate weighted average
            weights = [0.4, 0.3, 0.2, 0.1]  # Lead score is most important
            weighted_score = sum(
                factor * weight
                for factor, weight in zip(quality_factors[:len(weights)], weights[:len(quality_factors)])
            )
            
            return min(100, max(0, weighted_score))
            
        except Exception as e:
            logger.error(f"Quality calculation failed: {e}")
            return avg_score  # Fallback to average lead score
    
    async def _identify_cluster_characteristics(
        self,
        properties: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Identify characteristics of the cluster
        """
        characteristics = []
        
        try:
            # High-value cluster
            property_values = [p.get('property_value', 0) for p in properties if p.get('property_value')]
            if property_values:
                avg_value = np.mean(property_values)
                if avg_value >= 400000:
                    characteristics.append('high_value_neighborhood')
                elif avg_value >= 200000:
                    characteristics.append('middle_class_neighborhood')
                else:
                    characteristics.append('affordable_neighborhood')
            
            # Age-based characteristics
            year_built_values = [p.get('year_built', 0) for p in properties if p.get('year_built')]
            if year_built_values:
                avg_year = np.mean(year_built_values)
                current_year = 2024
                if avg_year <= 1980:
                    characteristics.append('mature_neighborhood')
                elif avg_year <= 2000:
                    characteristics.append('established_neighborhood')
                else:
                    characteristics.append('newer_development')
            
            # Owner occupancy
            owner_occupied_count = 0
            for prop in properties:
                owner_address = prop.get('owner_address', '').lower()
                property_address = prop.get('address', '').lower()
                if owner_address and property_address and owner_address in property_address:
                    owner_occupied_count += 1
            
            owner_occupied_pct = owner_occupied_count / len(properties)
            if owner_occupied_pct >= 0.7:
                characteristics.append('owner_occupied_majority')
            elif owner_occupied_pct >= 0.4:
                characteristics.append('mixed_occupancy')
            else:
                characteristics.append('rental_heavy')
            
            # Lead quality
            high_score_count = sum(1 for p in properties if p.get('overall_score', 0) >= 80)
            high_score_pct = high_score_count / len(properties)
            
            if high_score_pct >= 0.6:
                characteristics.append('premium_leads')
            elif high_score_pct >= 0.3:
                characteristics.append('quality_leads')
            else:
                characteristics.append('standard_leads')
            
            # Cluster size
            if len(properties) >= 10:
                characteristics.append('large_cluster')
            elif len(properties) >= 5:
                characteristics.append('medium_cluster')
            else:
                characteristics.append('small_cluster')
            
        except Exception as e:
            logger.error(f"Characteristic identification failed: {e}")
        
        return characteristics
    
    async def optimize_cluster_territories(
        self,
        clusters: List[Dict[str, Any]],
        contractor_capacity: Dict[str, int]
    ) -> Dict[str, Any]:
        """
        Optimize cluster assignments to contractors based on capacity and territory
        """
        try:
            assignments = {}
            
            # Sort clusters by quality score (assign best clusters first)
            sorted_clusters = sorted(clusters, key=lambda x: x['quality_score'], reverse=True)
            
            for cluster in sorted_clusters:
                best_contractor = None
                best_score = -1
                
                # Find best contractor for this cluster
                for contractor_id, capacity in contractor_capacity.items():
                    if capacity <= 0:  # No capacity remaining
                        continue
                    
                    # Calculate assignment score
                    # (In real implementation, would consider contractor location, specialties, etc.)
                    assignment_score = cluster['quality_score']
                    
                    if assignment_score > best_score:
                        best_score = assignment_score
                        best_contractor = contractor_id
                
                if best_contractor:
                    assignments[cluster['cluster_id']] = {
                        'contractor_id': best_contractor,
                        'cluster': cluster,
                        'assignment_score': best_score
                    }
                    
                    # Reduce contractor capacity
                    contractor_capacity[best_contractor] -= cluster['property_count']
            
            return {
                'assignments': assignments,
                'unassigned_clusters': [c for c in clusters if c['cluster_id'] not in assignments],
                'total_assigned': len(assignments)
            }
            
        except Exception as e:
            logger.error(f"Territory optimization failed: {e}")
            return {'assignments': {}, 'unassigned_clusters': clusters, 'total_assigned': 0}
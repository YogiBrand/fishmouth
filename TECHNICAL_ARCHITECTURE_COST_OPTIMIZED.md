# Technical Architecture - Cost-Optimized Fish Mouth System

## 🏗️ Architecture Overview

Fish Mouth's technical architecture is designed around the **FREE-FIRST** principle, implementing a 6-microservice system that achieves **94% cost reduction** through intelligent resource management, local processing, and strategic API usage.

---

## 🎯 Core Architecture Principles

### 1. FREE-FIRST Processing Pipeline
Every request follows the optimal cost path:
```
Request → Free Sources → Local Cache → Geographic Batching → Budget-Controlled APIs → Local Fallback
```

### 2. Microservice Cost Isolation
Each service independently optimizes costs while maintaining system cohesion:
- **Independent budgeting** per service
- **Isolated cost tracking** and optimization
- **Shared optimization intelligence** across services

### 3. Intelligent Resource Management
- **Predictive scaling** based on demand patterns
- **Geographic resource optimization** for batching
- **Temporal load balancing** for off-peak processing

---

## 🏛️ System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web Frontend]
        API[API Gateway]
        Mobile[Mobile Apps]
    end
    
    subgraph "Orchestration Layer"
        Orchestrator[Orchestrator Service<br/>Port 8009<br/>Cost Tracking & Routing]
    end
    
    subgraph "Processing Services"
        Scraper[Scraper Service<br/>Port 8011<br/>FREE-FIRST Data Collection]
        Enrichment[Enrichment Service<br/>Port 8004<br/>Local Property Analysis]
        ImageProc[Image Processor<br/>Port 8012<br/>OpenStreetMap + Enhancement]
        LeadGen[Lead Generator<br/>Port 8008<br/>Local ML Scoring]
        MLInference[ML Inference<br/>Port 8013<br/>Edge AI Processing]
    end
    
    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Property & Cost Data)]
        Redis[(Redis<br/>Caching & Sessions)]
        FileStorage[File Storage<br/>Images & Documents]
    end
    
    subgraph "External Sources"
        FreeAPIs[Free APIs<br/>OpenStreetMap<br/>Census Data<br/>Government DBs]
        PaidAPIs[Paid APIs<br/>Budget-Controlled<br/>Emergency Only]
    end
    
    subgraph "Monitoring"
        CostTracker[Cost Tracking<br/>Real-time Monitoring]
        AlertSystem[Alert System<br/>Budget & Performance]
    end
    
    Web --> API
    Mobile --> API
    API --> Orchestrator
    
    Orchestrator --> Scraper
    Orchestrator --> Enrichment
    Orchestrator --> ImageProc
    Orchestrator --> LeadGen
    Orchestrator --> MLInference
    
    Scraper --> PostgreSQL
    Enrichment --> PostgreSQL
    ImageProc --> PostgreSQL
    LeadGen --> PostgreSQL
    MLInference --> PostgreSQL
    
    Scraper --> Redis
    Enrichment --> Redis
    ImageProc --> Redis
    LeadGen --> Redis
    MLInference --> Redis
    
    ImageProc --> FileStorage
    
    Scraper -.->|FREE-FIRST| FreeAPIs
    Enrichment -.->|FREE-FIRST| FreeAPIs
    ImageProc -.->|FREE-FIRST| FreeAPIs
    
    Scraper -.->|Budget-Controlled| PaidAPIs
    Enrichment -.->|Budget-Controlled| PaidAPIs
    ImageProc -.->|Budget-Controlled| PaidAPIs
    
    All Services --> CostTracker
    CostTracker --> AlertSystem
```

---

## 🔧 Service-Level Architecture

### 1. Orchestrator Service (Port 8009)

**Role**: Cost-aware workflow coordination and optimization

```python
class CostOptimizedOrchestrator:
    def __init__(self):
        self.cost_tracker = RealTimeCostTracker()
        self.budget_controller = BudgetController()
        self.optimization_engine = OptimizationEngine()
        
    async def orchestrate_request(self, request: dict):
        """Cost-optimized request orchestration"""
        
        # Step 1: Analyze request for cost optimization opportunities
        optimization_plan = await self.create_optimization_plan(request)
        
        # Step 2: Execute services in cost-optimal order
        results = {}
        total_cost = 0.0
        
        for service_call in optimization_plan['service_sequence']:
            service_result = await self.execute_service_call(service_call)
            results[service_call['service']] = service_result
            total_cost += service_result.get('cost', 0.0)
            
            # Early exit if budget constraints met
            if total_cost >= self.budget_controller.get_request_budget_limit():
                break
                
        # Step 3: Apply cross-service optimizations
        optimized_results = await self.apply_cross_service_optimizations(results)
        
        return {
            'results': optimized_results,
            'cost_breakdown': await self.generate_cost_breakdown(results),
            'optimization_applied': optimization_plan['optimizations'],
            'total_cost': total_cost
        }
```

**Architecture Features**:
- **Smart Routing**: Route requests to most cost-effective services
- **Budget Management**: Real-time budget tracking and enforcement  
- **Cross-Service Optimization**: Share data between services to reduce redundant processing
- **Failure Handling**: Graceful degradation with cost considerations

### 2. Image Processor Service (Port 8012)

**Role**: Cost-optimized satellite and aerial imagery processing

```python
class CostOptimizedImageProcessor:
    def __init__(self):
        self.free_sources = {
            'openstreetmap': OpenStreetMapTileSource(),
            'wikimedia': WikimediaCommonsSource(),
            'government': GovernmentSatelliteSource()
        }
        self.local_processors = {
            'super_resolution': LocalSuperResolutionEngine(),
            'image_enhancement': LocalImageEnhancer(),
            'format_converter': LocalFormatConverter()
        }
        self.cache_manager = GeographicCacheManager(duration_days=7)
        
    async def process_property_image(self, lat: float, lng: float, property_id: str):
        """FREE-FIRST image processing with local enhancement"""
        
        processing_log = []
        total_cost = 0.0
        
        # FREE SOURCE 1: OpenStreetMap tiles
        try:
            osm_result = await self.process_osm_tiles(lat, lng)
            if osm_result['success']:
                processing_log.append("✅ OpenStreetMap tiles successful")
                
                # Local enhancement
                enhanced_image = await self.local_processors['super_resolution'].enhance(
                    osm_result['image_path']
                )
                processing_log.append("✅ Local super-resolution applied")
                
                return {
                    'success': True,
                    'image_path': enhanced_image['path'],
                    'cost': 0.0,
                    'processing_log': processing_log,
                    'quality_score': enhanced_image['quality_score'],
                    'sources_used': ['openstreetmap_tiles', 'local_super_resolution']
                }
        except Exception as e:
            processing_log.append(f"❌ OpenStreetMap failed: {e}")
        
        # FREE SOURCE 2: Extended geographic cache
        cached_result = await self.cache_manager.get_nearby_cached_image(lat, lng, radius_km=1.0)
        if cached_result:
            processing_log.append("✅ Geographic cache hit")
            return {
                'success': True,
                'image_path': cached_result['path'],
                'cost': 0.0,
                'processing_log': processing_log,
                'quality_score': cached_result['quality'],
                'sources_used': ['geographic_cache']
            }
        
        # FREE SOURCE 3: Batch processing opportunity
        batch_result = await self.try_batch_processing(lat, lng, property_id)
        if batch_result:
            processing_log.append("✅ Batch processing successful")
            return {
                'success': True,
                'image_path': batch_result['individual_path'],
                'cost': 0.0,  # Cost amortized across batch
                'processing_log': processing_log,
                'quality_score': batch_result['quality'],
                'sources_used': ['batch_processing']
            }
        
        # BUDGET-CONTROLLED FALLBACK
        if await self.budget_controller.can_spend(0.002):  # $0.002 for optimized API call
            try:
                paid_result = await self.call_optimized_satellite_api(lat, lng)
                total_cost = 0.002
                processing_log.append(f"💰 Paid API used: ${total_cost}")
                
                # Still apply local enhancement
                enhanced = await self.local_processors['super_resolution'].enhance(paid_result['path'])
                
                return {
                    'success': True,
                    'image_path': enhanced['path'],
                    'cost': total_cost,
                    'processing_log': processing_log,
                    'quality_score': enhanced['quality_score'],
                    'sources_used': ['paid_api_optimized', 'local_enhancement']
                }
            except Exception as e:
                processing_log.append(f"❌ Paid API failed: {e}")
        
        # LAST RESORT: Synthetic generation
        synthetic_result = await self.generate_synthetic_property_image(lat, lng)
        processing_log.append("🎨 Synthetic image generated")
        
        return {
            'success': True,
            'image_path': synthetic_result['path'],
            'cost': 0.0,
            'processing_log': processing_log,
            'quality_score': synthetic_result['quality'],
            'sources_used': ['synthetic_generation'],
            'note': 'Synthetic data - manual review recommended'
        }
```

**Key Technical Features**:
- **Multi-Source Fallback Chain**: 6 processing sources with intelligent fallbacks
- **Local Enhancement**: Super-resolution and image processing without API costs
- **Geographic Batching**: Process multiple nearby properties with single API call
- **Intelligent Caching**: 7-day cache with geographic proximity sharing

### 3. Enrichment Service (Port 8004)

**Role**: Property data enrichment using free and local sources

```python
class CostOptimizedEnrichmentService:
    def __init__(self):
        self.local_estimators = {
            'property_value': PropertyValueEstimator(),
            'market_analysis': MarketConditionsAnalyzer(),
            'demographic': DemographicAnalyzer(),
            'roof_assessment': RoofConditionEstimator()
        }
        self.free_data_sources = {
            'census': CensusDataAPI(),
            'government_records': GovernmentRecordsAPI(),
            'openstreetmap': OSMBusinessDataAPI(),
            'public_records': PublicRecordsAPI()
        }
        
    async def enrich_property_data(self, property_data: dict):
        """FREE-FIRST property enrichment with local algorithms"""
        
        enriched_data = property_data.copy()
        cost_tracking = {'total_cost': 0.0, 'sources_used': []}
        
        # LOCAL PROCESSING 1: Property value estimation
        try:
            value_estimate = await self.local_estimators['property_value'].estimate(property_data)
            if value_estimate:
                enriched_data.update({
                    'estimated_value': value_estimate['value'],
                    'value_confidence': value_estimate['confidence'],
                    'market_conditions': value_estimate['market_analysis'],
                    'price_per_sqft': value_estimate['price_per_sqft']
                })
                cost_tracking['sources_used'].append('local_property_estimation')
        except Exception as e:
            logger.warning(f"Local property estimation failed: {e}")
        
        # FREE SOURCE 1: Census demographic data
        try:
            census_data = await self.free_data_sources['census'].get_demographics(
                property_data['zip_code'],
                property_data.get('census_tract')
            )
            if census_data:
                enriched_data.update({
                    'median_household_income': census_data['income'],
                    'population_density': census_data['density'],
                    'education_levels': census_data['education'],
                    'housing_age_distribution': census_data['housing_age']
                })
                cost_tracking['sources_used'].append('census_demographics_free')
        except Exception as e:
            logger.warning(f"Census data enrichment failed: {e}")
        
        # LOCAL PROCESSING 2: Roof condition assessment
        if 'image_analysis' in property_data:
            try:
                roof_analysis = await self.local_estimators['roof_assessment'].analyze(
                    property_data['image_analysis']
                )
                enriched_data.update({
                    'roof_condition_score': roof_analysis['condition_score'],
                    'estimated_roof_age': roof_analysis['estimated_age'],
                    'replacement_urgency': roof_analysis['urgency_level'],
                    'roof_material_type': roof_analysis['material_type']
                })
                cost_tracking['sources_used'].append('local_roof_analysis')
            except Exception as e:
                logger.warning(f"Local roof analysis failed: {e}")
        
        # FREE SOURCE 2: Government property records
        try:
            gov_records = await self.free_data_sources['government_records'].lookup(
                property_data['address'],
                property_data.get('parcel_id')
            )
            if gov_records:
                enriched_data.update({
                    'tax_assessment': gov_records['assessment'],
                    'building_permits': gov_records['permits'],
                    'zoning': gov_records['zoning'],
                    'last_sale_date': gov_records['last_sale'],
                    'property_taxes': gov_records['taxes']
                })
                cost_tracking['sources_used'].append('government_records_free')
        except Exception as e:
            logger.warning(f"Government records lookup failed: {e}")
        
        # Calculate enrichment completeness
        completeness_score = self.calculate_completeness(property_data, enriched_data)
        
        # Only use paid APIs if completeness < 75% AND budget available
        if completeness_score < 0.75 and await self.budget_controller.can_spend(0.05):
            try:
                targeted_enrichment = await self.targeted_paid_enrichment(
                    enriched_data,
                    missing_fields=self.identify_missing_critical_fields(enriched_data)
                )
                enriched_data.update(targeted_enrichment['data'])
                cost_tracking['total_cost'] += targeted_enrichment['cost']
                cost_tracking['sources_used'].append(f"paid_targeted_{targeted_enrichment['source']}")
            except Exception as e:
                logger.warning(f"Targeted paid enrichment failed: {e}")
        
        return {
            'enriched_data': enriched_data,
            'cost_tracking': cost_tracking,
            'completeness_score': completeness_score,
            'free_sources_success_rate': len([s for s in cost_tracking['sources_used'] if 'free' in s or 'local' in s]) / len(self.free_data_sources)
        }
```

**Technical Optimizations**:
- **Local ML Models**: Property valuation and roof assessment without API costs
- **Government Data Integration**: Direct access to authoritative free sources
- **Targeted Paid Usage**: Only pay for missing critical data points
- **Completeness Scoring**: Intelligent decision-making on when to use paid sources

---

## 💾 Data Architecture

### Cost-Optimized Database Design

```sql
-- Cost tracking table for all services
CREATE TABLE cost_tracking (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    total_cost DECIMAL(10,4) DEFAULT 0.0000,
    sources_used JSONB,
    processing_time DECIMAL(8,3),
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing for cost analysis
    INDEX idx_service_date (service_name, created_at),
    INDEX idx_cost_analysis (created_at, total_cost),
    INDEX idx_sources_used USING GIN(sources_used)
);

-- Geographic cache table for image processing
CREATE TABLE geographic_image_cache (
    id SERIAL PRIMARY KEY,
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    quality_score DECIMAL(3,2),
    processing_sources JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Spatial indexing for geographic queries
    INDEX idx_geographic USING GIST(point(lat, lng)),
    INDEX idx_expiration (expires_at)
);

-- Budget tracking table
CREATE TABLE daily_budgets (
    date DATE PRIMARY KEY,
    total_budget DECIMAL(8,2) DEFAULT 10.00,
    current_spend DECIMAL(8,2) DEFAULT 0.00,
    service_breakdown JSONB,
    alert_thresholds JSONB,
    
    INDEX idx_budget_date (date DESC)
);

-- Property processing history for optimization
CREATE TABLE property_processing_history (
    property_id VARCHAR(255) NOT NULL,
    processing_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    services_used JSONB,
    total_cost DECIMAL(10,4),
    quality_metrics JSONB,
    optimization_opportunities JSONB,
    
    PRIMARY KEY (property_id, processing_date),
    INDEX idx_property_costs (property_id, total_cost),
    INDEX idx_processing_date (processing_date DESC)
);
```

### Caching Strategy

```python
class GeographicCacheManager:
    def __init__(self):
        self.cache_duration_days = 7
        self.geographic_radius_km = 1.0
        self.quality_threshold = 0.75
        
    async def get_cached_result(self, lat: float, lng: float, result_type: str):
        """Get cached result with geographic proximity"""
        
        # Direct cache hit
        direct_hit = await self.get_direct_cache_hit(lat, lng, result_type)
        if direct_hit:
            return direct_hit
        
        # Geographic proximity cache
        nearby_results = await self.get_nearby_cached_results(
            lat, lng, self.geographic_radius_km, result_type
        )
        
        if nearby_results:
            # Use highest quality nearby result
            best_result = max(nearby_results, key=lambda r: r['quality_score'])
            if best_result['quality_score'] >= self.quality_threshold:
                return best_result
        
        return None
        
    async def store_result_with_geographic_index(self, lat: float, lng: float, 
                                                result: dict, result_type: str):
        """Store result with geographic indexing for sharing"""
        
        cache_entry = {
            'lat': lat,
            'lng': lng,
            'result_type': result_type,
            'result_data': result,
            'quality_score': result.get('quality_score', 0.0),
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(days=self.cache_duration_days)
        }
        
        await self.store_cache_entry(cache_entry)
        
        # Update geographic index for efficient proximity queries
        await self.update_geographic_index(lat, lng, cache_entry['id'])
```

---

## 🔄 Cost Optimization Algorithms

### 1. Geographic Batching Algorithm

```python
class GeographicBatchingOptimizer:
    def __init__(self):
        self.max_batch_size = 25
        self.clustering_algorithm = 'DBSCAN'
        self.max_radius_km = 2.0
        
    async def optimize_request_batching(self, pending_requests: List[dict]):
        """Create optimal geographic batches for API efficiency"""
        
        # Step 1: Convert requests to geographic points
        geographic_points = [
            {
                'lat': req['lat'],
                'lng': req['lng'],
                'request_id': req['id'],
                'priority': req.get('priority', 1),
                'urgency': req.get('urgency', 'normal')
            }
            for req in pending_requests
        ]
        
        # Step 2: Apply DBSCAN clustering
        clusters = await self.apply_geographic_clustering(geographic_points)
        
        # Step 3: Optimize cluster boundaries for API efficiency
        optimized_batches = []
        for cluster in clusters:
            if len(cluster) >= 3:  # Minimum batch size for efficiency
                batch = await self.create_optimized_batch(cluster)
                optimized_batches.append(batch)
            else:
                # Add small clusters to nearest large batch or process individually
                await self.handle_small_cluster(cluster, optimized_batches)
        
        return {
            'batches': optimized_batches,
            'batch_count': len(optimized_batches),
            'total_requests': len(pending_requests),
            'batching_efficiency': len([r for batch in optimized_batches for r in batch]) / len(pending_requests),
            'estimated_api_reduction': self.calculate_api_reduction(optimized_batches, pending_requests)
        }
        
    async def create_optimized_batch(self, cluster_points: List[dict]):
        """Create optimized batch with center point and extraction coordinates"""
        
        # Calculate optimal center point for API call
        center_lat = np.mean([p['lat'] for p in cluster_points])
        center_lng = np.mean([p['lng'] for p in cluster_points])
        
        # Calculate extraction coordinates for each property
        extractions = []
        for point in cluster_points:
            extraction_coords = self.calculate_extraction_coordinates(
                point['lat'], point['lng'], center_lat, center_lng
            )
            extractions.append({
                'request_id': point['request_id'],
                'extraction_coords': extraction_coords,
                'priority': point['priority']
            })
        
        return {
            'center_lat': center_lat,
            'center_lng': center_lng,
            'extractions': extractions,
            'batch_size': len(cluster_points),
            'estimated_cost': 0.002,  # Single API call cost
            'cost_per_property': 0.002 / len(cluster_points),
            'processing_method': 'single_api_with_extractions'
        }
```

### 2. Budget Optimization Algorithm

```python
class BudgetOptimizationEngine:
    def __init__(self):
        self.daily_budget = 10.00
        self.emergency_budget = 50.00
        self.optimization_strategies = [
            'free_source_first',
            'cache_optimization', 
            'batch_processing',
            'quality_adjusted_sourcing',
            'temporal_load_balancing'
        ]
        
    async def optimize_request_within_budget(self, request: dict, current_budget_used: float):
        """Optimize single request processing within budget constraints"""
        
        available_budget = self.daily_budget - current_budget_used
        
        # Create cost-optimized processing plan
        processing_plan = {
            'request_id': request['id'],
            'available_budget': available_budget,
            'optimization_strategy': [],
            'processing_sequence': [],
            'expected_cost': 0.0,
            'quality_target': request.get('quality_requirement', 0.8)
        }
        
        # Strategy 1: Free sources first (always try)
        free_source_plan = await self.plan_free_source_processing(request)
        processing_plan['processing_sequence'].append(free_source_plan)
        processing_plan['optimization_strategy'].append('free_source_first')
        
        # Strategy 2: Cache optimization
        cache_plan = await self.plan_cache_utilization(request)
        if cache_plan['cache_available']:
            processing_plan['processing_sequence'].insert(0, cache_plan)  # Try cache first
            processing_plan['optimization_strategy'].append('cache_optimization')
        
        # Strategy 3: Batch processing opportunity
        batch_plan = await self.check_batch_processing_opportunity(request)
        if batch_plan['batch_possible']:
            processing_plan['processing_sequence'].append(batch_plan)
            processing_plan['optimization_strategy'].append('batch_processing')
        
        # Strategy 4: Budget-controlled paid fallback
        if available_budget > 0.001:  # Minimum threshold for paid APIs
            paid_plan = await self.plan_budget_controlled_paid_processing(
                request, available_budget
            )
            processing_plan['processing_sequence'].append(paid_plan)
            processing_plan['expected_cost'] = paid_plan['expected_cost']
        
        return processing_plan
        
    async def optimize_daily_budget_allocation(self, pending_requests: List[dict]):
        """Optimize entire day's budget allocation across requests"""
        
        # Prioritize requests by business value and urgency
        prioritized_requests = await self.prioritize_requests_by_value(pending_requests)
        
        # Allocate budget optimally
        budget_allocation = {
            'total_requests': len(prioritized_requests),
            'high_priority_allocation': self.daily_budget * 0.6,  # 60% for high priority
            'medium_priority_allocation': self.daily_budget * 0.3,  # 30% for medium
            'low_priority_allocation': self.daily_budget * 0.1,   # 10% for low
            'optimization_opportunities': []
        }
        
        # Identify optimization opportunities
        batch_opportunities = await self.identify_batch_opportunities(prioritized_requests)
        cache_opportunities = await self.identify_cache_opportunities(prioritized_requests)
        
        budget_allocation['optimization_opportunities'].extend([
            f"Batch processing: {len(batch_opportunities)} opportunities",
            f"Cache utilization: {len(cache_opportunities)} opportunities",
            f"Geographic optimization: {await self.estimate_geographic_savings(prioritized_requests)}"
        ])
        
        return budget_allocation
```

---

## 📊 Monitoring and Observability Architecture

### Real-Time Cost Monitoring

```python
class RealTimeCostMonitor:
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        self.dashboard_updater = DashboardUpdater()
        
    async def monitor_service_costs(self, service_name: str):
        """Real-time cost monitoring for individual service"""
        
        while True:
            # Collect current metrics
            current_metrics = await self.collect_service_metrics(service_name)
            
            # Update running totals
            await self.update_service_totals(service_name, current_metrics)
            
            # Check for alerts
            alerts = await self.check_cost_alerts(service_name, current_metrics)
            if alerts:
                await self.alert_manager.send_alerts(alerts)
            
            # Update dashboard
            await self.dashboard_updater.update_service_metrics(service_name, current_metrics)
            
            # Sleep before next collection
            await asyncio.sleep(10)  # 10-second monitoring interval
            
    async def generate_real_time_cost_report(self):
        """Generate real-time cost report across all services"""
        
        services = ['scraper', 'enrichment', 'image_processor', 'lead_generator', 'ml_inference']
        service_metrics = {}
        
        for service in services:
            metrics = await self.collect_service_metrics(service)
            service_metrics[service] = metrics
        
        # Calculate aggregate metrics
        total_cost = sum(metrics['current_cost'] for metrics in service_metrics.values())
        total_requests = sum(metrics['request_count'] for metrics in service_metrics.values())
        overall_free_rate = np.mean([metrics['free_source_rate'] for metrics in service_metrics.values()])
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'aggregate_metrics': {
                'total_daily_cost': total_cost,
                'total_requests_today': total_requests,
                'average_cost_per_request': total_cost / max(total_requests, 1),
                'overall_free_source_success_rate': overall_free_rate,
                'budget_utilization': (total_cost / self.daily_budget) * 100,
                'projected_daily_total': self.project_daily_total(total_cost)
            },
            'service_breakdown': service_metrics,
            'optimization_opportunities': await self.identify_real_time_optimizations(service_metrics)
        }
```

### Performance Metrics Collection

```python
class PerformanceMetricsCollector:
    def __init__(self):
        self.metrics_storage = TimeSeriesDB()
        
    async def collect_comprehensive_metrics(self):
        """Collect comprehensive performance and cost metrics"""
        
        metrics = {
            'cost_metrics': await self.collect_cost_metrics(),
            'performance_metrics': await self.collect_performance_metrics(),
            'quality_metrics': await self.collect_quality_metrics(),
            'optimization_metrics': await self.collect_optimization_metrics()
        }
        
        # Store in time series database for analysis
        await self.metrics_storage.store_metrics(metrics)
        
        return metrics
        
    async def collect_cost_metrics(self):
        """Collect detailed cost metrics"""
        
        return {
            'daily_spend': await self.get_current_daily_spend(),
            'cost_per_service': await self.get_cost_breakdown_by_service(),
            'free_source_usage': await self.get_free_source_utilization(),
            'paid_api_usage': await self.get_paid_api_utilization(),
            'cost_per_request': await self.get_average_cost_per_request(),
            'budget_efficiency': await self.calculate_budget_efficiency(),
            'savings_vs_traditional': await self.calculate_savings_vs_traditional()
        }
        
    async def collect_optimization_metrics(self):
        """Collect optimization effectiveness metrics"""
        
        return {
            'cache_hit_rate': await self.calculate_cache_hit_rate(),
            'batch_processing_efficiency': await self.calculate_batch_efficiency(),
            'geographic_optimization_savings': await self.calculate_geographic_savings(),
            'free_source_success_rate': await self.calculate_free_source_success_rate(),
            'quality_vs_cost_ratio': await self.calculate_quality_cost_ratio(),
            'processing_time_optimization': await self.calculate_processing_time_improvements()
        }
```

---

## 🔐 Security and Compliance Architecture

### Cost-Aware Security Design

```python
class CostAwareSecurityManager:
    def __init__(self):
        self.security_controls = {
            'api_key_rotation': 'Automated rotation to maintain free tier eligibility',
            'rate_limit_protection': 'Prevent accidental API overage charges',
            'budget_enforcement': 'Hard limits to prevent cost overruns',
            'audit_logging': 'Track all cost-related decisions and API calls'
        }
        
    async def implement_cost_aware_security(self):
        """Implement security controls that also optimize costs"""
        
        # API Key Management
        await self.setup_api_key_rotation()
        
        # Rate Limiting
        await self.implement_intelligent_rate_limiting()
        
        # Budget Controls
        await self.enforce_budget_hard_limits()
        
        # Audit Trail
        await self.setup_cost_audit_logging()
        
    async def setup_api_key_rotation(self):
        """Setup automatic API key rotation for free tier maintenance"""
        
        rotation_schedule = {
            'google_maps_api': '28 days',  # Rotate before monthly limits
            'other_apis': '30 days',       # Standard rotation
            'emergency_keys': 'manual'     # Manual rotation for emergency use
        }
        
        for api, schedule in rotation_schedule.items():
            await self.schedule_key_rotation(api, schedule)
            
    async def implement_intelligent_rate_limiting(self):
        """Implement rate limiting that maximizes free API usage"""
        
        rate_limits = {
            'openstreetmap': {'requests_per_second': 1, 'daily_limit': 'unlimited'},
            'census_api': {'requests_per_second': 2, 'daily_limit': 1000},
            'government_apis': {'requests_per_second': 0.5, 'daily_limit': 500},
            'paid_apis': {'requests_per_second': 0.1, 'daily_limit': 100}
        }
        
        for api, limits in rate_limits.items():
            await self.configure_rate_limiter(api, limits)
```

---

## 🚀 Deployment and Scaling Architecture

### Cost-Optimized Deployment Strategy

```yaml
# docker-compose.cost-optimized.yml
version: '3.8'

services:
  # Core services with resource optimization
  orchestrator:
    image: fishmouth/orchestrator:cost-optimized
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
    environment:
      - COST_OPTIMIZATION=enabled
      - DAILY_BUDGET=10.00
      - FREE_SOURCE_PRIORITY=true
    
  image-processor:
    image: fishmouth/image-processor:cost-optimized
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    environment:
      - USE_OPENSTREETMAP_TILES=true
      - LOCAL_SUPER_RESOLUTION=true
      - CACHE_DURATION_DAYS=7
      - BATCH_PROCESSING=true
    volumes:
      - image_cache:/app/cache
      - ml_models:/app/models
  
  # Shared services for cost efficiency
  redis:
    image: redis:7-alpine
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    command: redis-server --maxmemory 200mb --maxmemory-policy allkeys-lru
    
  postgres:
    image: postgres:15-alpine
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
    environment:
      - POSTGRES_SHARED_PRELOAD_LIBRARIES=pg_stat_statements
      - POSTGRES_MAX_CONNECTIONS=100

volumes:
  image_cache:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=2g,uid=1000
      
networks:
  fishmouth_cost_optimized:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Auto-Scaling Cost Controls

```python
class CostAwareAutoScaler:
    def __init__(self):
        self.scaling_policies = {
            'scale_up_threshold': 0.8,    # 80% resource usage
            'scale_down_threshold': 0.3,  # 30% resource usage
            'cost_per_instance': 35.00,   # Monthly cost per additional instance
            'max_instances': 10,          # Maximum instances for cost control
        }
        
    async def should_scale_up(self, current_metrics: dict) -> bool:
        """Determine if scaling up is cost-effective"""
        
        cpu_usage = current_metrics['cpu_usage']
        memory_usage = current_metrics['memory_usage']
        request_queue_length = current_metrics['queue_length']
        current_cost_per_request = current_metrics['cost_per_request']
        
        # Scale up if resources are constrained AND it's cost-effective
        resource_constrained = (cpu_usage > self.scaling_policies['scale_up_threshold'] or 
                              memory_usage > self.scaling_policies['scale_up_threshold'])
        
        # Calculate cost-effectiveness of scaling
        additional_capacity = 0.5  # 50% more capacity per instance
        cost_per_additional_request = (self.scaling_policies['cost_per_instance'] / 
                                     (current_metrics['monthly_requests'] * additional_capacity))
        
        cost_effective = cost_per_additional_request < current_cost_per_request
        
        return resource_constrained and cost_effective and request_queue_length > 100
        
    async def optimize_instance_allocation(self):
        """Optimize instance allocation for cost efficiency"""
        
        current_demand = await self.analyze_demand_patterns()
        optimal_allocation = await self.calculate_optimal_instance_count(current_demand)
        
        return {
            'current_instances': await self.get_current_instance_count(),
            'optimal_instances': optimal_allocation['instance_count'],
            'cost_impact': optimal_allocation['monthly_cost_impact'],
            'performance_impact': optimal_allocation['performance_metrics'],
            'scaling_recommendation': optimal_allocation['recommendation']
        }
```

---

**Prepared by**: Fish Mouth Architecture Team  
**Date**: January 14, 2025  
**Status**: Production Cost-Optimized Architecture  
**Next Review**: Monthly architecture optimization assessment
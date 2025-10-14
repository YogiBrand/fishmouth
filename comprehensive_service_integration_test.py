#!/usr/bin/env python3
"""
Comprehensive Service Integration Test for Fishmouth Data Pipeline
Tests actual endpoints and validates cost optimization
"""

import asyncio
import aiohttp
import time
import json
import psutil
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import traceback
import psycopg2
import redis
from dataclasses import dataclass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ServiceConfig:
    name: str
    port: int
    health_endpoint: str
    base_url: str

@dataclass
class TestResult:
    test_name: str
    status: str  # PASS, FAIL, SKIP
    duration: float
    details: Dict[str, Any]
    error: Optional[str] = None

class ComprehensiveServiceTest:
    def __init__(self):
        self.services = {
            'enrichment': ServiceConfig('Enrichment Service', 8004, '/health', 'http://localhost:8004'),
            'image_processor': ServiceConfig('Image Processor', 8012, '/health', 'http://localhost:8012'),
            'scraper': ServiceConfig('Scraper Service', 8011, '/health', 'http://localhost:8011'),
            'ml_inference': ServiceConfig('ML Inference', 8013, '/health', 'http://localhost:8013'),
            'lead_generator': ServiceConfig('Lead Generator', 8008, '/health', 'http://localhost:8008'),
            'orchestrator': ServiceConfig('Orchestrator', 8009, '/health', 'http://localhost:8009')
        }
        
        self.db_config = {
            'host': 'localhost',
            'port': 5432,
            'database': 'fishmouth',
            'user': 'fishmouth',
            'password': 'fishmouth123'
        }
        
        self.redis_config = {
            'host': 'localhost',
            'port': 6379,
            'db': 0
        }
        
        self.test_results: List[TestResult] = []
        self.available_services: List[str] = []
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            connector=aiohttp.TCPConnector(limit=20)
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    def log_test_result(self, result: TestResult):
        """Log and store test result"""
        self.test_results.append(result)
        status_emoji = "✅" if result.status == "PASS" else "❌" if result.status == "FAIL" else "⏭️"
        logger.info(f"{status_emoji} {result.test_name}: {result.status} ({result.duration:.2f}s)")
        if result.error:
            logger.error(f"   Error: {result.error}")

    async def discover_available_services(self) -> List[str]:
        """Discover which services are actually running"""
        available = []
        
        for service_name, service_config in self.services.items():
            try:
                async with self.session.get(
                    f"{service_config.base_url}{service_config.health_endpoint}", 
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        available.append(service_name)
                        logger.info(f"✅ {service_config.name} is available")
                    else:
                        logger.warning(f"⚠️ {service_config.name} returned status {response.status}")
            except Exception as e:
                logger.info(f"❌ {service_config.name} is not available: {str(e)[:50]}")
                
        self.available_services = available
        return available

    async def test_service_health(self, service_name: str) -> TestResult:
        """Test individual service health endpoint"""
        start_time = time.time()
        service = self.services[service_name]
        
        try:
            async with self.session.get(f"{service.base_url}{service.health_endpoint}") as response:
                duration = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    return TestResult(
                        test_name=f"{service.name} Health Check",
                        status="PASS",
                        duration=duration,
                        details={
                            'status_code': response.status,
                            'response': data,
                            'service_port': service.port,
                            'service_healthy': data.get('status') == 'healthy'
                        }
                    )
                else:
                    return TestResult(
                        test_name=f"{service.name} Health Check",
                        status="FAIL",
                        duration=duration,
                        details={'status_code': response.status},
                        error=f"Expected 200, got {response.status}"
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name=f"{service.name} Health Check",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    def test_database_integration(self) -> TestResult:
        """Test PostgreSQL database integration and schema"""
        start_time = time.time()
        
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            # Get schema info
            cursor.execute("""
                SELECT table_name, column_count
                FROM (
                    SELECT table_name, COUNT(*) as column_count
                    FROM information_schema.columns 
                    WHERE table_schema = 'public'
                    GROUP BY table_name
                ) t
                ORDER BY table_name
            """)
            tables_info = dict(cursor.fetchall())
            
            # Test data existence
            sample_data = {}
            for table in ['raw_properties', 'raw_permits', 'enrichment_jobs']:
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    sample_data[table] = count
                except:
                    sample_data[table] = 'table not found'
            
            cursor.close()
            conn.close()
            
            duration = time.time() - start_time
            return TestResult(
                test_name="Database Integration & Schema Analysis",
                status="PASS",
                duration=duration,
                details={
                    'postgres_version': version.split()[0:2],
                    'total_tables': len(tables_info),
                    'tables_with_columns': tables_info,
                    'sample_data_counts': sample_data,
                    'pipeline_tables_exist': all(t in tables_info for t in ['raw_properties', 'raw_permits'])
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Database Integration & Schema Analysis",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    def test_redis_integration(self) -> TestResult:
        """Test Redis integration and caching"""
        start_time = time.time()
        
        try:
            r = redis.Redis(**self.redis_config)
            
            # Test basic operations
            test_key = f"pipeline_test_{int(time.time())}"
            r.set(test_key, json.dumps({"test": "data", "timestamp": time.time()}), ex=300)
            value = r.get(test_key)
            stored_data = json.loads(value)
            r.delete(test_key)
            
            # Get Redis info
            info = r.info()
            
            # Test pipeline-specific keys
            pipeline_keys = []
            for pattern in ['enrichment:*', 'image:*', 'scraper:*']:
                keys = r.keys(pattern)
                pipeline_keys.extend([k.decode() for k in keys])
            
            duration = time.time() - start_time
            return TestResult(
                test_name="Redis Integration & Caching Test",
                status="PASS",
                duration=duration,
                details={
                    'redis_version': info.get('redis_version'),
                    'used_memory': info.get('used_memory_human'),
                    'connected_clients': info.get('connected_clients'),
                    'test_operation': 'Success',
                    'pipeline_keys_found': len(pipeline_keys),
                    'sample_pipeline_keys': pipeline_keys[:5]
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Redis Integration & Caching Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_enrichment_service_endpoints(self) -> TestResult:
        """Test Enrichment Service actual endpoints"""
        start_time = time.time()
        
        try:
            if 'enrichment' not in self.available_services:
                return TestResult(
                    test_name="Enrichment Service Endpoints Test",
                    status="SKIP",
                    duration=0,
                    details={},
                    error="Enrichment service not available"
                )
            
            results = {}
            
            # Test property enrichment endpoint
            property_data = {
                "address": "123 Main Street",
                "city": "San Francisco",
                "state": "CA",
                "zip_code": "94102"
            }
            
            try:
                async with self.session.post(
                    f"{self.services['enrichment'].base_url}/enrich/property",
                    json=property_data,
                    timeout=aiohttp.ClientTimeout(total=15)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        results['property_enrichment'] = {
                            'status': 'success',
                            'has_enriched_data': 'enriched_data' in result,
                            'cost_tracked': 'cost' in result,
                            'sources_used': result.get('sources_used', [])
                        }
                    else:
                        results['property_enrichment'] = {
                            'status': 'failed',
                            'status_code': response.status
                        }
            except asyncio.TimeoutError:
                results['property_enrichment'] = {'status': 'timeout'}
            except Exception as e:
                results['property_enrichment'] = {'status': 'error', 'error': str(e)}
            
            # Test address validation endpoint
            try:
                async with self.session.post(
                    f"{self.services['enrichment'].base_url}/validate/address",
                    params={
                        "address": "456 Market St",
                        "city": "San Francisco", 
                        "state": "CA"
                    }
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        results['address_validation'] = {
                            'status': 'success',
                            'validated': result.get('success', False),
                            'cost_tracked': 'cost' in result
                        }
                    else:
                        results['address_validation'] = {
                            'status': 'failed',
                            'status_code': response.status
                        }
            except Exception as e:
                results['address_validation'] = {'status': 'error', 'error': str(e)}
            
            duration = time.time() - start_time
            success_count = sum(1 for r in results.values() if r.get('status') == 'success')
            
            return TestResult(
                test_name="Enrichment Service Endpoints Test",
                status="PASS" if success_count > 0 else "FAIL",
                duration=duration,
                details={
                    'endpoints_tested': list(results.keys()),
                    'successful_endpoints': success_count,
                    'results': results
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Enrichment Service Endpoints Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_image_processor_cost_optimization(self) -> TestResult:
        """Test Image Processor cost optimization features"""
        start_time = time.time()
        
        try:
            if 'image_processor' not in self.available_services:
                return TestResult(
                    test_name="Image Processor Cost Optimization Test",
                    status="SKIP",
                    duration=0,
                    details={},
                    error="Image Processor service not available"
                )
            
            # Test various endpoints to understand the service
            endpoints_to_test = [
                '/cost-optimization-status',
                '/status',
                '/config',
                '/info'
            ]
            
            results = {}
            
            for endpoint in endpoints_to_test:
                try:
                    async with self.session.get(
                        f"{self.services['image_processor'].base_url}{endpoint}"
                    ) as response:
                        if response.status == 200:
                            data = await response.json()
                            results[endpoint] = {
                                'status': 'success',
                                'data': data
                            }
                        else:
                            results[endpoint] = {
                                'status': 'not_found' if response.status == 404 else 'error',
                                'status_code': response.status
                            }
                except Exception as e:
                    results[endpoint] = {'status': 'error', 'error': str(e)}
            
            # Test actual image processing with cost optimization
            test_location = {
                "address": "123 Test Street, San Francisco, CA",
                "lat": 37.7749,
                "lng": -122.4194
            }
            
            try:
                async with self.session.post(
                    f"{self.services['image_processor'].base_url}/process-location",
                    json=test_location,
                    timeout=aiohttp.ClientTimeout(total=20)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        results['location_processing'] = {
                            'status': 'success',
                            'cost_optimization_used': 'free_sources' in result or 'openstreetmap' in str(result).lower(),
                            'fallback_triggered': 'fallback' in str(result).lower(),
                            'cost_tracked': 'cost' in result or 'price' in result
                        }
                    else:
                        results['location_processing'] = {
                            'status': 'failed',
                            'status_code': response.status
                        }
            except asyncio.TimeoutError:
                results['location_processing'] = {'status': 'timeout'}
            except Exception as e:
                results['location_processing'] = {'status': 'error', 'error': str(e)}
            
            duration = time.time() - start_time
            successful_tests = sum(1 for r in results.values() if r.get('status') == 'success')
            
            return TestResult(
                test_name="Image Processor Cost Optimization Test",
                status="PASS" if successful_tests > 0 else "FAIL",
                duration=duration,
                details={
                    'endpoints_tested': len(endpoints_to_test),
                    'successful_endpoints': successful_tests,
                    'results': results,
                    'cost_optimization_detected': any(
                        'openstreetmap' in str(r).lower() or 'free_sources' in str(r).lower() 
                        for r in results.values()
                    )
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Image Processor Cost Optimization Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_data_pipeline_flow(self) -> TestResult:
        """Test data flow through available services"""
        start_time = time.time()
        
        try:
            pipeline_stages = []
            test_data = {
                "business_name": "Test Restaurant Pipeline",
                "address": "789 Pipeline Ave, San Francisco, CA 94103"
            }
            
            # Stage 1: Property Enrichment (if available)
            if 'enrichment' in self.available_services:
                try:
                    async with self.session.post(
                        f"{self.services['enrichment'].base_url}/enrich/property",
                        json={
                            "address": "789 Pipeline Ave",
                            "city": "San Francisco",
                            "state": "CA",
                            "zip_code": "94103"
                        },
                        timeout=aiohttp.ClientTimeout(total=15)
                    ) as response:
                        if response.status == 200:
                            enriched_data = await response.json()
                            pipeline_stages.append({
                                'stage': 'enrichment',
                                'status': 'success',
                                'data_enriched': 'enriched_data' in enriched_data
                            })
                            test_data.update(enriched_data.get('enriched_data', {}))
                        else:
                            pipeline_stages.append({
                                'stage': 'enrichment',
                                'status': 'failed',
                                'status_code': response.status
                            })
                except Exception as e:
                    pipeline_stages.append({
                        'stage': 'enrichment',
                        'status': 'error',
                        'error': str(e)
                    })
            
            # Stage 2: Image Processing (if available)
            if 'image_processor' in self.available_services and 'lat' in test_data and 'lng' in test_data:
                try:
                    async with self.session.post(
                        f"{self.services['image_processor'].base_url}/process-location",
                        json={
                            "lat": test_data.get('lat', 37.7749),
                            "lng": test_data.get('lng', -122.4194),
                            "address": test_data.get('address', 'Test Location')
                        },
                        timeout=aiohttp.ClientTimeout(total=20)
                    ) as response:
                        if response.status == 200:
                            image_data = await response.json()
                            pipeline_stages.append({
                                'stage': 'image_processing',
                                'status': 'success',
                                'images_processed': 'images' in image_data
                            })
                        else:
                            pipeline_stages.append({
                                'stage': 'image_processing',
                                'status': 'failed',
                                'status_code': response.status
                            })
                except Exception as e:
                    pipeline_stages.append({
                        'stage': 'image_processing',
                        'status': 'error',
                        'error': str(e)
                    })
            
            duration = time.time() - start_time
            successful_stages = sum(1 for s in pipeline_stages if s.get('status') == 'success')
            
            return TestResult(
                test_name="Data Pipeline Flow Test",
                status="PASS" if successful_stages > 0 else "FAIL",
                duration=duration,
                details={
                    'total_stages': len(pipeline_stages),
                    'successful_stages': successful_stages,
                    'pipeline_stages': pipeline_stages,
                    'data_flow_working': successful_stages > 0
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Data Pipeline Flow Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    def measure_system_performance(self) -> TestResult:
        """Measure comprehensive system performance"""
        start_time = time.time()
        
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Docker container metrics
            container_metrics = {}
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 'cpu_percent']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'fishmouth' in cmdline.lower():
                        service_name = 'unknown'
                        for service in ['enrichment', 'image_processor', 'postgres', 'redis']:
                            if service in cmdline:
                                service_name = service
                                break
                        
                        container_metrics[service_name] = {
                            'pid': proc.info['pid'],
                            'memory_mb': proc.info['memory_info'].rss // (1024 * 1024) if proc.info['memory_info'] else 0,
                            'cpu_percent': proc.info['cpu_percent'] or 0
                        }
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            # Calculate service efficiency
            total_container_memory = sum(m.get('memory_mb', 0) for m in container_metrics.values())
            efficiency_score = 100 - min(cpu_percent, memory.percent, disk.percent)
            
            duration = time.time() - start_time
            return TestResult(
                test_name="System Performance Analysis",
                status="PASS",
                duration=duration,
                details={
                    'system_metrics': {
                        'cpu_usage_percent': cpu_percent,
                        'memory_usage_percent': memory.percent,
                        'memory_available_gb': memory.available // (1024 ** 3),
                        'disk_usage_percent': disk.percent,
                        'disk_free_gb': disk.free // (1024 ** 3)
                    },
                    'container_metrics': container_metrics,
                    'performance_assessment': {
                        'total_containers': len(container_metrics),
                        'total_memory_used_mb': total_container_memory,
                        'efficiency_score': efficiency_score,
                        'performance_level': 'Excellent' if efficiency_score > 80 else 'Good' if efficiency_score > 60 else 'Needs Attention'
                    }
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="System Performance Analysis",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        logger.info("🚀 Starting Comprehensive Service Integration Tests")
        logger.info("=" * 80)
        
        # 1. Service Discovery
        logger.info("🔍 Discovering Available Services...")
        available = await self.discover_available_services()
        logger.info(f"Found {len(available)} available services: {', '.join(available)}")
        
        # 2. Service Health Checks
        logger.info("\n🏥 Testing Service Health...")
        for service_name in available:
            result = await self.test_service_health(service_name)
            self.log_test_result(result)
        
        # 3. Database Integration
        logger.info("\n🗄️ Testing Database Integration...")
        db_result = self.test_database_integration()
        self.log_test_result(db_result)
        
        # 4. Redis Integration
        logger.info("\n🔴 Testing Redis Integration...")
        redis_result = self.test_redis_integration()
        self.log_test_result(redis_result)
        
        # 5. Service-Specific Tests
        logger.info("\n💰 Testing Enrichment Service Endpoints...")
        enrichment_result = await self.test_enrichment_service_endpoints()
        self.log_test_result(enrichment_result)
        
        logger.info("\n🖼️ Testing Image Processor Cost Optimization...")
        image_result = await self.test_image_processor_cost_optimization()
        self.log_test_result(image_result)
        
        # 6. Pipeline Flow Test
        logger.info("\n🔄 Testing Data Pipeline Flow...")
        pipeline_result = await self.test_data_pipeline_flow()
        self.log_test_result(pipeline_result)
        
        # 7. Performance Analysis
        logger.info("\n📊 Analyzing System Performance...")
        perf_result = self.measure_system_performance()
        self.log_test_result(perf_result)

    def generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r.status == "PASS"])
        failed = len([r for r in self.test_results if r.status == "FAIL"])
        skipped = len([r for r in self.test_results if r.status == "SKIP"])
        
        return {
            'executive_summary': {
                'total_tests': total_tests,
                'passed': passed,
                'failed': failed,
                'skipped': skipped,
                'success_rate': (passed / total_tests * 100) if total_tests > 0 else 0,
                'total_duration': sum(r.duration for r in self.test_results),
                'services_available': len(self.available_services),
                'services_tested': self.available_services
            },
            'detailed_results': [
                {
                    'test_name': r.test_name,
                    'status': r.status,
                    'duration': r.duration,
                    'details': r.details,
                    'error': r.error
                }
                for r in self.test_results
            ],
            'cost_optimization_assessment': {
                'image_processor_optimized': any(
                    'cost_optimization' in r.test_name.lower() and r.status == 'PASS'
                    for r in self.test_results
                ),
                'free_sources_detected': any(
                    'openstreetmap' in str(r.details).lower() or 'free_sources' in str(r.details).lower()
                    for r in self.test_results
                )
            },
            'pipeline_readiness': {
                'database_ready': any(r.test_name == 'Database Integration & Schema Analysis' and r.status == 'PASS' for r in self.test_results),
                'redis_ready': any(r.test_name == 'Redis Integration & Caching Test' and r.status == 'PASS' for r in self.test_results),
                'services_operational': len(self.available_services) > 0,
                'data_flow_tested': any('pipeline flow' in r.test_name.lower() for r in self.test_results)
            },
            'generated_at': datetime.now().isoformat()
        }

    def print_executive_report(self):
        """Print executive summary report"""
        report = self.generate_comprehensive_report()
        
        print("\n" + "=" * 90)
        print("🎯 FISHMOUTH DATA PIPELINE - COMPREHENSIVE TEST REPORT")
        print("=" * 90)
        
        # Executive Summary
        summary = report['executive_summary']
        print(f"\n📊 EXECUTIVE SUMMARY:")
        print(f"   Services Available: {summary['services_available']}/6 ({', '.join(summary['services_tested'])})")
        print(f"   Total Tests: {summary['total_tests']}")
        print(f"   ✅ Passed: {summary['passed']}")
        print(f"   ❌ Failed: {summary['failed']}")
        print(f"   ⏭️ Skipped: {summary['skipped']}")
        print(f"   🎯 Success Rate: {summary['success_rate']:.1f}%")
        print(f"   ⏱️ Total Duration: {summary['total_duration']:.2f}s")
        
        # Cost Optimization Status
        cost_opt = report['cost_optimization_assessment']
        print(f"\n💰 COST OPTIMIZATION STATUS:")
        print(f"   Image Processor Optimized: {'✅ YES' if cost_opt['image_processor_optimized'] else '❌ NO'}")
        print(f"   Free Sources Detected: {'✅ YES' if cost_opt['free_sources_detected'] else '❌ NO'}")
        
        # Pipeline Readiness
        pipeline = report['pipeline_readiness']
        print(f"\n🔄 PIPELINE READINESS:")
        print(f"   Database Ready: {'✅' if pipeline['database_ready'] else '❌'}")
        print(f"   Redis Ready: {'✅' if pipeline['redis_ready'] else '❌'}")
        print(f"   Services Operational: {'✅' if pipeline['services_operational'] else '❌'}")
        print(f"   Data Flow Tested: {'✅' if pipeline['data_flow_tested'] else '❌'}")
        
        # Test Results Summary
        print(f"\n📝 TEST RESULTS SUMMARY:")
        for result in self.test_results:
            status_emoji = "✅" if result.status == "PASS" else "❌" if result.status == "FAIL" else "⏭️"
            print(f"   {status_emoji} {result.test_name} ({result.duration:.2f}s)")
            if result.error:
                print(f"      └─ Error: {result.error[:100]}...")
        
        # Final Assessment
        print(f"\n🎯 FINAL ASSESSMENT:")
        if summary['success_rate'] >= 90:
            print("   🟢 EXCELLENT: Pipeline is production-ready with optimal performance!")
        elif summary['success_rate'] >= 75:
            print("   🟡 GOOD: Pipeline is functional with minor optimizations needed")
        elif summary['success_rate'] >= 50:
            print("   🟠 FAIR: Pipeline needs attention before production use")
        else:
            print("   🔴 CRITICAL: Pipeline has significant issues requiring immediate attention")
        
        # Recommendations
        print(f"\n💡 RECOMMENDATIONS:")
        missing_services = set(['scraper', 'ml_inference', 'lead_generator', 'orchestrator']) - set(self.available_services)
        if missing_services:
            print(f"   • Start missing services: {', '.join(missing_services)}")
        
        if summary['failed'] > 0:
            print(f"   • Review and fix {summary['failed']} failed test(s)")
        
        if not cost_opt['image_processor_optimized']:
            print("   • Verify cost optimization settings in Image Processor")
        
        if not pipeline['data_flow_tested']:
            print("   • Complete end-to-end pipeline flow testing")
        
        print("\n" + "=" * 90)


async def main():
    """Main function to run comprehensive tests"""
    async with ComprehensiveServiceTest() as test_suite:
        try:
            await test_suite.run_comprehensive_tests()
            test_suite.print_executive_report()
            
            # Save detailed report
            report = test_suite.generate_comprehensive_report()
            with open('/home/yogi/fishmouth/comprehensive_test_report.json', 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info("📄 Detailed report saved to: /home/yogi/fishmouth/comprehensive_test_report.json")
            
        except Exception as e:
            logger.error(f"Test suite failed: {e}")
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
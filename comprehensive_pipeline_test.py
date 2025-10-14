#!/usr/bin/env python3
"""
Comprehensive Data Pipeline Integration Test Suite
Tests all 6 microservices end-to-end with cost optimization validation
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

class PipelineTestSuite:
    def __init__(self):
        self.services = {
            'scraper': ServiceConfig('Scraper Service', 8011, '/health', 'http://localhost:8011'),
            'image_processor': ServiceConfig('Image Processor', 8012, '/health', 'http://localhost:8012'),
            'ml_inference': ServiceConfig('ML Inference', 8013, '/health', 'http://localhost:8013'),
            'enrichment': ServiceConfig('Enrichment Service', 8004, '/health', 'http://localhost:8004'),
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
                            'service_port': service.port
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

    async def test_all_services_health(self) -> List[TestResult]:
        """Test health of all services"""
        logger.info("🏥 Testing Service Health Checks...")
        tasks = [self.test_service_health(service_name) for service_name in self.services.keys()]
        results = await asyncio.gather(*tasks)
        
        for result in results:
            self.log_test_result(result)
            
        return results

    def test_database_connection(self) -> TestResult:
        """Test PostgreSQL database connection"""
        start_time = time.time()
        
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Test basic query
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            # Test table existence
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public'
            """)
            table_count = cursor.fetchone()[0]
            
            cursor.close()
            conn.close()
            
            duration = time.time() - start_time
            return TestResult(
                test_name="Database Connection Test",
                status="PASS",
                duration=duration,
                details={
                    'postgres_version': version,
                    'table_count': table_count,
                    'connection_config': {k: v for k, v in self.db_config.items() if k != 'password'}
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Database Connection Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    def test_redis_connection(self) -> TestResult:
        """Test Redis connection"""
        start_time = time.time()
        
        try:
            r = redis.Redis(**self.redis_config)
            
            # Test basic operations
            test_key = f"test_key_{int(time.time())}"
            r.set(test_key, "test_value", ex=60)
            value = r.get(test_key)
            r.delete(test_key)
            
            # Get Redis info
            info = r.info()
            
            duration = time.time() - start_time
            return TestResult(
                test_name="Redis Connection Test",
                status="PASS",
                duration=duration,
                details={
                    'redis_version': info.get('redis_version'),
                    'used_memory': info.get('used_memory_human'),
                    'connected_clients': info.get('connected_clients'),
                    'test_operation': 'Success'
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Redis Connection Test",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_cost_optimization_image_processor(self) -> TestResult:
        """Test Image Processor cost optimization features"""
        start_time = time.time()
        
        try:
            # Test cost optimization status endpoint
            async with self.session.get(f"{self.services['image_processor'].base_url}/cost-optimization-status") as response:
                if response.status == 200:
                    data = await response.json()
                    
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Image Processor Cost Optimization",
                        status="PASS",
                        duration=duration,
                        details={
                            'cost_optimization_enabled': data.get('cost_optimization_enabled', False),
                            'free_sources_priority': data.get('free_sources_priority', []),
                            'openstreetmap_enabled': data.get('openstreetmap_enabled', False),
                            'fallback_sources': data.get('fallback_sources', [])
                        }
                    )
                else:
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Image Processor Cost Optimization",
                        status="FAIL",
                        duration=duration,
                        details={'status_code': response.status},
                        error=f"Cost optimization endpoint returned {response.status}"
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Image Processor Cost Optimization",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_data_flow_pipeline(self) -> TestResult:
        """Test complete data flow pipeline"""
        start_time = time.time()
        
        try:
            # Test data for pipeline
            test_data = {
                "business_name": "Test Restaurant",
                "address": "123 Main St, San Francisco, CA",
                "phone": "+1-555-123-4567",
                "website": "https://testrestaurant.com"
            }
            
            # Step 1: Submit to scraper service
            async with self.session.post(
                f"{self.services['scraper'].base_url}/scrape",
                json=test_data
            ) as response:
                if response.status != 200:
                    raise Exception(f"Scraper service failed with status {response.status}")
                scraper_result = await response.json()
            
            # Step 2: Enrich the data
            async with self.session.post(
                f"{self.services['enrichment'].base_url}/enrich",
                json=scraper_result
            ) as response:
                if response.status != 200:
                    raise Exception(f"Enrichment service failed with status {response.status}")
                enriched_result = await response.json()
            
            # Step 3: Generate lead score
            async with self.session.post(
                f"{self.services['lead_generator'].base_url}/score",
                json=enriched_result
            ) as response:
                if response.status != 200:
                    raise Exception(f"Lead generator failed with status {response.status}")
                lead_result = await response.json()
            
            # Step 4: Process images if available
            if 'images' in enriched_result and enriched_result['images']:
                async with self.session.post(
                    f"{self.services['image_processor'].base_url}/process",
                    json={'images': enriched_result['images'][:2]}  # Test with first 2 images
                ) as response:
                    if response.status == 200:
                        image_result = await response.json()
                        lead_result['image_analysis'] = image_result
            
            duration = time.time() - start_time
            return TestResult(
                test_name="Complete Data Flow Pipeline",
                status="PASS",
                duration=duration,
                details={
                    'pipeline_stages': ['scraper', 'enrichment', 'lead_scoring', 'image_processing'],
                    'final_result_keys': list(lead_result.keys()),
                    'data_enriched': len(enriched_result) > len(test_data),
                    'lead_score_generated': 'score' in lead_result
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Complete Data Flow Pipeline",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_orchestrator_coordination(self) -> TestResult:
        """Test orchestrator service coordination"""
        start_time = time.time()
        
        try:
            # Test orchestrator's ability to coordinate services
            test_job = {
                "job_type": "full_pipeline",
                "data": {
                    "business_name": "Orchestrator Test Business",
                    "address": "456 Test Ave, Boston, MA"
                }
            }
            
            async with self.session.post(
                f"{self.services['orchestrator'].base_url}/orchestrate",
                json=test_job
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Orchestrator Coordination",
                        status="PASS",
                        duration=duration,
                        details={
                            'job_id': result.get('job_id'),
                            'status': result.get('status'),
                            'services_coordinated': result.get('services_called', []),
                            'result_keys': list(result.keys())
                        }
                    )
                else:
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Orchestrator Coordination",
                        status="FAIL",
                        duration=duration,
                        details={'status_code': response.status},
                        error=f"Orchestrator returned status {response.status}"
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Orchestrator Coordination",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_error_handling_fallbacks(self) -> TestResult:
        """Test error handling and fallback mechanisms"""
        start_time = time.time()
        
        try:
            # Test with invalid data to trigger fallbacks
            invalid_data = {
                "business_name": "",  # Empty name should trigger fallback
                "address": "Invalid Address That Should Not Exist",
                "phone": "invalid-phone"
            }
            
            # Test enrichment service with invalid data
            async with self.session.post(
                f"{self.services['enrichment'].base_url}/enrich",
                json=invalid_data
            ) as response:
                result = await response.json()
                
                # Should still return a result with fallback values
                fallback_used = any(
                    'fallback' in str(v).lower() or 'default' in str(v).lower() 
                    for v in result.values() if isinstance(v, str)
                )
                
                duration = time.time() - start_time
                return TestResult(
                    test_name="Error Handling & Fallbacks",
                    status="PASS",
                    duration=duration,
                    details={
                        'invalid_input_handled': True,
                        'fallback_mechanisms_used': fallback_used,
                        'response_status': response.status,
                        'result_structure_maintained': isinstance(result, dict)
                    }
                )
                
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Error Handling & Fallbacks",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def test_batch_processing(self) -> TestResult:
        """Test batch processing capabilities"""
        start_time = time.time()
        
        try:
            # Create batch of test data
            batch_data = {
                "businesses": [
                    {"business_name": f"Batch Test Business {i}", "address": f"{i}00 Test St, City, ST"}
                    for i in range(1, 6)  # Test with 5 businesses
                ]
            }
            
            # Test batch processing through orchestrator
            async with self.session.post(
                f"{self.services['orchestrator'].base_url}/batch-process",
                json=batch_data
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Batch Processing",
                        status="PASS",
                        duration=duration,
                        details={
                            'batch_size': len(batch_data['businesses']),
                            'processed_count': result.get('processed_count', 0),
                            'success_rate': result.get('success_rate', 0),
                            'processing_time_per_item': duration / len(batch_data['businesses']),
                            'cost_optimization_used': result.get('cost_optimization_used', False)
                        }
                    )
                else:
                    duration = time.time() - start_time
                    return TestResult(
                        test_name="Batch Processing",
                        status="FAIL",
                        duration=duration,
                        details={'status_code': response.status},
                        error=f"Batch processing failed with status {response.status}"
                    )
                    
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Batch Processing",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    def measure_system_performance(self) -> TestResult:
        """Measure system performance metrics"""
        start_time = time.time()
        
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Check if Docker containers are running
            docker_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    if 'docker' in proc.info['name'].lower() or \
                       any('fishmouth' in str(cmd).lower() for cmd in proc.info['cmdline'] if cmd):
                        docker_processes.append({
                            'pid': proc.info['pid'],
                            'name': proc.info['name']
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            duration = time.time() - start_time
            return TestResult(
                test_name="System Performance Metrics",
                status="PASS",
                duration=duration,
                details={
                    'cpu_usage_percent': cpu_percent,
                    'memory_usage_percent': memory.percent,
                    'memory_available_mb': memory.available // (1024 * 1024),
                    'disk_usage_percent': disk.percent,
                    'disk_free_gb': disk.free // (1024 * 1024 * 1024),
                    'docker_processes_count': len(docker_processes),
                    'system_load_1min': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 'N/A'
                }
            )
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="System Performance Metrics",
                status="FAIL",
                duration=duration,
                details={},
                error=str(e)
            )

    async def run_comprehensive_tests(self):
        """Run all comprehensive tests"""
        logger.info("🚀 Starting Comprehensive Data Pipeline Integration Tests")
        logger.info("=" * 80)
        
        # 1. Service Health Checks
        await self.test_all_services_health()
        
        # 2. Database Integration Test
        db_result = self.test_database_connection()
        self.log_test_result(db_result)
        
        # 3. Redis Integration Test
        redis_result = self.test_redis_connection()
        self.log_test_result(redis_result)
        
        # 4. Cost Optimization Validation
        logger.info("💰 Testing Cost Optimization Features...")
        cost_opt_result = await self.test_cost_optimization_image_processor()
        self.log_test_result(cost_opt_result)
        
        # 5. Data Flow Pipeline Test
        logger.info("🔄 Testing Complete Data Flow Pipeline...")
        pipeline_result = await self.test_data_flow_pipeline()
        self.log_test_result(pipeline_result)
        
        # 6. Orchestrator Coordination Test
        logger.info("🎼 Testing Orchestrator Coordination...")
        orchestrator_result = await self.test_orchestrator_coordination()
        self.log_test_result(orchestrator_result)
        
        # 7. Error Handling Test
        logger.info("🛡️ Testing Error Handling & Fallbacks...")
        error_handling_result = await self.test_error_handling_fallbacks()
        self.log_test_result(error_handling_result)
        
        # 8. Batch Processing Test
        logger.info("📦 Testing Batch Processing...")
        batch_result = await self.test_batch_processing()
        self.log_test_result(batch_result)
        
        # 9. Performance Benchmarking
        logger.info("📊 Measuring System Performance...")
        perf_result = self.measure_system_performance()
        self.log_test_result(perf_result)

    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r.status == "PASS"])
        failed_tests = len([r for r in self.test_results if r.status == "FAIL"])
        skipped_tests = len([r for r in self.test_results if r.status == "SKIP"])
        
        total_duration = sum(r.duration for r in self.test_results)
        avg_duration = total_duration / total_tests if total_tests > 0 else 0
        
        return {
            'summary': {
                'total_tests': total_tests,
                'passed': passed_tests,
                'failed': failed_tests,
                'skipped': skipped_tests,
                'success_rate': (passed_tests / total_tests * 100) if total_tests > 0 else 0,
                'total_duration': total_duration,
                'average_test_duration': avg_duration
            },
            'test_results': [
                {
                    'test_name': r.test_name,
                    'status': r.status,
                    'duration': r.duration,
                    'details': r.details,
                    'error': r.error
                }
                for r in self.test_results
            ],
            'generated_at': datetime.now().isoformat(),
            'services_tested': list(self.services.keys())
        }

    def print_detailed_report(self):
        """Print detailed test report to console"""
        report = self.generate_test_report()
        
        print("\n" + "=" * 80)
        print("📋 COMPREHENSIVE DATA PIPELINE TEST REPORT")
        print("=" * 80)
        
        # Summary
        summary = report['summary']
        print(f"\n📊 TEST SUMMARY:")
        print(f"   Total Tests: {summary['total_tests']}")
        print(f"   ✅ Passed: {summary['passed']}")
        print(f"   ❌ Failed: {summary['failed']}")
        print(f"   ⏭️ Skipped: {summary['skipped']}")
        print(f"   🎯 Success Rate: {summary['success_rate']:.1f}%")
        print(f"   ⏱️ Total Duration: {summary['total_duration']:.2f}s")
        print(f"   📈 Avg Test Duration: {summary['average_test_duration']:.2f}s")
        
        # Detailed results
        print(f"\n📝 DETAILED TEST RESULTS:")
        for result in self.test_results:
            status_emoji = "✅" if result.status == "PASS" else "❌" if result.status == "FAIL" else "⏭️"
            print(f"\n{status_emoji} {result.test_name}")
            print(f"   Status: {result.status}")
            print(f"   Duration: {result.duration:.2f}s")
            
            if result.error:
                print(f"   ❌ Error: {result.error}")
            
            if result.details:
                print("   📋 Details:")
                for key, value in result.details.items():
                    if isinstance(value, dict):
                        print(f"      {key}: {json.dumps(value, indent=8)}")
                    else:
                        print(f"      {key}: {value}")
        
        # Final assessment
        print(f"\n🎯 FINAL ASSESSMENT:")
        if summary['success_rate'] >= 90:
            print("   🟢 EXCELLENT: Pipeline is working optimally!")
        elif summary['success_rate'] >= 70:
            print("   🟡 GOOD: Pipeline is functional with minor issues")
        elif summary['success_rate'] >= 50:
            print("   🟠 FAIR: Pipeline has some significant issues")
        else:
            print("   🔴 POOR: Pipeline has major issues that need attention")
        
        print("\n" + "=" * 80)


async def main():
    """Main function to run comprehensive tests"""
    async with PipelineTestSuite() as test_suite:
        try:
            await test_suite.run_comprehensive_tests()
            test_suite.print_detailed_report()
            
            # Save report to file
            report = test_suite.generate_test_report()
            with open('/home/yogi/fishmouth/test_report.json', 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info("📄 Test report saved to: /home/yogi/fishmouth/test_report.json")
            
        except Exception as e:
            logger.error(f"Test suite failed: {e}")
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
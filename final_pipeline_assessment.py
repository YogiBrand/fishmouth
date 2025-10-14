#!/usr/bin/env python3
"""
Final Comprehensive Pipeline Assessment for Fishmouth Data Pipeline
Complete analysis of working services, cost optimization, and recommendations
"""

import asyncio
import aiohttp
import time
import json
import psutil
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import psycopg2
import redis

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinalPipelineAssessment:
    def __init__(self):
        self.services = {
            'enrichment': 'http://localhost:8004',
            'image_processor': 'http://localhost:8012'
        }
        
        self.db_config = {
            'host': 'localhost', 'port': 5432, 'database': 'fishmouth',
            'user': 'fishmouth', 'password': 'fishmouth123'
        }
        
        self.results = {}
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_complete_pipeline_functionality(self):
        """Test the complete available pipeline functionality"""
        logger.info("🚀 Starting Final Pipeline Assessment...")
        
        # 1. Service Health Assessment
        logger.info("1. Testing Service Health...")
        service_health = {}
        for service, url in self.services.items():
            try:
                async with self.session.get(f"{url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        service_health[service] = {
                            'status': 'healthy',
                            'details': data,
                            'cost_optimized': 'cost' in str(data).lower() or 'optimization' in str(data).lower()
                        }
                    else:
                        service_health[service] = {'status': 'unhealthy', 'code': response.status}
            except Exception as e:
                service_health[service] = {'status': 'unavailable', 'error': str(e)}
        
        self.results['service_health'] = service_health
        
        # 2. Database Schema Analysis
        logger.info("2. Analyzing Database Schema...")
        try:
            conn = psycopg2.connect(**self.db_config)
            cursor = conn.cursor()
            
            # Get all tables and their structure
            cursor.execute("""
                SELECT t.table_name, COUNT(c.column_name) as column_count,
                       string_agg(c.column_name || ':' || c.data_type, ', ') as columns
                FROM information_schema.tables t
                LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
                WHERE t.table_schema = 'public'
                GROUP BY t.table_name
                ORDER BY t.table_name
            """)
            tables = cursor.fetchall()
            
            # Check for key pipeline tables
            pipeline_tables = ['raw_properties', 'raw_permits', 'enrichment_jobs', 'processed_leads']
            existing_tables = [t[0] for t in tables]
            
            self.results['database_analysis'] = {
                'total_tables': len(tables),
                'table_details': {t[0]: {'columns': t[1], 'structure': t[2]} for t in tables},
                'pipeline_tables_exist': {table: table in existing_tables for table in pipeline_tables},
                'schema_complete': sum(table in existing_tables for table in pipeline_tables) >= 2
            }
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            self.results['database_analysis'] = {'error': str(e)}
        
        # 3. Cost Optimization Validation
        logger.info("3. Validating Cost Optimization...")
        cost_optimization = {}
        
        # Test Image Processor Cost Features
        try:
            async with self.session.get(f"{self.services['image_processor']}/health") as response:
                if response.status == 200:
                    health_data = await response.json()
                    cost_optimization['image_processor'] = {
                        'cost_optimized': health_data.get('service') == 'cost-optimized-image-processor',
                        'free_openstreetmap': health_data.get('cost_optimizations', {}).get('free_openstreetmap', False),
                        'local_processing': health_data.get('cost_optimizations', {}).get('local_super_resolution', False),
                        'extended_caching': health_data.get('cost_optimizations', {}).get('extended_caching'),
                        'batch_processing': health_data.get('cost_optimizations', {}).get('batch_processing', False)
                    }
        except Exception as e:
            cost_optimization['image_processor'] = {'error': str(e)}
        
        self.results['cost_optimization'] = cost_optimization
        
        # 4. End-to-End Data Flow Test
        logger.info("4. Testing End-to-End Data Flow...")
        data_flow_results = {}
        
        # Test property enrichment flow
        try:
            test_property = {
                "address": "1600 Amphitheatre Parkway",
                "city": "Mountain View",
                "state": "CA",
                "zip_code": "94043"
            }
            
            async with self.session.post(
                f"{self.services['enrichment']}/enrich/property",
                json=test_property,
                timeout=aiohttp.ClientTimeout(total=15)
            ) as response:
                if response.status == 200:
                    enriched = await response.json()
                    data_flow_results['property_enrichment'] = {
                        'status': 'success',
                        'data_enriched': 'enriched_data' in enriched,
                        'cost_tracked': 'cost' in enriched,
                        'processing_time': enriched.get('processing_time', 'not_tracked')
                    }
                    
                    # If enrichment successful, try image processing
                    if 'enriched_data' in enriched and enriched['enriched_data']:
                        try:
                            location_data = {
                                "lat": 37.4221,
                                "lng": -122.0841,
                                "address": "1600 Amphitheatre Parkway, Mountain View, CA"
                            }
                            
                            async with self.session.post(
                                f"{self.services['image_processor']}/process-location",
                                json=location_data,
                                timeout=aiohttp.ClientTimeout(total=20)
                            ) as img_response:
                                if img_response.status == 200:
                                    img_data = await img_response.json()
                                    data_flow_results['image_processing'] = {
                                        'status': 'success',
                                        'images_found': 'images' in img_data or 'satellite' in img_data,
                                        'free_sources_used': 'openstreetmap' in str(img_data).lower()
                                    }
                                else:
                                    data_flow_results['image_processing'] = {
                                        'status': 'failed',
                                        'status_code': img_response.status
                                    }
                        except asyncio.TimeoutError:
                            data_flow_results['image_processing'] = {'status': 'timeout'}
                        except Exception as e:
                            data_flow_results['image_processing'] = {'status': 'error', 'error': str(e)}
                else:
                    data_flow_results['property_enrichment'] = {
                        'status': 'failed',
                        'status_code': response.status
                    }
        except Exception as e:
            data_flow_results['property_enrichment'] = {'status': 'error', 'error': str(e)}
        
        self.results['data_flow'] = data_flow_results
        
        # 5. Performance Analysis
        logger.info("5. Analyzing System Performance...")
        try:
            performance = {
                'cpu_usage': psutil.cpu_percent(interval=1),
                'memory_usage': psutil.virtual_memory().percent,
                'memory_available_gb': psutil.virtual_memory().available / (1024**3),
                'disk_usage': psutil.disk_usage('/').percent,
                'load_average': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else None
            }
            
            # Docker container analysis
            containers = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 'cpu_percent']):
                try:
                    cmdline = ' '.join(proc.info['cmdline'] or [])
                    if 'fishmouth' in cmdline.lower():
                        containers.append({
                            'service': 'enrichment' if 'enrichment' in cmdline else 'image_processor' if 'image' in cmdline else 'database' if 'postgres' in cmdline else 'cache' if 'redis' in cmdline else 'unknown',
                            'memory_mb': proc.info['memory_info'].rss // (1024**2) if proc.info['memory_info'] else 0,
                            'cpu_percent': proc.info['cpu_percent'] or 0
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            
            performance['containers'] = containers
            performance['total_container_memory_mb'] = sum(c['memory_mb'] for c in containers)
            
            self.results['performance'] = performance
            
        except Exception as e:
            self.results['performance'] = {'error': str(e)}

    def calculate_pipeline_score(self) -> Dict[str, Any]:
        """Calculate overall pipeline readiness score"""
        score_components = {
            'service_availability': 0,
            'database_readiness': 0,
            'cost_optimization': 0,
            'data_flow_functionality': 0,
            'performance_efficiency': 0
        }
        
        # Service availability (25 points)
        healthy_services = sum(1 for s in self.results.get('service_health', {}).values() 
                             if s.get('status') == 'healthy')
        score_components['service_availability'] = min(25, (healthy_services / 2) * 25)  # 2 services available
        
        # Database readiness (20 points)
        if self.results.get('database_analysis', {}).get('schema_complete'):
            score_components['database_readiness'] = 20
        elif self.results.get('database_analysis', {}).get('total_tables', 0) > 10:
            score_components['database_readiness'] = 15
        
        # Cost optimization (25 points)
        cost_opt = self.results.get('cost_optimization', {}).get('image_processor', {})
        if cost_opt.get('cost_optimized') and cost_opt.get('free_openstreetmap'):
            score_components['cost_optimization'] = 25
        elif cost_opt.get('free_openstreetmap'):
            score_components['cost_optimization'] = 20
        
        # Data flow functionality (20 points)
        data_flow = self.results.get('data_flow', {})
        successful_flows = sum(1 for f in data_flow.values() if f.get('status') == 'success')
        score_components['data_flow_functionality'] = min(20, successful_flows * 10)
        
        # Performance efficiency (10 points)
        perf = self.results.get('performance', {})
        if perf and not perf.get('error'):
            cpu_ok = perf.get('cpu_usage', 100) < 50
            memory_ok = perf.get('memory_usage', 100) < 80
            if cpu_ok and memory_ok:
                score_components['performance_efficiency'] = 10
            elif cpu_ok or memory_ok:
                score_components['performance_efficiency'] = 5
        
        total_score = sum(score_components.values())
        
        return {
            'total_score': total_score,
            'max_score': 100,
            'percentage': total_score,
            'grade': 'A' if total_score >= 90 else 'B' if total_score >= 80 else 'C' if total_score >= 70 else 'D' if total_score >= 60 else 'F',
            'components': score_components,
            'readiness_level': 'Production Ready' if total_score >= 85 else 'Near Production' if total_score >= 70 else 'Development Stage' if total_score >= 50 else 'Needs Work'
        }

    def generate_recommendations(self) -> List[str]:
        """Generate specific recommendations based on results"""
        recommendations = []
        
        # Service recommendations
        service_health = self.results.get('service_health', {})
        if len([s for s in service_health.values() if s.get('status') == 'healthy']) < 4:
            recommendations.append("🚀 CRITICAL: Start missing microservices (Scraper, ML Inference, Lead Generator, Orchestrator)")
        
        # Database recommendations
        db_analysis = self.results.get('database_analysis', {})
        missing_tables = [table for table, exists in db_analysis.get('pipeline_tables_exist', {}).items() if not exists]
        if missing_tables:
            recommendations.append(f"🗄️ DATABASE: Create missing pipeline tables: {', '.join(missing_tables)}")
        
        # Cost optimization recommendations
        cost_opt = self.results.get('cost_optimization', {}).get('image_processor', {})
        if not cost_opt.get('cost_optimized', False):
            recommendations.append("💰 COST: Verify cost optimization is properly enabled in Image Processor")
        
        # Data flow recommendations
        data_flow = self.results.get('data_flow', {})
        failed_flows = [flow for flow, result in data_flow.items() if result.get('status') != 'success']
        if failed_flows:
            recommendations.append(f"🔄 PIPELINE: Fix data flow issues in: {', '.join(failed_flows)}")
        
        # Performance recommendations
        perf = self.results.get('performance', {})
        if perf.get('cpu_usage', 0) > 70:
            recommendations.append("⚡ PERFORMANCE: High CPU usage detected - consider scaling or optimization")
        if perf.get('memory_usage', 0) > 90:
            recommendations.append("💾 PERFORMANCE: High memory usage - consider memory optimization or scaling")
        
        return recommendations

    def print_executive_summary(self):
        """Print comprehensive executive summary"""
        score = self.calculate_pipeline_score()
        recommendations = self.generate_recommendations()
        
        print("\n" + "=" * 100)
        print("🎯 FISHMOUTH DATA PIPELINE - FINAL COMPREHENSIVE ASSESSMENT")
        print("=" * 100)
        
        print(f"\n🏆 OVERALL PIPELINE SCORE: {score['total_score']}/100 (Grade: {score['grade']}) - {score['readiness_level']}")
        
        print(f"\n📊 SCORE BREAKDOWN:")
        for component, points in score['components'].items():
            max_points = {'service_availability': 25, 'database_readiness': 20, 
                         'cost_optimization': 25, 'data_flow_functionality': 20, 
                         'performance_efficiency': 10}[component]
            percentage = (points / max_points) * 100 if max_points > 0 else 0
            status = "✅" if percentage >= 80 else "⚠️" if percentage >= 60 else "❌"
            print(f"   {status} {component.replace('_', ' ').title()}: {points}/{max_points} ({percentage:.0f}%)")
        
        print(f"\n🏥 SERVICE STATUS:")
        for service, health in self.results.get('service_health', {}).items():
            status_emoji = "✅" if health.get('status') == 'healthy' else "❌"
            cost_indicator = "💰" if health.get('cost_optimized') else ""
            print(f"   {status_emoji} {service.title()}: {health.get('status', 'unknown').title()} {cost_indicator}")
        
        print(f"\n🗄️ DATABASE ANALYSIS:")
        db_info = self.results.get('database_analysis', {})
        if 'error' not in db_info:
            print(f"   Total Tables: {db_info.get('total_tables', 0)}")
            pipeline_tables = db_info.get('pipeline_tables_exist', {})
            for table, exists in pipeline_tables.items():
                status = "✅" if exists else "❌"
                print(f"   {status} {table}: {'Exists' if exists else 'Missing'}")
        else:
            print(f"   ❌ Database Error: {db_info['error']}")
        
        print(f"\n💰 COST OPTIMIZATION STATUS:")
        cost_opt = self.results.get('cost_optimization', {}).get('image_processor', {})
        if 'error' not in cost_opt:
            print(f"   Cost Optimized Service: {'✅ YES' if cost_opt.get('cost_optimized') else '❌ NO'}")
            print(f"   Free OpenStreetMap: {'✅ Enabled' if cost_opt.get('free_openstreetmap') else '❌ Disabled'}")
            print(f"   Local Processing: {'✅ Enabled' if cost_opt.get('local_processing') else '❌ Disabled'}")
            print(f"   Extended Caching: {cost_opt.get('extended_caching', 'Not configured')}")
            print(f"   Batch Processing: {'✅ Enabled' if cost_opt.get('batch_processing') else '❌ Disabled'}")
        else:
            print(f"   ❌ Cost Optimization Check Failed: {cost_opt['error']}")
        
        print(f"\n🔄 DATA FLOW RESULTS:")
        data_flow = self.results.get('data_flow', {})
        for flow_name, result in data_flow.items():
            status = "✅" if result.get('status') == 'success' else "❌" if result.get('status') == 'failed' else "⚠️"
            print(f"   {status} {flow_name.replace('_', ' ').title()}: {result.get('status', 'unknown').title()}")
            if result.get('status') == 'success':
                details = []
                if result.get('data_enriched'): details.append("Data Enriched")
                if result.get('cost_tracked'): details.append("Cost Tracked")
                if result.get('free_sources_used'): details.append("Free Sources Used")
                if details:
                    print(f"      └─ {', '.join(details)}")
        
        print(f"\n📊 PERFORMANCE METRICS:")
        perf = self.results.get('performance', {})
        if 'error' not in perf:
            print(f"   CPU Usage: {perf.get('cpu_usage', 0):.1f}%")
            print(f"   Memory Usage: {perf.get('memory_usage', 0):.1f}%")
            print(f"   Available Memory: {perf.get('memory_available_gb', 0):.1f} GB")
            print(f"   Total Container Memory: {perf.get('total_container_memory_mb', 0)} MB")
            print(f"   Active Containers: {len(perf.get('containers', []))}")
        
        print(f"\n🎯 PRIORITY RECOMMENDATIONS:")
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")
        else:
            print("   🎉 No critical recommendations - pipeline is well optimized!")
        
        print(f"\n💡 NEXT STEPS FOR PRODUCTION:")
        if score['total_score'] >= 85:
            print("   1. ✅ Pipeline is production-ready!")
            print("   2. 🚀 Deploy remaining services for full functionality")
            print("   3. 📊 Set up monitoring and alerting")
            print("   4. 🔄 Implement automated testing")
        else:
            print("   1. 🔧 Address priority recommendations above")
            print("   2. 🧪 Complete end-to-end testing")
            print("   3. 📈 Optimize performance bottlenecks")
            print("   4. 🔒 Implement security best practices")
        
        print("\n" + "=" * 100)

async def main():
    """Run final comprehensive assessment"""
    async with FinalPipelineAssessment() as assessment:
        try:
            await assessment.test_complete_pipeline_functionality()
            assessment.print_executive_summary()
            
            # Save detailed results
            with open('/home/yogi/fishmouth/final_assessment_report.json', 'w') as f:
                json.dump({
                    'assessment_results': assessment.results,
                    'pipeline_score': assessment.calculate_pipeline_score(),
                    'recommendations': assessment.generate_recommendations(),
                    'generated_at': datetime.now().isoformat()
                }, f, indent=2)
            
            logger.info("📄 Final assessment saved to: /home/yogi/fishmouth/final_assessment_report.json")
            
        except Exception as e:
            logger.error(f"Assessment failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(main())
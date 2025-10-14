#!/usr/bin/env python3
"""
Cost Optimization Validation Test
Verify that the cost-optimized approach works end-to-end with FREE-FIRST strategies
"""

import asyncio
import aiohttp
import time
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CostOptimizationValidator:
    def __init__(self):
        self.enrichment_url = "http://localhost:8004"
        self.image_processor_url = "http://localhost:8012"
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_enrichment_cost_tracking(self):
        """Test enrichment service cost tracking"""
        logger.info("🧪 Testing Enrichment Service Cost Tracking...")
        
        test_property = {
            "address": "123 Test Street",
            "city": "San Francisco",
            "state": "CA",
            "zip_code": "94102"
        }
        
        try:
            start_time = time.time()
            async with self.session.post(
                f"{self.enrichment_url}/enrich/property",
                json=test_property
            ) as response:
                processing_time = time.time() - start_time
                
                if response.status == 200:
                    result = await response.json()
                    
                    cost_info = {
                        'cost_tracked': 'cost' in result,
                        'cost_amount': result.get('cost', 0),
                        'sources_used': result.get('sources_used', []),
                        'fallbacks_triggered': result.get('fallbacks_triggered', []),
                        'processing_time': processing_time,
                        'free_sources_used': any('free' in str(source).lower() for source in result.get('sources_used', []))
                    }
                    
                    logger.info(f"✅ Enrichment Cost Analysis: {json.dumps(cost_info, indent=2)}")
                    return cost_info
                else:
                    logger.error(f"❌ Enrichment failed with status: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Enrichment test failed: {e}")
            return None

    async def test_image_processor_free_sources(self):
        """Test image processor free source prioritization"""
        logger.info("🖼️ Testing Image Processor Free Sources...")
        
        test_locations = [
            {"lat": 37.7749, "lng": -122.4194, "name": "San Francisco"},
            {"lat": 40.7128, "lng": -74.0060, "name": "New York"},
            {"lat": 34.0522, "lng": -118.2437, "name": "Los Angeles"}
        ]
        
        results = []
        
        for location in test_locations:
            try:
                start_time = time.time()
                async with self.session.post(
                    f"{self.image_processor_url}/process-location",
                    json={
                        "lat": location["lat"],
                        "lng": location["lng"],
                        "address": f"Test Location {location['name']}"
                    }
                ) as response:
                    processing_time = time.time() - start_time
                    
                    if response.status == 200:
                        result = await response.json()
                        
                        cost_analysis = {
                            'location': location['name'],
                            'processing_time': processing_time,
                            'openstreetmap_used': 'openstreetmap' in str(result).lower(),
                            'free_sources_detected': any(
                                keyword in str(result).lower() 
                                for keyword in ['openstreetmap', 'free', 'osm', 'local']
                            ),
                            'cost_tracked': 'cost' in result or 'price' in result,
                            'fallback_used': 'fallback' in str(result).lower(),
                            'response_size': len(str(result))
                        }
                        
                        results.append(cost_analysis)
                        logger.info(f"✅ {location['name']}: Free sources = {cost_analysis['free_sources_detected']}")
                        
                    else:
                        logger.error(f"❌ Image processing failed for {location['name']}: {response.status}")
                        results.append({
                            'location': location['name'],
                            'error': f"HTTP {response.status}"
                        })
                        
            except Exception as e:
                logger.error(f"❌ Image processing failed for {location['name']}: {e}")
                results.append({
                    'location': location['name'],
                    'error': str(e)
                })
        
        return results

    async def test_batch_processing_efficiency(self):
        """Test batch processing cost efficiency"""
        logger.info("📦 Testing Batch Processing Cost Efficiency...")
        
        # Create a batch of properties to process
        properties = [
            {"address": f"{100 + i} Test St", "city": "San Francisco", "state": "CA", "zip_code": "94102"}
            for i in range(5)
        ]
        
        total_cost = 0
        processing_times = []
        
        for i, prop in enumerate(properties):
            try:
                start_time = time.time()
                async with self.session.post(
                    f"{self.enrichment_url}/enrich/property",
                    json=prop
                ) as response:
                    processing_time = time.time() - start_time
                    processing_times.append(processing_time)
                    
                    if response.status == 200:
                        result = await response.json()
                        cost = result.get('cost', 0)
                        total_cost += cost
                        logger.info(f"✅ Property {i+1}/5 processed in {processing_time:.2f}s, cost: ${cost}")
                    else:
                        logger.error(f"❌ Property {i+1}/5 failed: {response.status}")
                        
            except Exception as e:
                logger.error(f"❌ Property {i+1}/5 error: {e}")
        
        avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
        
        batch_analysis = {
            'properties_processed': len(processing_times),
            'total_cost': total_cost,
            'average_cost_per_property': total_cost / len(processing_times) if processing_times else 0,
            'average_processing_time': avg_processing_time,
            'total_processing_time': sum(processing_times),
            'cost_effective': total_cost < 1.00,  # Less than $1 for 5 properties indicates good optimization
            'fast_processing': avg_processing_time < 5.0  # Less than 5 seconds average
        }
        
        logger.info(f"📊 Batch Analysis: {json.dumps(batch_analysis, indent=2)}")
        return batch_analysis

    async def run_cost_optimization_validation(self):
        """Run complete cost optimization validation"""
        logger.info("🚀 Starting Cost Optimization Validation...")
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'tests': {}
        }
        
        # Test 1: Enrichment Cost Tracking
        enrichment_result = await self.test_enrichment_cost_tracking()
        results['tests']['enrichment_cost_tracking'] = enrichment_result
        
        # Test 2: Image Processor Free Sources
        image_results = await self.test_image_processor_free_sources()
        results['tests']['image_processor_free_sources'] = image_results
        
        # Test 3: Batch Processing Efficiency
        batch_result = await self.test_batch_processing_efficiency()
        results['tests']['batch_processing_efficiency'] = batch_result
        
        # Generate Cost Optimization Score
        score = self.calculate_cost_optimization_score(results)
        results['cost_optimization_score'] = score
        
        return results

    def calculate_cost_optimization_score(self, results):
        """Calculate overall cost optimization effectiveness score"""
        score_components = {
            'enrichment_efficiency': 0,
            'free_source_usage': 0,
            'batch_processing': 0
        }
        
        # Enrichment efficiency (30 points)
        enrichment = results['tests'].get('enrichment_cost_tracking')
        if enrichment:
            if enrichment.get('cost_tracked') and enrichment.get('cost_amount', 0) < 0.50:
                score_components['enrichment_efficiency'] = 30
            elif enrichment.get('cost_tracked'):
                score_components['enrichment_efficiency'] = 20
        
        # Free source usage (40 points)
        image_results = results['tests'].get('image_processor_free_sources', [])
        if image_results:
            free_source_count = sum(1 for r in image_results if r.get('free_sources_detected'))
            total_tests = len([r for r in image_results if 'error' not in r])
            if total_tests > 0:
                free_source_ratio = free_source_count / total_tests
                score_components['free_source_usage'] = int(free_source_ratio * 40)
        
        # Batch processing efficiency (30 points)
        batch = results['tests'].get('batch_processing_efficiency')
        if batch:
            if batch.get('cost_effective') and batch.get('fast_processing'):
                score_components['batch_processing'] = 30
            elif batch.get('cost_effective') or batch.get('fast_processing'):
                score_components['batch_processing'] = 20
        
        total_score = sum(score_components.values())
        
        return {
            'total_score': total_score,
            'max_score': 100,
            'percentage': total_score,
            'grade': 'A' if total_score >= 90 else 'B' if total_score >= 80 else 'C' if total_score >= 70 else 'D',
            'components': score_components,
            'optimization_level': 'Excellent' if total_score >= 85 else 'Good' if total_score >= 70 else 'Needs Improvement'
        }

    def print_cost_optimization_report(self, results):
        """Print comprehensive cost optimization report"""
        score = results['cost_optimization_score']
        
        print("\n" + "=" * 90)
        print("💰 FISHMOUTH COST OPTIMIZATION VALIDATION REPORT")
        print("=" * 90)
        
        print(f"\n🏆 COST OPTIMIZATION SCORE: {score['total_score']}/100 (Grade: {score['grade']}) - {score['optimization_level']}")
        
        print(f"\n📊 OPTIMIZATION BREAKDOWN:")
        for component, points in score['components'].items():
            max_points = {'enrichment_efficiency': 30, 'free_source_usage': 40, 'batch_processing': 30}[component]
            percentage = (points / max_points) * 100 if max_points > 0 else 0
            status = "✅" if percentage >= 80 else "⚠️" if percentage >= 60 else "❌"
            print(f"   {status} {component.replace('_', ' ').title()}: {points}/{max_points} ({percentage:.0f}%)")
        
        print(f"\n🧪 TEST RESULTS:")
        
        # Enrichment Results
        enrichment = results['tests'].get('enrichment_cost_tracking')
        if enrichment:
            print(f"   💎 Enrichment Cost Tracking:")
            print(f"      Cost Tracked: {'✅' if enrichment.get('cost_tracked') else '❌'}")
            print(f"      Cost Amount: ${enrichment.get('cost_amount', 0):.2f}")
            print(f"      Processing Time: {enrichment.get('processing_time', 0):.2f}s")
            print(f"      Free Sources Used: {'✅' if enrichment.get('free_sources_used') else '❌'}")
        
        # Image Processing Results
        image_results = results['tests'].get('image_processor_free_sources', [])
        if image_results:
            print(f"   🖼️ Image Processor Free Sources:")
            for result in image_results:
                if 'error' not in result:
                    status = "✅" if result.get('free_sources_detected') else "⚠️"
                    print(f"      {status} {result.get('location')}: Free sources = {result.get('free_sources_detected')}")
                    print(f"         Processing time: {result.get('processing_time', 0):.2f}s")
        
        # Batch Processing Results  
        batch = results['tests'].get('batch_processing_efficiency')
        if batch:
            print(f"   📦 Batch Processing Efficiency:")
            print(f"      Properties Processed: {batch.get('properties_processed', 0)}")
            print(f"      Total Cost: ${batch.get('total_cost', 0):.2f}")
            print(f"      Average Cost per Property: ${batch.get('average_cost_per_property', 0):.2f}")
            print(f"      Average Processing Time: {batch.get('average_processing_time', 0):.2f}s")
            print(f"      Cost Effective: {'✅' if batch.get('cost_effective') else '❌'}")
            print(f"      Fast Processing: {'✅' if batch.get('fast_processing') else '❌'}")
        
        print(f"\n💡 COST OPTIMIZATION INSIGHTS:")
        if score['total_score'] >= 85:
            print("   🟢 EXCELLENT: Cost optimization is working exceptionally well!")
            print("   • Free sources are being prioritized effectively")
            print("   • Processing costs are minimal")
            print("   • Batch processing is highly efficient")
        elif score['total_score'] >= 70:
            print("   🟡 GOOD: Cost optimization is functional with room for improvement")
            print("   • Most free sources are being utilized")
            print("   • Costs are reasonable but could be optimized further")
        else:
            print("   🔴 NEEDS IMPROVEMENT: Cost optimization requires attention")
            print("   • Review free source configuration")
            print("   • Optimize processing costs")
            print("   • Improve batch processing efficiency")
        
        print("\n" + "=" * 90)

async def main():
    """Run cost optimization validation"""
    async with CostOptimizationValidator() as validator:
        try:
            results = await validator.run_cost_optimization_validation()
            validator.print_cost_optimization_report(results)
            
            # Save results
            with open('/home/yogi/fishmouth/cost_optimization_report.json', 'w') as f:
                json.dump(results, f, indent=2)
            
            logger.info("📄 Cost optimization report saved to: /home/yogi/fishmouth/cost_optimization_report.json")
            
        except Exception as e:
            logger.error(f"Cost optimization validation failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(main())
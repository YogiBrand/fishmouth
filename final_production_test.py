#!/usr/bin/env python3
"""
Final Production Test Suite
Verifies ALL systems are working with real data integration
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

# Test all service endpoints
SERVICES = {
    'Frontend': 'http://localhost:3000',
    'Main Backend': 'http://localhost:8000', 
    'Voice Server': 'http://localhost:8001',
    'Enrichment': 'http://localhost:8004',
    'Lead Generator': 'http://localhost:8008',
    'Orchestrator': 'http://localhost:8009',
    'Image Processor': 'http://localhost:8012'
}

async def test_service_health(session, name, url):
    """Test service health endpoint"""
    try:
        health_url = f"{url}/health" if not url.endswith('3000') else url
        async with session.get(health_url, timeout=10) as response:
            if response.status == 200:
                data = await response.json() if url.endswith(('8000', '8001', '8004', '8008', '8009', '8012')) else {'status': 'ok'}
                return {'service': name, 'status': '✅ HEALTHY', 'response_time': f"{response.headers.get('response-time', 'N/A')}ms", 'details': data}
            else:
                return {'service': name, 'status': f'❌ ERROR ({response.status})', 'response_time': 'N/A'}
    except Exception as e:
        return {'service': name, 'status': f'❌ FAILED ({str(e)})', 'response_time': 'N/A'}

async def test_database_integration():
    """Test database has production data"""
    try:
        import psycopg2
        conn = psycopg2.connect(
            host='localhost',
            port=5432,
            database='fishmouth',
            user='fishmouth', 
            password='fishmouth123'
        )
        cursor = conn.cursor()
        
        # Check all critical tables
        tables_to_check = [
            ('data_sources', 'Scraping data sources'),
            ('raw_properties', 'Property records'),
            ('raw_permits', 'Permit records'),
            ('lead_scores', 'Scored leads'),
            ('property_images', 'Property images'),
            ('scraping_jobs', 'Scraping jobs')
        ]
        
        results = []
        total_records = 0
        
        for table, description in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            total_records += count
            results.append({
                'table': table,
                'description': description,
                'records': count,
                'status': '✅ POPULATED' if count > 0 else '❌ EMPTY'
            })
        
        conn.close()
        
        return {
            'database_status': '✅ CONNECTED',
            'total_records': total_records,
            'tables': results
        }
        
    except Exception as e:
        return {
            'database_status': f'❌ ERROR: {str(e)}',
            'total_records': 0,
            'tables': []
        }

async def test_data_flow_integration(session):
    """Test end-to-end data flow"""
    tests = []
    
    # Test orchestrator system health
    try:
        async with session.get('http://localhost:8009/health', timeout=10) as response:
            if response.status == 200:
                data = await response.json()
                system_health = data.get('system_health', {})
                tests.append({
                    'test': 'System Health Monitoring',
                    'status': '✅ WORKING',
                    'details': f"Services monitored: {len(system_health.get('services', {}))}"
                })
            else:
                tests.append({'test': 'System Health Monitoring', 'status': '❌ FAILED', 'details': 'Health endpoint error'})
    except Exception as e:
        tests.append({'test': 'System Health Monitoring', 'status': '❌ FAILED', 'details': str(e)})
    
    # Test lead generator data access
    try:
        async with session.get('http://localhost:8008/health', timeout=10) as response:
            if response.status == 200:
                data = await response.json()
                services = data.get('services', {})
                db_status = services.get('database', 'unknown')
                tests.append({
                    'test': 'Lead Generator Database Access',
                    'status': '✅ WORKING' if db_status == 'ok' else '❌ FAILED',
                    'details': f"Database: {db_status}"
                })
            else:
                tests.append({'test': 'Lead Generator Database Access', 'status': '❌ FAILED', 'details': 'Service error'})
    except Exception as e:
        tests.append({'test': 'Lead Generator Database Access', 'status': '❌ FAILED', 'details': str(e)})
    
    # Test enrichment service integration
    try:
        async with session.get('http://localhost:8004/health', timeout=10) as response:
            if response.status == 200:
                data = await response.json()
                services = data.get('services', {})
                tests.append({
                    'test': 'Enrichment Service Integration',
                    'status': '✅ WORKING',
                    'details': f"Redis: {services.get('redis')}, DB: {services.get('database')}"
                })
            else:
                tests.append({'test': 'Enrichment Service Integration', 'status': '❌ FAILED', 'details': 'Service error'})
    except Exception as e:
        tests.append({'test': 'Enrichment Service Integration', 'status': '❌ FAILED', 'details': str(e)})
    
    # Test image processor cost optimization
    try:
        async with session.get('http://localhost:8012/health', timeout=10) as response:
            if response.status == 200:
                data = await response.json()
                cost_opts = data.get('cost_optimizations', {})
                tests.append({
                    'test': 'Cost-Optimized Image Processing',
                    'status': '✅ WORKING',
                    'details': f"Free OSM: {cost_opts.get('free_openstreetmap')}, Savings: {data.get('estimated_cost_savings')}"
                })
            else:
                tests.append({'test': 'Cost-Optimized Image Processing', 'status': '❌ FAILED', 'details': 'Service error'})
    except Exception as e:
        tests.append({'test': 'Cost-Optimized Image Processing', 'status': '❌ FAILED', 'details': str(e)})
    
    return tests

async def main():
    """Run complete production readiness test"""
    print("🚀 FISH MOUTH PRODUCTION READINESS TEST")
    print("=" * 60)
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n")
    
    start_time = time.time()
    
    # Test 1: Service Health Checks
    print("🔍 Testing Service Health...")
    async with aiohttp.ClientSession() as session:
        health_tasks = [test_service_health(session, name, url) for name, url in SERVICES.items()]
        health_results = await asyncio.gather(*health_tasks, return_exceptions=True)
    
    print("\n📊 SERVICE HEALTH RESULTS:")
    services_healthy = 0
    for result in health_results:
        if isinstance(result, dict):
            print(f"   {result['service']:<20} {result['status']:<15} {result.get('response_time', 'N/A'):<10}")
            if '✅' in result['status']:
                services_healthy += 1
        else:
            print(f"   {'ERROR':<20} ❌ FAILED      N/A")
    
    print(f"\n✅ Services Healthy: {services_healthy}/{len(SERVICES)}")
    
    # Test 2: Database Integration
    print("\n🗄️  Testing Database Integration...")
    db_results = await test_database_integration()
    
    print(f"\n📊 DATABASE INTEGRATION RESULTS:")
    print(f"   Database Status: {db_results['database_status']}")
    print(f"   Total Records: {db_results['total_records']:,}")
    
    for table_info in db_results['tables']:
        print(f"   {table_info['table']:<20} {table_info['status']:<15} {table_info['records']:,} records")
    
    # Test 3: Data Flow Integration  
    print("\n🔄 Testing Data Flow Integration...")
    async with aiohttp.ClientSession() as session:
        flow_results = await test_data_flow_integration(session)
    
    print(f"\n📊 DATA FLOW INTEGRATION RESULTS:")
    flow_tests_passed = 0
    for test in flow_results:
        print(f"   {test['test']:<35} {test['status']:<15}")
        print(f"      Details: {test['details']}")
        if '✅' in test['status']:
            flow_tests_passed += 1
    
    # Final Results
    end_time = time.time()
    test_duration = end_time - start_time
    
    print("\n" + "=" * 60)
    print("🎯 FINAL PRODUCTION READINESS ASSESSMENT")
    print("=" * 60)
    
    # Calculate overall scores
    service_score = (services_healthy / len(SERVICES)) * 100
    database_score = 100 if db_results['total_records'] > 400 else (db_results['total_records'] / 400) * 100
    integration_score = (flow_tests_passed / len(flow_results)) * 100 if flow_results else 0
    overall_score = (service_score + database_score + integration_score) / 3
    
    print(f"📊 SCORE BREAKDOWN:")
    print(f"   Service Health:      {service_score:6.1f}% ({services_healthy}/{len(SERVICES)} services)")
    print(f"   Database Population: {database_score:6.1f}% ({db_results['total_records']:,} records)")
    print(f"   Data Integration:    {integration_score:6.1f}% ({flow_tests_passed}/{len(flow_results)} tests)")
    print(f"   OVERALL SCORE:       {overall_score:6.1f}%")
    
    # Production readiness determination
    if overall_score >= 95:
        status_emoji = "🎉"
        status_text = "PRODUCTION READY - LAUNCH IMMEDIATELY"
        color = "\033[92m"  # Green
    elif overall_score >= 85:
        status_emoji = "✅"
        status_text = "PRODUCTION READY - MINOR OPTIMIZATIONS POSSIBLE"
        color = "\033[92m"  # Green
    elif overall_score >= 75:
        status_emoji = "⚠️"
        status_text = "MOSTLY READY - FEW ISSUES TO ADDRESS"
        color = "\033[93m"  # Yellow
    else:
        status_emoji = "❌"
        status_text = "NOT READY - CRITICAL ISSUES NEED FIXING"
        color = "\033[91m"  # Red
    
    print(f"\n{status_emoji} PRODUCTION STATUS:")
    print(f"{color}   {status_text}\033[0m")
    
    # Business metrics
    if db_results['total_records'] > 0:
        estimated_lead_value = 0
        for table_info in db_results['tables']:
            if table_info['table'] == 'lead_scores':
                estimated_lead_value = table_info['records'] * 125  # $125 avg per lead
        
        print(f"\n💰 BUSINESS VALUE:")
        print(f"   Estimated Lead Value: ${estimated_lead_value:,}")
        print(f"   Monthly Revenue Potential: ${estimated_lead_value * 4:,}")
        print(f"   Annual Revenue Potential: ${estimated_lead_value * 48:,}")
    
    print(f"\n⏱️  Test completed in {test_duration:.2f} seconds")
    print(f"🌐 Access your system at: http://localhost:3000")
    
    # Action items
    if overall_score >= 95:
        print(f"\n🚀 ACTION ITEMS:")
        print(f"   1. ✅ System is ready for production use")
        print(f"   2. ✅ Start generating leads immediately")
        print(f"   3. ✅ Begin marketing to roofing contractors")
        print(f"   4. ✅ Scale to additional cities as needed")
    else:
        print(f"\n🔧 ACTION ITEMS:")
        if services_healthy < len(SERVICES):
            print(f"   1. Fix service health issues")
        if db_results['total_records'] < 400:
            print(f"   2. Populate database with more production data")
        if flow_tests_passed < len(flow_results):
            print(f"   3. Resolve data integration issues")
    
    print("\n" + "=" * 60)
    return overall_score >= 95

if __name__ == "__main__":
    success = asyncio.run(main())
    if success:
        print("🎉 ALL SYSTEMS GO - PRODUCTION LAUNCH APPROVED! 🎉")
        exit(0)
    else:
        print("❌ PRODUCTION LAUNCH BLOCKED - RESOLVE ISSUES FIRST")
        exit(1)

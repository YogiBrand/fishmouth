#!/usr/bin/env python3
"""
Test script for Super HD satellite image enhancement
Demonstrates the capabilities of the advanced image processing
"""

import asyncio
import requests
import json
import time
from pathlib import Path

# Test configuration
IMAGE_PROCESSOR_URL = "http://localhost:8012"
TEST_PROPERTY_ID = "test_house_subdivision"
TEST_COORDINATES = {
    "lat": 33.67284063987245,  # From your Mapillary screenshot
    "lng": -84.17238060834336
}

async def test_super_hd_enhancement():
    """Test the Super HD enhancement service"""
    
    print("🧪 Testing Super HD Satellite Image Enhancement")
    print("=" * 60)
    
    # Step 1: Check service health
    print("\n1. Checking Image Processor Service Health...")
    try:
        response = requests.get(f"{IMAGE_PROCESSOR_URL}/readyz")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ Service healthy on port 8012")
            print(f"🎯 Cost optimizations: {health_data.get('cost_optimizations', {})}")
        else:
            print(f"❌ Service not healthy: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Cannot connect to image processor: {e}")
        return
    
    # Step 2: Download a test satellite image first (using free sources)
    print(f"\n2. Downloading satellite imagery for test coordinates...")
    satellite_request = {
        "property_id": TEST_PROPERTY_ID,
        "lat": TEST_COORDINATES["lat"],
        "lng": TEST_COORDINATES["lng"],
        "zoom": 18,
        "prefer_free": True
    }
    
    try:
        response = requests.post(
            f"{IMAGE_PROCESSOR_URL}/images/satellite/cost-optimized",
            json=satellite_request
        )
        if response.status_code == 200:
            print("✅ Satellite download queued")
            # Wait for processing
            print("⏳ Waiting for satellite download to complete...")
            time.sleep(10)
        else:
            print(f"❌ Satellite download failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Satellite download error: {e}")
    
    # Step 3: Test Super HD enhancement
    print(f"\n3. Testing Super HD Enhancement...")
    
    # Test different enhancement levels
    enhancement_tests = [
        {"level": "light", "resolution": "2k"},
        {"level": "medium", "resolution": "4k"},
        {"level": "maximum", "resolution": "4k"}
    ]
    
    for test in enhancement_tests:
        print(f"\n   Testing {test['level']} enhancement at {test['resolution']}...")
        
        enhancement_request = {
            "property_id": TEST_PROPERTY_ID,
            "lat": TEST_COORDINATES["lat"],
            "lng": TEST_COORDINATES["lng"],
            "enhancement_level": test['level'],
            "target_resolution": test['resolution'],
            "apply_mapillary_context": True
        }
        
        try:
            response = requests.post(
                f"{IMAGE_PROCESSOR_URL}/images/super-hd/enhance",
                json=enhancement_request
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ {test['level'].title()} enhancement queued")
                print(f"   🎯 Methods: {len(result.get('enhancement_methods', []))} AI techniques")
                print(f"   ⏱️ Estimated time: {result.get('estimated_processing_time')}")
            else:
                print(f"   ❌ Enhancement failed: {response.status_code}")
                if response.text:
                    print(f"   Error: {response.text}")
                    
        except Exception as e:
            print(f"   ❌ Enhancement request error: {e}")
    
    # Step 4: Wait for processing and check results
    print(f"\n4. Waiting for enhancement processing...")
    time.sleep(30)  # Wait for processing
    
    # Check status
    try:
        response = requests.get(f"{IMAGE_PROCESSOR_URL}/images/super-hd/status/{TEST_PROPERTY_ID}")
        if response.status_code == 200:
            status = response.json()
            print(f"\n📊 Enhancement Status for {TEST_PROPERTY_ID}:")
            print(f"   Has enhanced images: {status.get('has_enhanced_images')}")
            print(f"   Total enhanced versions: {status.get('total_enhanced_versions')}")
            print(f"   Enhanced images: {len(status.get('enhanced_images', []))}")
            print(f"   Comparison images: {len(status.get('comparison_images', []))}")
            
            if status.get('enhancement_metadata'):
                metadata = status['enhancement_metadata']
                print(f"   Last enhancement: {metadata.get('enhancement_timestamp')}")
                
                if 'enhancement_result' in metadata:
                    result = metadata['enhancement_result']
                    print(f"   Resolution upgrade: {result.get('original_resolution')} → {result.get('enhanced_resolution')}")
                    print(f"   Enhancement factor: {result.get('enhancement_factor')}")
                    print(f"   File size: {result.get('file_size_mb')} MB")
                
        else:
            print(f"❌ Status check failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Status check error: {e}")
    
    # Step 5: Cost summary
    print(f"\n5. Checking cost optimization summary...")
    try:
        response = requests.get(f"{IMAGE_PROCESSOR_URL}/costs/summary")
        if response.status_code == 200:
            cost_data = response.json()
            print(f"✅ Cost Summary:")
            print(f"   Properties processed: {cost_data.get('properties_processed')}")
            print(f"   Total cost: ${cost_data.get('total_cost')}")
            print(f"   Traditional cost would be: ${cost_data.get('traditional_cost')}")
            print(f"   Savings: ${cost_data.get('savings')} ({cost_data.get('savings_percentage')}%)")
            print(f"   Average cost per property: ${cost_data.get('avg_cost_per_property')}")
            
            source_usage = cost_data.get('source_usage', {})
            if source_usage:
                print(f"   Sources used: {', '.join(source_usage.keys())}")
        else:
            print(f"⚠️ Cost summary not available: {response.status_code}")
    except Exception as e:
        print(f"⚠️ Cost summary error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Super HD Enhancement Test Complete!")
    print("\nTo view results:")
    print(f"   Enhanced images: /app/images/satellite/{TEST_PROPERTY_ID}/enhanced/")
    print(f"   Before/after comparisons: /app/images/satellite/{TEST_PROPERTY_ID}/comparisons/")
    print(f"   Enhancement metadata: /app/images/satellite/{TEST_PROPERTY_ID}/metadata/")
    
    return True

def test_enhancement_methods():
    """Test the available enhancement methods"""
    
    print("\n🔬 Available Enhancement Methods:")
    print("=" * 50)
    
    methods = [
        {
            "name": "Real-ESRGAN Style",
            "description": "Advanced super resolution using ESRGAN-inspired techniques",
            "best_for": "Maximum quality improvement, architectural details"
        },
        {
            "name": "SRCNN Enhancement", 
            "description": "Neural network inspired feature extraction and enhancement",
            "best_for": "Balanced speed and quality, general improvements"
        },
        {
            "name": "EDSR Detail Enhancement",
            "description": "Enhanced Deep Super Resolution for fine details",
            "best_for": "Fine detail preservation, roof textures"
        },
        {
            "name": "Satellite-Specific Optimization",
            "description": "Custom algorithms tuned for satellite imagery characteristics",
            "best_for": "Building edges, property boundaries, roof analysis"
        },
        {
            "name": "Advanced Local Processing",
            "description": "Multi-stage local enhancement with adaptive filtering",
            "best_for": "Overall quality, contrast, and clarity"
        }
    ]
    
    for i, method in enumerate(methods, 1):
        print(f"\n{i}. {method['name']}")
        print(f"   📝 {method['description']}")
        print(f"   🎯 Best for: {method['best_for']}")
    
    print(f"\n💡 All methods work together in the 'maximum' enhancement level")
    print(f"🚀 Processing is done locally using open source techniques")
    print(f"💰 Zero additional API costs for enhancement")

if __name__ == "__main__":
    print("🛰️ Fishmouth Super HD Satellite Image Enhancement Test")
    print("Advanced AI-powered image quality improvement for property analysis")
    
    # Show available methods
    test_enhancement_methods()
    
    # Run the actual test
    asyncio.run(test_super_hd_enhancement())
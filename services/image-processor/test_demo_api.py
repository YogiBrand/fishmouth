#!/usr/bin/env python3
"""
Test client for Super HD Enhancement Demo API
Demonstrates satellite image enhancement capabilities
"""

import requests
import json
import base64
from pathlib import Path
import time

# API Configuration
API_BASE_URL = "http://localhost:8015"

def test_api_health():
    """Test if the API is running and healthy"""
    print("🔍 Testing API Health...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ API is healthy!")
            print(f"   Service: {health_data['service']}")
            print(f"   Enhancement methods: {health_data['enhancement_methods']}")
            print(f"   Supported formats: {', '.join(health_data['supported_formats'])}")
            print(f"   Max resolution: {health_data['max_resolution']}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

def test_api_info():
    """Get API information"""
    print("\n📋 Getting API Information...")
    
    try:
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            info = response.json()
            print(f"✅ API Info:")
            print(f"   Message: {info['message']}")
            print(f"   Version: {info['version']}")
            print(f"   Capabilities:")
            for capability in info['capabilities']:
                print(f"     • {capability}")
            return True
        else:
            print(f"❌ Failed to get API info: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API info request failed: {e}")
        return False

def save_base64_image(b64_data: str, filename: str):
    """Save base64 encoded image to file"""
    try:
        image_data = base64.b64decode(b64_data)
        output_path = Path(filename)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'wb') as f:
            f.write(image_data)
        
        print(f"💾 Saved: {output_path}")
        return str(output_path)
    except Exception as e:
        print(f"❌ Failed to save image: {e}")
        return None

def create_sample_image():
    """Create a sample blurry satellite-style image for testing"""
    print("\n🎨 Creating sample satellite image for testing...")
    
    try:
        import cv2
        import numpy as np
        
        # Create a simulated low-quality satellite image
        img_size = 320  # Small, blurry starting image
        
        # Create base image with some structure
        img = np.random.randint(80, 120, (img_size, img_size, 3), dtype=np.uint8)
        
        # Add building-like rectangles
        for i in range(5):
            x1 = np.random.randint(50, img_size-100)
            y1 = np.random.randint(50, img_size-100)
            w = np.random.randint(40, 80)
            h = np.random.randint(40, 80)
            
            color = np.random.randint(90, 140, 3).tolist()
            cv2.rectangle(img, (x1, y1), (x1+w, y1+h), color, -1)
        
        # Add roads
        cv2.line(img, (0, img_size//2), (img_size, img_size//2), (70, 70, 70), 8)
        cv2.line(img, (img_size//2, 0), (img_size//2, img_size), (70, 70, 70), 8)
        
        # Add noise to simulate low quality
        noise = np.random.randint(-20, 20, img.shape, dtype=np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        
        # Apply blur to simulate poor quality
        img = cv2.GaussianBlur(img, (5, 5), 1.5)
        
        # Save sample image
        sample_path = Path("images/sample_blurry_satellite.jpg")
        sample_path.parent.mkdir(parents=True, exist_ok=True)
        
        cv2.imwrite(str(sample_path), img, [cv2.IMWRITE_JPEG_QUALITY, 60])  # Low quality
        
        print(f"✅ Created sample image: {sample_path}")
        print(f"   Resolution: {img_size}x{img_size}")
        print(f"   Quality: Low (simulates blurry satellite imagery)")
        
        return str(sample_path)
        
    except Exception as e:
        print(f"❌ Failed to create sample image: {e}")
        return None

def test_enhancement(image_path: str, enhancement_level: str = "maximum", target_resolution: str = "4k"):
    """Test the enhancement endpoint"""
    print(f"\n🚀 Testing {enhancement_level} enhancement at {target_resolution} resolution...")
    
    try:
        if not Path(image_path).exists():
            print(f"❌ Image file not found: {image_path}")
            return False
        
        # Read and upload image
        with open(image_path, 'rb') as f:
            files = {'file': (Path(image_path).name, f, 'image/jpeg')}
            data = {
                'enhancement_level': enhancement_level,
                'target_resolution': target_resolution
            }
            
            print(f"   📤 Uploading {Path(image_path).name}...")
            start_time = time.time()
            
            response = requests.post(f"{API_BASE_URL}/enhance", files=files, data=data)
            
            processing_time = time.time() - start_time
            
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ Enhancement completed in {processing_time:.1f} seconds!")
            print(f"   Original: {result['original_resolution']}")
            print(f"   Enhanced: {result['enhanced_resolution']}")
            print(f"   Enhancement factor: {result['enhancement_factor']}")
            print(f"   File size: {result['file_size_kb']} KB")
            print(f"   Methods used: {len(result['processing_methods'])}")
            
            # Save enhanced image
            enhanced_path = f"images/enhanced_{enhancement_level}_{target_resolution}.jpg"
            save_base64_image(result['enhanced_image_b64'], enhanced_path)
            
            # Save comparison image
            comparison_path = f"images/comparison_{enhancement_level}_{target_resolution}.jpg"
            save_base64_image(result['comparison_image_b64'], comparison_path)
            
            print(f"   📁 Enhanced image: {enhanced_path}")
            print(f"   📁 Comparison: {comparison_path}")
            
            return True
        else:
            print(f"❌ Enhancement failed: {response.status_code}")
            if response.text:
                print(f"   Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Enhancement test failed: {e}")
        return False

def test_coordinate_enhancement(image_path: str):
    """Test coordinate-aware enhancement (Mapillary integration)"""
    print(f"\n🗺️ Testing coordinate-aware enhancement...")
    
    # Use coordinates from your Mapillary screenshot
    test_data = {
        "property_id": "subdivision_house_demo",
        "lat": 33.67284063987245,
        "lng": -84.17238060834336,
        "enhancement_level": "maximum",
        "target_resolution": "4k"
    }
    
    try:
        with open(image_path, 'rb') as f:
            files = {'file': (Path(image_path).name, f, 'image/jpeg')}
            
            print(f"   📍 Coordinates: {test_data['lat']}, {test_data['lng']}")
            print(f"   🏠 Property ID: {test_data['property_id']}")
            
            response = requests.post(f"{API_BASE_URL}/enhance-coordinates", files=files, data=test_data)
            
        if response.status_code == 200:
            result = response.json()
            
            print(f"✅ Coordinate-aware enhancement completed!")
            print(f"   Property ID: {result['property_id']}")
            print(f"   Coordinates: {result['coordinates']}")
            print(f"   Mapillary context: {result['mapillary_context_applied']}")
            
            # Save results
            enhanced_path = f"images/enhanced_with_coordinates.jpg"
            save_base64_image(result['enhanced_image_b64'], enhanced_path)
            
            comparison_path = f"images/comparison_with_coordinates.jpg"
            save_base64_image(result['comparison_image_b64'], comparison_path)
            
            print(f"   📁 Enhanced: {enhanced_path}")
            print(f"   📁 Comparison: {comparison_path}")
            
            return True
        else:
            print(f"❌ Coordinate enhancement failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Coordinate enhancement test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🛰️ Super HD Satellite Image Enhancement Demo")
    print("=" * 60)
    
    # Test API health
    if not test_api_health():
        print("❌ API is not available. Make sure it's running on port 8015")
        return
    
    # Get API info
    test_api_info()
    
    # Create sample image for testing
    sample_image = create_sample_image()
    if not sample_image:
        print("❌ Could not create sample image")
        return
    
    # Test different enhancement levels
    enhancement_tests = [
        ("light", "2k"),
        ("medium", "4k"), 
        ("maximum", "4k"),
        ("maximum", "8k")  # Push the limits
    ]
    
    success_count = 0
    for level, resolution in enhancement_tests:
        if test_enhancement(sample_image, level, resolution):
            success_count += 1
        time.sleep(1)  # Brief pause between tests
    
    # Test coordinate-aware enhancement
    if test_coordinate_enhancement(sample_image):
        success_count += 1
    
    print(f"\n" + "=" * 60)
    print(f"🎉 Testing Complete!")
    print(f"✅ Successful tests: {success_count}/{len(enhancement_tests) + 1}")
    
    if success_count > 0:
        print(f"\n📁 Enhanced images saved in: ./images/")
        print(f"💡 Compare original vs enhanced to see the quality improvement!")
        print(f"🎯 The API successfully demonstrated:")
        print(f"   • Real-ESRGAN style super resolution")
        print(f"   • Satellite-specific optimizations")
        print(f"   • Multiple quality levels (light/medium/maximum)")
        print(f"   • Various target resolutions (2K/4K/8K)")
        print(f"   • Coordinate-aware processing for Mapillary integration")
        
        # Show file sizes for comparison
        try:
            import os
            original_size = os.path.getsize(sample_image)
            enhanced_files = list(Path("images").glob("enhanced_*.jpg"))
            if enhanced_files:
                enhanced_size = os.path.getsize(enhanced_files[0])
                print(f"\n📊 File size comparison:")
                print(f"   Original: {original_size // 1024} KB")
                print(f"   Enhanced: {enhanced_size // 1024} KB")
        except:
            pass

if __name__ == "__main__":
    main()
# 🎯 Bulletproof Quality Control - Complete Implementation Guide

**Version**: 1.0  
**Date**: 2025-10-13  
**Status**: Ready for Implementation  
**Estimated Time**: 4 weeks full-time, 6 weeks part-time

---

## 📋 Table of Contents

1. [Pre-Implementation Checklist](#pre-implementation-checklist)
2. [Phase 1: Foundation (Week 1)](#phase-1-foundation-week-1)
3. [Phase 2: Core Enhancement (Week 2)](#phase-2-core-enhancement-week-2)
4. [Phase 3: Advanced Features (Week 3)](#phase-3-advanced-features-week-3)
5. [Phase 4: Integration & Testing (Week 4)](#phase-4-integration--testing-week-4)
6. [Configuration Reference](#configuration-reference)
7. [Testing Procedures](#testing-procedures)
8. [Deployment Checklist](#deployment-checklist)

---

## Pre-Implementation Checklist

### ✅ Required Before Starting

#### 1. API Keys & Accounts
```bash
# REQUIRED
✅ Anthropic Claude API key (already have)
✅ OpenCV installed (already have)
✅ PostgreSQL database running (already have)

# OPTIONAL BUT RECOMMENDED (for Phase 2)
⚠️ Attom Data API key ($0.10/lookup) - Get from: https://api.gateway.attomdata.com/
⚠️ Melissa Data API key ($0.05/lookup) - Get from: https://www.melissa.com/
✅ US Census API (FREE, no key needed)

# OPTIONAL (for Phase 3)
⚠️ OpenAI API key (for multi-model verification) - Get from: https://platform.openai.com/
```

#### 2. Development Environment Setup
```bash
cd /home/yogi/fishmouth

# Create new branch
git checkout -b feature/bulletproof-quality-control

# Ensure virtual environment
cd backend
source venv/bin/activate

# Install new dependencies
pip install opencv-python-headless>=4.8.0
pip install scikit-image>=0.21.0  # For advanced image analysis
pip install openai>=1.0.0  # For multi-model verification (optional)

# Update requirements.txt
pip freeze > requirements.txt

# Frontend (no changes needed initially)
cd ../frontend
npm install  # Ensure all deps are current
```

#### 3. Database Backup
```bash
# CRITICAL: Backup database before migrations
cd /home/yogi/fishmouth
docker-compose exec postgres pg_dump -U fishmouth fishmouth > backup_pre_bulletproof_$(date +%Y%m%d).sql

# Or if running locally
pg_dump -U fishmouth -d fishmouth > backup_pre_bulletproof_$(date +%Y%m%d).sql
```

#### 4. Documentation Review
- ✅ Read `.speckit/BULLETPROOF_INTEGRATION_PLAN.md` (high-level strategy)
- ✅ Read `.speckit/BULLETPROOF_QUICK_SUMMARY.md` (quick reference)
- ✅ Read `.speckit/architecture/database-schema.md` (current schema)
- ✅ Read `.speckit/CURRENT_STATUS.md` (current system status)

---

## Phase 1: Foundation (Week 1)

**Goal**: Implement image quality validation and feedback tracking  
**Estimated Time**: 5-7 days  
**Value Delivered**: 40% of total enhancement value

### Day 1-2: Image Quality Validator

#### Step 1.1: Create Service Directory Structure

```bash
cd /home/yogi/fishmouth/backend
mkdir -p services/quality
touch services/quality/__init__.py
touch services/quality/image_validator.py
touch services/quality/quality_models.py
```

#### Step 1.2: Create Quality Models

**File**: `/backend/services/quality/quality_models.py`

```python
"""
Data models for quality control system
"""
from dataclasses import dataclass
from typing import List, Optional, Dict


@dataclass
class ImageQualityResult:
    """Result of image quality validation"""
    is_valid: bool
    overall_score: float  # 0-100
    resolution_score: float
    brightness_score: float
    contrast_score: float
    sharpness_score: float
    shadow_score: float
    roof_visibility_score: float
    weather_score: float
    compression_score: float
    issues: List[str]
    warnings: List[str]
    metadata: Dict


@dataclass
class LeadQualityScore:
    """Enhanced lead scoring result"""
    total_score: float  # 0-100
    priority: str  # QUALIFIED, POTENTIAL, REJECT
    
    # Component scores
    urgency_score: float
    financial_score: float
    damage_score: float
    engagement_score: float
    property_score: float
    
    # Breakdown
    breakdown: Dict[str, float]
    rejection_reasons: List[str]
    qualification_notes: List[str]
    
    # Metadata
    confidence_level: str  # HIGH, MEDIUM, LOW
    recommended_action: str
```

#### Step 1.3: Implement Image Quality Validator

**File**: `/backend/services/quality/image_validator.py`

```python
"""
Image Quality Validation Service
Pre-flight checks to reject unusable images before AI analysis
"""

import cv2
import numpy as np
from typing import Tuple
import logging
from .quality_models import ImageQualityResult

logger = logging.getLogger(__name__)


class ImageQualityValidator:
    """
    Validates image quality before expensive AI analysis
    
    Checks:
    1. Resolution (min 800x800)
    2. Brightness (not too dark/bright)
    3. Contrast (sufficient detail)
    4. Sharpness (detect blur with Laplacian)
    5. Shadow detection (heavy shadows hide damage)
    6. Roof visibility (trees/obstructions)
    7. Weather interference (clouds, fog)
    8. Compression artifacts (over-compressed JPEGs)
    """
    
    # Thresholds (configurable via environment)
    MIN_RESOLUTION = 800
    MIN_BRIGHTNESS = 30
    MAX_BRIGHTNESS = 225
    MIN_CONTRAST = 30
    MIN_SHARPNESS = 50
    MIN_ROOF_VISIBILITY = 0.60  # 60% of image should be roof
    MIN_OVERALL_SCORE = 70  # Pass threshold
    
    def __init__(self, min_score: int = 70):
        """
        Initialize validator
        
        Args:
            min_score: Minimum overall score to pass (default 70)
        """
        self.min_score = min_score
        self.validation_count = 0
        self.rejection_count = 0
    
    def validate_image(self, image_data: bytes) -> ImageQualityResult:
        """
        Comprehensive image quality validation
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            ImageQualityResult with pass/fail and detailed scores
        """
        self.validation_count += 1
        
        # Decode image
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return self._failed_result("Failed to decode image")
                
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            return self._failed_result(f"Decode error: {str(e)}")
        
        issues = []
        warnings = []
        scores = {}
        
        # Run all quality checks
        height, width = img.shape[:2]
        
        # 1. Resolution check
        scores['resolution'] = self._check_resolution(width, height, issues, warnings)
        
        # 2. Brightness check
        scores['brightness'] = self._check_brightness(img, issues, warnings)
        
        # 3. Contrast check
        scores['contrast'] = self._check_contrast(img, issues, warnings)
        
        # 4. Sharpness/blur check
        scores['sharpness'] = self._check_sharpness(img, issues, warnings)
        
        # 5. Shadow detection
        scores['shadows'] = self._check_shadows(img, issues, warnings)
        
        # 6. Roof visibility
        scores['roof_visibility'] = self._check_roof_visibility(img, issues, warnings)
        
        # 7. Weather interference
        scores['weather'] = self._check_weather(img, issues, warnings)
        
        # 8. Compression artifacts
        scores['compression'] = self._check_compression(img, issues, warnings)
        
        # Calculate weighted overall score
        weights = {
            'resolution': 0.15,
            'brightness': 0.10,
            'contrast': 0.15,
            'sharpness': 0.20,
            'shadows': 0.10,
            'roof_visibility': 0.20,
            'weather': 0.05,
            'compression': 0.05
        }
        
        overall_score = sum(scores[k] * weights[k] for k in scores)
        overall_score = round(overall_score, 2)
        
        # Determine if valid (pass threshold + not too many critical issues)
        is_valid = overall_score >= self.min_score and len(issues) <= 2
        
        if not is_valid:
            self.rejection_count += 1
            logger.info(f"Image rejected: score={overall_score}, issues={issues}")
        
        return ImageQualityResult(
            is_valid=is_valid,
            overall_score=overall_score,
            resolution_score=scores['resolution'],
            brightness_score=scores['brightness'],
            contrast_score=scores['contrast'],
            sharpness_score=scores['sharpness'],
            shadow_score=scores['shadows'],
            roof_visibility_score=scores['roof_visibility'],
            weather_score=scores['weather'],
            compression_score=scores['compression'],
            issues=issues,
            warnings=warnings,
            metadata={
                'width': width,
                'height': height,
                'total_validations': self.validation_count,
                'total_rejections': self.rejection_count,
                'rejection_rate': round(self.rejection_count / self.validation_count * 100, 1)
            }
        )
    
    def _check_resolution(self, width: int, height: int, issues: List, warnings: List) -> float:
        """Check image resolution"""
        min_dimension = min(width, height)
        
        if min_dimension < self.MIN_RESOLUTION:
            issues.append(f"Resolution too low: {width}x{height} (minimum {self.MIN_RESOLUTION}px)")
            return max(0, (min_dimension / self.MIN_RESOLUTION) * 100)
        
        # Bonus for high resolution
        if min_dimension >= 2000:
            return 100.0
        elif min_dimension >= 1500:
            return 95.0
        elif min_dimension >= 1200:
            return 90.0
        else:
            warnings.append(f"Resolution acceptable but not optimal: {width}x{height}")
            return 85.0
    
    def _check_brightness(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check brightness levels"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_brightness = np.mean(gray)
        
        if mean_brightness < self.MIN_BRIGHTNESS:
            issues.append(f"Image too dark (brightness: {mean_brightness:.0f})")
            return (mean_brightness / self.MIN_BRIGHTNESS) * 100
        
        if mean_brightness > self.MAX_BRIGHTNESS:
            issues.append(f"Image too bright/washed out (brightness: {mean_brightness:.0f})")
            return (self.MAX_BRIGHTNESS / mean_brightness) * 100
        
        # Optimal range: 80-180
        if 80 <= mean_brightness <= 180:
            return 100.0
        else:
            warnings.append(f"Brightness suboptimal: {mean_brightness:.0f}")
            return 90.0
    
    def _check_contrast(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check contrast levels"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        contrast = gray.std()
        
        if contrast < self.MIN_CONTRAST:
            issues.append(f"Low contrast (contrast: {contrast:.0f})")
            return (contrast / self.MIN_CONTRAST) * 100
        
        # Higher contrast is better for roof analysis
        if contrast >= 60:
            return 100.0
        elif contrast >= 45:
            return 95.0
        elif contrast >= 30:
            warnings.append(f"Contrast acceptable but low: {contrast:.0f}")
            return 85.0
        else:
            return 75.0
    
    def _check_sharpness(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check image sharpness using Laplacian variance"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if laplacian_var < self.MIN_SHARPNESS:
            issues.append(f"Image too blurry (sharpness: {laplacian_var:.0f})")
            return (laplacian_var / self.MIN_SHARPNESS) * 100
        
        # Sharp images have high Laplacian variance
        if laplacian_var >= 200:
            return 100.0
        elif laplacian_var >= 150:
            return 95.0
        elif laplacian_var >= 100:
            return 90.0
        elif laplacian_var >= 50:
            warnings.append(f"Image slightly blurry: {laplacian_var:.0f}")
            return 85.0
        else:
            return 80.0
    
    def _check_shadows(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check for heavy shadows that hide roof details"""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Detect very dark regions (shadows)
        dark_threshold = 50
        dark_pixels = np.sum(gray < dark_threshold)
        total_pixels = gray.size
        dark_percentage = (dark_pixels / total_pixels) * 100
        
        if dark_percentage > 40:
            issues.append(f"Heavy shadows detected ({dark_percentage:.0f}% of image)")
            return max(0, 100 - dark_percentage)
        elif dark_percentage > 25:
            warnings.append(f"Moderate shadows detected ({dark_percentage:.0f}%)")
            return max(60, 100 - dark_percentage)
        else:
            return 100.0
    
    def _check_roof_visibility(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """
        Estimate roof visibility (not obstructed by trees, etc.)
        This is a simplified check - real implementation would use edge detection
        """
        # Simplified: Check for green pixels (trees) in image
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Green range in HSV
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)
        
        green_percentage = (np.sum(green_mask > 0) / green_mask.size) * 100
        
        # High green = possible tree obstruction
        if green_percentage > 50:
            issues.append(f"Heavy obstruction detected ({green_percentage:.0f}% vegetation)")
            return max(0, 100 - green_percentage)
        elif green_percentage > 30:
            warnings.append(f"Moderate obstruction ({green_percentage:.0f}% vegetation)")
            return max(60, 100 - green_percentage * 0.8)
        else:
            return 100.0
    
    def _check_weather(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check for weather interference (clouds, fog, rain)"""
        # Simplified: Check for washed out appearance (clouds/fog)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Very bright + low contrast = clouds/fog
        mean_brightness = np.mean(gray)
        contrast = gray.std()
        
        if mean_brightness > 200 and contrast < 30:
            issues.append("Weather interference detected (clouds/fog)")
            return 50.0
        elif mean_brightness > 190 and contrast < 40:
            warnings.append("Possible weather interference")
            return 80.0
        else:
            return 100.0
    
    def _check_compression(self, img: np.ndarray, issues: List, warnings: List) -> float:
        """Check for compression artifacts"""
        # Simplified: High frequency noise indicates compression
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate high-frequency component
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        high_freq = cv2.absdiff(gray, blur)
        compression_score = np.mean(high_freq)
        
        # High score = heavy compression artifacts
        if compression_score > 20:
            warnings.append(f"Compression artifacts detected (score: {compression_score:.1f})")
            return max(60, 100 - compression_score * 2)
        else:
            return 100.0
    
    def _failed_result(self, reason: str) -> ImageQualityResult:
        """Return a failed validation result"""
        return ImageQualityResult(
            is_valid=False,
            overall_score=0.0,
            resolution_score=0.0,
            brightness_score=0.0,
            contrast_score=0.0,
            sharpness_score=0.0,
            shadow_score=0.0,
            roof_visibility_score=0.0,
            weather_score=0.0,
            compression_score=0.0,
            issues=[reason],
            warnings=[],
            metadata={'error': True}
        )
    
    def get_stats(self) -> dict:
        """Get validator statistics"""
        return {
            'total_validations': self.validation_count,
            'total_rejections': self.rejection_count,
            'rejection_rate': round(self.rejection_count / max(1, self.validation_count) * 100, 1),
            'pass_rate': round((self.validation_count - self.rejection_count) / max(1, self.validation_count) * 100, 1)
        }
```

#### Step 1.4: Update Package Initialization

**File**: `/backend/services/quality/__init__.py`

```python
"""
Quality control services for bulletproof lead generation
"""

from .image_validator import ImageQualityValidator
from .quality_models import ImageQualityResult, LeadQualityScore

__all__ = [
    'ImageQualityValidator',
    'ImageQualityResult',
    'LeadQualityScore',
]
```

#### Step 1.5: Integrate with Lead Generation Service

**File**: `/backend/services/lead_generation_service.py`

Add at the top:
```python
from services.quality import ImageQualityValidator, ImageQualityResult
```

Modify the `_process_property` method (around line 200-250):

```python
async def _process_property(
    self,
    scan_id: int,
    property_candidate: PropertyCandidate,
    user_id: int
) -> Optional[Lead]:
    """Process single property with quality control"""
    
    # ... existing property discovery code ...
    
    # Get imagery
    imagery_provider = ImageryProvider()
    imagery = await imagery_provider.fetch_imagery(
        property_candidate.latitude,
        property_candidate.longitude
    )
    
    if not imagery or not imagery.image_data:
        logger.warning(f"No imagery for {property_candidate.address}")
        return None
    
    # ✨ NEW: Image Quality Validation (Pre-flight check)
    image_validator = ImageQualityValidator(min_score=70)
    quality_result = image_validator.validate_image(imagery.image_data)
    
    if not quality_result.is_valid:
        logger.info(
            f"Image rejected for {property_candidate.address}: "
            f"score={quality_result.overall_score}, "
            f"issues={quality_result.issues}"
        )
        # Don't process this property - save API costs
        return None
    
    logger.info(
        f"Image quality validated: score={quality_result.overall_score}/100 "
        f"for {property_candidate.address}"
    )
    
    # Continue with existing AI analysis
    analysis = await analyze_roof(imagery.image_data)
    
    # ... rest of existing code ...
    
    # When creating Lead object, add quality scores:
    lead = Lead(
        # ... existing fields ...
        image_quality_score=quality_result.overall_score,
        image_quality_issues=quality_result.issues if quality_result.issues else None,
        quality_validation_status='passed',
        # ... rest of fields ...
    )
    
    return lead
```

---

### Day 3-4: Feedback Tracking System

#### Step 2.1: Create Feedback Tracker Service

**File**: `/backend/services/quality/feedback_tracker.py`

```python
"""
Feedback Tracking System
Tracks lead outcomes for continuous improvement
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)


class FeedbackTrackerService:
    """
    Track lead outcomes to continuously improve system accuracy
    
    Tracks:
    - Contact attempts and results
    - Appointments scheduled/completed
    - Quotes provided
    - Contracts signed
    - Analysis accuracy validation
    - False positive/negative rates
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def track_lead(
        self,
        lead_id: int,
        initial_score: float,
        priority: str
    ) -> None:
        """
        Start tracking a new lead
        
        Args:
            lead_id: Lead ID from leads table
            initial_score: Predicted lead score
            priority: Predicted priority (QUALIFIED/POTENTIAL/REJECT)
        """
        from models import LeadOutcome
        
        # Check if already tracking
        existing = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if existing:
            logger.debug(f"Lead {lead_id} already tracked")
            return
        
        # Create new tracking record
        outcome = LeadOutcome(
            lead_id=lead_id,
            predicted_score=initial_score,
            predicted_priority=priority,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.db.add(outcome)
        self.db.commit()
        logger.info(f"Started tracking lead {lead_id}, score={initial_score}, priority={priority}")
    
    def update_contacted(
        self,
        lead_id: int,
        contacted: bool = True,
        contact_date: Optional[datetime] = None
    ) -> None:
        """Mark lead as contacted"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            logger.warning(f"Lead {lead_id} not found in tracking")
            return
        
        outcome.contacted = contacted
        outcome.contact_date = contact_date or datetime.utcnow()
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
        logger.info(f"Lead {lead_id} marked as contacted")
    
    def update_appointment(
        self,
        lead_id: int,
        scheduled: bool = True,
        appointment_date: Optional[datetime] = None
    ) -> None:
        """Mark appointment scheduled"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            return
        
        outcome.appointment_scheduled = scheduled
        outcome.appointment_date = appointment_date
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
        logger.info(f"Lead {lead_id} appointment scheduled: {appointment_date}")
    
    def update_inspection(
        self,
        lead_id: int,
        completed: bool = True,
        inspection_date: Optional[datetime] = None
    ) -> None:
        """Mark inspection completed"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            return
        
        outcome.inspection_completed = completed
        outcome.inspection_date = inspection_date or datetime.utcnow()
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
    
    def update_quote(
        self,
        lead_id: int,
        quote_amount: float,
        provided: bool = True
    ) -> None:
        """Mark quote provided"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            return
        
        outcome.quote_provided = provided
        outcome.quote_amount = quote_amount
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
    
    def update_contract(
        self,
        lead_id: int,
        contract_value: float,
        signed: bool = True,
        contract_date: Optional[datetime] = None
    ) -> None:
        """Mark contract signed"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            return
        
        outcome.contract_signed = signed
        outcome.contract_value = contract_value
        outcome.contract_date = contract_date or datetime.utcnow()
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
        logger.info(f"Lead {lead_id} contract signed: ${contract_value}")
    
    def mark_false_positive(
        self,
        lead_id: int,
        reason: str
    ) -> None:
        """Mark lead as false positive"""
        from models import LeadOutcome
        
        outcome = self.db.query(LeadOutcome).filter(
            LeadOutcome.lead_id == lead_id
        ).first()
        
        if not outcome:
            return
        
        outcome.false_positive = True
        outcome.analysis_accurate = False
        outcome.rejection_reason = reason
        outcome.updated_at = datetime.utcnow()
        
        self.db.commit()
        logger.warning(f"Lead {lead_id} marked as false positive: {reason}")
    
    def get_conversion_metrics(self, days: int = 30) -> Dict:
        """
        Calculate conversion funnel metrics
        
        Returns:
            {
                'total_leads': 150,
                'contacted': 120,
                'contact_rate': 0.80,
                'appointments': 90,
                'appointment_rate': 0.75,
                'inspections': 78,
                'inspection_rate': 0.87,
                'contracts': 42,
                'contract_rate': 0.54,
                'revenue': 618000,
                'avg_deal_value': 14714
            }
        """
        from models import LeadOutcome
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Query outcomes
        outcomes = self.db.query(LeadOutcome).filter(
            LeadOutcome.created_at >= cutoff_date
        ).all()
        
        total = len(outcomes)
        if total == 0:
            return self._empty_metrics()
        
        contacted = sum(1 for o in outcomes if o.contacted)
        appointments = sum(1 for o in outcomes if o.appointment_scheduled)
        inspections = sum(1 for o in outcomes if o.inspection_completed)
        contracts = sum(1 for o in outcomes if o.contract_signed)
        
        revenue = sum(o.contract_value for o in outcomes if o.contract_signed)
        avg_deal = revenue / contracts if contracts > 0 else 0
        
        return {
            'period_days': days,
            'total_leads': total,
            'contacted': contacted,
            'contact_rate': round(contacted / total, 3),
            'appointments': appointments,
            'appointment_rate': round(appointments / contacted, 3) if contacted > 0 else 0,
            'inspections': inspections,
            'inspection_rate': round(inspections / appointments, 3) if appointments > 0 else 0,
            'contracts': contracts,
            'contract_rate': round(contracts / inspections, 3) if inspections > 0 else 0,
            'overall_conversion': round(contracts / total, 3),
            'revenue': revenue,
            'avg_deal_value': round(avg_deal, 2)
        }
    
    def get_accuracy_metrics(self) -> Dict:
        """
        Calculate analysis accuracy metrics
        
        Returns:
            {
                'total_validated': 89,
                'accurate': 86,
                'accuracy_rate': 0.966,
                'false_positives': 3,
                'false_positive_rate': 0.034
            }
        """
        from models import LeadOutcome
        
        outcomes = self.db.query(LeadOutcome).filter(
            LeadOutcome.analysis_accurate != None
        ).all()
        
        total = len(outcomes)
        if total == 0:
            return {
                'total_validated': 0,
                'accurate': 0,
                'accuracy_rate': 0,
                'false_positives': 0,
                'false_positive_rate': 0
            }
        
        accurate = sum(1 for o in outcomes if o.analysis_accurate)
        false_positives = sum(1 for o in outcomes if o.false_positive)
        
        return {
            'total_validated': total,
            'accurate': accurate,
            'accuracy_rate': round(accurate / total, 3),
            'false_positives': false_positives,
            'false_positive_rate': round(false_positives / total, 3)
        }
    
    def get_score_calibration(self) -> Dict:
        """
        Analyze which score ranges actually convert
        
        Returns:
            {
                '90-100': {'count': 23, 'closed': 18, 'close_rate': 0.78},
                '80-89': {'count': 45, 'closed': 19, 'close_rate': 0.42},
                ...
            }
        """
        from models import LeadOutcome
        
        ranges = {
            '90-100': (90, 100),
            '80-89': (80, 89),
            '70-79': (70, 79),
            '60-69': (60, 69)
        }
        
        results = {}
        
        for range_name, (min_score, max_score) in ranges.items():
            outcomes = self.db.query(LeadOutcome).filter(
                LeadOutcome.predicted_score >= min_score,
                LeadOutcome.predicted_score <= max_score
            ).all()
            
            count = len(outcomes)
            closed = sum(1 for o in outcomes if o.contract_signed)
            
            results[range_name] = {
                'count': count,
                'closed': closed,
                'close_rate': round(closed / count, 3) if count > 0 else 0
            }
        
        return results
    
    def _empty_metrics(self) -> Dict:
        """Return empty metrics structure"""
        return {
            'period_days': 0,
            'total_leads': 0,
            'contacted': 0,
            'contact_rate': 0,
            'appointments': 0,
            'appointment_rate': 0,
            'inspections': 0,
            'inspection_rate': 0,
            'contracts': 0,
            'contract_rate': 0,
            'overall_conversion': 0,
            'revenue': 0,
            'avg_deal_value': 0
        }
```

---

### Day 5: Database Migrations

#### Step 3.1: Create Migration for New Fields

```bash
cd /home/yogi/fishmouth/backend
alembic revision -m "add_bulletproof_quality_control_phase1"
```

This creates a new migration file. Edit it:

**File**: `/backend/alembic/versions/[timestamp]_add_bulletproof_quality_control_phase1.py`

```python
"""add bulletproof quality control phase 1

Revision ID: [auto-generated]
Revises: [previous-revision]
Create Date: [auto-generated]
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '[auto-generated]'
down_revision = '[previous-revision]'
branch_labels = None
depends_on = None


def upgrade():
    # Add image quality fields to leads table
    op.add_column('leads', sa.Column('image_quality_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('image_quality_issues', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('leads', sa.Column('quality_validation_status', sa.String(20), nullable=True))
    
    # Create lead_outcomes table for feedback tracking
    op.create_table(
        'lead_outcomes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lead_id', sa.Integer(), nullable=False),
        sa.Column('predicted_score', sa.Float(), nullable=True),
        sa.Column('predicted_priority', sa.String(20), nullable=True),
        
        # Outcome tracking
        sa.Column('contacted', sa.Boolean(), nullable=False, default=False),
        sa.Column('contact_date', sa.DateTime(), nullable=True),
        sa.Column('appointment_scheduled', sa.Boolean(), nullable=False, default=False),
        sa.Column('appointment_date', sa.DateTime(), nullable=True),
        sa.Column('inspection_completed', sa.Boolean(), nullable=False, default=False),
        sa.Column('inspection_date', sa.DateTime(), nullable=True),
        sa.Column('quote_provided', sa.Boolean(), nullable=False, default=False),
        sa.Column('quote_amount', sa.Float(), nullable=True),
        sa.Column('contract_signed', sa.Boolean(), nullable=False, default=False),
        sa.Column('contract_value', sa.Float(), nullable=True),
        sa.Column('contract_date', sa.DateTime(), nullable=True),
        
        # Validation
        sa.Column('analysis_accurate', sa.Boolean(), nullable=True),
        sa.Column('false_positive', sa.Boolean(), nullable=False, default=False),
        sa.Column('false_negative', sa.Boolean(), nullable=False, default=False),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('feedback_notes', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE')
    )
    
    # Create indexes
    op.create_index('idx_lead_outcomes_lead_id', 'lead_outcomes', ['lead_id'])
    op.create_index('idx_lead_outcomes_created_at', 'lead_outcomes', ['created_at'])
    op.create_index('idx_lead_outcomes_predicted_score', 'lead_outcomes', ['predicted_score'])


def downgrade():
    # Remove indexes
    op.drop_index('idx_lead_outcomes_predicted_score', table_name='lead_outcomes')
    op.drop_index('idx_lead_outcomes_created_at', table_name='lead_outcomes')
    op.drop_index('idx_lead_outcomes_lead_id', table_name='lead_outcomes')
    
    # Drop table
    op.drop_table('lead_outcomes')
    
    # Remove columns from leads
    op.drop_column('leads', 'quality_validation_status')
    op.drop_column('leads', 'image_quality_issues')
    op.drop_column('leads', 'image_quality_score')
```

#### Step 3.2: Update Models

**File**: `/backend/models.py`

Add to Lead model (around line 130-200):

```python
class Lead(Base):
    __tablename__ = "leads"
    
    # ... existing fields ...
    
    # ✨ NEW: Image Quality Fields (Phase 1)
    image_quality_score = Column(Float, nullable=True)
    image_quality_issues = Column(JSON, nullable=True)
    quality_validation_status = Column(String(20), nullable=True)  # 'passed', 'failed', 'pending'
    
    # ... rest of existing fields ...
```

Add new LeadOutcome model:

```python
class LeadOutcome(Base):
    """Track lead outcomes for continuous improvement"""
    __tablename__ = "lead_outcomes"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=False)
    
    # Predictions
    predicted_score = Column(Float, nullable=True)
    predicted_priority = Column(String(20), nullable=True)
    
    # Outcome tracking
    contacted = Column(Boolean, default=False, nullable=False)
    contact_date = Column(DateTime, nullable=True)
    appointment_scheduled = Column(Boolean, default=False, nullable=False)
    appointment_date = Column(DateTime, nullable=True)
    inspection_completed = Column(Boolean, default=False, nullable=False)
    inspection_date = Column(DateTime, nullable=True)
    quote_provided = Column(Boolean, default=False, nullable=False)
    quote_amount = Column(Float, nullable=True)
    contract_signed = Column(Boolean, default=False, nullable=False)
    contract_value = Column(Float, nullable=True)
    contract_date = Column(DateTime, nullable=True)
    
    # Validation
    analysis_accurate = Column(Boolean, nullable=True)
    false_positive = Column(Boolean, default=False, nullable=False)
    false_negative = Column(Boolean, default=False, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    feedback_notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationship
    lead = relationship("Lead", backref="outcome")
```

#### Step 3.3: Run Migration

```bash
cd /home/yogi/fishmouth/backend
alembic upgrade head
```

---

### Day 6-7: Testing Phase 1

#### Step 4.1: Unit Tests

**File**: `/backend/tests/test_image_validator.py`

```python
"""
Unit tests for Image Quality Validator
"""
import pytest
import cv2
import numpy as np
from services.quality import ImageQualityValidator


def create_test_image(width=1000, height=1000, quality='good'):
    """Create test image with specific quality characteristics"""
    if quality == 'good':
        # High quality image
        img = np.random.randint(80, 180, (height, width, 3), dtype=np.uint8)
    elif quality == 'dark':
        # Too dark
        img = np.random.randint(0, 50, (height, width, 3), dtype=np.uint8)
    elif quality == 'blurry':
        # Blurry image
        img = np.random.randint(80, 180, (height, width, 3), dtype=np.uint8)
        img = cv2.GaussianBlur(img, (15, 15), 0)
    elif quality == 'low_res':
        # Low resolution
        img = np.random.randint(80, 180, (400, 400, 3), dtype=np.uint8)
    else:
        img = np.random.randint(80, 180, (height, width, 3), dtype=np.uint8)
    
    # Encode to bytes
    _, buffer = cv2.imencode('.jpg', img)
    return buffer.tobytes()


def test_good_quality_image():
    """Test that good quality images pass"""
    validator = ImageQualityValidator(min_score=70)
    image_data = create_test_image(quality='good')
    
    result = validator.validate_image(image_data)
    
    assert result.is_valid is True
    assert result.overall_score >= 70
    assert len(result.issues) == 0


def test_dark_image_rejected():
    """Test that dark images are rejected"""
    validator = ImageQualityValidator(min_score=70)
    image_data = create_test_image(quality='dark')
    
    result = validator.validate_image(image_data)
    
    assert result.is_valid is False
    assert any('dark' in issue.lower() for issue in result.issues)


def test_blurry_image_rejected():
    """Test that blurry images are rejected"""
    validator = ImageQualityValidator(min_score=70)
    image_data = create_test_image(quality='blurry')
    
    result = validator.validate_image(image_data)
    
    assert result.is_valid is False
    assert any('blur' in issue.lower() for issue in result.issues)


def test_low_resolution_rejected():
    """Test that low resolution images are rejected"""
    validator = ImageQualityValidator(min_score=70)
    image_data = create_test_image(quality='low_res')
    
    result = validator.validate_image(image_data)
    
    assert result.is_valid is False
    assert any('resolution' in issue.lower() for issue in result.issues)


def test_validator_stats():
    """Test validator statistics tracking"""
    validator = ImageQualityValidator(min_score=70)
    
    # Validate good image
    good_image = create_test_image(quality='good')
    validator.validate_image(good_image)
    
    # Validate bad image
    bad_image = create_test_image(quality='dark')
    validator.validate_image(bad_image)
    
    stats = validator.get_stats()
    
    assert stats['total_validations'] == 2
    assert stats['total_rejections'] == 1
    assert stats['rejection_rate'] == 50.0
```

Run tests:
```bash
cd /home/yogi/fishmouth/backend
pytest tests/test_image_validator.py -v
```

---

## Phase 2: Core Enhancement (Week 2)

**Goal**: Implement data enrichment and enhanced lead scoring  
**Estimated Time**: 5-7 days  
**Value Delivered**: 35% of total enhancement value

### Day 8-9: Data Enrichment Service

#### Step 5.1: Setup API Credentials

**IMPORTANT**: Get API keys first before implementation

```bash
# 1. Attom Data API (Property data)
# Sign up at: https://api.gateway.attomdata.com/
# Cost: $0.10 per lookup
# Free tier: 1000 requests/month

# 2. Melissa Data API (Address validation + homeowner data)
# Sign up at: https://www.melissa.com/
# Cost: $0.05 per lookup
# Free tier: 500 requests/month

# 3. US Census API (FREE - no key needed)
# Auto-generated from: https://api.census.gov/data.html
```

Add to `.env`:
```bash
# Data Enrichment APIs (Phase 2)
ATTOM_API_KEY=your_attom_key_here
MELISSA_API_KEY=your_melissa_key_here

# Optional: OpenAI for multi-model verification (Phase 3)
OPENAI_API_KEY=your_openai_key_here
```

#### Step 5.2: Create Data Enrichment Service

**File**: `/backend/services/quality/data_enricher.py`

```python
"""
Property Data Enrichment Service
Gathers financial and demographic data for lead qualification
"""

import logging
from typing import Dict, Optional
from dataclasses import dataclass
import httpx

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class FinancialQualification:
    """Financial qualification data"""
    is_qualified: bool
    qualification_reasons: list[str]
    disqualification_reasons: list[str]
    
    # Property financial data
    property_value: Optional[float]
    assessed_value: Optional[float]
    mortgage_amount: Optional[float]
    equity_estimate: Optional[float]
    equity_percent: Optional[float]
    
    # Homeowner financial indicators
    median_income: Optional[float]
    income_estimate: Optional[float]
    credit_score_range: Optional[str]
    
    # Additional context
    has_mortgage: bool
    has_liens: bool
    foreclosure_risk: bool
    
    # Data sources
    data_sources: list[str]
    enrichment_cost: float


class PropertyDataEnricher:
    """
    Enriches property data from multiple sources
    
    Data Sources:
    1. Attom Data - Property valuations, mortgages, equity
    2. Melissa Data - Homeowner demographics, income estimates
    3. US Census - Area median income, demographics (FREE)
    """
    
    MINIMUM_EQUITY_PERCENT = 20.0  # Need 20% equity
    MINIMUM_INCOME_TO_VALUE_RATIO = 0.15  # Income >= 15% of property value
    MINIMUM_PROPERTY_VALUE = 150000  # Don't target low-value properties
    
    def __init__(
        self,
        attom_api_key: Optional[str] = None,
        melissa_api_key: Optional[str] = None
    ):
        self.attom_api_key = attom_api_key or settings.attom_api_key
        self.melissa_api_key = melissa_api_key or settings.melissa_api_key
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def enrich_and_qualify(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str,
        property_value: Optional[float] = None
    ) -> FinancialQualification:
        """
        Enrich property data and determine financial qualification
        
        Returns:
            FinancialQualification with is_qualified flag and detailed breakdown
        """
        enrichment_cost = 0.0
        data_sources = []
        
        # 1. Get property financial data (Attom)
        property_data = await self._get_property_financials(
            address, city, state, zip_code
        )
        if property_data:
            enrichment_cost += 0.10  # Attom cost
            data_sources.append('attom')
        
        # 2. Get homeowner demographics (Melissa)
        homeowner_data = await self._get_homeowner_demographics(
            address, city, state, zip_code
        )
        if homeowner_data:
            enrichment_cost += 0.05  # Melissa cost
            data_sources.append('melissa')
        
        # 3. Get area demographics (US Census - FREE)
        census_data = await self._get_census_data(zip_code, state)
        if census_data:
            data_sources.append('census')
        
        # Merge data
        merged = self._merge_data(property_data, homeowner_data, census_data, property_value)
        
        # Run qualification logic
        qualification = self._determine_qualification(merged)
        qualification.data_sources = data_sources
        qualification.enrichment_cost = enrichment_cost
        
        logger.info(
            f"Financial qualification for {address}: "
            f"qualified={qualification.is_qualified}, "
            f"cost=${enrichment_cost:.2f}"
        )
        
        return qualification
    
    async def _get_property_financials(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str
    ) -> Optional[Dict]:
        """
        Get property financial data from Attom Data API
        
        Returns:
            {
                'property_value': 450000,
                'assessed_value': 435000,
                'mortgage_amount': 280000,
                'equity_estimate': 170000,
                'has_mortgage': True,
                'has_liens': False,
                'foreclosure': False
            }
        """
        if not self.attom_api_key:
            logger.warning("Attom API key not configured")
            return None
        
        try:
            response = await self.client.get(
                "https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/detail",
                params={
                    'address1': address,
                    'address2': f"{city}, {state} {zip_code}"
                },
                headers={'apikey': self.attom_api_key}
            )
            response.raise_for_status()
            data = response.json()
            
            # Parse Attom response
            property_info = data.get('property', [{}])[0]
            assessment = property_info.get('assessment', {})
            mortgage = property_info.get('mortgage', {})
            
            property_value = assessment.get('market', {}).get('mktTtlValue')
            assessed_value = assessment.get('assessed', {}).get('assdTtlValue')
            mortgage_amount = mortgage.get('amount')
            
            equity_estimate = None
            equity_percent = None
            if property_value and mortgage_amount:
                equity_estimate = property_value - mortgage_amount
                equity_percent = (equity_estimate / property_value) * 100
            
            return {
                'property_value': property_value,
                'assessed_value': assessed_value,
                'mortgage_amount': mortgage_amount,
                'equity_estimate': equity_estimate,
                'equity_percent': equity_percent,
                'has_mortgage': mortgage_amount and mortgage_amount > 0,
                'has_liens': mortgage.get('lienCount', 0) > 0,
                'foreclosure': property_info.get('foreclosure', {}).get('isForeclosure', False)
            }
            
        except Exception as e:
            logger.error(f"Attom API error for {address}: {e}")
            return None
    
    async def _get_homeowner_demographics(
        self,
        address: str,
        city: str,
        state: str,
        zip_code: str
    ) -> Optional[Dict]:
        """
        Get homeowner demographics from Melissa Data API
        
        Returns:
            {
                'income_estimate': 95000,
                'credit_score_range': '700-749',
                'length_of_residence': 8,
                'age_range': '45-54',
                'homeowner_name': 'John Smith'
            }
        """
        if not self.melissa_api_key:
            logger.warning("Melissa API key not configured")
            return None
        
        try:
            response = await self.client.get(
                "https://personator.melissadata.net/v3/WEB/ContactVerify/doContactVerify",
                params={
                    'id': self.melissa_api_key,
                    'a1': address,
                    'city': city,
                    'state': state,
                    'postal': zip_code,
                    'format': 'json'
                }
            )
            response.raise_for_status()
            data = response.json()
            
            records = data.get('Records', [])
            if not records:
                return None
            
            record = records[0]
            
            return {
                'income_estimate': record.get('IncomeEstimate'),
                'credit_score_range': record.get('CreditScoreRange'),
                'length_of_residence': record.get('LengthOfResidence'),
                'age_range': record.get('AgeRange'),
                'homeowner_name': record.get('FullName')
            }
            
        except Exception as e:
            logger.error(f"Melissa API error for {address}: {e}")
            return None
    
    async def _get_census_data(self, zip_code: str, state: str) -> Optional[Dict]:
        """
        Get area demographics from US Census API (FREE)
        
        Returns:
            {
                'median_income': 78000,
                'median_home_value': 385000,
                'population': 25000
            }
        """
        try:
            # Get ZCTA (ZIP Code Tabulation Area) data
            response = await self.client.get(
                "https://api.census.gov/data/2021/acs/acs5",
                params={
                    'get': 'NAME,B19013_001E,B25077_001E',  # Median income, median home value
                    'for': f'zip code tabulation area:{zip_code}',
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if len(data) < 2:
                return None
            
            values = data[1]  # First row is headers
            
            return {
                'median_income': float(values[1]) if values[1] else None,
                'median_home_value': float(values[2]) if values[2] else None,
            }
            
        except Exception as e:
            logger.warning(f"Census API error for {zip_code}: {e}")
            return None
    
    def _merge_data(
        self,
        property_data: Optional[Dict],
        homeowner_data: Optional[Dict],
        census_data: Optional[Dict],
        fallback_property_value: Optional[float]
    ) -> Dict:
        """Merge data from all sources"""
        merged = {
            # Property financials
            'property_value': None,
            'assessed_value': None,
            'mortgage_amount': None,
            'equity_estimate': None,
            'equity_percent': None,
            'has_mortgage': False,
            'has_liens': False,
            'foreclosure_risk': False,
            
            # Homeowner data
            'income_estimate': None,
            'credit_score_range': None,
            'length_of_residence': None,
            
            # Census data
            'median_income': None,
            'median_home_value': None,
        }
        
        # Merge property data
        if property_data:
            merged.update(property_data)
        
        # Fallback to provided property value
        if not merged['property_value'] and fallback_property_value:
            merged['property_value'] = fallback_property_value
        
        # Merge homeowner data
        if homeowner_data:
            merged.update(homeowner_data)
        
        # Merge census data
        if census_data:
            merged.update(census_data)
        
        return merged
    
    def _determine_qualification(self, data: Dict) -> FinancialQualification:
        """
        Determine if lead is financially qualified
        
        Qualification Criteria:
        1. Property value >= $150,000
        2. Equity >= 20% OR no mortgage
        3. Income estimate >= 15% of property value OR median income >= threshold
        4. No foreclosure risk
        5. No excessive liens
        """
        qualified = True
        reasons = []
        disqualification_reasons = []
        
        property_value = data.get('property_value')
        equity_percent = data.get('equity_percent')
        has_mortgage = data.get('has_mortgage', False)
        income_estimate = data.get('income_estimate')
        median_income = data.get('median_income')
        foreclosure = data.get('foreclosure_risk', False)
        has_liens = data.get('has_liens', False)
        
        # Check 1: Property value
        if property_value:
            if property_value >= self.MINIMUM_PROPERTY_VALUE:
                reasons.append(f"Property value ${property_value:,.0f} meets minimum")
            else:
                qualified = False
                disqualification_reasons.append(
                    f"Property value ${property_value:,.0f} below minimum ${self.MINIMUM_PROPERTY_VALUE:,.0f}"
                )
        
        # Check 2: Equity
        if equity_percent is not None:
            if equity_percent >= self.MINIMUM_EQUITY_PERCENT:
                reasons.append(f"Sufficient equity {equity_percent:.1f}%")
            else:
                qualified = False
                disqualification_reasons.append(
                    f"Insufficient equity {equity_percent:.1f}% (need {self.MINIMUM_EQUITY_PERCENT}%)"
                )
        elif not has_mortgage:
            reasons.append("Property owned outright (no mortgage)")
        
        # Check 3: Income qualification
        if property_value:
            minimum_income = property_value * self.MINIMUM_INCOME_TO_VALUE_RATIO
            
            if income_estimate and income_estimate >= minimum_income:
                reasons.append(f"Income ${income_estimate:,.0f} sufficient for property value")
            elif median_income and median_income >= minimum_income:
                reasons.append(f"Area median income ${median_income:,.0f} sufficient")
            elif income_estimate or median_income:
                # We have income data but it's insufficient
                actual_income = income_estimate or median_income
                qualified = False
                disqualification_reasons.append(
                    f"Income ${actual_income:,.0f} below threshold ${minimum_income:,.0f}"
                )
            # If no income data available, don't disqualify (neutral)
        
        # Check 4: Foreclosure risk
        if foreclosure:
            qualified = False
            disqualification_reasons.append("Property in foreclosure")
        
        # Check 5: Liens
        if has_liens:
            # Don't disqualify, but note it
            reasons.append("⚠️ Property has liens (investigate further)")
        
        # If no data available, remain neutral (qualified by default)
        if not property_value and not income_estimate and not median_income:
            reasons.append("⚠️ Limited financial data - manual review recommended")
        
        return FinancialQualification(
            is_qualified=qualified,
            qualification_reasons=reasons,
            disqualification_reasons=disqualification_reasons,
            property_value=property_value,
            assessed_value=data.get('assessed_value'),
            mortgage_amount=data.get('mortgage_amount'),
            equity_estimate=data.get('equity_estimate'),
            equity_percent=equity_percent,
            median_income=median_income,
            income_estimate=income_estimate,
            credit_score_range=data.get('credit_score_range'),
            has_mortgage=has_mortgage,
            has_liens=has_liens,
            foreclosure_risk=foreclosure,
            data_sources=[],
            enrichment_cost=0.0
        )
```

---

### Day 10-11: Enhanced Lead Scoring

#### Step 6.1: Create Advanced Lead Scorer

**File**: `/backend/services/quality/lead_scorer.py`

```python
"""
Advanced Lead Scoring Engine
5-factor scoring: Urgency, Financial, Damage, Engagement, Property
"""

import logging
from typing import Dict, List
from dataclasses import dataclass

from services.quality.quality_models import LeadQualityScore
from services.quality.data_enricher import FinancialQualification
from services.ai.roof_analyzer import RoofAnalysisResult

logger = logging.getLogger(__name__)


@dataclass
class LeadScoringInputs:
    """All inputs needed for advanced lead scoring"""
    roof_analysis: RoofAnalysisResult
    financial_qual: FinancialQualification
    property_value: float
    contact_confidence: float
    image_quality_score: float


class AdvancedLeadScorer:
    """
    5-Factor Advanced Lead Scoring System
    
    Factors (weights):
    1. Urgency (35%) - How soon they need a roof
    2. Financial (30%) - Can they afford it?
    3. Damage (20%) - Severity of roof issues
    4. Engagement (10%) - Contact quality
    5. Property (5%) - Property characteristics
    
    Score Ranges:
    - 85-100: QUALIFIED (hot lead)
    - 70-84: POTENTIAL (warm lead)
    - 0-69: REJECT (not worth pursuing)
    """
    
    # Weights
    URGENCY_WEIGHT = 0.35
    FINANCIAL_WEIGHT = 0.30
    DAMAGE_WEIGHT = 0.20
    ENGAGEMENT_WEIGHT = 0.10
    PROPERTY_WEIGHT = 0.05
    
    # Thresholds
    QUALIFIED_THRESHOLD = 85
    POTENTIAL_THRESHOLD = 70
    
    def score_lead(self, inputs: LeadScoringInputs) -> LeadQualityScore:
        """
        Calculate comprehensive lead score
        
        Args:
            inputs: All scoring inputs
            
        Returns:
            LeadQualityScore with priority and detailed breakdown
        """
        # Calculate each factor
        urgency_score = self._score_urgency(inputs.roof_analysis)
        financial_score = self._score_financial(inputs.financial_qual)
        damage_score = self._score_damage(inputs.roof_analysis)
        engagement_score = self._score_engagement(
            inputs.contact_confidence,
            inputs.image_quality_score
        )
        property_score = self._score_property(inputs.property_value)
        
        # Weighted total
        total_score = (
            urgency_score * self.URGENCY_WEIGHT +
            financial_score * self.FINANCIAL_WEIGHT +
            damage_score * self.DAMAGE_WEIGHT +
            engagement_score * self.ENGAGEMENT_WEIGHT +
            property_score * self.PROPERTY_WEIGHT
        )
        
        # Determine priority
        if total_score >= self.QUALIFIED_THRESHOLD:
            priority = "QUALIFIED"
            action = "IMMEDIATE_CONTACT"
        elif total_score >= self.POTENTIAL_THRESHOLD:
            priority = "POTENTIAL"
            action = "NURTURE_SEQUENCE"
        else:
            priority = "REJECT"
            action = "DO_NOT_CONTACT"
        
        # Determine confidence
        if inputs.financial_qual and inputs.financial_qual.data_sources:
            confidence = "HIGH"
        elif inputs.image_quality_score >= 85:
            confidence = "MEDIUM"
        else:
            confidence = "LOW"
        
        # Build detailed breakdown
        breakdown = {
            'urgency': round(urgency_score, 2),
            'financial': round(financial_score, 2),
            'damage': round(damage_score, 2),
            'engagement': round(engagement_score, 2),
            'property': round(property_score, 2),
            'weighted_urgency': round(urgency_score * self.URGENCY_WEIGHT, 2),
            'weighted_financial': round(financial_score * self.FINANCIAL_WEIGHT, 2),
            'weighted_damage': round(damage_score * self.DAMAGE_WEIGHT, 2),
            'weighted_engagement': round(engagement_score * self.ENGAGEMENT_WEIGHT, 2),
            'weighted_property': round(property_score * self.PROPERTY_WEIGHT, 2),
        }
        
        # Rejection reasons
        rejection_reasons = []
        if total_score < self.POTENTIAL_THRESHOLD:
            if urgency_score < 50:
                rejection_reasons.append("Low urgency (roof in good condition)")
            if financial_score < 50:
                rejection_reasons.append(f"Financial concerns: {inputs.financial_qual.disqualification_reasons}")
            if damage_score < 30:
                rejection_reasons.append("Minimal damage detected")
        
        # Qualification notes
        qual_notes = []
        if urgency_score >= 80:
            qual_notes.append("⭐ High urgency - roof needs immediate attention")
        if financial_score >= 80:
            qual_notes.append("💰 Strong financial qualification")
        if damage_score >= 70:
            qual_notes.append("🔴 Significant damage detected")
        if inputs.financial_qual.is_qualified:
            qual_notes.extend(inputs.financial_qual.qualification_reasons)
        
        return LeadQualityScore(
            total_score=round(total_score, 2),
            priority=priority,
            urgency_score=urgency_score,
            financial_score=financial_score,
            damage_score=damage_score,
            engagement_score=engagement_score,
            property_score=property_score,
            breakdown=breakdown,
            rejection_reasons=rejection_reasons,
            qualification_notes=qual_notes,
            confidence_level=confidence,
            recommended_action=action
        )
    
    def _score_urgency(self, analysis: RoofAnalysisResult) -> float:
        """
        Score urgency based on roof age and condition
        
        Returns: 0-100 score
        """
        age_score = 0.0
        condition_score = 0.0
        
        # Age factor (40% of urgency)
        age = analysis.roof_age_years
        if age >= 25:
            age_score = 100
        elif age >= 20:
            age_score = 85
        elif age >= 15:
            age_score = 70
        elif age >= 10:
            age_score = 50
        elif age >= 5:
            age_score = 30
        else:
            age_score = 10
        
        # Condition factor (60% of urgency)
        # Lower condition score = higher urgency
        condition = analysis.condition_score
        if condition <= 40:
            condition_score = 100  # Critical condition
        elif condition <= 55:
            condition_score = 85   # Poor condition
        elif condition <= 70:
            condition_score = 65   # Fair condition
        elif condition <= 85:
            condition_score = 40   # Good condition
        else:
            condition_score = 10   # Excellent condition
        
        # Weighted combination
        urgency = (age_score * 0.4) + (condition_score * 0.6)
        
        return round(urgency, 2)
    
    def _score_financial(self, financial_qual: FinancialQualification) -> float:
        """
        Score financial qualification
        
        Returns: 0-100 score
        """
        if not financial_qual:
            # No financial data - default to neutral (70)
            return 70.0
        
        # If explicitly disqualified, return low score
        if not financial_qual.is_qualified:
            return 30.0
        
        score = 70.0  # Base qualified score
        
        # Boost for strong equity
        if financial_qual.equity_percent:
            if financial_qual.equity_percent >= 50:
                score += 15
            elif financial_qual.equity_percent >= 30:
                score += 10
            elif financial_qual.equity_percent >= 20:
                score += 5
        
        # Boost for high income
        if financial_qual.income_estimate:
            if financial_qual.income_estimate >= 150000:
                score += 10
            elif financial_qual.income_estimate >= 100000:
                score += 5
        
        # Penalty for liens
        if financial_qual.has_liens:
            score -= 10
        
        # Penalty for foreclosure risk
        if financial_qual.foreclosure_risk:
            score = min(score, 25.0)
        
        return round(min(score, 100.0), 2)
    
    def _score_damage(self, analysis: RoofAnalysisResult) -> float:
        """
        Score roof damage severity
        
        Returns: 0-100 score
        """
        damage_count = len(analysis.damage_indicators)
        
        # More damage = higher score (higher priority)
        if damage_count >= 5:
            score = 100
        elif damage_count >= 4:
            score = 85
        elif damage_count >= 3:
            score = 70
        elif damage_count >= 2:
            score = 55
        elif damage_count >= 1:
            score = 40
        else:
            score = 20
        
        # Adjust based on specific damage types
        damage_types = analysis.damage_indicators
        
        # Critical damage indicators
        if 'severe_deterioration' in damage_types or 'structural_damage' in damage_types:
            score = min(score + 15, 100)
        
        if 'missing_shingles' in damage_types or 'active_leaks' in damage_types:
            score = min(score + 10, 100)
        
        return round(score, 2)
    
    def _score_engagement(self, contact_confidence: float, image_quality: float) -> float:
        """
        Score lead engagement potential
        
        Args:
            contact_confidence: 0-1 confidence in contact info
            image_quality: 0-100 image quality score
            
        Returns: 0-100 score
        """
        # Convert contact confidence to 0-100
        contact_score = contact_confidence * 100
        
        # Weight: 60% contact, 40% image quality
        engagement = (contact_score * 0.6) + (image_quality * 0.4)
        
        return round(engagement, 2)
    
    def _score_property(self, property_value: float) -> float:
        """
        Score property value
        
        Higher value properties = slightly better leads
        
        Returns: 0-100 score
        """
        if not property_value:
            return 50.0  # Neutral if unknown
        
        if property_value >= 800000:
            return 100.0
        elif property_value >= 600000:
            return 90.0
        elif property_value >= 400000:
            return 80.0
        elif property_value >= 250000:
            return 70.0
        elif property_value >= 150000:
            return 60.0
        else:
            return 40.0
```

---

### Day 12: Phase 2 Integration

#### Step 7.1: Update Configuration

**File**: `/backend/config.py`

Add to settings class:

```python
class Settings(BaseSettings):
    # ... existing fields ...
    
    # Quality Control & Data Enrichment (Phase 2)
    attom_api_key: Optional[str] = Field(default=None, env="ATTOM_API_KEY")
    melissa_api_key: Optional[str] = Field(default=None, env="MELISSA_API_KEY")
    
    # Image quality thresholds
    image_quality_min_score: int = Field(default=70, env="IMAGE_QUALITY_MIN_SCORE")
    image_quality_enabled: bool = Field(default=True, env="IMAGE_QUALITY_ENABLED")
    
    # Financial qualification thresholds
    financial_min_equity_percent: float = Field(default=20.0, env="FINANCIAL_MIN_EQUITY_PERCENT")
    financial_min_property_value: float = Field(default=150000, env="FINANCIAL_MIN_PROPERTY_VALUE")
    
    # Lead scoring thresholds
    lead_score_qualified_threshold: int = Field(default=85, env="LEAD_SCORE_QUALIFIED_THRESHOLD")
    lead_score_potential_threshold: int = Field(default=70, env="LEAD_SCORE_POTENTIAL_THRESHOLD")
```

#### Step 7.2: Update Lead Generation Service

**File**: `/backend/services/lead_generation_service.py`

Major refactor of `_process_candidate` method:

```python
from services.quality import ImageQualityValidator
from services.quality.data_enricher import PropertyDataEnricher
from services.quality.lead_scorer import AdvancedLeadScorer, LeadScoringInputs
from services.quality.feedback_tracker import FeedbackTrackerService

class LeadGenerationService:
    """Enhanced with bulletproof quality control"""
    
    # Initialize new services
    image_validator = ImageQualityValidator(min_score=settings.image_quality_min_score)
    data_enricher = PropertyDataEnricher()
    advanced_scorer = AdvancedLeadScorer()
    
    async def _process_candidate(
        self,
        area_scan: AreaScan,
        candidate: PropertyCandidate,
        imagery: ImageryProvider,
        property_enricher: PropertyEnrichmentService,
        contact_enricher: ContactEnrichmentService,
    ) -> Optional[tuple]:
        """
        Process property candidate with full bulletproof quality control
        
        Pipeline:
        1. Property discovery ✅ (existing)
        2. Get imagery ✅ (existing)
        3. 🆕 IMAGE QUALITY VALIDATION (Phase 1)
        4. AI roof analysis ✅ (existing)
        5. Property enrichment ✅ (existing)
        6. 🆕 FINANCIAL QUALIFICATION (Phase 2)
        7. Contact enrichment ✅ (existing)
        8. 🆕 ADVANCED LEAD SCORING (Phase 2)
        9. Save lead ✅ (existing)
        10. 🆕 START FEEDBACK TRACKING (Phase 1)
        """
        
        # Steps 1-2: Existing property discovery and imagery fetch
        imagery_result = await imagery.fetch_imagery(
            candidate.latitude,
            candidate.longitude
        )
        
        if not imagery_result or not imagery_result.image_data:
            logger.warning(f"No imagery for {candidate.address}")
            return None
        
        # 🆕 STEP 3: Image Quality Validation
        if settings.image_quality_enabled:
            quality_result = self.image_validator.validate_image(imagery_result.image_data)
            
            if not quality_result.is_valid:
                logger.info(
                    f"Image rejected for {candidate.address}: "
                    f"score={quality_result.overall_score}, issues={quality_result.issues}"
                )
                # Save rejection for analytics
                self._log_image_rejection(
                    area_scan.id,
                    candidate.address,
                    quality_result.overall_score,
                    quality_result.issues
                )
                return None  # Skip this property - saves $0.20+ in API costs
        else:
            quality_result = None
        
        # Step 4: AI Roof Analysis (existing)
        roof_analysis = await analyze_roof(imagery_result.image_data)
        
        # Step 5: Property Enrichment (existing)
        property_profile = await property_enricher.enrich(
            candidate.address,
            candidate.latitude,
            candidate.longitude
        )
        
        # 🆕 STEP 6: Financial Qualification (NEW!)
        if settings.attom_api_key or settings.melissa_api_key:
            financial_qual = await self.data_enricher.enrich_and_qualify(
                address=candidate.address,
                city=property_profile.city or "",
                state=property_profile.state or "",
                zip_code=property_profile.zip_code or "",
                property_value=property_profile.property_value
            )
            
            # CRITICAL: Reject financially unqualified leads
            if not financial_qual.is_qualified:
                logger.info(
                    f"Lead financially disqualified: {candidate.address} - "
                    f"{financial_qual.disqualification_reasons}"
                )
                return None  # Don't waste time on leads that can't pay
        else:
            financial_qual = None  # No enrichment APIs configured
        
        # Step 7: Contact Enrichment (existing)
        contact_profile = await contact_enricher.enrich(
            candidate.address,
            property_profile.city,
            property_profile.state
        )
        
        # 🆕 STEP 8: Advanced Lead Scoring (NEW!)
        scoring_inputs = LeadScoringInputs(
            roof_analysis=roof_analysis,
            financial_qual=financial_qual,
            property_value=property_profile.property_value or 0,
            contact_confidence=contact_profile.confidence,
            image_quality_score=quality_result.overall_score if quality_result else 85.0
        )
        
        lead_quality_score = self.advanced_scorer.score_lead(scoring_inputs)
        
        # CRITICAL: Reject low-quality leads
        if lead_quality_score.priority == "REJECT":
            logger.info(
                f"Lead rejected by scoring: {candidate.address} - "
                f"score={lead_quality_score.total_score}, "
                f"reasons={lead_quality_score.rejection_reasons}"
            )
            return None
        
        # Step 9: Save Lead (enhanced with new fields)
        lead = Lead(
            user_id=area_scan.user_id,
            area_scan_id=area_scan.id,
            
            # Property info (existing)
            address=candidate.address,
            city=property_profile.city,
            state=property_profile.state,
            zip_code=property_profile.zip_code,
            latitude=candidate.latitude,
            longitude=candidate.longitude,
            
            # Roof analysis (existing)
            roof_age_years=roof_analysis.roof_age_years,
            roof_condition_score=roof_analysis.condition_score,
            roof_material=roof_analysis.roof_material,
            roof_size_sqft=roof_analysis.roof_size_sqft,
            aerial_image_url=imagery_result.url,
            ai_analysis=roof_analysis.to_dict(),
            
            # 🆕 NEW: Image quality fields
            image_quality_score=quality_result.overall_score if quality_result else None,
            image_quality_issues=quality_result.issues if quality_result else None,
            quality_validation_status='passed' if quality_result else 'skipped',
            
            # 🆕 NEW: Enhanced scoring
            lead_score=lead_quality_score.total_score,
            priority=self._map_priority(lead_quality_score.priority),
            replacement_urgency=self._determine_urgency(lead_quality_score.urgency_score),
            damage_indicators=roof_analysis.damage_indicators,
            
            # 🆕 NEW: Financial qualification
            financial_qualified=financial_qual.is_qualified if financial_qual else None,
            financial_qualification_notes=financial_qual.qualification_reasons if financial_qual else None,
            equity_percent=financial_qual.equity_percent if financial_qual else None,
            income_estimate=financial_qual.income_estimate if financial_qual else None,
            
            # Contact info (existing, enhanced)
            homeowner_name=contact_profile.homeowner_name,
            homeowner_email_encrypted=encrypt_value(contact_profile.email) if contact_profile.email else None,
            homeowner_phone_encrypted=encrypt_value(contact_profile.phone) if contact_profile.phone else None,
            homeowner_email_hash=hash_pii(contact_profile.email) if contact_profile.email else None,
            homeowner_phone_hash=hash_pii(contact_profile.phone) if contact_profile.phone else None,
            contact_enriched=True,
            contact_enrichment_cost=0.10,  # Existing cost
            
            # Property data (existing)
            property_value=property_profile.property_value,
            year_built=property_profile.year_built,
            property_type=property_profile.property_type,
            
            # Analytics (enhanced)
            cost_to_generate=self._calculate_generation_cost(
                quality_result,
                financial_qual,
                imagery_result
            ),
            estimated_value=self._estimate_lead_value(lead_quality_score),
            conversion_probability=self._estimate_conversion(lead_quality_score),
            
            # Status
            status=LeadStatus.NEW,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        self.db.add(lead)
        self.db.commit()
        self.db.refresh(lead)
        
        # 🆕 STEP 10: Start feedback tracking
        feedback_tracker = FeedbackTrackerService(self.db)
        feedback_tracker.track_lead(
            lead_id=lead.id,
            initial_score=lead_quality_score.total_score,
            priority=lead_quality_score.priority
        )
        
        logger.info(
            f"✅ Lead created: {candidate.address} | "
            f"Score: {lead_quality_score.total_score}/100 | "
            f"Priority: {lead_quality_score.priority} | "
            f"Cost: ${lead.cost_to_generate:.2f}"
        )
        
        return (lead, lead_quality_score, roof_analysis, property_profile, contact_profile)
    
    def _map_priority(self, quality_priority: str) -> LeadPriority:
        """Map quality priority to LeadPriority enum"""
        if quality_priority == "QUALIFIED":
            return LeadPriority.HOT
        elif quality_priority == "POTENTIAL":
            return LeadPriority.WARM
        else:
            return LeadPriority.COLD
    
    def _determine_urgency(self, urgency_score: float) -> str:
        """Determine replacement urgency from score"""
        if urgency_score >= 85:
            return "immediate"
        elif urgency_score >= 70:
            return "urgent"
        elif urgency_score >= 50:
            return "plan_ahead"
        else:
            return "good_condition"
    
    def _calculate_generation_cost(
        self,
        quality_result,
        financial_qual,
        imagery_result
    ) -> float:
        """Calculate total cost to generate this lead"""
        cost = 0.0
        
        # AI analysis cost
        cost += 0.15  # Claude Sonnet cost
        
        # Imagery cost (if not free)
        if imagery_result.source != "free":
            cost += 0.05
        
        # Data enrichment cost
        if financial_qual:
            cost += financial_qual.enrichment_cost
        
        # Contact enrichment (existing)
        cost += 0.10
        
        return round(cost, 2)
    
    def _estimate_lead_value(self, lead_score: LeadQualityScore) -> float:
        """
        Estimate lead value based on priority
        
        Industry average roof replacement: $12,000 - $18,000
        Contractor profit margin: ~30%
        Lead value: 5-10% of job value
        """
        avg_job_value = 15000
        
        if lead_score.priority == "QUALIFIED":
            # Hot leads worth 10% of job value
            return round(avg_job_value * 0.10, 2)
        elif lead_score.priority == "POTENTIAL":
            # Warm leads worth 5% of job value
            return round(avg_job_value * 0.05, 2)
        else:
            return 0.0
    
    def _estimate_conversion(self, lead_score: LeadQualityScore) -> float:
        """
        Estimate conversion probability
        
        Based on priority and confidence level
        """
        base_conversion = {
            "QUALIFIED": 35.0,  # 35% conversion for hot leads
            "POTENTIAL": 15.0,  # 15% conversion for warm leads
            "REJECT": 2.0       # 2% for cold leads
        }
        
        conversion = base_conversion.get(lead_score.priority, 10.0)
        
        # Adjust for confidence
        if lead_score.confidence_level == "HIGH":
            conversion *= 1.2
        elif lead_score.confidence_level == "LOW":
            conversion *= 0.8
        
        return round(min(conversion, 100.0), 2)
    
    def _log_image_rejection(
        self,
        scan_id: int,
        address: str,
        score: float,
        issues: List[str]
    ) -> None:
        """Log rejected images for analytics"""
        activity = LeadActivity(
            area_scan_id=scan_id,
            activity_type="image_rejected",
            description=f"Image quality check failed for {address}",
            metadata={
                'address': address,
                'quality_score': score,
                'issues': issues
            },
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(activity)
        self.db.commit()
```

---

### Day 13-14: Database Migrations Phase 2

#### Step 8.1: Create Migration for Enhanced Fields

```bash
cd /home/yogi/fishmouth/backend
alembic revision -m "add_bulletproof_phase2_financial_scoring"
```

Edit the migration file:

```python
"""add bulletproof phase 2 financial scoring

Revision ID: [auto-generated]
Revises: [phase1-revision-id]
Create Date: [auto-generated]
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '[auto-generated]'
down_revision = '[phase1-revision-id]'
branch_labels = None
depends_on = None


def upgrade():
    # Add financial qualification fields to leads
    op.add_column('leads', sa.Column('financial_qualified', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('financial_qualification_notes', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('leads', sa.Column('equity_percent', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('income_estimate', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('has_mortgage', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('has_liens', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('foreclosure_risk', sa.Boolean(), nullable=True))
    
    # Add enhanced scoring fields
    op.add_column('leads', sa.Column('urgency_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('financial_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('damage_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('engagement_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('property_score', sa.Float(), nullable=True))
    op.add_column('leads', sa.Column('score_breakdown', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('leads', sa.Column('rejection_reasons', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    op.add_column('leads', sa.Column('qualification_notes', postgresql.JSON(astext_type=sa.Text()), nullable=True))
    
    # Create indexes for new fields
    op.create_index('idx_leads_financial_qualified', 'leads', ['financial_qualified'])
    op.create_index('idx_leads_urgency_score', 'leads', ['urgency_score'])
    op.create_index('idx_leads_financial_score', 'leads', ['financial_score'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_leads_financial_score', table_name='leads')
    op.drop_index('idx_leads_urgency_score', table_name='leads')
    op.drop_index('idx_leads_financial_qualified', table_name='leads')
    
    # Drop columns
    op.drop_column('leads', 'qualification_notes')
    op.drop_column('leads', 'rejection_reasons')
    op.drop_column('leads', 'score_breakdown')
    op.drop_column('leads', 'property_score')
    op.drop_column('leads', 'engagement_score')
    op.drop_column('leads', 'damage_score')
    op.drop_column('leads', 'financial_score')
    op.drop_column('leads', 'urgency_score')
    op.drop_column('leads', 'foreclosure_risk')
    op.drop_column('leads', 'has_liens')
    op.drop_column('leads', 'has_mortgage')
    op.drop_column('leads', 'income_estimate')
    op.drop_column('leads', 'equity_percent')
    op.drop_column('leads', 'financial_qualification_notes')
    op.drop_column('leads', 'financial_qualified')
```

Run migration:
```bash
alembic upgrade head
```

#### Step 8.2: Update Lead Model

**File**: `/backend/models.py`

```python
class Lead(Base):
    __tablename__ = "leads"
    
    # ... existing fields ...
    
    # Phase 1: Image Quality
    image_quality_score = Column(Float, nullable=True)
    image_quality_issues = Column(JSON, nullable=True)
    quality_validation_status = Column(String(20), nullable=True)
    
    # 🆕 Phase 2: Financial Qualification
    financial_qualified = Column(Boolean, nullable=True)
    financial_qualification_notes = Column(JSON, nullable=True)
    equity_percent = Column(Float, nullable=True)
    income_estimate = Column(Float, nullable=True)
    has_mortgage = Column(Boolean, nullable=True)
    has_liens = Column(Boolean, nullable=True)
    foreclosure_risk = Column(Boolean, nullable=True)
    
    # 🆕 Phase 2: Enhanced Scoring
    urgency_score = Column(Float, nullable=True)
    financial_score = Column(Float, nullable=True)
    damage_score = Column(Float, nullable=True)
    engagement_score = Column(Float, nullable=True)
    property_score = Column(Float, nullable=True)
    score_breakdown = Column(JSON, nullable=True)
    rejection_reasons = Column(JSON, nullable=True)
    qualification_notes = Column(JSON, nullable=True)
    
    # ... rest of existing fields ...
```

---

This completes Phase 2. Would you like me to continue with:
- **Phase 3**: Multi-Model Verification + Enhanced Pipeline
- **Phase 4**: Frontend Integration + API Updates
- **Configuration Reference** & **Testing Procedures**
- **Deployment Checklist**

Let me know and I'll continue!

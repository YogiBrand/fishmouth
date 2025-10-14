from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from io import BytesIO
from typing import Dict, List, Optional

import numpy as np
from PIL import Image, ImageFilter


@dataclass
class RoofAnalysisResult:
    roof_age_years: int
    condition_score: float  # 0-100, higher means better condition
    replacement_urgency: str
    damage_indicators: List[str]
    metrics: Dict[str, float]
    confidence: float
    summary: str


class RoofAnalyzer:
    """Performs computer-vision-based assessment of roof imagery."""

    def analyze(self, image_bytes: bytes, metadata: Dict) -> RoofAnalysisResult:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        resized = image.resize((512, 512))
        np_image = np.asarray(resized) / 255.0

        gray = np.mean(np_image, axis=2)
        green_channel = np_image[:, :, 1]

        contrast = float(np.std(gray))
        gradient_x = np.abs(np.gradient(gray, axis=1))
        gradient_y = np.abs(np.gradient(gray, axis=0))
        edge_density = float(np.mean(gradient_x + gradient_y))

        # Detect dark streaks (algae/granule loss)
        dark_mask = gray < 0.35
        dark_streak_ratio = float(np.mean(dark_mask))

        # Detect moss growth via green channel dominance
        moss_mask = (green_channel > 0.42) & (gray < 0.55)
        moss_ratio = float(np.mean(moss_mask))

        # Missing shingle heuristic: low edge density + high local variance drop
        blurred = gray.copy()
        blurred_img = Image.fromarray((gray * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2))
        blurred = np.asarray(blurred_img) / 255.0
        texture_diff = float(np.mean(np.abs(gray - blurred)))

        damage_indicators: List[str] = []
        if dark_streak_ratio > 0.06:
            damage_indicators.append("dark_streaks")
        if moss_ratio > 0.03:
            damage_indicators.append("moss_growth")
        if texture_diff > 0.055 and edge_density < 0.35:
            damage_indicators.append("missing_shingles")
        if contrast < 0.08:
            damage_indicators.append("granule_loss")

        roof_age_years = self._estimate_roof_age(metadata, damage_indicators, dark_streak_ratio, moss_ratio)
        condition_score = self._compute_condition_score(damage_indicators, dark_streak_ratio, moss_ratio, contrast)
        replacement_urgency = self._determine_urgency(condition_score, roof_age_years, damage_indicators)
        confidence = self._estimate_confidence(metadata, np_image)

        metrics = {
            "contrast": round(contrast, 4),
            "edge_density": round(edge_density, 4),
            "dark_streak_ratio": round(dark_streak_ratio, 4),
            "moss_ratio": round(moss_ratio, 4),
            "texture_diff": round(texture_diff, 4),
        }

        summary = self._build_summary(replacement_urgency, damage_indicators, roof_age_years, condition_score, metadata)

        return RoofAnalysisResult(
            roof_age_years=roof_age_years,
            condition_score=round(condition_score, 1),
            replacement_urgency=replacement_urgency,
            damage_indicators=damage_indicators,
            metrics=metrics,
            confidence=round(confidence, 2),
            summary=summary,
        )

    def _estimate_roof_age(self, metadata: Dict, damage_indicators: List[str], dark_ratio: float, moss_ratio: float) -> int:
        current_year = datetime.utcnow().year
        if metadata.get("last_roof_replacement_year"):
            return max(1, current_year - metadata["last_roof_replacement_year"])
        if metadata.get("year_built"):
            base_age = current_year - metadata["year_built"]
        else:
            base_age = 15

        modifier = 0
        if "missing_shingles" in damage_indicators:
            modifier += 6
        if "dark_streaks" in damage_indicators:
            modifier += 4
        if "moss_growth" in damage_indicators:
            modifier += 3
        modifier += int(dark_ratio * 50 + moss_ratio * 40)
        return max(5, min(base_age + modifier, 45))

    def _compute_condition_score(self, damage_indicators: List[str], dark_ratio: float, moss_ratio: float, contrast: float) -> float:
        score = 92.0
        score -= len(damage_indicators) * 12
        score -= dark_ratio * 120
        score -= moss_ratio * 90
        if contrast < 0.07:
            score -= 10
        return float(np.clip(score, 10, 100))

    def _determine_urgency(self, condition_score: float, roof_age: int, damage_indicators: List[str]) -> str:
        if condition_score < 45 or roof_age > 25:
            return "immediate"
        if condition_score < 60 or roof_age > 20 or "missing_shingles" in damage_indicators:
            return "urgent"
        if condition_score < 75 or roof_age > 15:
            return "plan_ahead"
        return "good_condition"

    def _estimate_confidence(self, metadata: Dict, np_image: np.ndarray) -> float:
        height, width, _ = np_image.shape
        resolution_factor = min(height, width) / 1024
        metadata_factor = 0.2 if metadata.get("year_built") else 0.0
        metadata_factor += 0.2 if metadata.get("last_roof_replacement_year") else 0.0
        return float(np.clip(0.55 + resolution_factor * 0.25 + metadata_factor, 0.55, 0.95))

    def _build_summary(
        self,
        urgency: str,
        damage_indicators: List[str],
        roof_age: int,
        condition_score: float,
        metadata: Dict,
    ) -> str:
        issues = ", ".join(damage_indicators).replace("_", " ") if damage_indicators else "no critical damage detected"
        material = metadata.get("roof_material", "asphalt shingles")
        value_segment = f"Estimated roof age {roof_age} years, condition {condition_score}/100."
        urgency_text = {
            "immediate": "Immediate replacement recommended to prevent interior damage.",
            "urgent": "High priority replacement advised within 3 months.",
            "plan_ahead": "Plan replacement within the next 12-18 months.",
            "good_condition": "Roof is in stable condition. Continue monitoring annually.",
        }[urgency]
        return f"Detected {issues} on a {material} roof. {value_segment} {urgency_text}"


def analyze_roof(image_bytes: bytes, metadata: Dict) -> RoofAnalysisResult:
    return RoofAnalyzer().analyze(image_bytes, metadata)

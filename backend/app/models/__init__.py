"""Bridge module exposing ORM models under the new app namespace."""

from models import (  # type: ignore
    AICall,
    BuildingPermit,
    CallCampaign,
    ContagionCluster,
    Contractor,
    Property,
    PropertyReport,
    PropertyScore,
    ScheduledSMS,
    SocialProofData,
    FollowUpTask,
)

__all__ = [
    "AICall",
    "BuildingPermit",
    "CallCampaign",
    "ContagionCluster",
    "Contractor",
    "Property",
    "PropertyReport",
    "PropertyScore",
    "ScheduledSMS",
    "SocialProofData",
    "FollowUpTask",
]

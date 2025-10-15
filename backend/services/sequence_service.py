from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from config import get_settings
from database import SessionLocal
from models import (
    Sequence,
    SequenceNode,
    SequenceEnrollment,
    SequenceHistory,
    OutboxMessage,
    Lead,
    SequenceNodeType,
    LeadActivity,
    VoiceCall,
    SequenceExecution,
    MessageEvent,
)
from zoneinfo import ZoneInfo
from services.sequence_scheduler import schedule_enrollment_execution, trigger_pending_scan
from services.sequence_delivery import get_delivery_adapters, DeliveryResult
from services.outbox_service import queue_outbox_message
from services.billing_service import record_usage
from app.lib import coerce_model_dict, compose_context, resolve_text

settings = get_settings()


def _add_history_entry(
    db: Session,
    enrollment: SequenceEnrollment,
    *,
    action: str,
    status: str,
    node: Optional[SequenceNode] = None,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    event_type: Optional[str] = None,
) -> SequenceHistory:
    entry = SequenceHistory(
        sequence_id=enrollment.sequence_id,
        enrollment_id=enrollment.id,
        node_id=node.node_id if node else None,
        step_type=node.node_type.value if node and node.node_type else None,
        action=action,
        status=status,
        result=result or {},
        error=error,
        event_type=event_type,
    )
    db.add(entry)
    db.flush()
    return entry


class SequenceService:
    """
    Service for managing lead sequences and automation flows
    """
    
    @staticmethod
    def _coerce_node_type(node_type: str) -> SequenceNodeType:
        try:
            return SequenceNodeType(node_type)
        except ValueError as exc:
            raise ValueError(f"Unsupported node type '{node_type}'") from exc

    @staticmethod
    def _resolve_timeframe_start(timeframe: Optional[str]) -> Optional[datetime]:
        """Translate a timeframe string (e.g. 7d, 30d, all) into a UTC start timestamp."""
        if not timeframe:
            timeframe = "30d"
        window = timeframe.strip().lower()
        now = datetime.utcnow()

        presets = {
            "24h": timedelta(hours=24),
            "48h": timedelta(hours=48),
            "7d": timedelta(days=7),
            "14d": timedelta(days=14),
            "30d": timedelta(days=30),
            "60d": timedelta(days=60),
            "90d": timedelta(days=90),
        }
        if window in {"all", "lifetime", "any"}:
            return None
        if window in presets:
            return now - presets[window]
        if window.endswith("d"):
            try:
                days = int(window[:-1])
                return now - timedelta(days=max(days, 0))
            except ValueError:
                return now - timedelta(days=30)
        if window.endswith("h"):
            try:
                hours = int(window[:-1])
                return now - timedelta(hours=max(hours, 0))
            except ValueError:
                return now - timedelta(days=30)
        return now - timedelta(days=30)

    @staticmethod
    def _derive_channel(
        adapter: Optional[str],
        node_type: Optional[SequenceNodeType],
    ) -> str:
        """Normalise adapter/node_type into a display channel."""
        if adapter:
            channel = adapter.lower()
            mapping = {
                "email": "email",
                "sms": "sms",
                "voice": "voice",
                "voice_call": "voice",
                "report": "report",
                "smartscan": "smartscan",
                "task": "task",
            }
            return mapping.get(channel, channel)
        if node_type:
            mapping = {
                SequenceNodeType.EMAIL: "email",
                SequenceNodeType.SMS: "sms",
                SequenceNodeType.VOICE_CALL: "voice",
                SequenceNodeType.WAIT: "wait",
                SequenceNodeType.CONDITION: "condition",
                SequenceNodeType.RESEARCH: "research",
                SequenceNodeType.START: "start",
                SequenceNodeType.END: "end",
            }
            return mapping.get(node_type, node_type.value.lower())
        return "automation"

    @staticmethod
    def trigger_processing() -> None:
        """Kick off asynchronous processing of pending sequence steps."""

        trigger_pending_scan()
    
    @staticmethod
    def create_sequence_from_template(template_name: str, user_id: int, db: Session) -> Sequence:
        """Create a new sequence from a predefined template"""
        templates = {
            "hot_lead_followup": {
                "name": "Hot Lead Follow-up",
                "description": "Aggressive 5-day follow-up for leads with 80+ scores",
                "flow_data": {
                    "nodes": [
                        {
                            "id": "start",
                            "type": "start",
                            "position": {"x": 100, "y": 100},
                            "data": {"label": "Start"}
                        },
                        {
                            "id": "call_1",
                            "type": "voice_call",
                            "position": {"x": 300, "y": 100},
                            "data": {
                                "label": "Initial Call",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "",
                                "ai_instructions": "Call lead about their roof condition. Be professional and focus on urgency.",
                                "script": "Hi {{homeowner_name}}, this is {{agent_name}} from Fish Mouth Roofing. We spotted urgent roof issues and can schedule a free inspection.",
                                "conversation_goal": "schedule_inspection",
                                "suggested_replies": [
                                    "Let's book the inspection",
                                    "Send me more details by email"
                                ]
                            }
                        },
                        {
                            "id": "wait_1",
                            "type": "wait",
                            "position": {"x": 500, "y": 100},
                            "data": {
                                "label": "Wait 4 Hours",
                                "delay_days": 0,
                                "delay_hours": 4,
                                "send_time": ""
                            }
                        },
                        {
                            "id": "sms_1",
                            "type": "sms",
                            "position": {"x": 700, "y": 100},
                            "data": {
                                "label": "Follow-up SMS",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "",
                                "use_ai_writer": true,
                                "ai_prompt": "Write an urgent but helpful SMS reminding the homeowner about the roof issues and asking to confirm an inspection.",
                                "message": "Hi {{homeowner_name}}, this is about your roof inspection. We found urgent issues that need attention. Can we schedule a free estimate?",
                                "suggested_replies": [
                                    "Yes, schedule me",
                                    "Call me tomorrow",
                                    "Not interested"
                                ]
                            }
                        },
                        {
                            "id": "condition_1",
                            "type": "condition",
                            "position": {"x": 900, "y": 100},
                            "data": {
                                "label": "Response Check",
                                "condition": "lead_responded"
                            }
                        },
                        {
                            "id": "email_1",
                            "type": "email",
                            "position": {"x": 700, "y": 300},
                            "data": {
                                "label": "Urgent Email",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "",
                                "use_ai_writer": true,
                                "ai_prompt": "Draft an urgent email about critical roof issues, include inspection CTA and urgency.",
                                "subject": "Critical Roof Issues Found at {{address}}",
                                "template": "urgent_roof_email",
                                "body": "Hi {{homeowner_name}},\n\nOur AI analysis found urgent issues on your roof. Please choose a time for a free inspection so we can prevent costly damage.\n\nBest,\nFish Mouth Roofing",
                                "suggested_replies": [
                                    "Book me for tomorrow",
                                    "Call me to discuss",
                                    "Send details"
                                ]
                            }
                        },
                        {
                            "id": "end_success",
                            "type": "end",
                            "position": {"x": 1100, "y": 50},
                            "data": {"label": "Responded", "outcome": "responded"}
                        },
                        {
                            "id": "call_2",
                            "type": "voice_call",
                            "position": {"x": 900, "y": 300},
                            "data": {
                                "label": "Final Call",
                                "delay_days": 1,
                                "delay_hours": 0,
                                "send_time": "14:00",
                                "ai_instructions": "Last attempt. Emphasize urgency and limited-time offer.",
                                "script": "Hi {{homeowner_name}}, I wanted to make sure you saw our findings. Let's get an inspection scheduled before the next storm.",
                                "conversation_goal": "schedule_inspection",
                                "suggested_replies": [
                                    "Schedule for 2pm",
                                    "Call me later",
                                    "No thanks"
                                ]
                            }
                        },
                        {
                            "id": "end_no_response",
                            "type": "end",
                            "position": {"x": 1100, "y": 300},
                            "data": {"label": "No Response", "outcome": "no_response"}
                        }
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "call_1"},
                        {"id": "e2", "source": "call_1", "target": "wait_1"},
                        {"id": "e3", "source": "wait_1", "target": "sms_1"},
                        {"id": "e4", "source": "sms_1", "target": "condition_1"},
                        {"id": "e5", "source": "condition_1", "target": "end_success", "data": {"condition": "true"}},
                        {"id": "e6", "source": "condition_1", "target": "email_1", "data": {"condition": "false"}},
                        {"id": "e7", "source": "email_1", "target": "call_2"},
                        {"id": "e8", "source": "call_2", "target": "end_no_response"}
                    ]
                }
            },
            "warm_lead_nurture": {
                "name": "Warm Lead Nurture",
                "description": "Educational 7-day sequence for warm prospects",
                "flow_data": {
                    "nodes": [
                        {
                            "id": "start",
                            "type": "start",
                            "position": {"x": 100, "y": 100},
                            "data": {"label": "Start"}
                        },
                        {
                            "id": "email_welcome",
                            "type": "email",
                            "position": {"x": 300, "y": 100},
                            "data": {
                                "label": "Welcome Email",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "09:00",
                                "use_ai_writer": true,
                                "ai_prompt": "Send a warm welcome email summarising the roof analysis, include value props and next steps.",
                                "subject": "Your Roof Analysis Results",
                                "template": "welcome_analysis",
                                "body": "Hi {{homeowner_name}},\n\nThanks for requesting a roof analysis. Here's what we found and how we can help.\n\nBest,\nFish Mouth Roofing",
                                "suggested_replies": [
                                    "Book an inspection",
                                    "Send pricing",
                                    "No thanks"
                                ]
                            }
                        },
                        {
                            "id": "wait_2",
                            "type": "wait",
                            "position": {"x": 500, "y": 100},
                            "data": {
                                "label": "Wait 2 Days",
                                "delay_days": 2,
                                "delay_hours": 0,
                                "send_time": "09:00"
                            }
                        },
                        {
                            "id": "email_education",
                            "type": "email",
                            "position": {"x": 700, "y": 100},
                            "data": {
                                "label": "Educational Content",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "10:00",
                                "use_ai_writer": true,
                                "ai_prompt": "Write an educational email teaching the homeowner about roof warning signs and offering help.",
                                "subject": "5 Signs Your Roof Needs Replacement",
                                "template": "educational_content",
                                "body": "Hi {{homeowner_name}},\n\nHere are the top five warning signs that a roof needs attention. We're happy to inspect yours when convenient.\n\nBest,\nFish Mouth Roofing",
                                "suggested_replies": [
                                    "Schedule inspection",
                                    "Call me",
                                    "Send more tips"
                                ]
                            }
                        },
                        {
                            "id": "wait_3",
                            "type": "wait",
                            "position": {"x": 900, "y": 100},
                            "data": {
                                "label": "Wait 3 Days",
                                "delay_days": 3,
                                "delay_hours": 0,
                                "send_time": "09:00"
                            }
                        },
                        {
                            "id": "call_soft",
                            "type": "voice_call",
                            "position": {"x": 1100, "y": 100},
                            "data": {
                                "label": "Soft Touch Call",
                                "delay_days": 0,
                                "delay_hours": 0,
                                "send_time": "15:00",
                                "ai_instructions": "Friendly check-in call. Ask if they have questions about their roof analysis.",
                                "script": "Hi {{homeowner_name}}, just checking in to see if you had any questions about the roof analysis we sent.",
                                "conversation_goal": "qualify_lead",
                                "suggested_replies": [
                                    "Book inspection",
                                    "Email me",
                                    "Not right now"
                                ]
                            }
                        },
                        {
                            "id": "end_nurture",
                            "type": "end",
                            "position": {"x": 1300, "y": 100},
                            "data": {"label": "Nurtured", "outcome": "nurtured"}
                        }
                    ],
                    "edges": [
                        {"id": "e1", "source": "start", "target": "email_welcome"},
                        {"id": "e2", "source": "email_welcome", "target": "wait_2"},
                        {"id": "e3", "source": "wait_2", "target": "email_education"},
                        {"id": "e4", "source": "wait_3", "target": "call_soft"},
                        {"id": "e5", "source": "call_soft", "target": "end_nurture"}
                    ]
                }
            }
        }
        
        template = templates.get(template_name)
        if not template:
            raise ValueError(f"Template {template_name} not found")
        
        # Create sequence
        sequence = Sequence(
            user_id=user_id,
            name=template["name"],
            description=template["description"],
            flow_data=template["flow_data"],
            is_active=False  # Start inactive until user activates
        )
        
        db.add(sequence)
        db.commit()
        db.refresh(sequence)
        
        # Create sequence nodes
        for node_data in template["flow_data"]["nodes"]:
            node_type = SequenceService._coerce_node_type(node_data["type"])
            node = SequenceNode(
                sequence_id=sequence.id,
                node_id=node_data["id"],
                node_type=node_type,
                position_x=node_data["position"]["x"],
                position_y=node_data["position"]["y"],
                config=node_data["data"]
            )
            db.add(node)
        
        db.commit()
        return sequence
    
    @staticmethod
    def update_sequence_flow(sequence_id: int, flow_data: Dict, user_id: int, db: Session) -> Sequence:
        """Update sequence flow data and nodes"""
        sequence = db.query(Sequence).filter(
            Sequence.id == sequence_id,
            Sequence.user_id == user_id
        ).first()
        
        if not sequence:
            raise ValueError("Sequence not found")
        
        # Update flow data
        sequence.flow_data = flow_data
        sequence.updated_at = datetime.utcnow()
        
        # Delete existing nodes
        db.query(SequenceNode).filter(SequenceNode.sequence_id == sequence_id).delete()
        
        # Create new nodes
        for node_data in flow_data.get("nodes", []):
            node_type = SequenceService._coerce_node_type(node_data["type"])
            node = SequenceNode(
                sequence_id=sequence.id,
                node_id=node_data["id"],
                node_type=node_type,
                position_x=node_data["position"]["x"],
                position_y=node_data["position"]["y"],
                config=node_data.get("data", {})
            )
            db.add(node)
        
        db.commit()
        db.refresh(sequence)
        return sequence
    
    @staticmethod
    def enroll_lead_in_sequence(lead_id: int, sequence_id: int, user_id: int, db: Session) -> SequenceEnrollment:
        """Enroll a lead in a sequence"""
        # Verify sequence belongs to user
        sequence = db.query(Sequence).filter(
            Sequence.id == sequence_id,
            Sequence.user_id == user_id,
            Sequence.is_active == True
        ).first()
        
        if not sequence:
            raise ValueError("Active sequence not found")
        
        # Verify lead belongs to user
        lead = db.query(Lead).filter(
            Lead.id == lead_id,
            Lead.user_id == user_id
        ).first()
        
        if not lead:
            raise ValueError("Lead not found")
        
        # Check if already enrolled
        existing = db.query(SequenceEnrollment).filter(
            SequenceEnrollment.lead_id == lead_id,
            SequenceEnrollment.sequence_id == sequence_id,
            SequenceEnrollment.status == "active"
        ).first()
        
        if existing:
            raise ValueError("Lead already enrolled in this sequence")
        
        # Create enrollment
        enrollment = SequenceEnrollment(
            lead_id=lead_id,
            sequence_id=sequence_id,
            status="active",
            current_node_id="start",
            next_execution_at=datetime.utcnow(),
            enrolled_at=datetime.utcnow()
        )
        
        db.add(enrollment)
        
        # Update sequence stats
        sequence.total_enrolled += 1
        
        db.commit()
        db.refresh(enrollment)

        _add_history_entry(
            db,
            enrollment,
            action="enrollment.created",
            status="active",
            result={"sequence_id": sequence.id},
        )

        SequenceService.trigger_processing()
        return enrollment

    @staticmethod
    def find_enrollment(sequence_id: int, lead_id: int, db: Session) -> Optional[SequenceEnrollment]:
        return (
            db.query(SequenceEnrollment)
            .filter(
                SequenceEnrollment.sequence_id == sequence_id,
                SequenceEnrollment.lead_id == lead_id,
            )
            .order_by(SequenceEnrollment.enrolled_at.desc())
            .first()
        )

    @staticmethod
    def pause_enrollment(enrollment: SequenceEnrollment, db: Session) -> SequenceEnrollment:
        if enrollment.status == "paused":
            return enrollment

        enrollment.status = "paused"
        enrollment.next_execution_at = None
        _add_history_entry(
            db,
            enrollment,
            action="enrollment.paused",
            status="paused",
        )
        db.commit()
        db.refresh(enrollment)
        return enrollment

    @staticmethod
    def get_sequence_performance(sequence_id: int, user_id: int, db: Session) -> Dict:
        """Get sequence performance metrics"""
        sequence = db.query(Sequence).filter(
            Sequence.id == sequence_id,
            Sequence.user_id == user_id
        ).first()
        
        if not sequence:
            raise ValueError("Sequence not found")
        
        enrollments = db.query(SequenceEnrollment).filter(
            SequenceEnrollment.sequence_id == sequence_id
        ).all()
        
        total_enrolled = len(enrollments)
        active_enrollments = len([e for e in enrollments if e.status == "active"])
        completed_enrollments = len([e for e in enrollments if e.status == "completed"])
        converted_enrollments = len([e for e in enrollments if e.conversion_outcome == "converted"])
        
        conversion_rate = (converted_enrollments / total_enrolled * 100) if total_enrolled > 0 else 0
        completion_rate = (completed_enrollments / total_enrolled * 100) if total_enrolled > 0 else 0
        
        return {
            "sequence_id": sequence_id,
            "name": sequence.name,
            "total_enrolled": total_enrolled,
            "active_enrollments": active_enrollments,
            "completed_enrollments": completed_enrollments,
            "converted_enrollments": converted_enrollments,
            "conversion_rate": round(conversion_rate, 1),
            "completion_rate": round(completion_rate, 1),
            "avg_completion_time_hours": 72,  # Mock data
            "best_performing_node": "voice_call",  # Mock data
            "drop_off_points": ["sms_1", "email_1"]  # Mock data
        }

    @staticmethod
    def get_sequence_analytics(
        sequence_id: int,
        user_id: int,
        db: Session,
        *,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """Aggregate delivery + engagement analytics for a sequence."""
        filters = filters or {}
        timeframe = filters.get("timeframe") or "30d"
        step_filter = (filters.get("step") or "").strip() or None
        status_filter = (filters.get("status") or "").strip().lower() or None
        channel_filter = (filters.get("channel") or "").strip().lower() or None
        search_filter = (filters.get("search") or "").strip().lower() or None

        limit = max(1, min(limit, 200))
        offset = max(0, offset)

        start_time = SequenceService._resolve_timeframe_start(timeframe)

        sequence = (
            db.query(Sequence)
            .filter(Sequence.id == sequence_id, Sequence.user_id == user_id)
            .first()
        )
        if not sequence:
            raise ValueError("Sequence not found")

        nodes = (
            db.query(SequenceNode)
            .filter(SequenceNode.sequence_id == sequence.id)
            .all()
        )
        node_map = {node.node_id: node for node in nodes if node.node_id}
        ordered_nodes = sorted(
            nodes,
            key=lambda n: (
                n.position_y if n.position_y is not None else 0.0,
                n.position_x if n.position_x is not None else 0.0,
                n.id or 0,
            ),
        )

        enrollments = (
            db.query(SequenceEnrollment)
            .options(selectinload(SequenceEnrollment.lead))
            .filter(
                SequenceEnrollment.sequence_id == sequence.id,
                SequenceEnrollment.user_id == user_id,
            )
            .all()
        )
        enrollment_map = {enrollment.id: enrollment for enrollment in enrollments}
        enrollment_ids: Set[int] = set(enrollment_map.keys())

        total_enrolled = len(enrollments)
        active_enrollments = sum(1 for e in enrollments if e.status == "active")
        paused_enrollments = sum(1 for e in enrollments if e.status == "paused")
        completed_enrollments = sum(1 for e in enrollments if e.status == "completed")
        failed_enrollments = sum(1 for e in enrollments if e.status == "failed")
        converted_enrollments = sum(
            1 for e in enrollments if e.conversion_outcome == "converted"
        )
        conversion_rate = (
            round((converted_enrollments / total_enrolled) * 100, 1)
            if total_enrolled
            else 0.0
        )
        completion_rate = (
            round((completed_enrollments / total_enrolled) * 100, 1)
            if total_enrolled
            else 0.0
        )
        emails_sent_total = sum(e.emails_sent for e in enrollments)
        sms_sent_total = sum(e.sms_sent for e in enrollments)
        calls_made_total = sum(e.calls_made for e in enrollments)

        node_types_present = {
            node.node_type for node in nodes if getattr(node, "node_type", None)
        }
        def _missing_contact(predicate) -> int:
            missing = 0
            for enrollment in enrollments:
                lead = enrollment.lead
                if not lead or not predicate(lead):
                    missing += 1
            return missing

        automation_health: List[Dict[str, Any]] = []
        if SequenceNodeType.EMAIL in node_types_present:
            missing_email = _missing_contact(lambda lead: bool(lead.homeowner_email))
            automation_health.append(
                {
                    "channel": "email",
                    "has_steps": True,
                    "missing_contacts": missing_email,
                    "ready_contacts": max(total_enrolled - missing_email, 0),
                    "status": "attention" if missing_email else "ok",
                }
            )
        if SequenceNodeType.SMS in node_types_present:
            missing_sms = _missing_contact(lambda lead: bool(lead.homeowner_phone))
            automation_health.append(
                {
                    "channel": "sms",
                    "has_steps": True,
                    "missing_contacts": missing_sms,
                    "ready_contacts": max(total_enrolled - missing_sms, 0),
                    "status": "attention" if missing_sms else "ok",
                }
            )
        if SequenceNodeType.VOICE_CALL in node_types_present:
            missing_voice = _missing_contact(lambda lead: bool(lead.homeowner_phone))
            automation_health.append(
                {
                    "channel": "voice",
                    "has_steps": True,
                    "missing_contacts": missing_voice,
                    "ready_contacts": max(total_enrolled - missing_voice, 0),
                    "status": "attention" if missing_voice else "ok",
                }
            )

        executions: List[SequenceExecution] = []
        if enrollment_ids:
            exec_query = (
                db.query(SequenceExecution)
                .filter(
                    SequenceExecution.sequence_id == sequence.id,
                    SequenceExecution.enrollment_id.in_(enrollment_ids),
                    SequenceExecution.adapter.isnot(None),
                )
            )
            if start_time:
                exec_query = exec_query.filter(SequenceExecution.started_at >= start_time)
            if step_filter:
                exec_query = exec_query.filter(SequenceExecution.node_id == step_filter)
            if channel_filter:
                exec_query = exec_query.filter(SequenceExecution.adapter == channel_filter)
            executions = exec_query.order_by(SequenceExecution.started_at.desc()).all()

        message_ids: Set[str] = set()
        for execution in executions:
            metadata_source = getattr(execution, "metadata", None)
            metadata = metadata_source if isinstance(metadata_source, dict) else None
            if metadata is None:
                metadata = execution.execution_metadata or {}
            message_id_value = metadata.get("message_id") or metadata.get("id")
            if message_id_value:
                message_ids.add(str(message_id_value))

        outbox_map: Dict[str, OutboxMessage] = {}
        events_by_message: Dict[str, List[MessageEvent]] = defaultdict(list)
        if message_ids:
            outbox_rows = (
                db.query(OutboxMessage)
                .filter(OutboxMessage.id.in_(message_ids))
                .all()
            )
            outbox_map = {str(row.id): row for row in outbox_rows}
            event_rows = (
                db.query(MessageEvent)
                .filter(MessageEvent.message_id.in_(message_ids))
                .order_by(MessageEvent.occurred_at.asc())
                .all()
            )
            for event in event_rows:
                events_by_message[str(event.message_id)].append(event)

        all_records: List[Dict[str, Any]] = []
        for execution in executions:
            metadata_source = getattr(execution, "metadata", None)
            metadata = metadata_source if isinstance(metadata_source, dict) else None
            if metadata is None:
                metadata = execution.execution_metadata or {}
            node_id = execution.node_id or metadata.get("sequence_node_id")
            enrollment = enrollment_map.get(execution.enrollment_id)
            if not enrollment:
                continue
            lead = enrollment.lead
            node = node_map.get(node_id)
            channel = SequenceService._derive_channel(
                execution.adapter,
                node.node_type if node else execution.node_type,
            )
            if channel_filter and channel != channel_filter:
                continue

            message_id = metadata.get("message_id") or metadata.get("id")
            message_key = str(message_id) if message_id else None
            outbox = outbox_map.get(message_key) if message_key else None
            events = events_by_message.get(message_key or "", [])

            sent_dt = None
            if outbox and (outbox.sent_at or outbox.created_at):
                sent_dt = outbox.sent_at or outbox.created_at
            if not sent_dt:
                sent_dt = execution.started_at

            delivered_dt = outbox.delivered_at if outbox else None
            event_summaries: List[Dict[str, Any]] = []
            engagement_candidates: List[Tuple[str, Optional[datetime], Dict[str, Any]]] = []
            open_events = 0
            click_events = 0
            reply_events = 0
            delivered_events = 0
            failed_events = 0
            for evt in events:
                occurred_dt = evt.occurred_at
                summary = {
                    "type": evt.type,
                    "occurred_at": occurred_dt.isoformat() if occurred_dt else None,
                    "meta": evt.meta or {},
                }
                event_summaries.append(summary)
                event_type = (evt.type or "").lower()
                if event_type == "opened":
                    open_events += 1
                    engagement_candidates.append(("opened", occurred_dt, summary))
                elif event_type == "clicked":
                    click_events += 1
                    engagement_candidates.append(("clicked", occurred_dt, summary))
                elif event_type == "replied":
                    reply_events += 1
                    engagement_candidates.append(("replied", occurred_dt, summary))
                elif event_type == "delivered":
                    delivered_events += 1
                elif event_type in {"failed", "bounced"}:
                    failed_events += 1

            engagement_event: Optional[Dict[str, Any]] = None
            engagement_dt: Optional[datetime] = None
            for priority in ("replied", "clicked", "opened"):
                for event_type, occurred_dt, summary in engagement_candidates:
                    if event_type == priority:
                        engagement_event = summary
                        engagement_dt = occurred_dt
                        break
                if engagement_event:
                    break
            if not engagement_event and engagement_candidates:
                fallback_type, occurred_dt, summary = engagement_candidates[0]
                engagement_event = summary
                engagement_dt = occurred_dt

            response_minutes_value: Optional[float] = None
            if engagement_dt and sent_dt:
                delta = (engagement_dt - sent_dt).total_seconds()
                if delta >= 0:
                    response_minutes_value = delta / 60.0

            last_event_dt = engagement_dt
            if not last_event_dt and events:
                last_event_dt = events[-1].occurred_at
            if not last_event_dt:
                last_event_dt = delivered_dt or sent_dt

            delivery_status_raw = (
                (outbox.status.lower() if outbox and outbox.status else None)
                or (execution.status.lower() if execution.status else None)
                or "queued"
            )
            delivery_status = delivery_status_raw
            if failed_events or delivery_status_raw in {"failed", "bounced"} or execution.status == "failed":
                delivery_status = "failed"
            elif delivered_events or (outbox and outbox.delivered_at):
                delivery_status = "delivered"
            elif delivery_status_raw in {"queued", "sending", "pending", "running"}:
                delivery_status = "queued"
            elif delivery_status_raw == "completed" and channel == "voice":
                delivery_status = "completed"
            elif delivery_status_raw == "sent":
                delivery_status = "sent"

            is_delivered = delivery_status == "delivered"
            is_failed = delivery_status in {"failed", "bounced"}
            is_queued = delivery_status in {"queued", "pending", "sending", "running"}
            engaged_flag = bool(engagement_event and (engagement_event.get("type") or "").lower() in {"opened", "clicked", "replied"})

            lead_payload = {
                "id": lead.id if lead else None,
                "name": (
                    lead.homeowner_name
                    or lead.address
                    or (f"Lead #{lead.id}" if lead else "Lead")
                )
                if lead
                else "Lead",
                "email": lead.homeowner_email if lead else None,
                "phone": lead.homeowner_phone if lead else None,
                "city": lead.city if lead else None,
                "state": lead.state if lead else None,
                "score": lead.lead_score if lead else None,
                "status": lead.status if lead else None,
            }

            node_label = ""
            node_type_value = None
            node_position = {"x": None, "y": None}
            if node:
                node_label = (node.config or {}).get("label") or node.node_id
                node_type_value = node.node_type.value if node.node_type else None
                node_position = {
                    "x": node.position_x,
                    "y": node.position_y,
                }
            else:
                node_label = node_id or (execution.node_type.value if execution.node_type else "Step")
                node_type_value = execution.node_type.value if execution.node_type else None

            sent_iso = sent_dt.isoformat() if sent_dt else None
            delivered_iso = delivered_dt.isoformat() if delivered_dt else None
            last_event_iso = last_event_dt.isoformat() if last_event_dt else None

            record = {
                "execution_id": execution.id,
                "channel": channel,
                "lead": lead_payload,
                "sequence_node": {
                    "id": node_id,
                    "label": node_label,
                    "type": node_type_value,
                    "channel": channel,
                    "position": node_position,
                },
                "delivery": {
                    "status": delivery_status,
                    "engine_status": execution.status,
                    "sent_at": sent_iso,
                    "delivered_at": delivered_iso,
                    "last_event_at": last_event_iso,
                    "provider": metadata.get("provider") or (outbox.provider if outbox else None),
                    "message_id": message_key,
                },
                "engagement": {
                    "type": engagement_event.get("type") if engagement_event else None,
                    "occurred_at": engagement_event.get("occurred_at") if engagement_event else None,
                    "response_minutes": round(response_minutes_value, 1) if response_minutes_value is not None else None,
                },
                "events": event_summaries,
                "enrollment": {
                    "id": enrollment.id,
                    "status": enrollment.status,
                    "conversion_outcome": enrollment.conversion_outcome,
                    "current_node_id": enrollment.current_node_id,
                    "steps_completed": enrollment.steps_completed,
                    "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                    "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
                },
            }

            node_position_tuple = (
                node.position_y if node and node.position_y is not None else 0.0,
                node.position_x if node and node.position_x is not None else 0.0,
                node.id if node and node.id is not None else 0,
            )
            record["_metrics"] = {
                "node_id": node_id,
                "delivered": 1 if is_delivered else 0,
                "failed": 1 if is_failed else 0,
                "queued": 1 if is_queued else 0,
                "engaged": 1 if engaged_flag else 0,
                "clicked": 1 if click_events > 0 else 0,
                "opened": 1 if open_events > 0 else 0,
                "replied": 1 if reply_events > 0 else 0,
                "open_events": open_events,
                "click_events": click_events,
                "reply_events": reply_events,
                "response_minutes": response_minutes_value,
                "lead_id": lead.id if lead else None,
                "channel": channel,
                "sort_ts": (
                    sent_dt.timestamp()
                    if sent_dt
                    else (execution.started_at.timestamp() if execution.started_at else 0.0)
                ),
                "node_position": node_position_tuple,
            }
            all_records.append(record)

        def _aggregate_delivery(records_list: List[Dict[str, Any]]) -> Dict[str, Any]:
            totals = {
                "messages": len(records_list),
                "delivered": 0,
                "failed": 0,
                "queued": 0,
                "engaged": 0,
                "clicked": 0,
                "opened": 0,
                "replied": 0,
                "unique_leads": 0,
                "average_response_minutes": None,
                "engagement_rate": 0.0,
                "delivery_rate": 0.0,
                "failure_rate": 0.0,
            }
            if not records_list:
                return totals

            responses: List[float] = []
            lead_ids: Set[int] = set()
            for rec in records_list:
                metrics = rec.get("_metrics") or {}
                totals["delivered"] += metrics.get("delivered", 0)
                totals["failed"] += metrics.get("failed", 0)
                totals["queued"] += metrics.get("queued", 0)
                totals["engaged"] += metrics.get("engaged", 0)
                totals["clicked"] += metrics.get("clicked", 0)
                totals["opened"] += metrics.get("opened", 0)
                totals["replied"] += metrics.get("replied", 0)
                response_value = metrics.get("response_minutes")
                if isinstance(response_value, (int, float)):
                    responses.append(float(response_value))
                lead_id_val = metrics.get("lead_id")
                if lead_id_val is not None:
                    lead_ids.add(lead_id_val)
            totals["unique_leads"] = len(lead_ids)
            if responses:
                totals["average_response_minutes"] = round(
                    sum(responses) / len(responses), 1
                )
            if totals["messages"]:
                totals["engagement_rate"] = round(
                    (totals["engaged"] / totals["messages"]) * 100, 1
                )
                totals["delivery_rate"] = round(
                    (totals["delivered"] / totals["messages"]) * 100, 1
                )
                totals["failure_rate"] = round(
                    (totals["failed"] / totals["messages"]) * 100, 1
                )
            return totals

        def _channel_breakdown(records_list: List[Dict[str, Any]]) -> Dict[str, Any]:
            counts: Dict[str, int] = defaultdict(int)
            for rec in records_list:
                metrics = rec.get("_metrics") or {}
                channel_name = metrics.get("channel") or "unknown"
                counts[channel_name] += 1
            total = sum(counts.values())
            distribution = {
                channel_name: round((count / total) * 100, 1) if total else 0.0
                for channel_name, count in counts.items()
            }
            return {"counts": dict(counts), "distribution": distribution}

        def _build_step_metrics(records_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            step_map: Dict[str, Dict[str, Any]] = {}
            for rec in records_list:
                metrics = rec.get("_metrics") or {}
                node_id_key = metrics.get("node_id")
                if not node_id_key:
                    continue
                node = node_map.get(node_id_key)
                entry = step_map.setdefault(
                    node_id_key,
                    {
                        "node_id": node_id_key,
                        "label": (node.config or {}).get("label") if node else node_id_key,
                        "type": node.node_type.value if node and node.node_type else None,
                        "channel": SequenceService._derive_channel(
                            None, node.node_type if node else None
                        ),
                        "sends": 0,
                        "delivered": 0,
                        "failed": 0,
                        "engagements": 0,
                        "opens": 0,
                        "clicks": 0,
                        "replies": 0,
                        "last_activity_at": None,
                        "_responses": [],
                        "_position": metrics.get("node_position")
                        or (
                            node.position_y if node and node.position_y is not None else 0.0,
                            node.position_x if node and node.position_x is not None else 0.0,
                            node.id if node and node.id is not None else 0,
                        ),
                    },
                )
                entry["sends"] += 1
                entry["delivered"] += metrics.get("delivered", 0)
                entry["failed"] += metrics.get("failed", 0)
                entry["engagements"] += metrics.get("engaged", 0)
                entry["opens"] += metrics.get("open_events", 0)
                entry["clicks"] += metrics.get("click_events", 0)
                entry["replies"] += metrics.get("reply_events", 0)
                response_val = metrics.get("response_minutes")
                if isinstance(response_val, (int, float)):
                    entry["_responses"].append(float(response_val))
                last_event_at = rec.get("delivery", {}).get("last_event_at")
                if last_event_at:
                    existing = entry["last_activity_at"]
                    if not existing or last_event_at > existing:
                        entry["last_activity_at"] = last_event_at

            step_list: List[Dict[str, Any]] = []
            for entry in step_map.values():
                responses = entry.pop("_responses", [])
                position = entry.pop("_position", (0.0, 0.0, 0))
                sends = entry["sends"] or 1  # avoid division-by-zero
                entry["engagement_rate"] = round(
                    (entry["engagements"] / sends) * 100, 1
                )
                entry["delivery_rate"] = round((entry["delivered"] / sends) * 100, 1)
                entry["failure_rate"] = round((entry["failed"] / sends) * 100, 1)
                entry["avg_response_minutes"] = (
                    round(sum(responses) / len(responses), 1) if responses else None
                )
                entry["_position"] = position
                step_list.append(entry)

            def _sort_key(item: Dict[str, Any]) -> Tuple[float, float, float]:
                return item.get("_position", (0.0, 0.0, 0))

            step_list.sort(key=_sort_key)
            for item in step_list:
                item.pop("_position", None)
            return step_list

        filtered_records = all_records
        if status_filter:
            def _match_status(record: Dict[str, Any]) -> bool:
                delivery_status_local = (record.get("delivery", {}).get("status") or "").lower()
                engagement_type = (record.get("engagement", {}).get("type") or "").lower()
                if status_filter == "engaged":
                    return bool(record.get("_metrics", {}).get("engaged"))
                if status_filter == "responded":
                    return engagement_type == "replied"
                if status_filter == "delivered":
                    return delivery_status_local == "delivered"
                if status_filter == "queued":
                    return delivery_status_local in {"queued", "pending", "sending", "running"}
                if status_filter == "failed":
                    return delivery_status_local in {"failed", "bounced"}
                if status_filter == "sent":
                    return delivery_status_local == "sent"
                if status_filter == "completed":
                    return delivery_status_local == "completed"
                return delivery_status_local == status_filter

            filtered_records = [rec for rec in filtered_records if _match_status(rec)]

        if search_filter:
            def _matches_search(record: Dict[str, Any]) -> bool:
                lead_payload_local = record.get("lead", {})
                values = [
                    lead_payload_local.get("name") or "",
                    lead_payload_local.get("email") or "",
                    lead_payload_local.get("phone") or "",
                    lead_payload_local.get("city") or "",
                    lead_payload_local.get("state") or "",
                    record.get("sequence_node", {}).get("label") or "",
                ]
                return any(search_filter in (value or "").lower() for value in values)

            filtered_records = [rec for rec in filtered_records if _matches_search(rec)]

        filtered_records.sort(
            key=lambda rec: rec.get("_metrics", {}).get("sort_ts") or 0.0,
            reverse=True,
        )

        overall_delivery = _aggregate_delivery(all_records)
        filtered_delivery = _aggregate_delivery(filtered_records)
        overall_step_metrics = _build_step_metrics(all_records)
        filtered_step_metrics = _build_step_metrics(filtered_records)
        overall_channel = _channel_breakdown(all_records)
        filtered_channel = _channel_breakdown(filtered_records)

        paginated_records = filtered_records[offset : offset + limit]

        for rec in all_records:
            rec.pop("_metrics", None)

        step_options = [
            {
                "node_id": node.node_id,
                "label": (node.config or {}).get("label") or node.node_id,
                "type": node.node_type.value if node.node_type else None,
                "channel": SequenceService._derive_channel(None, node.node_type),
            }
            for node in ordered_nodes
        ]
        channel_options = sorted(
            {
                SequenceService._derive_channel(None, node.node_type)
                for node in ordered_nodes
                if node.node_type
            }
        )

        return {
            "sequence": {
                "id": sequence.id,
                "name": sequence.name,
                "description": sequence.description,
                "is_active": sequence.is_active,
            },
            "filters": {
                "timeframe": timeframe,
                "applied": {
                    "step": step_filter,
                    "status": status_filter,
                    "channel": channel_filter,
                    "search": filters.get("search") or None,
                },
                "options": {
                    "steps": step_options,
                    "channels": channel_options,
                    "statuses": [
                        "engaged",
                        "responded",
                        "delivered",
                        "queued",
                        "failed",
                        "sent",
                        "completed",
                    ],
                },
            },
            "summary": {
                "enrollment": {
                    "total": total_enrolled,
                    "active": active_enrollments,
                    "paused": paused_enrollments,
                    "completed": completed_enrollments,
                    "failed": failed_enrollments,
                    "converted": converted_enrollments,
                    "conversion_rate": conversion_rate,
                    "completion_rate": completion_rate,
                    "emails_sent": emails_sent_total,
                    "sms_sent": sms_sent_total,
                    "calls_made": calls_made_total,
                },
                "delivery": filtered_delivery,
                "overall_delivery": overall_delivery,
                "channels": {
                    "filtered": filtered_channel,
                    "overall": overall_channel,
                },
            },
            "automation_health": automation_health,
            "steps": {
                "filtered": filtered_step_metrics,
                "overall": overall_step_metrics,
            },
            "engagements": {
                "total": len(filtered_records),
                "count": len(paginated_records),
                "limit": limit,
                "offset": offset,
                "items": paginated_records,
            },
        }

class SequenceExecutor:
    """
    Service for executing sequence steps and managing lead progression
    """

    @staticmethod
    def _check_contact_permissions(lead: Lead, channel: str) -> Optional[str]:
        if lead.dnc:
            return "Lead is marked as do-not-contact"
        channel = channel.lower()
        if channel == "email" and not lead.consent_email:
            return "Email consent not granted"
        if channel == "sms" and not lead.consent_sms:
            return "SMS consent not granted"
        if channel == "voice" and not lead.consent_voice:
            return "Voice consent not granted"
        return None

    @staticmethod
    def _safe_int(value, default=0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _fetch_sequence_node(sequence: Sequence, node_id: Optional[str], db: Session) -> Optional[SequenceNode]:
        if not node_id:
            return None
        return db.query(SequenceNode).filter(
            SequenceNode.sequence_id == sequence.id,
            SequenceNode.node_id == node_id
        ).first()

    @staticmethod
    def _start_execution_log(enrollment: SequenceEnrollment, node: SequenceNode, adapter: str, db: Session) -> SequenceExecution:
        log_entry = SequenceExecution(
            sequence_id=enrollment.sequence_id,
            enrollment_id=enrollment.id,
            node_id=node.node_id,
            node_type=node.node_type,
            adapter=adapter,
            status="running",
            started_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.flush()
        return log_entry

    @staticmethod
    def _complete_execution_log(log_entry: SequenceExecution, result: Optional[DeliveryResult], success: bool = True, error: Optional[str] = None) -> None:
        log_entry.status = "completed" if success else "failed"
        log_entry.completed_at = datetime.utcnow()
        if error:
            log_entry.error_message = error
        if result:
            metadata = log_entry.metadata or {}
            metadata.update(result.metadata or {})
            if result.message_id:
                metadata.setdefault("message_id", result.message_id)
            metadata["provider"] = result.provider
            if result.cost is not None:
                metadata["cost"] = result.cost
            log_entry.metadata = metadata

    @staticmethod
    def _compute_next_execution(sequence: Sequence, node: Optional[SequenceNode], base_time: datetime) -> datetime:
        if not node:
            return base_time

        config = node.config or {}
        delay_days = SequenceExecutor._safe_int(config.get("delay_days", 0), 0)
        delay_hours = SequenceExecutor._safe_int(config.get("delay_hours", 0), 0)
        delay_minutes = SequenceExecutor._safe_int(config.get("delay_minutes", 0), 0)
        delay_seconds = SequenceExecutor._safe_int(
            config.get("delay_seconds", config.get("duration_sec", 0)),
            0,
        )
        send_time = config.get("send_time") or ""

        try:
            tz = ZoneInfo(sequence.timezone or "UTC")
        except Exception:
            tz = ZoneInfo("UTC")

        base_local = base_time.replace(tzinfo=timezone.utc).astimezone(tz)
        target_local = base_local + timedelta(
            days=delay_days,
            hours=delay_hours,
            minutes=delay_minutes,
            seconds=delay_seconds,
        )

        if send_time:
            try:
                hour, minute = map(int, send_time.split(":")[:2])
                target_local = target_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if target_local < base_local + timedelta(days=delay_days, hours=delay_hours):
                    target_local += timedelta(days=1)
            except ValueError:
                pass

        return target_local.astimezone(timezone.utc).replace(tzinfo=None)

    @staticmethod
    def _advance_to_next_node(
        enrollment: SequenceEnrollment,
        current_node: Optional[SequenceNode],
        next_node_id: Optional[str],
        db: Session,
    ) -> None:
        sequence = enrollment.sequence
        base_time = datetime.utcnow()

        if not next_node_id:
            enrollment.current_node_id = None
            enrollment.next_execution_at = None
            enrollment.last_execution_at = base_time
            return

        schedule_source = current_node if current_node and current_node.node_type == SequenceNodeType.WAIT else None
        next_node = SequenceExecutor._fetch_sequence_node(sequence, next_node_id, db)
        if schedule_source is None:
            schedule_source = next_node

        enrollment.current_node_id = next_node_id
        enrollment.next_execution_at = SequenceExecutor._compute_next_execution(sequence, schedule_source, base_time)
        enrollment.last_execution_at = base_time

    @staticmethod
    def _render_text(template: str, lead: Lead) -> str:
        if not template:
            return ""

        context = SequenceExecutor._token_context_for_lead(lead)
        resolution = resolve_text(template, context)
        return resolution.text

    @staticmethod
    def _token_context_for_lead(lead: Lead) -> Dict[str, Any]:
        lead_payload = coerce_model_dict(lead)
        company_payload = SequenceExecutor._company_for_lead(lead)
        return compose_context(lead=lead_payload, company=company_payload or None)

    @staticmethod
    def _company_for_lead(lead: Lead) -> Dict[str, Any]:
        company: Dict[str, Any] = {}
        user = getattr(lead, "user", None)
        if user:
            user_payload = coerce_model_dict(
                user,
                columns=[
                    "company_name",
                    "full_name",
                    "phone",
                    "email",
                    "business_logo_url",
                ],
            )
            name = user_payload.get("company_name") or user_payload.get("full_name")
            if name:
                company["name"] = name
            if user_payload.get("phone"):
                company["phone"] = user_payload["phone"]
            if user_payload.get("email"):
                company.setdefault("email", user_payload["email"])
            if user_payload.get("business_logo_url"):
                company["logo_url"] = user_payload["business_logo_url"]
        return company

    @staticmethod
    def _generate_ai_email(lead: Lead, config: Dict[str, Any]) -> str:
        prompt = config.get("ai_prompt") or "Just wanted to follow up about your roof inspection request."
        summary = SequenceExecutor._render_text(prompt, lead)
        homeowner = lead.homeowner_name or "there"
        agent_name = getattr(getattr(lead, "user", None), "company_name", None) or "Fish Mouth Roofing"
        address = lead.address or "your property"

        body = (
            f"Hi {homeowner},\n\n"
            f"{summary}\n\n"
            f"Our AI detected important signals at {address}. Let's lock in a time that works for you so we can keep everything safe."
            f"\n\nBest,\n{agent_name}"
        )
        return SequenceExecutor._render_text(body, lead)

    @staticmethod
    def _generate_ai_sms(lead: Lead, config: Dict[str, Any]) -> str:
        prompt = config.get("ai_prompt") or "Remind the homeowner about their free roof inspection and include a clear CTA."
        summary = SequenceExecutor._render_text(prompt, lead)
        address = lead.address or "your property"

        if len(summary) > 0:
            body = summary
        else:
            body = f"Quick reminder: we found issues on the roof at {address}. Grab your free inspection? Reply YES and we'll schedule it."

        return SequenceExecutor._render_text(body, lead)
    @staticmethod
    async def process_pending_steps(db: Session):
        """Process all pending sequence steps"""
        # Get all active enrollments that are ready for next step
        current_time = datetime.utcnow()
        
        enrollments = db.query(SequenceEnrollment).filter(
            SequenceEnrollment.status == "active",
            or_(SequenceEnrollment.next_execution_at == None, SequenceEnrollment.next_execution_at <= current_time)
        ).all()
        
        for enrollment in enrollments:
            try:
                await SequenceExecutor.execute_next_step(enrollment, db)
            except Exception as e:
                print(f"Error executing step for enrollment {enrollment.id}: {e}")
                # Mark as failed and continue
                enrollment.status = "failed"
                enrollment.error_message = str(e)
                _add_history_entry(
                    db,
                    enrollment,
                    action="execution.error",
                    status="failed",
                    result={},
                    error=str(e),
                )
                db.commit()
    
    @staticmethod
    async def execute_next_step(enrollment: SequenceEnrollment, db: Session):
        """Execute the next step for a specific enrollment"""
        sequence = enrollment.sequence
        current_node_id = enrollment.current_node_id
        
        # Find current node
        current_node = db.query(SequenceNode).filter(
            SequenceNode.sequence_id == sequence.id,
            SequenceNode.node_id == current_node_id
        ).first()
        
        if not current_node:
            enrollment.status = "failed"
            enrollment.error_message = f"Node {current_node_id} not found"
            db.commit()
            return
        
        enrollment.error_message = None

        # Handle start node by moving immediately to the next node
        if current_node.node_type == SequenceNodeType.START:
            next_node_id = SequenceExecutor._get_next_node_id(current_node, sequence)
            if next_node_id is None:
                enrollment.status = "completed"
                enrollment.completed_at = datetime.utcnow()
                sequence.total_completed += 1
            else:
                SequenceExecutor._advance_to_next_node(enrollment, current_node, next_node_id, db)
            db.commit()
            if enrollment.status == "active":
                schedule_enrollment_execution(enrollment.id, enrollment.next_execution_at)
            return

        # Execute based on node type
        if current_node.node_type == SequenceNodeType.VOICE_CALL:
            await SequenceExecutor._execute_voice_call(enrollment, current_node, db)
        elif current_node.node_type == SequenceNodeType.EMAIL:
            await SequenceExecutor._execute_email(enrollment, current_node, db)
        elif current_node.node_type == SequenceNodeType.SMS:
            await SequenceExecutor._execute_sms(enrollment, current_node, db)
        elif current_node.node_type == SequenceNodeType.WAIT:
            await SequenceExecutor._execute_wait(enrollment, current_node, db)
        elif current_node.node_type == SequenceNodeType.CONDITION:
            await SequenceExecutor._execute_condition(enrollment, current_node, db)
        elif current_node.node_type == SequenceNodeType.END:
            await SequenceExecutor._execute_end(enrollment, current_node, db)
        
        db.commit()

        if enrollment.status == "active":
            schedule_enrollment_execution(enrollment.id, enrollment.next_execution_at)

    @staticmethod
    async def _execute_voice_call(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute voice call step using the configured adapter."""
        lead = enrollment.lead
        config = node.config or {}
        adapters = get_delivery_adapters()
        log_entry = SequenceExecutor._start_execution_log(enrollment, node, "voice", db)

        rendered_instructions = SequenceExecutor._render_text(config.get("ai_instructions", ""), lead)
        rendered_script = SequenceExecutor._render_text(config.get("script", ""), lead)
        to_number = lead.homeowner_phone or config.get("fallback_number")

        if not to_number:
            error = "No phone number available for voice outreach."
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="voice_call_failed",
                    title="Voice call skipped – missing phone number",
                    description="Sequence attempted to place a call but no phone number was available.",
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        violation = SequenceExecutor._check_contact_permissions(lead, "voice")
        if violation:
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=violation)
            enrollment.status = "failed"
            enrollment.error_message = violation
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.voice",
                status="blocked",
                error=violation,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="contact_blocked",
                    title="Voice call blocked by consent guard",
                    description=violation,
                    metadata={"sequence_node_id": node.node_id, "channel": "voice"},
                )
            )
            return

        try:
            result = await adapters.voice.initiate_call(
                to_number=to_number,
                script=rendered_script,
                metadata={
                    "sequence_node_id": node.node_id,
                    "ai_instructions": rendered_instructions,
                    "conversation_goal": config.get("conversation_goal"),
                },
            )
            SequenceExecutor._complete_execution_log(log_entry, result, success=result.success)
        except Exception as exc:  # pragma: no cover - defensive
            error = f"Voice delivery failed: {exc}"
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="voice_call_failed",
                    title=config.get("label", "AI Voice Call Failed"),
                    description=error,
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        if not result.success:
            error = (result.metadata or {}).get("error") if result.metadata else "Voice delivery reported a failure."
            enrollment.status = "failed"
            enrollment.error_message = error
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="voice_call_failed",
                    title=config.get("label", "AI Voice Call Failed"),
                    description=error,
                    metadata={
                        "sequence_node_id": node.node_id,
                        "provider": result.provider,
                        "delivery_metadata": result.metadata,
                    },
                )
            )
            return

        voice_call = VoiceCall(
            user_id=lead.user_id,
            lead_id=lead.id,
            to_number=to_number,
            status="completed" if result.success else "failed",
            duration_seconds=120 if result.success else 0,
            outcome="pending_follow_up" if result.success else "failed",
            ai_instructions=rendered_instructions,
            conversation_goal=config.get("conversation_goal"),
            sequence_enrollment_id=enrollment.id,
        )

        db.add(voice_call)
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=lead.user_id,
                activity_type="voice_call" if result.success else "voice_call_failed",
                title=config.get("label", "AI Voice Call"),
                description="Automated voice outreach executed by AI agent." if result.success else "Voice outreach failed.",
                metadata={
                    "sequence_node_id": node.node_id,
                    "ai_instructions": rendered_instructions,
                    "script": rendered_script,
                    "conversation_goal": config.get("conversation_goal"),
                    "provider": result.provider,
                    "message_id": result.message_id,
                    "delivery_metadata": result.metadata,
                },
            )
        )

        next_node_id = SequenceExecutor._get_next_node_id(node, enrollment.sequence)
        enrollment.steps_completed += 1
        enrollment.calls_made += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)
    
    @staticmethod
    async def _execute_email(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute email step"""
        config = node.config or {}
        lead = enrollment.lead
        log_entry = SequenceExecutor._start_execution_log(enrollment, node, "email", db)

        violation = SequenceExecutor._check_contact_permissions(lead, "email")
        if violation:
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=violation)
            enrollment.status = "failed"
            enrollment.error_message = violation
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.email",
                status="blocked",
                error=violation,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="contact_blocked",
                    title="Email blocked by consent guard",
                    description=violation,
                    metadata={"sequence_node_id": node.node_id, "channel": "email"},
                )
            )
            return

        use_ai = config.get("use_ai_writer", True)
        subject_template = config.get("subject", "Follow-up from Fish Mouth")
        subject = SequenceExecutor._render_text(subject_template, lead)
        if use_ai:
            body = SequenceExecutor._generate_ai_email(lead, config)
        else:
            body = SequenceExecutor._render_text(config.get("body", ""), lead)

        to_address = lead.homeowner_email
        if not to_address:
            error = "No email address available for sequence email."
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.email",
                status="failed",
                error=error,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="email_failed",
                    title="Email skipped – missing address",
                    description="Sequence email could not be sent because the lead lacks an email address.",
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        try:
            queued = queue_outbox_message(
                channel="email",
                to_address=to_address,
                subject=subject,
                text=body,
                metadata={
                    "sequence_node_id": node.node_id,
                    "sequence_id": enrollment.sequence_id,
                    "enrollment_id": enrollment.id,
                    "lead_id": lead.id,
                },
                context={
                    "sequence_id": enrollment.sequence_id,
                    "enrollment_id": enrollment.id,
                    "lead_id": lead.id,
                    "node_id": node.node_id,
                },
            )
            result = DeliveryResult(
                success=True,
                provider="outbox",
                message_id=queued.get("id"),
                metadata={"status": queued.get("status", "queued"), **queued},
            )
            SequenceExecutor._complete_execution_log(log_entry, result, success=True)
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.email",
                status="queued",
                result={
                    "message_id": queued.get("id"),
                    "subject": subject,
                    "status": queued.get("status", "queued"),
                },
            )
        except Exception as exc:  # pragma: no cover
            error = f"Email delivery failed: {exc}"
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.email",
                status="failed",
                error=error,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="email_failed",
                    title=config.get("label", "Sequence Email Failed"),
                    description=error,
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=lead.user_id,
                activity_type="email_sent",
                title=config.get("label", "Sequence Email Queued"),
                description="Sequence email queued for delivery via outbox.",
                metadata={
                    "subject": subject,
                    "template": config.get("template"),
                    "body": body,
                    "generated": bool(use_ai),
                    "ai_prompt": config.get("ai_prompt"),
                    "suggested_replies": config.get("suggested_replies", []),
                    "sequence_node_id": node.node_id,
                    "provider": result.provider,
                    "message_id": result.message_id,
                    "delivery_metadata": result.metadata,
                },
            )
        )

        record_usage(
            db,
            user_id=lead.user_id,
            metric="emails_sent",
            quantity=1,
            metadata={"sequence_node_id": node.node_id},
        )

        next_node_id = SequenceExecutor._get_next_node_id(node, enrollment.sequence)
        enrollment.emails_sent += 1
        enrollment.steps_completed += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)
    
    @staticmethod
    async def _execute_sms(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute SMS step"""
        config = node.config or {}
        lead = enrollment.lead

        log_entry = SequenceExecutor._start_execution_log(enrollment, node, "sms", db)

        violation = SequenceExecutor._check_contact_permissions(lead, "sms")
        if violation:
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=violation)
            enrollment.status = "failed"
            enrollment.error_message = violation
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.sms",
                status="blocked",
                error=violation,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="contact_blocked",
                    title="SMS blocked by consent guard",
                    description=violation,
                    metadata={"sequence_node_id": node.node_id, "channel": "sms"},
                )
            )
            return

        use_ai = config.get("use_ai_writer", True)
        if use_ai:
            message = SequenceExecutor._generate_ai_sms(lead, config)
        else:
            message = SequenceExecutor._render_text(config.get("message", ""), lead)

        to_number = lead.homeowner_phone or config.get("fallback_number")
        if not to_number:
            error = "No phone number available for SMS delivery."
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.sms",
                status="failed",
                error=error,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="sms_failed",
                    title="SMS skipped – missing phone number",
                    description="Sequence SMS could not be sent because no phone number is available.",
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        try:
            queued = queue_outbox_message(
                channel="sms",
                to_address=to_number,
                text=message,
                metadata={
                    "sequence_node_id": node.node_id,
                    "sequence_id": enrollment.sequence_id,
                    "enrollment_id": enrollment.id,
                    "lead_id": lead.id,
                },
                context={
                    "sequence_id": enrollment.sequence_id,
                    "enrollment_id": enrollment.id,
                    "lead_id": lead.id,
                    "node_id": node.node_id,
                },
            )
            result = DeliveryResult(
                success=True,
                provider="outbox",
                message_id=queued.get("id"),
                metadata={"status": queued.get("status", "queued"), **queued},
            )
            SequenceExecutor._complete_execution_log(log_entry, result, success=True)
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.sms",
                status="queued",
                result={
                    "message_id": queued.get("id"),
                    "to": to_number,
                    "status": queued.get("status", "queued"),
                },
            )
        except Exception as exc:  # pragma: no cover
            error = f"SMS delivery failed: {exc}"
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
            _add_history_entry(
                db,
                enrollment,
                node=node,
                action="step.sms",
                status="failed",
                error=error,
            )
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="sms_failed",
                    title=config.get("label", "Sequence SMS Failed"),
                    description=error,
                    metadata={"sequence_node_id": node.node_id},
                )
            )
            return

        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=lead.user_id,
                activity_type="sms_sent",
                title=config.get("label", "Sequence SMS Queued"),
                description="Sequence SMS queued for delivery via outbox.",
                metadata={
                    "message": message,
                    "to_number": to_number,
                    "generated": bool(use_ai),
                    "ai_prompt": config.get("ai_prompt"),
                    "suggested_replies": config.get("suggested_replies", []),
                    "sequence_node_id": node.node_id,
                    "provider": result.provider,
                    "message_id": result.message_id,
                    "delivery_metadata": result.metadata,
                },
            )
        )
        record_usage(
            db,
            user_id=lead.user_id,
            metric="sms_sent",
            quantity=1,
            metadata={"sequence_node_id": node.node_id},
        )

        next_node_id = SequenceExecutor._get_next_node_id(node, enrollment.sequence)
        enrollment.sms_sent += 1
        enrollment.steps_completed += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)

    @staticmethod
    async def _execute_wait(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute wait step"""
        next_node_id = SequenceExecutor._get_next_node_id(node, enrollment.sequence)
        enrollment.steps_completed += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)
        _add_history_entry(
            db,
            enrollment,
            node=node,
            action="step.wait",
            status="scheduled",
            result={
                "next_node_id": next_node_id,
                "resume_at": enrollment.next_execution_at.isoformat() if enrollment.next_execution_at else None,
            },
        )

    @staticmethod
    async def _execute_condition(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute condition step"""
        config = node.config or {}
        expr = config.get("expr")
        event_type = config.get("event_type") or config.get("event")

        condition_result = False

        if isinstance(expr, bool):
            condition_result = expr
        elif isinstance(expr, str):
            lowered = expr.strip().lower()
            condition_result = lowered in {"1", "true", "yes", "then"}

        if event_type:
            recent_event = (
                db.query(SequenceHistory)
                .filter(
                    SequenceHistory.enrollment_id == enrollment.id,
                    SequenceHistory.event_type == event_type,
                )
                .order_by(SequenceHistory.created_at.desc())
                .first()
            )
            if recent_event:
                condition_result = True

        branch_value = "true" if condition_result else "false"

        flow_data = enrollment.sequence.flow_data
        edges = flow_data.get("edges", [])

        next_node_id = None
        for edge in edges:
            if edge["source"] != node.node_id:
                continue
            edge_condition = edge.get("data", {}).get("condition")
            if edge_condition is None and next_node_id is None:
                next_node_id = edge["target"]
            elif edge_condition == branch_value:
                next_node_id = edge["target"]
                break

        enrollment.steps_completed += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)
        _add_history_entry(
            db,
            enrollment,
            node=node,
            action="step.condition",
            status="completed",
            result={
                "branch": branch_value,
                "next_node_id": next_node_id,
                "event_type": event_type,
            },
        )
    
    @staticmethod
    async def _execute_end(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute end step"""
        config = node.config or {}
        outcome = config.get("outcome", "completed")
        
        enrollment.status = "completed"
        enrollment.completed_at = datetime.utcnow()
        enrollment.conversion_outcome = outcome
        enrollment.steps_completed += 1

        # Update sequence stats
        sequence = enrollment.sequence
        sequence.total_completed += 1
        if outcome == "converted":
            sequence.total_converted += 1
        if sequence.total_enrolled:
            sequence.conversion_rate = (sequence.total_converted / sequence.total_enrolled) * 100

        lead = enrollment.lead
        db.add(LeadActivity(
            lead_id=lead.id,
            user_id=lead.user_id,
            activity_type="sequence_outcome",
            title=f"Sequence completed ({outcome})",
            description=config.get("label", "Sequence finished"),
            metadata={
                "sequence_id": sequence.id,
                "outcome": outcome,
                "node_id": node.node_id,
            },
        ))
        _add_history_entry(
            db,
            enrollment,
            node=node,
            action="step.end",
            status="completed",
            result={"outcome": outcome},
        )
    
    @staticmethod
    def _get_next_node_id(current_node: SequenceNode, sequence: Sequence) -> Optional[str]:
        """Get the next node ID from flow data"""
        flow_data = sequence.flow_data
        edges = flow_data.get("edges", [])
        
        for edge in edges:
            if edge["source"] == current_node.node_id:
                return edge["target"]
        
        return None


class SequenceEventProcessor:
    """Map platform events into sequence enrollments and history."""

    SUPPORTED_EVENTS = {"report.sent", "report.viewed", "message.clicked"}

    @staticmethod
    def _coerce_int(value: Optional[Any]) -> Optional[int]:
        if value is None:
            return None
        if isinstance(value, int):
            return value
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None

    @staticmethod
    def handle_event(
        event_type: str,
        lead_id: Optional[Any],
        payload: Dict[str, Any],
        db: Session,
    ) -> Dict[str, Any]:
        if event_type not in SequenceEventProcessor.SUPPORTED_EVENTS:
            return {"handled": False, "actions": []}

        normalized_lead_id = SequenceEventProcessor._coerce_int(lead_id or payload.get("lead_id"))
        actions: List[Dict[str, Any]] = []

        if event_type == "report.sent":
            actions.extend(
                SequenceEventProcessor._auto_enroll_on_report_sent(
                    db,
                    normalized_lead_id,
                    payload,
                )
            )
        else:
            actions.extend(
                SequenceEventProcessor._record_lead_event(
                    db,
                    event_type,
                    normalized_lead_id,
                    payload,
                )
            )

        db.commit()
        if actions:
            SequenceService.trigger_processing()

        return {"handled": True, "actions": actions}

    @staticmethod
    def _auto_enroll_on_report_sent(
        db: Session,
        lead_id: Optional[int],
        payload: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        outcomes: List[Dict[str, Any]] = []
        if not lead_id:
            return outcomes

        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            return outcomes

        sequence = (
            db.query(Sequence)
            .filter(Sequence.user_id == lead.user_id, Sequence.is_active == True)
            .order_by(Sequence.created_at.asc())
            .first()
        )
        if not sequence:
            return outcomes

        try:
            enrollment = SequenceService.enroll_lead_in_sequence(lead.id, sequence.id, lead.user_id, db)
        except ValueError:
            enrollment = (
                db.query(SequenceEnrollment)
                .filter(
                    SequenceEnrollment.lead_id == lead.id,
                    SequenceEnrollment.sequence_id == sequence.id,
                )
                .first()
            )
            if not enrollment:
                return outcomes
            outcomes.append(
                {
                    "type": "existing_enrollment",
                    "sequence_id": sequence.id,
                    "enrollment_id": enrollment.id,
                }
            )
            _add_history_entry(
                db,
                enrollment,
                action="event.auto_enroll",
                status=enrollment.status,
                result=payload,
                event_type="report.sent",
            )
            return outcomes

        outcomes.append(
            {
                "type": "enrolled",
                "sequence_id": sequence.id,
                "enrollment_id": enrollment.id,
            }
        )
        _add_history_entry(
            db,
            enrollment,
            action="event.auto_enroll",
            status=enrollment.status,
            result=payload,
            event_type="report.sent",
        )
        return outcomes

    @staticmethod
    def _record_lead_event(
        db: Session,
        event_type: str,
        lead_id: Optional[int],
        payload: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        outcomes: List[Dict[str, Any]] = []

        enrollment_ids: List[int] = []

        payload_enrollment = SequenceEventProcessor._coerce_int(
            payload.get("enrollment_id") or payload.get("context", {}).get("enrollment_id")
        )
        if payload_enrollment:
            enrollment_ids.append(payload_enrollment)
        else:
            message_id = payload.get("message_id")
            if message_id:
                message = db.query(OutboxMessage).filter(OutboxMessage.id == message_id).first()
                if message:
                    context = message.payload.get("context") or {}
                    context_enrollment = SequenceEventProcessor._coerce_int(
                        context.get("enrollment_id") or message.payload.get("metadata", {}).get("enrollment_id")
                    )
                    if context_enrollment:
                        enrollment_ids.append(context_enrollment)
                    if not lead_id:
                        lead_id = SequenceEventProcessor._coerce_int(
                            context.get("lead_id") or message.payload.get("metadata", {}).get("lead_id")
                        )

        enrollments: List[SequenceEnrollment] = []
        if enrollment_ids:
            enrollments = (
                db.query(SequenceEnrollment)
                .filter(SequenceEnrollment.id.in_(enrollment_ids))
                .all()
            )
        elif lead_id:
            enrollments = (
                db.query(SequenceEnrollment)
                .filter(
                    SequenceEnrollment.lead_id == lead_id,
                    SequenceEnrollment.status == "active",
                )
                .all()
            )

        for enrollment in enrollments:
            if enrollment.status != "active":
                continue
            _add_history_entry(
                db,
                enrollment,
                action="event.received",
                status="recorded",
                result=payload,
                event_type=event_type,
            )
            enrollment.error_message = None
            enrollment.next_execution_at = datetime.utcnow()
            outcomes.append(
                {
                    "type": "event_recorded",
                    "enrollment_id": enrollment.id,
                    "event": event_type,
                }
            )

        return outcomes

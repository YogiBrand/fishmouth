from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any

from sqlalchemy import or_
from sqlalchemy.orm import Session

from config import get_settings
from database import SessionLocal
from models import (
    Sequence,
    SequenceNode,
    SequenceEnrollment,
    Lead,
    SequenceNodeType,
    LeadActivity,
    VoiceCall,
    SequenceExecution,
)
from zoneinfo import ZoneInfo
from services.sequence_scheduler import schedule_enrollment_execution, trigger_pending_scan
from services.sequence_delivery import get_delivery_adapters, DeliveryResult
from services.billing_service import record_usage

settings = get_settings()

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

        SequenceService.trigger_processing()
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

class SequenceExecutor:
    """
    Service for executing sequence steps and managing lead progression
    """

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
        send_time = config.get("send_time") or ""

        try:
            tz = ZoneInfo(sequence.timezone or "UTC")
        except Exception:
            tz = ZoneInfo("UTC")

        base_local = base_time.replace(tzinfo=timezone.utc).astimezone(tz)
        target_local = base_local + timedelta(days=delay_days, hours=delay_hours)

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

        homeowner = lead.homeowner_name or "there"
        address = lead.address or "your property"
        city = lead.city or "your area"
        state = lead.state or ""
        agent_name = getattr(getattr(lead, "user", None), "company_name", None) or "Fish Mouth AI"
        replacements = {
            "homeowner_name": homeowner,
            "address": address,
            "city": city,
            "state": state,
            "agent_name": agent_name,
            "lead_score": f"{lead.lead_score:.0f}" if lead.lead_score is not None else "",
        }

        result = template
        for key, value in replacements.items():
            result = result.replace(f"{{{{{key}}}}}", value)
        return result

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
        adapters = get_delivery_adapters()
        log_entry = SequenceExecutor._start_execution_log(enrollment, node, "email", db)

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
            result = await adapters.email.send_email(
                to_address=to_address,
                subject=subject,
                body=body,
                metadata={"sequence_node_id": node.node_id},
            )
            SequenceExecutor._complete_execution_log(log_entry, result, success=result.success)
        except Exception as exc:  # pragma: no cover
            error = f"Email delivery failed: {exc}"
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
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

        if not result.success:
            error = (result.metadata or {}).get("error") if result.metadata else "Email delivery reported a failure."
            enrollment.status = "failed"
            enrollment.error_message = error
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="email_failed",
                    title=config.get("label", "Sequence Email Failed"),
                    description=error,
                    metadata={
                        "sequence_node_id": node.node_id,
                        "provider": result.provider,
                        "delivery_metadata": result.metadata,
                    },
                )
            )
            return

        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=lead.user_id,
                activity_type="email_sent",
                title=config.get("label", "Sequence Email"),
                description=config.get("subject") or "Automated follow-up email delivered.",
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

        adapters = get_delivery_adapters()
        log_entry = SequenceExecutor._start_execution_log(enrollment, node, "sms", db)

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
            result = await adapters.sms.send_sms(
                to_number=to_number,
                body=message,
                metadata={"sequence_node_id": node.node_id},
            )
            SequenceExecutor._complete_execution_log(log_entry, result, success=result.success)
        except Exception as exc:  # pragma: no cover
            error = f"SMS delivery failed: {exc}"
            SequenceExecutor._complete_execution_log(log_entry, None, success=False, error=error)
            enrollment.status = "failed"
            enrollment.error_message = error
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

        if not result.success:
            error = (result.metadata or {}).get("error") if result.metadata else "SMS delivery reported a failure."
            enrollment.status = "failed"
            enrollment.error_message = error
            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    activity_type="sms_failed",
                    title=config.get("label", "Sequence SMS Failed"),
                    description=error,
                    metadata={
                        "sequence_node_id": node.node_id,
                        "provider": result.provider,
                        "delivery_metadata": result.metadata,
                    },
                )
            )
            return

        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=lead.user_id,
                activity_type="sms_sent",
                title=config.get("label", "Sequence SMS"),
                description="Automated SMS delivered to homeowner.",
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

        # Move to next node
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

    @staticmethod
    async def _execute_condition(enrollment: SequenceEnrollment, node: SequenceNode, db: Session):
        """Execute condition step"""
        config = node.config or {}
        condition = config.get("condition", "false")
        
        # Mock condition evaluation
        condition_result = False  # For demo, always false
        
        # Get next node based on condition
        flow_data = enrollment.sequence.flow_data
        edges = flow_data.get("edges", [])
        
        next_node_id = None
        for edge in edges:
            if edge["source"] == node.node_id:
                edge_condition = edge.get("data", {}).get("condition")
                if (condition_result and edge_condition == "true") or (not condition_result and edge_condition == "false"):
                    next_node_id = edge["target"]
                    break
        
        if not next_node_id:
            # Default to first edge if no condition match
            for edge in edges:
                if edge["source"] == node.node_id:
                    next_node_id = edge["target"]
                    break
        
        enrollment.steps_completed += 1
        SequenceExecutor._advance_to_next_node(enrollment, node, next_node_id, db)
    
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
    
    @staticmethod
    def _get_next_node_id(current_node: SequenceNode, sequence: Sequence) -> Optional[str]:
        """Get the next node ID from flow data"""
        flow_data = sequence.flow_data
        edges = flow_data.get("edges", [])
        
        for edge in edges:
            if edge["source"] == current_node.node_id:
                return edge["target"]
        
        return None

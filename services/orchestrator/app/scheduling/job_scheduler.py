"""
Job scheduling and queue management
"""
import logging
from typing import Dict, Any, List, Optional
import asyncio
import json
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class JobScheduler:
    """Manages job scheduling and queue processing"""
    
    def __init__(self):
        self.job_queues = {
            'high_priority': 'jobs:high',
            'medium_priority': 'jobs:medium', 
            'low_priority': 'jobs:low',
            'maintenance': 'jobs:maintenance'
        }
        
    async def schedule_job(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        priority: str = 'medium',
        delay_seconds: int = 0
    ) -> str:
        """Schedule a job for execution"""
        try:
            from shared.redis_client import redis_client
            
            job_id = f"{job_type}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
            
            job_payload = {
                'id': job_id,
                'type': job_type,
                'data': job_data,
                'priority': priority,
                'scheduled_at': datetime.utcnow().isoformat(),
                'execute_after': (datetime.utcnow() + timedelta(seconds=delay_seconds)).isoformat(),
                'status': 'scheduled'
            }
            
            # Add to appropriate queue
            queue_key = self.job_queues.get(f"{priority}_priority", self.job_queues['medium_priority'])
            await redis_client.lpush(queue_key, json.dumps(job_payload))
            
            logger.info(f"Scheduled job {job_id} with {priority} priority")
            return job_id
            
        except Exception as e:
            logger.error(f"Failed to schedule job: {e}")
            raise
    
    async def get_next_job(self, priority_order: List[str] = None) -> Optional[Dict[str, Any]]:
        """Get next job from queues in priority order"""
        try:
            from shared.redis_client import redis_client
            
            if not priority_order:
                priority_order = ['high', 'medium', 'low', 'maintenance']
            
            for priority in priority_order:
                queue_key = self.job_queues.get(f"{priority}_priority")
                if not queue_key:
                    continue
                
                # Get job from queue
                job_data = await redis_client.rpop(queue_key)
                if job_data:
                    try:
                        job = json.loads(job_data)
                        
                        # Check if job is ready to execute
                        execute_after = datetime.fromisoformat(job['execute_after'])
                        if datetime.utcnow() >= execute_after:
                            job['status'] = 'running'
                            return job
                        else:
                            # Put job back if not ready
                            await redis_client.rpush(queue_key, job_data)
                    except json.JSONDecodeError:
                        logger.error(f"Invalid job data in queue: {job_data}")
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get next job: {e}")
            return None
    
    async def complete_job(self, job_id: str, result: Dict[str, Any] = None):
        """Mark job as completed"""
        try:
            from shared.redis_client import redis_client
            
            completion_data = {
                'job_id': job_id,
                'completed_at': datetime.utcnow().isoformat(),
                'result': result or {},
                'status': 'completed'
            }
            
            # Store completion record
            await redis_client.set(
                f"job_result:{job_id}",
                json.dumps(completion_data),
                expire=86400  # Keep for 24 hours
            )
            
            logger.info(f"Job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to complete job {job_id}: {e}")
    
    async def fail_job(self, job_id: str, error: str):
        """Mark job as failed"""
        try:
            from shared.redis_client import redis_client
            
            failure_data = {
                'job_id': job_id,
                'failed_at': datetime.utcnow().isoformat(),
                'error': error,
                'status': 'failed'
            }
            
            # Store failure record
            await redis_client.set(
                f"job_result:{job_id}",
                json.dumps(failure_data),
                expire=86400  # Keep for 24 hours
            )
            
            logger.error(f"Job {job_id} failed: {error}")
            
        except Exception as e:
            logger.error(f"Failed to record job failure {job_id}: {e}")
    
    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job status and result"""
        try:
            from shared.redis_client import redis_client
            
            result_data = await redis_client.get(f"job_result:{job_id}")
            if result_data:
                return json.loads(result_data)
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get job status {job_id}: {e}")
            return None
    
    async def get_queue_stats(self) -> Dict[str, int]:
        """Get queue statistics"""
        try:
            from shared.redis_client import redis_client
            
            stats = {}
            for priority, queue_key in self.job_queues.items():
                length = await redis_client.llen(queue_key)
                stats[priority] = length
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get queue stats: {e}")
            return {}
    
    async def schedule_recurring_job(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        cron_expression: str,
        job_id: str = None
    ):
        """Schedule a recurring job (this would integrate with APScheduler)"""
        try:
            # This would use APScheduler to create recurring jobs
            # For now, just log the request
            logger.info(f"Recurring job {job_type} scheduled with cron: {cron_expression}")
            
        except Exception as e:
            logger.error(f"Failed to schedule recurring job: {e}")
    
    async def cleanup_completed_jobs(self, older_than_hours: int = 24):
        """Clean up old completed job records"""
        try:
            from shared.redis_client import redis_client
            
            # This would clean up old job result records
            # For now, Redis TTL handles this automatically
            logger.info(f"Cleaned up job records older than {older_than_hours} hours")
            
        except Exception as e:
            logger.error(f"Failed to cleanup jobs: {e}")
    
    async def pause_queue(self, priority: str):
        """Pause processing of a specific queue"""
        try:
            from shared.redis_client import redis_client
            
            await redis_client.set(f"queue_paused:{priority}", "true", expire=3600)
            logger.info(f"Paused {priority} priority queue")
            
        except Exception as e:
            logger.error(f"Failed to pause queue {priority}: {e}")
    
    async def resume_queue(self, priority: str):
        """Resume processing of a paused queue"""
        try:
            from shared.redis_client import redis_client
            
            await redis_client.delete(f"queue_paused:{priority}")
            logger.info(f"Resumed {priority} priority queue")
            
        except Exception as e:
            logger.error(f"Failed to resume queue {priority}: {e}")
    
    async def is_queue_paused(self, priority: str) -> bool:
        """Check if queue is paused"""
        try:
            from shared.redis_client import redis_client
            
            paused = await redis_client.exists(f"queue_paused:{priority}")
            return bool(paused)
            
        except Exception as e:
            logger.error(f"Failed to check queue status {priority}: {e}")
            return False
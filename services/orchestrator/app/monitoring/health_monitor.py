"""
System health monitoring and alerting
"""
import logging
import httpx
from typing import Dict, Any, List
import asyncio
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class HealthMonitor:
    """Monitors health of all services in the system"""
    
    def __init__(self):
        self.services = {
            'scraper': {
                'url': 'http://scraper-service:8002/health',
                'timeout': 10,
                'critical': True
            },
            'enrichment': {
                'url': 'http://enrichment-service:8004/health', 
                'timeout': 10,
                'critical': True
            },
            'lead_generator': {
                'url': 'http://lead-generator:8008/health',
                'timeout': 10,
                'critical': True
            },
            'main_backend': {
                'url': 'http://backend:8000/health',
                'timeout': 10,
                'critical': True
            },
            'voice_server': {
                'url': 'http://voice-server:8001/health',
                'timeout': 10,
                'critical': False  # Optional service
            },
            'frontend': {
                'url': 'http://frontend:3000',
                'timeout': 5,
                'critical': True
            }
        }
        
        self.database_checks = [
            'SELECT 1',  # Basic connectivity
            'SELECT COUNT(*) FROM raw_properties',  # Data availability
            'SELECT COUNT(*) FROM scraping_jobs WHERE status = \'running\'',  # Active jobs
        ]
    
    async def check_system_health(self) -> Dict[str, Any]:
        """Comprehensive system health check"""
        try:
            logger.info("🔍 Running comprehensive system health check")
            
            health_results = {
                'timestamp': datetime.utcnow().isoformat(),
                'overall_healthy': True,
                'services': {},
                'database': {},
                'queue': {},
                'critical_issues': []
            }
            
            # Check all services
            service_results = await self.check_all_services()
            health_results['services'] = service_results
            
            # Check database
            database_results = await self.check_database_health()
            health_results['database'] = database_results
            
            # Check Redis/queue health
            queue_results = await self.check_queue_health()
            health_results['queue'] = queue_results
            
            # Determine overall health
            critical_service_issues = [
                service for service, status in service_results.items()
                if not status.get('healthy', False) and self.services.get(service, {}).get('critical', False)
            ]
            
            if critical_service_issues or not database_results.get('healthy', False):
                health_results['overall_healthy'] = False
                health_results['critical_issues'].extend(critical_service_issues)
                
                if not database_results.get('healthy', False):
                    health_results['critical_issues'].append('database_connection')
            
            logger.info(f"✅ Health check completed. Overall healthy: {health_results['overall_healthy']}")
            return health_results
            
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'overall_healthy': False,
                'error': str(e),
                'critical_issues': ['health_check_failure']
            }
    
    async def check_all_services(self) -> Dict[str, Dict[str, Any]]:
        """Check health of all services"""
        results = {}
        
        # Create tasks for parallel health checks
        tasks = []
        for service_name, config in self.services.items():
            task = self.check_service_health(service_name, config)
            tasks.append(task)
        
        # Execute all health checks in parallel
        service_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(service_results):
            service_name = list(self.services.keys())[i]
            
            if isinstance(result, Exception):
                results[service_name] = {
                    'healthy': False,
                    'error': str(result),
                    'response_time': None,
                    'last_checked': datetime.utcnow().isoformat()
                }
            else:
                results[service_name] = result
        
        return results
    
    async def check_service_health(self, service_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Check health of a single service"""
        try:
            start_time = datetime.now()
            
            async with httpx.AsyncClient(timeout=config['timeout']) as client:
                response = await client.get(config['url'])
                
                response_time = (datetime.now() - start_time).total_seconds() * 1000
                
                if response.status_code == 200:
                    # Try to parse health response
                    try:
                        health_data = response.json()
                        return {
                            'healthy': health_data.get('status') in ['healthy', 'ok'],
                            'response_time': round(response_time, 2),
                            'status_code': response.status_code,
                            'details': health_data,
                            'last_checked': datetime.utcnow().isoformat()
                        }
                    except:
                        # Service responded but no JSON
                        return {
                            'healthy': True,
                            'response_time': round(response_time, 2),
                            'status_code': response.status_code,
                            'details': {'raw_response': response.text[:200]},
                            'last_checked': datetime.utcnow().isoformat()
                        }
                else:
                    return {
                        'healthy': False,
                        'response_time': round(response_time, 2),
                        'status_code': response.status_code,
                        'error': f"HTTP {response.status_code}",
                        'last_checked': datetime.utcnow().isoformat()
                    }
                    
        except httpx.TimeoutException:
            return {
                'healthy': False,
                'response_time': None,
                'error': f"Timeout after {config['timeout']}s",
                'last_checked': datetime.utcnow().isoformat()
            }
        except Exception as e:
            return {
                'healthy': False,
                'response_time': None,
                'error': str(e),
                'last_checked': datetime.utcnow().isoformat()
            }
    
    async def check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and basic functionality"""
        try:
            from shared.database import db_client
            
            start_time = datetime.now()
            
            # Basic connectivity test
            await db_client.execute("SELECT 1")
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Additional checks
            check_results = {}
            for check_query in self.database_checks:
                try:
                    result = await db_client.fetch_one(check_query)
                    check_results[check_query] = {
                        'success': True,
                        'result': dict(result) if result else None
                    }
                except Exception as e:
                    check_results[check_query] = {
                        'success': False,
                        'error': str(e)
                    }
            
            return {
                'healthy': True,
                'response_time': round(response_time, 2),
                'checks': check_results,
                'last_checked': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'healthy': False,
                'response_time': None,
                'error': str(e),
                'last_checked': datetime.utcnow().isoformat()
            }
    
    async def check_queue_health(self) -> Dict[str, Any]:
        """Check Redis/queue system health"""
        try:
            from shared.redis_client import redis_client
            
            start_time = datetime.now()
            
            # Basic connectivity
            await redis_client.set("health_check", "ok", expire=60)
            result = await redis_client.get("health_check")
            
            response_time = (datetime.now() - start_time).total_seconds() * 1000
            
            if result == "ok":
                # Get queue statistics
                from app.scheduling.job_scheduler import JobScheduler
                scheduler = JobScheduler()
                queue_stats = await scheduler.get_queue_stats()
                
                return {
                    'healthy': True,
                    'response_time': round(response_time, 2),
                    'queue_lengths': queue_stats,
                    'last_checked': datetime.utcnow().isoformat()
                }
            else:
                return {
                    'healthy': False,
                    'error': "Redis connectivity test failed",
                    'last_checked': datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            return {
                'healthy': False,
                'response_time': None,
                'error': str(e),
                'last_checked': datetime.utcnow().isoformat()
            }
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get system performance metrics"""
        try:
            from shared.database import db_client
            
            # Job processing metrics
            job_metrics_query = """
            SELECT 
                status,
                COUNT(*) as count,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes
            FROM scraping_jobs 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY status
            """
            
            job_metrics = await db_client.fetch_all(job_metrics_query)
            
            # Lead generation metrics
            lead_metrics_query = """
            SELECT 
                COUNT(*) as total_leads,
                AVG(overall_score) as avg_score,
                COUNT(*) FILTER (WHERE overall_score >= 80) as high_quality_count
            FROM lead_scores 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            """
            
            lead_metrics = await db_client.fetch_one(lead_metrics_query)
            
            return {
                'job_processing': job_metrics,
                'lead_generation': dict(lead_metrics) if lead_metrics else {},
                'collected_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {
                'error': str(e),
                'collected_at': datetime.utcnow().isoformat()
            }
    
    async def check_data_freshness(self) -> Dict[str, Any]:
        """Check if data is being updated regularly"""
        try:
            from shared.database import db_client
            
            # Check for recent scraping activity
            recent_scraping_query = """
            SELECT COUNT(*) as count
            FROM scraping_jobs 
            WHERE created_at >= NOW() - INTERVAL '4 hours'
            """
            
            recent_scraping = await db_client.fetch_one(recent_scraping_query)
            
            # Check for recent enrichment
            recent_enrichment_query = """
            SELECT COUNT(*) as count
            FROM enrichment_jobs 
            WHERE created_at >= NOW() - INTERVAL '2 hours'
            """
            
            recent_enrichment = await db_client.fetch_one(recent_enrichment_query)
            
            # Check for recent lead scoring
            recent_scoring_query = """
            SELECT COUNT(*) as count
            FROM lead_scores 
            WHERE created_at >= NOW() - INTERVAL '1 hour'
            """
            
            recent_scoring = await db_client.fetch_one(recent_scoring_query)
            
            freshness_issues = []
            
            if recent_scraping and recent_scraping['count'] == 0:
                freshness_issues.append('no_recent_scraping')
                
            if recent_enrichment and recent_enrichment['count'] == 0:
                freshness_issues.append('no_recent_enrichment')
                
            if recent_scoring and recent_scoring['count'] == 0:
                freshness_issues.append('no_recent_scoring')
            
            return {
                'fresh': len(freshness_issues) == 0,
                'recent_scraping': recent_scraping['count'] if recent_scraping else 0,
                'recent_enrichment': recent_enrichment['count'] if recent_enrichment else 0, 
                'recent_scoring': recent_scoring['count'] if recent_scoring else 0,
                'issues': freshness_issues,
                'checked_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Data freshness check failed: {e}")
            return {
                'fresh': False,
                'error': str(e),
                'checked_at': datetime.utcnow().isoformat()
            }
    
    async def alert_on_critical_issues(self, health_results: Dict[str, Any]):
        """Send alerts for critical system issues"""
        try:
            critical_issues = health_results.get('critical_issues', [])
            
            if critical_issues:
                # In a real implementation, this would send:
                # - Slack notifications
                # - Email alerts
                # - PagerDuty incidents
                # - SMS alerts
                
                logger.error(f"🚨 CRITICAL SYSTEM ISSUES DETECTED: {', '.join(critical_issues)}")
                
                # Store alert in database
                from shared.database import db_client
                
                await db_client.execute("""
                    INSERT INTO system_health (service_name, health_check, status, metadata)
                    VALUES ('orchestrator', 'critical_alert', 'critical', $1)
                """, json.dumps({
                    'issues': critical_issues,
                    'timestamp': health_results['timestamp'],
                    'alert_level': 'critical'
                }))
                
        except Exception as e:
            logger.error(f"Failed to send critical alerts: {e}")
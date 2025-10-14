# Cost Monitoring & Tracking System - Fish Mouth Data Acquisition

## 🎯 Overview

Fish Mouth's comprehensive cost monitoring and tracking system provides real-time visibility into our **FREE-FIRST** approach effectiveness, enabling proactive optimization and maintaining our **94% cost savings** achievement.

---

## 📊 Real-Time Cost Dashboard

### Live Metrics Display

```python
class FishMouthCostDashboard:
    def __init__(self):
        self.live_collector = LiveCostCollector()
        self.historical_analyzer = HistoricalCostAnalyzer()
        
    async def get_dashboard_data(self):
        """Main dashboard data aggregation"""
        
        return {
            'live_metrics': await self.get_live_cost_metrics(),
            'daily_summary': await self.get_daily_cost_summary(),
            'service_breakdown': await self.get_service_cost_breakdown(),
            'optimization_opportunities': await self.identify_optimization_opportunities(),
            'alerts_and_warnings': await self.get_active_cost_alerts(),
            'historical_trends': await self.get_cost_trends(days=30)
        }
        
    async def get_live_cost_metrics(self):
        """Real-time cost metrics"""
        
        return {
            'current_daily_spend': await self.live_collector.get_current_daily_spend(),
            'budget_remaining': await self.live_collector.get_daily_budget_remaining(),
            'free_source_success_rate': await self.live_collector.get_free_source_rate(),
            'requests_per_minute': await self.live_collector.get_request_rate(),
            'cost_per_request': await self.live_collector.get_current_cost_per_request(),
            'projected_daily_total': await self.live_collector.project_daily_total(),
            'time_until_budget_exhausted': await self.live_collector.estimate_budget_runway()
        }
```

### Dashboard API Endpoints

```python
@app.get("/cost/dashboard/live")
async def get_live_cost_dashboard():
    """Live cost monitoring dashboard"""
    
    dashboard = FishMouthCostDashboard()
    data = await dashboard.get_dashboard_data()
    
    return {
        "success": True,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
        "status": {
            "budget_health": "healthy" if data['live_metrics']['budget_remaining'] > 20 else "warning",
            "free_source_performance": "excellent" if data['live_metrics']['free_source_success_rate'] > 0.90 else "good",
            "cost_efficiency": f"{(1 - data['live_metrics']['cost_per_request'] / 2.40) * 100:.1f}% savings vs traditional"
        }
    }

@app.get("/cost/services/{service_name}/metrics")
async def get_service_cost_metrics(service_name: str):
    """Detailed cost metrics for specific service"""
    
    service_monitor = ServiceCostMonitor(service_name)
    return await service_monitor.get_detailed_metrics()
```

---

## 📈 Per-Service Cost Tracking

### Service-Level Monitoring

Each microservice implements comprehensive cost tracking:

```python
class ServiceCostTracker:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.daily_costs = {}
        self.request_costs = []
        
    async def track_request_cost(self, request_id: str, cost_data: dict):
        """Track individual request costs"""
        
        cost_entry = {
            'request_id': request_id,
            'timestamp': datetime.utcnow(),
            'total_cost': cost_data.get('total_cost', 0.0),
            'sources_used': cost_data.get('sources_used', []),
            'free_sources_attempted': cost_data.get('free_sources_attempted', []),
            'paid_apis_used': cost_data.get('paid_apis_used', []),
            'cache_hits': cost_data.get('cache_hits', 0),
            'batch_processing': cost_data.get('batch_processing', False),
            'quality_score': cost_data.get('quality_score', 0.0),
            'processing_time': cost_data.get('processing_time', 0.0)
        }
        
        # Store in time-series database
        await self.store_cost_entry(cost_entry)
        
        # Update real-time aggregations
        await self.update_live_aggregations(cost_entry)
        
        # Check for alerts
        await self.check_cost_alerts(cost_entry)
        
    async def get_service_cost_summary(self, time_period: str = "today"):
        """Get cost summary for service"""
        
        if time_period == "today":
            entries = await self.get_today_entries()
        elif time_period == "week":
            entries = await self.get_week_entries()
        elif time_period == "month":
            entries = await self.get_month_entries()
            
        return {
            'total_cost': sum(entry['total_cost'] for entry in entries),
            'total_requests': len(entries),
            'free_source_success_rate': self.calculate_free_source_rate(entries),
            'cache_hit_rate': self.calculate_cache_hit_rate(entries),
            'average_cost_per_request': self.calculate_average_cost_per_request(entries),
            'cost_by_source': self.breakdown_cost_by_source(entries),
            'quality_metrics': self.calculate_quality_metrics(entries),
            'performance_metrics': self.calculate_performance_metrics(entries)
        }
```

### Image Processor Cost Tracking

```python
class ImageProcessorCostTracker(ServiceCostTracker):
    def __init__(self):
        super().__init__("image_processor")
        self.cost_per_source = {
            'openstreetmap_tiles': 0.0,
            'local_super_resolution': 0.0,
            'extended_cache': 0.0,
            'geographic_batch': 0.0,
            'google_maps_optimized': 0.002,  # $0.002 per request
            'mapbox_satellite': 0.0015,     # $0.0015 per request
            'synthetic_generation': 0.0
        }
        
    async def track_image_processing_cost(self, property_id: str, processing_result: dict):
        """Track image processing with detailed source cost breakdown"""
        
        source_costs = []
        total_cost = 0.0
        
        for source in processing_result['sources_used']:
            source_cost = self.cost_per_source.get(source, 0.0)
            total_cost += source_cost
            
            source_costs.append({
                'source': source,
                'cost': source_cost,
                'success': True,
                'quality_contribution': processing_result.get(f'{source}_quality', 0.0)
            })
            
        # Track fallbacks that were attempted but failed
        for fallback in processing_result.get('fallbacks_triggered', []):
            source_costs.append({
                'source': fallback,
                'cost': 0.0,
                'success': False,
                'failure_reason': processing_result.get(f'{fallback}_error', 'unknown')
            })
            
        await self.track_request_cost(property_id, {
            'total_cost': total_cost,
            'sources_used': processing_result['sources_used'],
            'source_cost_breakdown': source_costs,
            'processing_time': processing_result.get('processing_time', 0.0),
            'quality_score': processing_result.get('quality_score', 0.0),
            'image_resolution': processing_result.get('image_resolution'),
            'enhancement_applied': processing_result.get('enhancement_applied', False)
        })
        
        # Log significant events
        if total_cost > 0:
            logger.warning(f"💰 Image processing cost incurred: ${total_cost:.4f} for property {property_id}")
        else:
            logger.info(f"✅ FREE image processing successful for property {property_id}")
```

---

## 💰 Budget Management System

### Daily Budget Controls

```python
class DailyBudgetController:
    def __init__(self):
        self.daily_budget = 10.00  # $10 daily budget
        self.emergency_budget = 50.00  # Emergency budget for critical requests
        self.budget_reset_hour = 0  # Midnight UTC reset
        
    async def check_budget_availability(self, requested_amount: float = 0.0):
        """Check if budget is available for API calls"""
        
        current_usage = await self.get_current_daily_usage()
        remaining_budget = self.daily_budget - current_usage
        
        if requested_amount <= remaining_budget:
            return {
                'budget_available': True,
                'remaining_budget': remaining_budget,
                'requested_amount': requested_amount,
                'approval_status': 'approved'
            }
        elif self.is_emergency_request() and requested_amount <= self.emergency_budget:
            return {
                'budget_available': True,
                'remaining_budget': remaining_budget,
                'emergency_budget_used': True,
                'requested_amount': requested_amount,
                'approval_status': 'emergency_approved'
            }
        else:
            return {
                'budget_available': False,
                'remaining_budget': remaining_budget,
                'requested_amount': requested_amount,
                'approval_status': 'denied',
                'alternative_action': 'use_free_sources_only'
            }
    
    async def record_expense(self, amount: float, service: str, request_id: str):
        """Record API expense against daily budget"""
        
        expense_record = {
            'amount': amount,
            'service': service,
            'request_id': request_id,
            'timestamp': datetime.utcnow(),
            'budget_day': datetime.utcnow().date()
        }
        
        # Store expense
        await self.store_expense_record(expense_record)
        
        # Update running totals
        await self.update_daily_usage(amount)
        
        # Check for budget alerts
        current_usage = await self.get_current_daily_usage()
        usage_percentage = current_usage / self.daily_budget
        
        if usage_percentage >= 0.8:  # 80% budget used
            await self.send_budget_alert("high_usage", {
                'current_usage': current_usage,
                'daily_budget': self.daily_budget,
                'percentage_used': usage_percentage * 100,
                'remaining': self.daily_budget - current_usage
            })
        
        if current_usage >= self.daily_budget:  # Budget exceeded
            await self.send_budget_alert("budget_exceeded", {
                'current_usage': current_usage,
                'daily_budget': self.daily_budget,
                'overage': current_usage - self.daily_budget
            })
```

### Weekly/Monthly Budget Analysis

```python
class BudgetAnalyzer:
    def __init__(self):
        self.cost_tracker = CostTracker()
        
    async def generate_weekly_budget_report(self):
        """Generate comprehensive weekly budget analysis"""
        
        week_data = await self.get_week_cost_data()
        
        return {
            'period': {
                'start_date': week_data['start_date'],
                'end_date': week_data['end_date'],
                'days_analyzed': 7
            },
            
            'budget_performance': {
                'total_spent': week_data['total_cost'],
                'daily_average': week_data['total_cost'] / 7,
                'budget_utilization': week_data['total_cost'] / (self.daily_budget * 7),
                'days_under_budget': week_data['days_under_budget'],
                'days_over_budget': week_data['days_over_budget']
            },
            
            'cost_efficiency': {
                'free_source_success_rate': week_data['avg_free_source_rate'],
                'cost_per_request': week_data['total_cost'] / week_data['total_requests'],
                'savings_vs_traditional': self.calculate_savings_vs_traditional(week_data),
                'most_cost_effective_service': week_data['best_performing_service'],
                'highest_cost_service': week_data['highest_cost_service']
            },
            
            'optimization_opportunities': [
                self.identify_cost_optimization_opportunities(week_data)
            ],
            
            'trend_analysis': {
                'cost_trend': week_data['daily_costs'],
                'free_source_trend': week_data['daily_free_rates'],
                'request_volume_trend': week_data['daily_request_counts']
            }
        }
        
    async def generate_monthly_budget_forecast(self):
        """Forecast monthly costs based on current trends"""
        
        current_month_data = await self.get_month_to_date_data()
        days_in_month = calendar.monthrange(datetime.now().year, datetime.now().month)[1]
        days_elapsed = datetime.now().day
        days_remaining = days_in_month - days_elapsed
        
        # Linear projection based on current usage
        linear_projection = (current_month_data['total_cost'] / days_elapsed) * days_in_month
        
        # Trend-based projection
        trend_projection = await self.calculate_trend_projection(current_month_data, days_remaining)
        
        # Machine learning projection (if enough historical data)
        ml_projection = await self.calculate_ml_projection(current_month_data)
        
        return {
            'month': datetime.now().strftime('%B %Y'),
            'days_elapsed': days_elapsed,
            'days_remaining': days_remaining,
            'current_spend': current_month_data['total_cost'],
            
            'projections': {
                'linear': {
                    'projected_total': linear_projection,
                    'confidence': 'medium',
                    'method': 'linear_extrapolation'
                },
                'trend_based': {
                    'projected_total': trend_projection,
                    'confidence': 'high',
                    'method': 'trend_analysis'
                },
                'ml_forecast': {
                    'projected_total': ml_projection['projection'],
                    'confidence': ml_projection['confidence'],
                    'method': 'machine_learning'
                }
            },
            
            'budget_assessment': {
                'monthly_budget': self.daily_budget * days_in_month,
                'projected_vs_budget': trend_projection / (self.daily_budget * days_in_month),
                'budget_status': 'under_budget' if trend_projection < (self.daily_budget * days_in_month) else 'over_budget',
                'recommended_actions': self.get_budget_recommendations(trend_projection, days_in_month)
            }
        }
```

---

## 🚨 Alert and Warning System

### Cost Alert Configuration

```python
class CostAlertSystem:
    def __init__(self):
        self.alert_thresholds = {
            'daily_budget_80_percent': 0.8,
            'daily_budget_100_percent': 1.0,
            'free_source_success_below_85': 0.85,
            'cost_per_request_spike': 0.01,  # Alert if cost per request > $0.01
            'service_offline': True,
            'api_rate_limit_approaching': 0.9
        }
        
        self.notification_channels = {
            'email': ['dev-team@fishmouth.io', 'ops@fishmouth.io'],
            'slack': '#cost-alerts',
            'dashboard': True,
            'sms': '+1234567890'  # Emergency only
        }
        
    async def check_all_alerts(self):
        """Check all configured cost alerts"""
        
        active_alerts = []
        
        # Daily budget alerts
        budget_usage = await self.get_daily_budget_usage_percentage()
        if budget_usage >= self.alert_thresholds['daily_budget_80_percent']:
            active_alerts.append(await self.create_budget_alert(budget_usage))
        
        # Free source performance alerts
        free_source_rate = await self.get_current_free_source_rate()
        if free_source_rate < self.alert_thresholds['free_source_success_below_85']:
            active_alerts.append(await self.create_free_source_alert(free_source_rate))
        
        # Cost spike alerts
        current_cost_per_request = await self.get_current_cost_per_request()
        if current_cost_per_request > self.alert_thresholds['cost_per_request_spike']:
            active_alerts.append(await self.create_cost_spike_alert(current_cost_per_request))
        
        # Service availability alerts
        for service in ['scraper', 'enrichment', 'image_processor', 'lead_generator', 'ml_inference']:
            if not await self.check_service_health(service):
                active_alerts.append(await self.create_service_offline_alert(service))
        
        # Process and send alerts
        for alert in active_alerts:
            await self.process_alert(alert)
        
        return active_alerts
        
    async def create_budget_alert(self, usage_percentage: float):
        """Create budget usage alert"""
        
        severity = 'warning' if usage_percentage < 1.0 else 'critical'
        
        return {
            'alert_id': f"budget_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            'type': 'budget_usage',
            'severity': severity,
            'timestamp': datetime.utcnow(),
            'title': f"Daily Budget {usage_percentage * 100:.1f}% Used",
            'description': f"Current daily budget usage: {usage_percentage * 100:.1f}%",
            'data': {
                'usage_percentage': usage_percentage,
                'current_usage': await self.get_current_daily_usage(),
                'daily_budget': await self.get_daily_budget(),
                'remaining_budget': await self.get_remaining_daily_budget()
            },
            'recommended_actions': [
                'Monitor free source success rates',
                'Consider enabling emergency budget if critical',
                'Review cost optimization opportunities'
            ],
            'notification_channels': ['email', 'slack', 'dashboard'] if severity == 'warning' else ['email', 'slack', 'dashboard', 'sms']
        }
        
    async def process_alert(self, alert: dict):
        """Process and send alert through configured channels"""
        
        for channel in alert['notification_channels']:
            if channel == 'email':
                await self.send_email_alert(alert)
            elif channel == 'slack':
                await self.send_slack_alert(alert)
            elif channel == 'dashboard':
                await self.display_dashboard_alert(alert)
            elif channel == 'sms':
                await self.send_sms_alert(alert)
        
        # Store alert in database for history
        await self.store_alert_record(alert)
```

### Alert Templates and Notifications

```python
class AlertNotificationTemplates:
    @staticmethod
    def budget_warning_email(alert_data: dict):
        """Email template for budget warnings"""
        
        return {
            'subject': f"🚨 Fish Mouth Cost Alert: Daily Budget {alert_data['data']['usage_percentage'] * 100:.1f}% Used",
            'body': f"""
            <h2>Cost Budget Alert</h2>
            
            <p><strong>Alert Type:</strong> Budget Usage Warning</p>
            <p><strong>Time:</strong> {alert_data['timestamp']}</p>
            <p><strong>Severity:</strong> {alert_data['severity'].upper()}</p>
            
            <h3>Budget Status</h3>
            <ul>
                <li>Daily Budget: ${alert_data['data']['daily_budget']:.2f}</li>
                <li>Current Usage: ${alert_data['data']['current_usage']:.2f}</li>
                <li>Remaining: ${alert_data['data']['remaining_budget']:.2f}</li>
                <li>Usage Percentage: {alert_data['data']['usage_percentage'] * 100:.1f}%</li>
            </ul>
            
            <h3>Recommended Actions</h3>
            <ul>
                {"".join(f"<li>{action}</li>" for action in alert_data['recommended_actions'])}
            </ul>
            
            <p><a href="http://dashboard.fishmouth.io/cost-monitoring">View Live Cost Dashboard</a></p>
            """,
            'recipients': ['dev-team@fishmouth.io', 'ops@fishmouth.io']
        }
        
    @staticmethod
    def slack_cost_alert(alert_data: dict):
        """Slack message template for cost alerts"""
        
        color = 'warning' if alert_data['severity'] == 'warning' else 'danger'
        
        return {
            'channel': '#cost-alerts',
            'attachments': [{
                'color': color,
                'title': alert_data['title'],
                'text': alert_data['description'],
                'fields': [
                    {
                        'title': 'Current Usage',
                        'value': f"${alert_data['data']['current_usage']:.2f}",
                        'short': True
                    },
                    {
                        'title': 'Daily Budget',
                        'value': f"${alert_data['data']['daily_budget']:.2f}",
                        'short': True
                    },
                    {
                        'title': 'Percentage Used',
                        'value': f"{alert_data['data']['usage_percentage'] * 100:.1f}%",
                        'short': True
                    },
                    {
                        'title': 'Remaining Budget',
                        'value': f"${alert_data['data']['remaining_budget']:.2f}",
                        'short': True
                    }
                ],
                'actions': [
                    {
                        'type': 'button',
                        'text': 'View Dashboard',
                        'url': 'http://dashboard.fishmouth.io/cost-monitoring'
                    }
                ]
            }]
        }
```

---

## 📊 Historical Analysis and Reporting

### Monthly Cost Reports

```python
class MonthlyCostReportGenerator:
    def __init__(self):
        self.report_generator = ReportGenerator()
        
    async def generate_monthly_report(self, year: int, month: int):
        """Generate comprehensive monthly cost report"""
        
        month_data = await self.get_month_data(year, month)
        
        report = {
            'report_metadata': {
                'period': f"{calendar.month_name[month]} {year}",
                'generated_at': datetime.utcnow().isoformat(),
                'report_type': 'monthly_cost_analysis',
                'currency': 'USD'
            },
            
            'executive_summary': {
                'total_monthly_cost': month_data['total_cost'],
                'total_requests_processed': month_data['total_requests'],
                'cost_per_request': month_data['total_cost'] / month_data['total_requests'],
                'free_source_success_rate': month_data['avg_free_source_rate'],
                'cost_savings_vs_traditional': month_data['savings_vs_traditional'],
                'budget_utilization': month_data['budget_utilization_percentage']
            },
            
            'daily_breakdown': [
                {
                    'date': day_data['date'],
                    'total_cost': day_data['cost'],
                    'requests': day_data['requests'],
                    'free_source_rate': day_data['free_rate'],
                    'budget_status': day_data['budget_status']
                }
                for day_data in month_data['daily_data']
            ],
            
            'service_analysis': {
                service: await self.get_service_monthly_analysis(service, year, month)
                for service in ['scraper', 'enrichment', 'image_processor', 'lead_generator', 'ml_inference']
            },
            
            'cost_optimization_analysis': {
                'free_sources_performance': month_data['free_sources_analysis'],
                'cache_efficiency': month_data['cache_analysis'],
                'batch_processing_usage': month_data['batch_analysis'],
                'geographic_optimization': month_data['geographic_analysis']
            },
            
            'trend_analysis': {
                'cost_trend': month_data['cost_trend'],
                'volume_trend': month_data['volume_trend'],
                'efficiency_trend': month_data['efficiency_trend'],
                'quality_trend': month_data['quality_trend']
            },
            
            'recommendations': await self.generate_optimization_recommendations(month_data),
            
            'appendices': {
                'raw_data': month_data['raw_metrics'],
                'methodology': 'FREE-FIRST cost analysis methodology v2.1',
                'data_sources': ['service_cost_trackers', 'budget_controllers', 'performance_monitors']
            }
        }
        
        # Generate visual charts and graphs
        report['visualizations'] = await self.generate_report_visualizations(month_data)
        
        return report
        
    async def export_report_formats(self, report: dict, output_dir: str):
        """Export report in multiple formats"""
        
        # PDF report for executives
        pdf_report = await self.generate_pdf_report(report)
        with open(f"{output_dir}/monthly_cost_report.pdf", 'wb') as f:
            f.write(pdf_report)
        
        # Excel spreadsheet for detailed analysis
        excel_report = await self.generate_excel_report(report)
        excel_report.save(f"{output_dir}/monthly_cost_data.xlsx")
        
        # JSON for API consumers
        with open(f"{output_dir}/monthly_cost_report.json", 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        # CSV for data analysis
        csv_data = await self.flatten_report_to_csv(report)
        csv_data.to_csv(f"{output_dir}/monthly_cost_summary.csv", index=False)
```

### Cost Trend Analysis

```python
class CostTrendAnalyzer:
    def __init__(self):
        self.statistical_analyzer = StatisticalAnalyzer()
        
    async def analyze_cost_trends(self, time_period: str = "3_months"):
        """Analyze cost trends over specified period"""
        
        historical_data = await self.get_historical_data(time_period)
        
        trends = {
            'overall_cost_trend': self.calculate_trend(historical_data['daily_costs']),
            'free_source_success_trend': self.calculate_trend(historical_data['free_source_rates']),
            'request_volume_trend': self.calculate_trend(historical_data['request_volumes']),
            'cost_per_request_trend': self.calculate_trend(historical_data['cost_per_request']),
            'service_specific_trends': {}
        }
        
        # Service-specific trend analysis
        for service in historical_data['services']:
            service_data = historical_data['services'][service]
            trends['service_specific_trends'][service] = {
                'cost_trend': self.calculate_trend(service_data['daily_costs']),
                'efficiency_trend': self.calculate_trend(service_data['efficiency_scores']),
                'volume_trend': self.calculate_trend(service_data['request_volumes'])
            }
        
        # Predictive analysis
        trends['predictions'] = {
            'next_month_cost': await self.predict_next_month_cost(historical_data),
            'cost_optimization_opportunities': await self.identify_trend_based_optimizations(trends),
            'efficiency_forecast': await self.forecast_efficiency_improvements(trends)
        }
        
        return trends
        
    def calculate_trend(self, data_points: List[float]) -> dict:
        """Calculate trend statistics for data series"""
        
        if len(data_points) < 2:
            return {'trend': 'insufficient_data'}
        
        # Linear regression for trend
        slope, intercept, r_value, p_value, std_err = scipy.stats.linregress(
            range(len(data_points)), data_points
        )
        
        # Determine trend direction and strength
        if abs(slope) < 0.01:  # Essentially flat
            trend_direction = 'stable'
        elif slope > 0:
            trend_direction = 'increasing'
        else:
            trend_direction = 'decreasing'
        
        # Trend strength based on correlation coefficient
        if abs(r_value) > 0.8:
            trend_strength = 'strong'
        elif abs(r_value) > 0.5:
            trend_strength = 'moderate'
        else:
            trend_strength = 'weak'
        
        return {
            'trend': trend_direction,
            'strength': trend_strength,
            'slope': slope,
            'correlation': r_value,
            'p_value': p_value,
            'standard_error': std_err,
            'trend_summary': f"{trend_strength} {trend_direction} trend (r={r_value:.3f})"
        }
```

---

## 📱 Cost Monitoring APIs

### RESTful API Endpoints

```python
# API endpoints for cost monitoring integration

@app.get("/api/cost/current")
async def get_current_cost_metrics():
    """Get current cost metrics"""
    
    cost_collector = CurrentCostCollector()
    return await cost_collector.get_current_metrics()

@app.get("/api/cost/daily/{date}")
async def get_daily_cost_breakdown(date: str):
    """Get detailed cost breakdown for specific date"""
    
    daily_analyzer = DailyCostAnalyzer()
    return await daily_analyzer.get_day_breakdown(date)

@app.get("/api/cost/service/{service_name}/performance")
async def get_service_cost_performance(service_name: str, days: int = 7):
    """Get cost performance metrics for specific service"""
    
    service_monitor = ServiceCostMonitor(service_name)
    return await service_monitor.get_performance_metrics(days)

@app.post("/api/cost/alerts/configure")
async def configure_cost_alerts(alert_config: dict):
    """Configure cost alert thresholds and channels"""
    
    alert_system = CostAlertSystem()
    return await alert_system.update_configuration(alert_config)

@app.get("/api/cost/forecast/monthly")
async def get_monthly_cost_forecast():
    """Get monthly cost forecast based on current trends"""
    
    forecaster = CostForecaster()
    return await forecaster.generate_monthly_forecast()

@app.get("/api/cost/optimization/opportunities")
async def get_cost_optimization_opportunities():
    """Get current cost optimization opportunities"""
    
    optimizer = CostOptimizer()
    return await optimizer.identify_opportunities()
```

### WebSocket Real-Time Updates

```python
class CostMonitoringWebSocket:
    def __init__(self):
        self.active_connections = set()
        
    async def connect(self, websocket):
        """Connect client to real-time cost updates"""
        
        await websocket.accept()
        self.active_connections.add(websocket)
        
        # Send initial cost state
        current_state = await self.get_current_cost_state()
        await websocket.send_json(current_state)
        
    async def disconnect(self, websocket):
        """Disconnect client"""
        
        self.active_connections.discard(websocket)
        
    async def broadcast_cost_update(self, cost_update: dict):
        """Broadcast cost update to all connected clients"""
        
        disconnected = set()
        
        for websocket in self.active_connections:
            try:
                await websocket.send_json({
                    'type': 'cost_update',
                    'timestamp': datetime.utcnow().isoformat(),
                    'data': cost_update
                })
            except:
                disconnected.add(websocket)
        
        # Clean up disconnected clients
        self.active_connections -= disconnected
        
    async def send_cost_alert(self, alert: dict):
        """Send cost alert to all connected clients"""
        
        for websocket in self.active_connections:
            try:
                await websocket.send_json({
                    'type': 'cost_alert',
                    'alert': alert
                })
            except:
                pass  # Handle disconnection gracefully

@app.websocket("/ws/cost-monitoring")
async def cost_monitoring_websocket(websocket: WebSocket):
    """WebSocket endpoint for real-time cost monitoring"""
    
    cost_ws = CostMonitoringWebSocket()
    await cost_ws.connect(websocket)
    
    try:
        while True:
            # Keep connection alive and handle any client messages
            message = await websocket.receive_text()
            
            # Handle client requests (e.g., request specific metrics)
            if message == "request_current_metrics":
                current_metrics = await get_current_cost_metrics()
                await websocket.send_json(current_metrics)
                
    except WebSocketDisconnect:
        await cost_ws.disconnect(websocket)
```

---

## 🔧 Integration with Fish Mouth Services

### Service Integration Examples

```python
# Example: Image Processor Integration
class ImageProcessorWithCostTracking(ImageProcessor):
    def __init__(self):
        super().__init__()
        self.cost_tracker = ServiceCostTracker("image_processor")
        
    async def process_satellite_image(self, lat: float, lng: float, property_id: str):
        """Process satellite image with integrated cost tracking"""
        
        start_time = time.time()
        processing_result = await super().process_satellite_image(lat, lng, property_id)
        processing_time = time.time() - start_time
        
        # Track cost information
        await self.cost_tracker.track_request_cost(property_id, {
            'total_cost': processing_result.get('cost', 0.0),
            'sources_used': processing_result.get('sources_used', []),
            'processing_time': processing_time,
            'quality_score': processing_result.get('quality_score', 0.0),
            'cache_hit': 'cache' in processing_result.get('sources_used', []),
            'batch_processing': processing_result.get('batch_processing', False)
        })
        
        return processing_result

# Example: Enrichment Service Integration  
class EnrichmentServiceWithCostTracking(EnrichmentService):
    def __init__(self):
        super().__init__()
        self.cost_tracker = ServiceCostTracker("enrichment_service")
        
    async def enrich_property_data(self, property_data: dict):
        """Enrich property data with integrated cost tracking"""
        
        start_time = time.time()
        enrichment_result = await super().enrich_property_data(property_data)
        processing_time = time.time() - start_time
        
        # Track enrichment costs
        await self.cost_tracker.track_request_cost(property_data.get('property_id'), {
            'total_cost': enrichment_result.get('cost_tracking', {}).get('total_cost', 0.0),
            'sources_used': enrichment_result.get('cost_tracking', {}).get('sources_used', []),
            'processing_time': processing_time,
            'completeness_score': enrichment_result.get('completeness_score', 0.0),
            'free_sources_success_rate': enrichment_result.get('free_sources_success_rate', 0.0)
        })
        
        return enrichment_result
```

---

**Prepared by**: Fish Mouth Operations Team  
**Date**: January 14, 2025  
**Status**: Production Cost Monitoring System  
**Next Review**: Weekly cost optimization analysis
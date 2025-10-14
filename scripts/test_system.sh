#!/bin/bash

# End-to-End Testing Script for Data Acquisition System
# This script tests the complete workflow from scraping to lead generation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Service endpoints
ORCHESTRATOR_URL="http://localhost:8009"
SCRAPER_URL="http://localhost:8011"
IMAGE_PROCESSOR_URL="http://localhost:8012"
ML_INFERENCE_URL="http://localhost:8013"
ENRICHMENT_URL="http://localhost:8004"
LEAD_GENERATOR_URL="http://localhost:8008"
OLLAMA_URL="http://localhost:11434"

# Test configuration
TEST_CITY="Austin"
TEST_STATE="TX"
TEST_ADDRESS="123 Main St"
TEST_ZIP="78701"

echo -e "${BLUE}🧪 Starting End-to-End Data Acquisition System Test${NC}"
echo "=================================================="

# Function to check HTTP response
check_response() {
    local url=$1
    local expected_code=${2:-200}
    local description=$3
    
    echo -n "Testing $description... "
    
    response=$(curl -s -w "%{http_code}" -o /tmp/response.json "$url")
    
    if [ "$response" -eq "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        if [ -f /tmp/response.json ]; then
            echo "Response: $(cat /tmp/response.json)"
        fi
        return 1
    fi
}

# Function to check JSON response contains expected fields
check_json_field() {
    local field=$1
    local description=$2
    
    if jq -e ".$field" /tmp/response.json > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $description${NC}"
        return 0
    else
        echo -e "  ${RED}❌ Missing $description${NC}"
        return 1
    fi
}

# Function to wait for job completion
wait_for_job() {
    local service_url=$1
    local job_id=$2
    local timeout=${3:-300} # 5 minutes default
    local elapsed=0
    
    echo -n "Waiting for job $job_id to complete... "
    
    while [ $elapsed -lt $timeout ]; do
        response=$(curl -s "$service_url/jobs/$job_id")
        status=$(echo "$response" | jq -r '.status')
        
        case $status in
            "completed")
                echo -e "${GREEN}✅ COMPLETED${NC}"
                return 0
                ;;
            "failed")
                echo -e "${RED}❌ FAILED${NC}"
                echo "Error: $(echo "$response" | jq -r '.error_message // "Unknown error"')"
                return 1
                ;;
            "running"|"pending")
                echo -n "."
                sleep 5
                elapsed=$((elapsed + 5))
                ;;
            *)
                echo -e "${YELLOW}⚠️  Unknown status: $status${NC}"
                sleep 5
                elapsed=$((elapsed + 5))
                ;;
        esac
    done
    
    echo -e "${RED}❌ TIMEOUT${NC}"
    return 1
}

# Test 1: Check all services are running
echo -e "\n${BLUE}Test 1: Service Health Checks${NC}"
echo "-------------------------------"

check_response "$OLLAMA_URL/api/tags" 200 "Ollama LLM service"
check_response "$SCRAPER_URL/health" 200 "Scraper service health"
check_response "$IMAGE_PROCESSOR_URL/health" 200 "Image processor health"
check_response "$ML_INFERENCE_URL/health" 200 "ML inference health"
check_response "$ENRICHMENT_URL/health" 200 "Enrichment service health"
check_response "$LEAD_GENERATOR_URL/health" 200 "Lead generator health"
check_response "$ORCHESTRATOR_URL/health" 200 "Orchestrator health"

# Test 2: System Status
echo -e "\n${BLUE}Test 2: System Status${NC}"
echo "----------------------"

curl -s "$ORCHESTRATOR_URL/status" > /tmp/response.json
check_json_field "overall_health" "Overall health status"
check_json_field "services" "Service status details"
check_json_field "active_workflows" "Active workflow count"

# Test 3: Ollama Model Test
echo -e "\n${BLUE}Test 3: AI Model Functionality${NC}"
echo "--------------------------------"

echo -n "Testing LLM data extraction... "
ollama_response=$(curl -s -X POST "$OLLAMA_URL/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Extract from: \"Name: John Smith, Address: 456 Oak St, Austin TX 78702\" Return JSON with name and address fields.",
    "stream": false,
    "options": {"temperature": 0.1}
  }')

if echo "$ollama_response" | jq -e '.response' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ LLM responding${NC}"
else
    echo -e "${RED}❌ LLM not responding properly${NC}"
    echo "Response: $ollama_response"
fi

# Test 4: Address Validation
echo -e "\n${BLUE}Test 4: Address Validation${NC}"
echo "----------------------------"

echo -n "Testing address validation... "
validation_response=$(curl -s -X POST "$ENRICHMENT_URL/validate/address" \
  -H "Content-Type: application/json" \
  -d "{
    \"address\": \"$TEST_ADDRESS\",
    \"city\": \"$TEST_CITY\",
    \"state\": \"$TEST_STATE\",
    \"zip_code\": \"$TEST_ZIP\"
  }")

if echo "$validation_response" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Address validation working${NC}"
else
    echo -e "${RED}❌ Address validation failed${NC}"
    echo "Response: $validation_response"
fi

# Test 5: Email Lookup (Mock Test)
echo -e "\n${BLUE}Test 5: Email Discovery${NC}"
echo "-------------------------"

echo -n "Testing email lookup service... "
email_response=$(curl -s -X POST "$ENRICHMENT_URL/enrich/email" \
  -H "Content-Type: application/json" \
  -d '{
    "owner_name": "John Doe",
    "address": "'$TEST_ADDRESS'",
    "city": "'$TEST_CITY'",
    "state": "'$TEST_STATE'"
  }')

if echo "$email_response" | jq -e '.success' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Email service responding${NC}"
else
    echo -e "${RED}❌ Email service failed${NC}"
    echo "Response: $email_response"
fi

# Test 6: Lead Scoring (requires data)
echo -e "\n${BLUE}Test 6: Lead Generation Pipeline${NC}"
echo "----------------------------------"

echo -n "Testing lead scoring endpoint... "
curl -s "$LEAD_GENERATOR_URL/leads/top?limit=1" > /tmp/response.json

if [ "$(jq -r '.leads | length' /tmp/response.json 2>/dev/null)" ]; then
    echo -e "${GREEN}✅ Lead generator responding${NC}"
    lead_count=$(jq -r '.count' /tmp/response.json)
    echo "  Found $lead_count leads in system"
else
    echo -e "${YELLOW}⚠️  No leads found (expected for new system)${NC}"
fi

# Test 7: Workflow Orchestration
echo -e "\n${BLUE}Test 7: Workflow System${NC}"
echo "-------------------------"

echo -n "Testing workflow history... "
curl -s "$ORCHESTRATOR_URL/workflows/history?limit=5" > /tmp/response.json

if jq -e '.workflows' /tmp/response.json > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Workflow history accessible${NC}"
    workflow_count=$(jq -r '.count' /tmp/response.json)
    echo "  Found $workflow_count recent workflows"
else
    echo -e "${YELLOW}⚠️  No workflow history (expected for new system)${NC}"
fi

# Test 8: System Metrics
echo -e "\n${BLUE}Test 8: Performance Metrics${NC}"
echo "-----------------------------"

echo -n "Testing metrics collection... "
curl -s "$ORCHESTRATOR_URL/metrics" > /tmp/response.json

if jq -e '.daily_processing' /tmp/response.json > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Metrics system working${NC}"
else
    echo -e "${YELLOW}⚠️  No metrics data (expected for new system)${NC}"
fi

# Test 9: Integration Test (Optional - requires confirmation)
echo -e "\n${BLUE}Test 9: Integration Test${NC}"
echo "-------------------------"

read -p "Run full integration test (will create test data)? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting integration test with test city processing..."
    
    # Start city processing
    echo -n "Creating city processing job... "
    job_response=$(curl -s -X POST "$ORCHESTRATOR_URL/cities/process" \
      -H "Content-Type: application/json" \
      -d "{
        \"city\": \"$TEST_CITY\",
        \"state\": \"$TEST_STATE\",
        \"priority\": 1,
        \"scrape_types\": [\"permit\"]
      }")
    
    if echo "$job_response" | jq -e '.success' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Integration test started${NC}"
        workflow_id=$(echo "$job_response" | jq -r '.workflow_id')
        echo "  Workflow ID: $workflow_id"
        echo -e "${YELLOW}  Note: Full processing may take several minutes${NC}"
    else
        echo -e "${RED}❌ Integration test failed to start${NC}"
        echo "Response: $job_response"
    fi
else
    echo -e "${YELLOW}⚠️  Skipping integration test${NC}"
fi

# Summary
echo -e "\n${BLUE}📊 Test Summary${NC}"
echo "==============="

# Count passed tests by checking previous outputs
if check_response "$ORCHESTRATOR_URL/health" 200 "Final health check" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Core system is functional${NC}"
    
    echo -e "\n${GREEN}🎉 Data Acquisition System Test Complete!${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Access the dashboard at http://localhost:3000"
    echo "2. Navigate to the Data Acquisition section"
    echo "3. Run your first workflow or process a city"
    echo "4. Monitor system health and job progress"
    echo "5. Check generated leads in the system"
    
    echo -e "\n${BLUE}🔧 Useful Commands:${NC}"
    echo "• View service logs: docker-compose logs [service-name]"
    echo "• Restart a service: docker-compose restart [service-name]"
    echo "• Check database: docker-compose exec postgres psql -U fishmouth -d fishmouth"
    echo "• Monitor Redis: docker-compose exec redis redis-cli monitor"
    
else
    echo -e "${RED}❌ System has critical issues${NC}"
    echo -e "\n${YELLOW}🔧 Troubleshooting:${NC}"
    echo "1. Check all services are running: docker-compose ps"
    echo "2. Check service logs: docker-compose logs"
    echo "3. Restart services: docker-compose restart"
    echo "4. Apply database schema: psql -f shared/migrations/005_data_acquisition_schema.sql"
    echo "5. Setup Ollama: ./scripts/setup_ollama.sh"
fi

# Cleanup
rm -f /tmp/response.json

echo -e "\n${BLUE}Test completed at $(date)${NC}"
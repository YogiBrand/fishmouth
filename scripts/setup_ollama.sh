#!/bin/bash

# Setup Ollama for Data Acquisition System
# This script installs Ollama and downloads required LLM models

set -e  # Exit on error

echo "🚀 Setting up Ollama for Data Acquisition System..."

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   exit 1
fi

# Install Ollama if not already installed
if ! command -v ollama &> /dev/null; then
    echo "📦 Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    echo "✅ Ollama installed successfully"
else
    echo "✅ Ollama is already installed"
fi

# Start Ollama service
echo "🔧 Starting Ollama service..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to start
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Function to check if Ollama is running
check_ollama() {
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for Ollama to be ready
RETRY_COUNT=0
MAX_RETRIES=30

while ! check_ollama; do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Ollama failed to start after $MAX_RETRIES attempts"
        exit 1
    fi
    echo "⏳ Waiting for Ollama to be ready... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

echo "✅ Ollama is running and ready"

# Download required models
echo "📥 Downloading LLM models for data extraction..."

# Primary model: Llama 3.2 3B (lightweight, fast)
echo "📥 Downloading llama3.2:3b (primary model)..."
if ollama pull llama3.2:3b; then
    echo "✅ Successfully downloaded llama3.2:3b"
else
    echo "❌ Failed to download llama3.2:3b"
    echo "🔄 Trying alternative model..."
    if ollama pull llama3.1:8b; then
        echo "✅ Successfully downloaded llama3.1:8b as fallback"
    else
        echo "❌ Failed to download fallback model"
        exit 1
    fi
fi

# Fallback model: Mistral 7B Instruct
echo "📥 Downloading mistral:7b-instruct (fallback model)..."
if ollama pull mistral:7b-instruct; then
    echo "✅ Successfully downloaded mistral:7b-instruct"
else
    echo "⚠️  Warning: Failed to download mistral:7b-instruct fallback model"
    echo "   The system will work with just the primary model"
fi

# Optional: Download a smaller model for testing
echo "📥 Downloading phi3:mini for testing..."
if ollama pull phi3:mini; then
    echo "✅ Successfully downloaded phi3:mini"
else
    echo "⚠️  Warning: Failed to download phi3:mini test model"
fi

# Test the installation
echo "🧪 Testing Ollama installation..."

# Test primary model
echo "Testing llama3.2:3b model..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2:3b",
    "prompt": "Extract data from this text: \"Name: John Doe, Email: john@example.com\" Return JSON format.",
    "stream": false,
    "options": {
      "temperature": 0.1
    }
  }' | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'response' in data and len(data['response']) > 0:
        print('✅ Model test successful')
    else:
        print('❌ Model test failed - empty response')
        sys.exit(1)
except Exception as e:
    print(f'❌ Model test failed: {e}')
    sys.exit(1)
")

if [ $? -eq 0 ]; then
    echo "✅ LLM model is working correctly"
else
    echo "❌ LLM model test failed"
    exit 1
fi

# Create systemd service (optional)
echo "🔧 Setting up Ollama service..."

# Check if systemd is available
if command -v systemctl &> /dev/null; then
    # Create systemd service file
    sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Server
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$(which ollama) serve
Environment="OLLAMA_HOST=0.0.0.0:11434"
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable ollama
    sudo systemctl start ollama
    
    echo "✅ Ollama systemd service created and started"
else
    echo "⚠️  Systemd not available, Ollama will need to be started manually"
fi

# Create configuration file
echo "📝 Creating Ollama configuration..."

mkdir -p ~/.ollama
cat > ~/.ollama/config.json <<EOF
{
  "models": {
    "primary": "llama3.2:3b",
    "fallback": "mistral:7b-instruct",
    "test": "phi3:mini"
  },
  "settings": {
    "host": "0.0.0.0:11434",
    "timeout": 30,
    "max_retries": 3
  }
}
EOF

# Set environment variables
echo "🔧 Setting up environment variables..."

# Add to bashrc if not already present
if ! grep -q "OLLAMA_HOST" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Ollama Configuration" >> ~/.bashrc
    echo "export OLLAMA_HOST=0.0.0.0:11434" >> ~/.bashrc
    echo "export OLLAMA_MODELS_PATH=~/.ollama/models" >> ~/.bashrc
fi

# Create startup script
cat > ~/start_ollama.sh <<'EOF'
#!/bin/bash
# Start Ollama for Data Acquisition System

echo "🚀 Starting Ollama for data acquisition..."

# Set environment
export OLLAMA_HOST=0.0.0.0:11434

# Start ollama
ollama serve &
OLLAMA_PID=$!

echo "✅ Ollama started with PID: $OLLAMA_PID"
echo "🔗 Access at: http://localhost:11434"

# Keep running
wait $OLLAMA_PID
EOF

chmod +x ~/start_ollama.sh

# Create Docker Compose override for Ollama (optional)
echo "🐳 Creating Docker Compose configuration for Ollama..."

cat > ollama-service.yml <<EOF
version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: fishmouth_ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
    restart: unless-stopped
    command: ollama serve

volumes:
  ollama_data:
EOF

echo "✅ Created ollama-service.yml for Docker deployment"

# Display summary
echo ""
echo "🎉 Ollama setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "  • Ollama installed and running"
echo "  • Primary model: llama3.2:3b"
echo "  • Fallback model: mistral:7b-instruct"
echo "  • Service endpoint: http://localhost:11434"
echo "  • Configuration: ~/.ollama/config.json"
echo ""
echo "🔧 Next steps:"
echo "  1. Run 'source ~/.bashrc' to load environment variables"
echo "  2. Test with: curl http://localhost:11434/api/tags"
echo "  3. Start your data acquisition services"
echo ""
echo "📚 Available models:"
ollama list

# Cleanup
if [ ! -z "$OLLAMA_PID" ] && ps -p $OLLAMA_PID > /dev/null; then
    echo ""
    echo "🔄 Ollama is running as background process (PID: $OLLAMA_PID)"
    echo "   Use 'kill $OLLAMA_PID' to stop, or use systemctl if service is enabled"
fi

echo ""
echo "✅ Setup complete! Your data acquisition system is ready to use AI-powered extraction."
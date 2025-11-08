#!/bin/bash

# Mosquitto MQTT Broker Setup Script for Smart Car IoT Platform
# This script sets up a local Mosquitto broker for development

echo "=== Smart Car IoT Platform - Mosquitto MQTT Broker Setup ==="

# Check if Mosquitto is installed
if ! command -v mosquitto &> /dev/null; then
    echo "Mosquitto is not installed. Installing..."

    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Detected macOS. Installing via Homebrew..."
        brew install mosquitto
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Detected Linux. Installing via apt..."
        sudo apt-get update
        sudo apt-get install -y mosquitto mosquitto-clients
    else
        echo "Unsupported OS. Please install Mosquitto manually."
        exit 1
    fi
else
    echo "Mosquitto is already installed."
fi

# Create configuration directory if it doesn't exist
MQTT_CONFIG_DIR="./mqtt-config"
mkdir -p "$MQTT_CONFIG_DIR"

# Create Mosquitto configuration file
MQTT_CONFIG_FILE="$MQTT_CONFIG_DIR/mosquitto.conf"
echo "Creating Mosquitto configuration at $MQTT_CONFIG_FILE..."

cat > "$MQTT_CONFIG_FILE" << 'EOF'
# Mosquitto MQTT Broker Configuration for Smart Car IoT Platform

# Listener configuration
listener 1883
protocol mqtt

# WebSocket listener for browser clients (dashboard)
listener 9001
protocol websockets

# Allow anonymous connections for development
# IMPORTANT: In production, enable authentication and TLS
allow_anonymous true

# Persistence settings
persistence true
persistence_location ./mqtt-data/

# Logging
log_dest file ./mqtt-logs/mosquitto.log
log_type all
log_timestamp true

# Connection limits
max_connections -1
max_inflight_messages 20
max_queued_messages 100

# Security (Development mode - disable for now)
# In production, uncomment these and configure certificates:
# cafile /path/to/ca.crt
# certfile /path/to/server.crt
# keyfile /path/to/server.key
# require_certificate false
# use_identity_as_username true

# ACL configuration (access control list)
# acl_file ./mqtt-config/acl.conf
EOF

# Create ACL file for access control
ACL_FILE="$MQTT_CONFIG_DIR/acl.conf"
echo "Creating ACL configuration at $ACL_FILE..."

cat > "$ACL_FILE" << 'EOF'
# MQTT Access Control List for Smart Car IoT Platform

# Admin user has full access
user admin
topic readwrite #

# Device users can publish telemetry and subscribe to commands
pattern read devices/%u/commands/#
pattern write devices/%u/telemetry/#
pattern write devices/%u/events/#

# Dashboard users can subscribe to all device data
user dashboard
topic read devices/+/telemetry/#
topic read devices/+/events/#
topic write devices/+/commands/#
EOF

# Create necessary directories
mkdir -p ./mqtt-data
mkdir -p ./mqtt-logs

echo "Mosquitto configuration created successfully!"
echo ""
echo "To start the MQTT broker, run:"
echo "  mosquitto -c $MQTT_CONFIG_FILE"
echo ""
echo "MQTT Endpoints:"
echo "  - MQTT Protocol: mqtt://localhost:1883"
echo "  - WebSocket Protocol: ws://localhost:9001"
echo ""
echo "For production deployment:"
echo "  1. Enable authentication (create password file)"
echo "  2. Configure TLS certificates"
echo "  3. Set allow_anonymous to false"
echo "  4. Review and restrict ACL permissions"

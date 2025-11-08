#!/bin/bash

# Start Mosquitto MQTT Broker for Smart Car IoT Platform
# This script starts the Mosquitto broker with the configuration created by initMosquitto.sh

MQTT_CONFIG_DIR="./mqtt-config"
MQTT_CONFIG_FILE="$MQTT_CONFIG_DIR/mosquitto.conf"

echo "=== Starting Mosquitto MQTT Broker ==="

# Check if configuration file exists
if [ ! -f "$MQTT_CONFIG_FILE" ]; then
    echo "Configuration file not found: $MQTT_CONFIG_FILE"
    echo "Please run ./initMosquitto.sh first to create the configuration."
    exit 1
fi

# Check if Mosquitto is installed
if ! command -v mosquitto &> /dev/null; then
    echo "Mosquitto is not installed."
    echo "Please run ./initMosquitto.sh to install and configure Mosquitto."
    exit 1
fi

# Create necessary directories if they don't exist
mkdir -p ./mqtt-data
mkdir -p ./mqtt-logs

echo "Starting Mosquitto broker..."
echo "Configuration: $MQTT_CONFIG_FILE"
echo ""
echo "MQTT Endpoints:"
echo "  - MQTT Protocol: mqtt://localhost:1883"
echo "  - WebSocket Protocol: ws://localhost:9001"
echo ""
echo "Press Ctrl+C to stop the broker."
echo ""

# Start Mosquitto with the configuration file
mosquitto -c "$MQTT_CONFIG_FILE" -v

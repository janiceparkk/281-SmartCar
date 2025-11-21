const mqtt = require("mqtt");
const { pgPool } = require("../config/database");
const {
	recordConnection,
	recordDisconnection,
	updateHeartbeat,
} = require("./connectionTracker");
const { storeTelemetry } = require("./telemetryService");

class MQTTService {
	constructor() {
		this.client = null;
		this.isConnected = false;
		this.subscribedTopics = new Set();
		this.deviceSessions = new Map(); // Track active device sessions
	}

	/**
	 * Initialize MQTT client and connect to broker
	 */
	async initialize() {
		try {
			const brokerUrl = `mqtt://${process.env.MQTT_BROKER_HOST}:${process.env.MQTT_BROKER_PORT}`;
			const options = {
				clientId: `smartcar_backend_${Date.now()}`,
				username: process.env.MQTT_BROKER_USERNAME,
				password: process.env.MQTT_BROKER_PASSWORD,
				clean: true,
				reconnectPeriod: 5000,
			};

			console.log(`[MQTT Service] Connecting to broker: ${brokerUrl}`);

			this.client = mqtt.connect(brokerUrl, options);

			// Set up event handlers
			this.client.on("connect", () => {
				this.isConnected = true;
				console.log("[MQTT Service] Connected to MQTT broker");
				this.setupDefaultSubscriptions();
			});

			this.client.on("error", (error) => {
				console.error("[MQTT Service] Connection error:", error.message);
			});

			this.client.on("close", () => {
				this.isConnected = false;
				console.log("[MQTT Service] Disconnected from MQTT broker");
			});

			this.client.on("message", (topic, message) => {
				this.handleMessage(topic, message);
			});

			this.client.on("reconnect", () => {
				console.log("[MQTT Service] Attempting to reconnect to MQTT broker");
			});
		} catch (error) {
			console.error("[MQTT Service] Initialization error:", error.message);
			throw error;
		}
	}

	/**
	 * Set up default topic subscriptions
	 */
	setupDefaultSubscriptions() {
		// Subscribe to device telemetry topics
		this.subscribe("devices/+/telemetry");
		this.subscribe("devices/+/status");
		this.subscribe("devices/+/heartbeat");
	}

	/**
	 * Subscribe to a topic
	 * @param {string} topic - MQTT topic to subscribe to
	 */
	subscribe(topic) {
		if (!this.isConnected) {
			console.warn("[MQTT Service] Not connected. Cannot subscribe to:", topic);
			return;
		}

		this.client.subscribe(topic, (err) => {
			if (err) {
				console.error(`[MQTT Service] Subscription error for ${topic}:`, err.message);
			} else {
				this.subscribedTopics.add(topic);
				console.log(`[MQTT Service] Subscribed to: ${topic}`);
			}
		});
	}

	/**
	 * Unsubscribe from a topic
	 * @param {string} topic - MQTT topic to unsubscribe from
	 */
	unsubscribe(topic) {
		if (!this.isConnected) {
			console.warn("[MQTT Service] Not connected. Cannot unsubscribe from:", topic);
			return;
		}

		this.client.unsubscribe(topic, (err) => {
			if (err) {
				console.error(`[MQTT Service] Unsubscribe error for ${topic}:`, err.message);
			} else {
				this.subscribedTopics.delete(topic);
				console.log(`[MQTT Service] Unsubscribed from: ${topic}`);
			}
		});
	}

	/**
	 * Publish a message to a topic
	 * @param {string} topic - MQTT topic
	 * @param {Object|string} message - Message payload
	 */
	publish(topic, message) {
		if (!this.isConnected) {
			console.warn("[MQTT Service] Not connected. Cannot publish to:", topic);
			return false;
		}

		const payload = typeof message === "string" ? message : JSON.stringify(message);

		this.client.publish(topic, payload, (err) => {
			if (err) {
				console.error(`[MQTT Service] Publish error for ${topic}:`, err.message);
			} else {
				console.log(`[MQTT Service] Published to ${topic}`);
			}
		});

		return true;
	}

	/**
	 * Handle incoming MQTT messages
	 * @param {string} topic - Topic the message was received on
	 * @param {Buffer} message - Message payload
	 */
	async handleMessage(topic, message) {
		try {
			const payload = JSON.parse(message.toString());
			console.log(`[MQTT Service] Received message on ${topic}`);

			// Extract device ID from topic (e.g., "devices/123/telemetry" -> 123)
			const topicParts = topic.split("/");
			const deviceId = parseInt(topicParts[1]);

			if (isNaN(deviceId)) {
				console.warn(`[MQTT Service] Invalid device ID in topic: ${topic}`);
				return;
			}

			// Route message based on topic pattern
			if (topic.includes("/heartbeat")) {
				await this.handleHeartbeat(deviceId, payload);
			} else if (topic.includes("/status")) {
				await this.handleStatusUpdate(deviceId, payload);
			} else if (topic.includes("/telemetry")) {
				await this.handleTelemetry(deviceId, payload);
			}
		} catch (error) {
			console.error(`[MQTT Service] Error handling message on ${topic}:`, error.message);
		}
	}

	/**
	 * Handle device heartbeat messages
	 * @param {number} deviceId - Device identifier
	 * @param {Object} payload - Message payload
	 */
	async handleHeartbeat(deviceId, payload) {
		try {
			await updateHeartbeat(deviceId);
			console.log(`[MQTT Service] Heartbeat processed for device ${deviceId}`);
		} catch (error) {
			console.error(`[MQTT Service] Heartbeat processing error for device ${deviceId}:`, error.message);
		}
	}

	/**
	 * Handle device status update messages
	 * @param {number} deviceId - Device identifier
	 * @param {Object} payload - Message payload (should include 'status')
	 */
	async handleStatusUpdate(deviceId, payload) {
		try {
			const { status } = payload;

			if (status === "online" || status === "connected") {
				await recordConnection(deviceId, "mqtt");
				this.deviceSessions.set(deviceId, { connectedAt: new Date() });
			} else if (status === "offline" || status === "disconnected") {
				await recordDisconnection(deviceId);
				this.deviceSessions.delete(deviceId);
			}

			console.log(`[MQTT Service] Status update for device ${deviceId}: ${status}`);
		} catch (error) {
			console.error(`[MQTT Service] Status update error for device ${deviceId}:`, error.message);
		}
	}

	/**
	 * Handle device telemetry messages
	 * @param {number} deviceId - Device identifier
	 * @param {Object} payload - Telemetry data
	 */
	async handleTelemetry(deviceId, payload) {
		try {
			// Store telemetry data
			await storeTelemetry(deviceId, payload);
			console.log(`[MQTT Service] Telemetry stored for device ${deviceId}`);
		} catch (error) {
			console.error(`[MQTT Service] Telemetry processing error for device ${deviceId}:`, error.message);
		}
	}

	/**
	 * Disconnect from MQTT broker
	 */
	disconnect() {
		if (this.client) {
			this.client.end();
			this.isConnected = false;
			console.log("[MQTT Service] Disconnected from MQTT broker");
		}
	}

	/**
	 * Get service status
	 * @returns {Object} Service status information
	 */
	getStatus() {
		return {
			connected: this.isConnected,
			subscribedTopics: Array.from(this.subscribedTopics),
			activeSessions: this.deviceSessions.size,
		};
	}
}

// Export singleton instance
module.exports = new MQTTService();

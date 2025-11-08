/**
 * MQTT Service for Smart Car IoT Platform
 *
 * Handles real-time connectivity infrastructure for IoT devices:
 * - MQTT broker integration
 * - Device heartbeat monitoring with timeout detection
 * - Connection state tracking (Online/Idle/Offline/No-Connection)
 * - Automatic reconnection with exponential backoff
 * - Telemetry and event data ingestion
 *
 * Phase 2 Implementation for IoT Device Manager & Connectivity
 */

const mqtt = require('mqtt');
const EventEmitter = require('events');

class MQTTService extends EventEmitter {
	constructor(options = {}) {
		super();

		this.brokerUrl = options.brokerUrl || 'mqtt://localhost:1883';
		this.client = null;
		this.devices = new Map(); // Track connected devices with state
		this.heartbeatTimers = new Map(); // Store heartbeat timeout timers

		// Configuration
		this.config = {
			heartbeatTimeout: options.heartbeatTimeout || 60000, // 60 seconds
			idleTimeout: options.idleTimeout || 300000, // 5 minutes
			offlineTimeout: options.offlineTimeout || 1800000, // 30 minutes
			reconnectBackoff: {
				initial: 1000,
				max: 60000,
				multiplier: 2
			}
		};

		this.connectionStates = {
			ONLINE: 'Online',
			IDLE: 'Idle',
			OFFLINE: 'Offline',
			NO_CONNECTION: 'No-Connection'
		};
	}

	/**
	 * Initialize MQTT client and connect to broker
	 */
	async connect() {
		return new Promise((resolve, reject) => {
			console.log('[MQTT] Connecting to broker:', this.brokerUrl);

			// MQTT client options with automatic reconnection
			const options = {
				clientId: `smartcar_backend_${Date.now()}`,
				clean: true,
				reconnectPeriod: this.config.reconnectBackoff.initial,
				connectTimeout: 30000,
				will: {
					topic: 'backend/status',
					payload: JSON.stringify({ status: 'offline', timestamp: new Date() }),
					qos: 1,
					retain: true
				}
			};

			this.client = mqtt.connect(this.brokerUrl, options);

			// Connection event handlers
			this.client.on('connect', () => {
				console.log('[MQTT] Successfully connected to broker');
				this.setupSubscriptions();
				this.publishBackendStatus('online');
				resolve(this.client);
			});

			this.client.on('error', (error) => {
				console.error('[MQTT] Connection error:', error.message);
				reject(error);
			});

			this.client.on('reconnect', () => {
				console.log('[MQTT] Attempting to reconnect to broker...');
			});

			this.client.on('offline', () => {
				console.warn('[MQTT] Client went offline');
				this.emit('broker_offline');
			});

			this.client.on('message', (topic, message) => {
				this.handleIncomingMessage(topic, message);
			});

			// Handle connection loss
			this.client.on('close', () => {
				console.log('[MQTT] Connection closed');
			});
		});
	}

	/**
	 * Subscribe to relevant MQTT topics
	 */
	setupSubscriptions() {
		const topics = [
			'devices/+/telemetry',      // Device telemetry data
			'devices/+/heartbeat',      // Device heartbeat signals
			'devices/+/events',         // Device events (audio, alerts)
			'devices/+/status',         // Device status updates
			'devices/+/connection'      // Device connection state changes
		];

		topics.forEach(topic => {
			this.client.subscribe(topic, { qos: 1 }, (err) => {
				if (err) {
					console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
				} else {
					console.log(`[MQTT] Subscribed to topic: ${topic}`);
				}
			});
		});
	}

	/**
	 * Handle incoming MQTT messages
	 */
	handleIncomingMessage(topic, message) {
		try {
			const data = JSON.parse(message.toString());
			const topicParts = topic.split('/');
			const deviceId = topicParts[1];
			const messageType = topicParts[2];

			// Update last seen timestamp
			this.updateDeviceLastSeen(deviceId);

			switch (messageType) {
				case 'heartbeat':
					this.handleHeartbeat(deviceId, data);
					break;
				case 'telemetry':
					this.handleTelemetry(deviceId, data);
					break;
				case 'events':
					this.handleDeviceEvent(deviceId, data);
					break;
				case 'status':
					this.handleStatusUpdate(deviceId, data);
					break;
				case 'connection':
					this.handleConnectionUpdate(deviceId, data);
					break;
				default:
					console.log(`[MQTT] Unknown message type: ${messageType}`);
			}
		} catch (error) {
			console.error('[MQTT] Error parsing message:', error.message);
		}
	}

	/**
	 * Handle device heartbeat
	 */
	handleHeartbeat(deviceId, data) {
		console.log(`[MQTT] Heartbeat received from device: ${deviceId}`);

		// Update device state to Online
		this.updateDeviceState(deviceId, this.connectionStates.ONLINE, data);

		// Reset heartbeat timeout timer
		this.resetHeartbeatTimer(deviceId);

		// Emit heartbeat event for database update
		this.emit('device_heartbeat', {
			deviceId,
			timestamp: new Date(),
			connectionQuality: data.connectionQuality || {}
		});
	}

	/**
	 * Handle telemetry data from device
	 */
	handleTelemetry(deviceId, data) {
		console.log(`[MQTT] Telemetry received from device: ${deviceId}`);

		// Update device state to Online (telemetry implies activity)
		this.updateDeviceState(deviceId, this.connectionStates.ONLINE, data);
		this.resetHeartbeatTimer(deviceId);

		// Emit telemetry event for processing and storage
		this.emit('device_telemetry', {
			deviceId,
			data,
			timestamp: new Date()
		});
	}

	/**
	 * Handle device events (audio, alerts, etc.)
	 */
	handleDeviceEvent(deviceId, data) {
		console.log(`[MQTT] Event received from device: ${deviceId}`, data.eventType);

		this.emit('device_event', {
			deviceId,
			eventType: data.eventType,
			eventData: data,
			timestamp: new Date()
		});
	}

	/**
	 * Handle device status updates
	 */
	handleStatusUpdate(deviceId, data) {
		console.log(`[MQTT] Status update from device: ${deviceId}`, data);

		this.emit('device_status_update', {
			deviceId,
			status: data,
			timestamp: new Date()
		});
	}

	/**
	 * Handle device connection state changes
	 */
	handleConnectionUpdate(deviceId, data) {
		console.log(`[MQTT] Connection update from device: ${deviceId}`, data.state);

		if (data.state === 'connected') {
			this.onDeviceConnected(deviceId, data);
		} else if (data.state === 'disconnected') {
			this.onDeviceDisconnected(deviceId, data);
		}
	}

	/**
	 * Handle device connection
	 */
	onDeviceConnected(deviceId, data) {
		console.log(`[MQTT] Device connected: ${deviceId}`);

		this.updateDeviceState(deviceId, this.connectionStates.ONLINE, data);
		this.resetHeartbeatTimer(deviceId);

		this.emit('device_connected', {
			deviceId,
			timestamp: new Date(),
			metadata: data
		});
	}

	/**
	 * Handle device disconnection
	 */
	onDeviceDisconnected(deviceId, reason) {
		console.log(`[MQTT] Device disconnected: ${deviceId}`, reason);

		this.updateDeviceState(deviceId, this.connectionStates.OFFLINE, { reason });
		this.clearHeartbeatTimer(deviceId);

		this.emit('device_disconnected', {
			deviceId,
			timestamp: new Date(),
			reason
		});
	}

	/**
	 * Update device connection state
	 */
	updateDeviceState(deviceId, state, metadata = {}) {
		const device = this.devices.get(deviceId) || {};

		const updatedDevice = {
			...device,
			deviceId,
			state,
			lastSeen: new Date(),
			metadata,
			stateChangedAt: device.state !== state ? new Date() : device.stateChangedAt
		};

		this.devices.set(deviceId, updatedDevice);

		// Emit state change event
		if (device.state !== state) {
			this.emit('device_state_changed', {
				deviceId,
				previousState: device.state,
				newState: state,
				timestamp: new Date()
			});
		}
	}

	/**
	 * Update device last seen timestamp
	 */
	updateDeviceLastSeen(deviceId) {
		const device = this.devices.get(deviceId);
		if (device) {
			device.lastSeen = new Date();
			this.devices.set(deviceId, device);
		}
	}

	/**
	 * Reset heartbeat timeout timer for a device
	 */
	resetHeartbeatTimer(deviceId) {
		// Clear existing timer
		this.clearHeartbeatTimer(deviceId);

		// Set new timeout timer
		const timer = setTimeout(() => {
			this.onHeartbeatTimeout(deviceId);
		}, this.config.heartbeatTimeout);

		this.heartbeatTimers.set(deviceId, timer);
	}

	/**
	 * Clear heartbeat timeout timer
	 */
	clearHeartbeatTimer(deviceId) {
		const timer = this.heartbeatTimers.get(deviceId);
		if (timer) {
			clearTimeout(timer);
			this.heartbeatTimers.delete(deviceId);
		}
	}

	/**
	 * Handle heartbeat timeout (device went idle)
	 */
	onHeartbeatTimeout(deviceId) {
		console.warn(`[MQTT] Heartbeat timeout for device: ${deviceId}`);

		const device = this.devices.get(deviceId);
		if (!device) return;

		const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();

		// Determine new state based on time since last seen
		let newState;
		if (timeSinceLastSeen < this.config.idleTimeout) {
			newState = this.connectionStates.IDLE;
			// Set another timer to check for offline state
			setTimeout(() => this.checkDeviceState(deviceId), this.config.idleTimeout - timeSinceLastSeen);
		} else if (timeSinceLastSeen < this.config.offlineTimeout) {
			newState = this.connectionStates.OFFLINE;
			// Set another timer to check for no-connection state
			setTimeout(() => this.checkDeviceState(deviceId), this.config.offlineTimeout - timeSinceLastSeen);
		} else {
			newState = this.connectionStates.NO_CONNECTION;
		}

		this.updateDeviceState(deviceId, newState, { reason: 'heartbeat_timeout' });
	}

	/**
	 * Check and update device state based on last seen time
	 */
	checkDeviceState(deviceId) {
		const device = this.devices.get(deviceId);
		if (!device) return;

		const timeSinceLastSeen = Date.now() - device.lastSeen.getTime();

		let newState;
		if (timeSinceLastSeen < this.config.heartbeatTimeout) {
			newState = this.connectionStates.ONLINE;
		} else if (timeSinceLastSeen < this.config.idleTimeout) {
			newState = this.connectionStates.IDLE;
		} else if (timeSinceLastSeen < this.config.offlineTimeout) {
			newState = this.connectionStates.OFFLINE;
		} else {
			newState = this.connectionStates.NO_CONNECTION;
		}

		if (device.state !== newState) {
			this.updateDeviceState(deviceId, newState, { reason: 'state_check' });
		}
	}

	/**
	 * Publish command to a device
	 */
	publishCommand(deviceId, command, data = {}) {
		const topic = `devices/${deviceId}/commands/${command}`;
		const payload = JSON.stringify({
			command,
			data,
			timestamp: new Date(),
			messageId: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		});

		this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => {
			if (err) {
				console.error(`[MQTT] Failed to publish command to ${deviceId}:`, err);
			} else {
				console.log(`[MQTT] Command published to ${deviceId}:`, command);
			}
		});
	}

	/**
	 * Publish backend status
	 */
	publishBackendStatus(status) {
		const topic = 'backend/status';
		const payload = JSON.stringify({
			status,
			timestamp: new Date(),
			version: '1.0.0'
		});

		this.client.publish(topic, payload, { qos: 1, retain: true });
	}

	/**
	 * Get device connection state
	 */
	getDeviceState(deviceId) {
		const device = this.devices.get(deviceId);
		return device ? device.state : this.connectionStates.NO_CONNECTION;
	}

	/**
	 * Get all connected devices
	 */
	getConnectedDevices() {
		const connected = [];
		for (const [deviceId, device] of this.devices.entries()) {
			if (device.state === this.connectionStates.ONLINE) {
				connected.push(deviceId);
			}
		}
		return connected;
	}

	/**
	 * Get device statistics
	 */
	getDeviceStatistics() {
		const stats = {
			total: this.devices.size,
			online: 0,
			idle: 0,
			offline: 0,
			noConnection: 0
		};

		for (const device of this.devices.values()) {
			switch (device.state) {
				case this.connectionStates.ONLINE:
					stats.online++;
					break;
				case this.connectionStates.IDLE:
					stats.idle++;
					break;
				case this.connectionStates.OFFLINE:
					stats.offline++;
					break;
				case this.connectionStates.NO_CONNECTION:
					stats.noConnection++;
					break;
			}
		}

		return stats;
	}

	/**
	 * Disconnect from MQTT broker
	 */
	disconnect() {
		// Clear all heartbeat timers
		for (const timer of this.heartbeatTimers.values()) {
			clearTimeout(timer);
		}
		this.heartbeatTimers.clear();

		// Publish offline status
		if (this.client && this.client.connected) {
			this.publishBackendStatus('offline');
			this.client.end(false, () => {
				console.log('[MQTT] Disconnected from broker');
			});
		}
	}
}

module.exports = MQTTService;

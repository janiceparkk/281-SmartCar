/**
 * MQTT Device Simulator for Smart Car IoT Platform
 *
 * Simulates IoT devices connecting to the MQTT broker and sending:
 * - Heartbeat signals
 * - Telemetry data (GPS, speed, battery, etc.)
 * - Audio events and alerts
 * - Connection state changes
 *
 * Usage: node test-mqtt-device-simulator.js [deviceId] [scenario]
 *
 * Scenarios:
 * - normal: Regular device with periodic heartbeats and telemetry
 * - unstable: Device with intermittent connectivity
 * - audio_events: Device sending audio events
 * - offline: Device that goes offline after some time
 */

const mqtt = require('mqtt');

// Configuration
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const DEVICE_ID = process.argv[2] || 'IOT-001';
const SCENARIO = process.argv[3] || 'normal';

console.log(`\n=== MQTT Device Simulator ===`);
console.log(`Device ID: ${DEVICE_ID}`);
console.log(`Scenario: ${SCENARIO}`);
console.log(`Broker: ${BROKER_URL}\n`);

// MQTT Client setup
const client = mqtt.connect(BROKER_URL, {
	clientId: `mqtt_client_${DEVICE_ID}`,
	clean: true,
	reconnectPeriod: 5000,
	connectTimeout: 30000
});

let heartbeatInterval;
let telemetryInterval;
let audioEventInterval;
let isConnected = false;

// Connection event handlers
client.on('connect', () => {
	console.log(`[${DEVICE_ID}] Connected to MQTT broker`);
	isConnected = true;

	// Subscribe to command topics
	client.subscribe(`devices/${DEVICE_ID}/commands/#`, { qos: 1 }, (err) => {
		if (!err) {
			console.log(`[${DEVICE_ID}] Subscribed to command topics`);
		}
	});

	// Publish connection status
	publishConnectionStatus('connected');

	// Start the scenario
	startScenario();
});

client.on('error', (error) => {
	console.error(`[${DEVICE_ID}] Connection error:`, error.message);
});

client.on('message', (topic, message) => {
	console.log(`[${DEVICE_ID}] Received command:`, topic, message.toString());
	handleCommand(topic, JSON.parse(message.toString()));
});

client.on('offline', () => {
	console.warn(`[${DEVICE_ID}] Client went offline`);
	isConnected = false;
});

client.on('reconnect', () => {
	console.log(`[${DEVICE_ID}] Attempting to reconnect...`);
});

client.on('close', () => {
	console.log(`[${DEVICE_ID}] Connection closed`);
	isConnected = false;
});

// Publish functions
function publishConnectionStatus(state) {
	const topic = `devices/${DEVICE_ID}/connection`;
	const payload = {
		state,
		deviceId: DEVICE_ID,
		timestamp: new Date().toISOString()
	};
	client.publish(topic, JSON.stringify(payload), { qos: 1 });
	console.log(`[${DEVICE_ID}] Published connection status: ${state}`);
}

function publishHeartbeat() {
	if (!isConnected) return;

	const topic = `devices/${DEVICE_ID}/heartbeat`;
	const payload = {
		deviceId: DEVICE_ID,
		timestamp: new Date().toISOString(),
		connectionQuality: {
			latency: Math.floor(Math.random() * 100) + 10,
			signalStrength: Math.floor(Math.random() * 40) + 60,
			packetLoss: Math.random() * 5
		}
	};
	client.publish(topic, JSON.stringify(payload), { qos: 1 });
	console.log(`[${DEVICE_ID}] Heartbeat sent`);
}

function publishTelemetry() {
	if (!isConnected) return;

	const topic = `devices/${DEVICE_ID}/telemetry`;

	// Simulate GPS coordinates around San Jose, CA
	const baseLat = 37.3382;
	const baseLon = -121.8863;
	const randomOffset = () => (Math.random() - 0.5) * 0.01;

	const payload = {
		deviceId: DEVICE_ID,
		timestamp: new Date().toISOString(),
		lat: baseLat + randomOffset(),
		lon: baseLon + randomOffset(),
		speed: Math.floor(Math.random() * 60) + 20,
		battery: Math.floor(Math.random() * 30) + 70,
		temperature: Math.floor(Math.random() * 20) + 15,
		connectionQuality: {
			latency: Math.floor(Math.random() * 100) + 10,
			signalStrength: Math.floor(Math.random() * 40) + 60,
			packetLoss: Math.random() * 5
		}
	};
	client.publish(topic, JSON.stringify(payload), { qos: 1 });
	console.log(`[${DEVICE_ID}] Telemetry sent: lat=${payload.lat.toFixed(4)}, lon=${payload.lon.toFixed(4)}, speed=${payload.speed}mph`);
}

function publishAudioEvent() {
	if (!isConnected) return;

	const topic = `devices/${DEVICE_ID}/events`;

	const eventTypes = ['horn', 'siren', 'crash', 'screeching_tires', 'alarm'];
	const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

	const payload = {
		deviceId: DEVICE_ID,
		timestamp: new Date().toISOString(),
		type: 'audio_event',
		eventType: 'audio_event',
		event: `${eventType}_detected`,
		classification: eventType,
		confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
		eventData: {
			duration: Math.floor(Math.random() * 5000) + 1000,
			frequency: Math.floor(Math.random() * 2000) + 500,
			amplitude: Math.random()
		}
	};
	client.publish(topic, JSON.stringify(payload), { qos: 1 });
	console.log(`[${DEVICE_ID}] Audio event sent: ${eventType} (confidence: ${payload.confidence.toFixed(2)})`);
}

function publishStatusUpdate(status) {
	const topic = `devices/${DEVICE_ID}/status`;
	const payload = {
		deviceId: DEVICE_ID,
		timestamp: new Date().toISOString(),
		status,
		firmwareVersion: '1.0.0'
	};
	client.publish(topic, JSON.stringify(payload), { qos: 1 });
	console.log(`[${DEVICE_ID}] Status update sent: ${status}`);
}

// Command handlers
function handleCommand(topic, message) {
	const commandType = topic.split('/').pop();

	switch (commandType) {
		case 'restart':
			console.log(`[${DEVICE_ID}] Restarting device...`);
			publishStatusUpdate('restarting');
			setTimeout(() => {
				publishStatusUpdate('online');
			}, 2000);
			break;
		case 'update_firmware':
			console.log(`[${DEVICE_ID}] Updating firmware to version ${message.data.version}...`);
			publishStatusUpdate('updating');
			setTimeout(() => {
				publishStatusUpdate('online');
			}, 5000);
			break;
		case 'shutdown':
			console.log(`[${DEVICE_ID}] Shutting down...`);
			publishConnectionStatus('disconnected');
			client.end();
			process.exit(0);
			break;
		default:
			console.log(`[${DEVICE_ID}] Unknown command: ${commandType}`);
	}
}

// Scenario implementations
function startScenario() {
	console.log(`\n[${DEVICE_ID}] Starting scenario: ${SCENARIO}\n`);

	switch (SCENARIO) {
		case 'normal':
			runNormalScenario();
			break;
		case 'unstable':
			runUnstableScenario();
			break;
		case 'audio_events':
			runAudioEventsScenario();
			break;
		case 'offline':
			runOfflineScenario();
			break;
		default:
			console.log(`Unknown scenario: ${SCENARIO}. Using 'normal' scenario.`);
			runNormalScenario();
	}
}

function runNormalScenario() {
	// Send heartbeat every 30 seconds
	heartbeatInterval = setInterval(() => {
		publishHeartbeat();
	}, 30000);

	// Send telemetry every 10 seconds
	telemetryInterval = setInterval(() => {
		publishTelemetry();
	}, 10000);

	// Send initial heartbeat and telemetry
	publishHeartbeat();
	publishTelemetry();
}

function runUnstableScenario() {
	// Intermittent heartbeats (sometimes missed)
	heartbeatInterval = setInterval(() => {
		if (Math.random() > 0.3) { // 70% chance of sending heartbeat
			publishHeartbeat();
		} else {
			console.log(`[${DEVICE_ID}] Heartbeat missed (unstable connection)`);
		}
	}, 30000);

	// Intermittent telemetry
	telemetryInterval = setInterval(() => {
		if (Math.random() > 0.2) { // 80% chance of sending telemetry
			publishTelemetry();
		}
	}, 15000);

	// Randomly disconnect and reconnect
	setInterval(() => {
		if (Math.random() > 0.7 && isConnected) {
			console.log(`[${DEVICE_ID}] Simulating connection drop...`);
			client.end(true);
			setTimeout(() => {
				console.log(`[${DEVICE_ID}] Reconnecting...`);
				client.reconnect();
			}, 5000);
		}
	}, 60000);
}

function runAudioEventsScenario() {
	// Regular heartbeats
	heartbeatInterval = setInterval(() => {
		publishHeartbeat();
	}, 30000);

	// Regular telemetry
	telemetryInterval = setInterval(() => {
		publishTelemetry();
	}, 10000);

	// Frequent audio events
	audioEventInterval = setInterval(() => {
		publishAudioEvent();
	}, 15000);

	// Initial messages
	publishHeartbeat();
	publishTelemetry();
	setTimeout(() => publishAudioEvent(), 3000);
}

function runOfflineScenario() {
	// Send a few messages then go offline
	publishHeartbeat();
	publishTelemetry();

	setTimeout(() => {
		publishHeartbeat();
		publishTelemetry();
	}, 10000);

	setTimeout(() => {
		console.log(`[${DEVICE_ID}] Going offline...`);
		publishConnectionStatus('disconnected');
		client.end();
		process.exit(0);
	}, 20000);
}

// Cleanup on exit
process.on('SIGINT', () => {
	console.log(`\n[${DEVICE_ID}] Shutting down...`);

	clearInterval(heartbeatInterval);
	clearInterval(telemetryInterval);
	clearInterval(audioEventInterval);

	publishConnectionStatus('disconnected');

	setTimeout(() => {
		client.end();
		process.exit(0);
	}, 1000);
});

console.log(`\n[${DEVICE_ID}] Device simulator started. Press Ctrl+C to stop.\n`);

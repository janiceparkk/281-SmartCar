# CARLA Bridge API Documentation

Based on the new `carla_bridge.py` implementation, here's the revised documentation:

## 🚗 CARLA Bridge System

The CARLA Bridge provides a real-time simulation environment with audio processing capabilities for vehicle monitoring and analysis.

## 📋 Prerequisites

### System Requirements

- **Ubuntu** (recommended 20.04+)

- **Python 3.7+**

- **CARLA 0.9.15**

- **Minimum 8GB RAM**, 16GB recommended

- **NVIDIA GPU** with 4GB+ VRAM for optimal performance

### Required Environment Variables

```bash

# Create .env file in project root

SERVICE_TOKEN=your-secure-service-token-here

```

## 🔧 Installation Guide

### Step 1: Install CARLA Simulator

```bash

# Run from your home directory (recommended)

cd ~

# Download and install CARLA 0.9.15

curl -L -o CARLA_0.9.15.tar.gz https://tiny.carla.org/carla-0-9-15-linux

tar -xvzf CARLA_0.9.15.tar.gz

cd CARLA_0.9.15

# Install Python API dependencies

./ImportAssets.sh

```

### Step 2: Set up Python Environment

```bash

# Navigate to your project directory

cd /path/to/your/project

# Create and activate virtual environment

python3 -m venv carla_env

source carla_env/bin/activate

# Install Python requirements

pip install -r requirements.txt

```

**Required Python packages:**

- `carla` (comes with CARLA installation)

- `flask`, `flask-cors`

- `opencv-python`

- `numpy`

- `requests`

- `python-dotenv`

### Step 3: Audio Dataset Setup

The system requires an audio dataset for realistic sound simulation. Create the following directory structure:

```

backend/audio_dataset/

├── road_traffic_dataset/

├── car_crash_dataset/

├── glass_breaking_dataset/

├── Alert_sounds/

├── Emergency_sirens/

├── Human_Scream/

└── Environmental_Sounds/

```

**Supported audio formats:** `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`

## 🚀 Running the System

### Step 1: Start CARLA Simulator

```bash

# From CARLA installation directory

cd ~/CARLA_0.9.15

# High performance mode (recommended)

./CarlaUE4.sh -quality-level=Low -windowed -ResX=800 -ResY=600

# Or for better graphics (if system supports it)

./CarlaUE4.sh -windowed -ResX=1280 -ResY=720

```

### Step 2: Start the CARLA Bridge

```bash

# From your project directory

cd /path/to/your/project

source carla_env/bin/activate

# Standard mode (with cleanup)

python carla_bridge.py

# Debug mode (no cleanup)

python carla_bridge.py --no-cleanup

```

## 📡 API Documentation

The CARLA Bridge API runs on `http://localhost:5001`

### Health & Status

#### `GET /health`

Check system health and active vehicles.

**Response:**

```json
{
	"status": "healthy",

	"cars_connected": 3,

	"active_cars": ["CAR1000", "CAR1001", "CAR1002"]
}
```

### Vehicle Management

#### `GET /car-list`

Get list of all active vehicle IDs.

**Response:**

```json
["CAR1000", "CAR1001", "CAR1002"]
```

#### `POST /add-car`

Add a new vehicle to the simulation.

**Request:**

```json
{
	"car_id": "TESLA_001",

	"model": "vehicle.tesla.model3",

	"location": {
		"lat": 205.0,

		"lon": 15.0
	}
}
```

**Available Vehicle Models:**

- `vehicle.tesla.model3`

- `vehicle.audi.tt`

- `vehicle.bmw.grandtourer`

- `vehicle.chevrolet.impala`

- `vehicle.dodge.charger.police`

- `vehicle.ford.mustang`

- `vehicle.jeep.wrangler_rubber`

- `vehicle.lincoln.mkz2017`

- `vehicle.mercedes.coupe`

- `vehicle.mini.cooperst`

- `vehicle.nissan.micra`

- `vehicle.seat.leon`

- `vehicle.toyota.prius`

- `vehicle.volkswagen.t2`

#### `POST /remove-car/<car_id>`

Remove a vehicle from simulation.

### Real-time Data Streams

#### `GET /telemetry/<car_id>`

Get real-time vehicle telemetry data.

**Response:**

```json
{
	"car_id": "CAR1000",

	"telemetry": {
		"lat": 150.25,

		"lon": 5.89,

		"speed": 65.4,

		"timestamp": 1732066423.123
	}
}
```

#### `GET /video-stream/<car_id>`

First-person view video stream (MJPEG format).

**Usage:**

```html
<img src="http://localhost:5001/video-stream/CAR1000" />
```

#### `GET /video-stream-third-person/<car_id>`

Third-person view video stream (MJPEG format).

#### `GET /camera-positions`

Get all available camera streams.

**Response:**

```json
{
	"CAR1000": {
		"first_person": "/video-stream/CAR1000",

		"third_person": "/video-stream-third-person/CAR1000"
	}
}
```

## 🔊 Audio Processing System

### Audio Categories & Triggers

| Category      | Trigger Condition  | Sample Sources                            |
| ------------- | ------------------ | ----------------------------------------- |
| Idle          | Speed < 5 km/h     | road_traffic_dataset                      |
| Low Speed     | 5–30 km/h          | road_traffic_dataset                      |
| Medium Speed  | 30–70 km/h         | road_traffic_dataset                      |
| High Speed    | >70 km/h           | road_traffic_dataset                      |
| Braking       | Rapid deceleration | road_traffic_dataset                      |
| Collision     | Stuck >30 seconds  | car_crash_dataset, glass_breaking_dataset |
| Horn          | Manual trigger     | Alert_sounds                              |
| Siren         | Emergency vehicles | Emergency_sirens                          |
| Scream        | Pedestrian events  | Human_Scream                              |
| Environmental | Ambient sounds     | Environmental_Sounds                      |

### Audio Processing Flow

1\. **Speed-based categorization** every 10 seconds

2\. **Dataset lookup** with keyword matching

3\. **Fallback generation** if no audio files found

4\. **Upload to Express backend** for AI analysis

5\. **Automatic cleanup** of temporary files

## 🔧 Configuration

### Environment Variables

```python

EXPRESS_HTTP_URL = "http://localhost:5000"  # Backend API

CARLA_BRIDGE_PORT = 5001                    # Bridge server port

NUMBER_OF_CARS = 3                          # Default vehicle count

MIN_SPEED_FOR_AUDIO = 5.0                   # Minimum speed for audio processing

AUDIO_INTERVAL = 10.0                       # Audio processing interval (seconds)

```

### Audio Dataset Structure

The system searches for audio files in this priority:

1\. Category-specific folders (e.g., `road_traffic_dataset/`)

2\. Keyword matching in filenames

3\. Fallback synthetic audio generation

## 🛠️ Troubleshooting

### Common Issues

1\. **CARLA Connection Failed**

   ```bash

   # Check CARLA server is running

   netstat -tulpn | grep 2000

   ```

2\. **Audio Files Not Found**

   ```bash

   # Verify dataset structure

   find backend/audio_dataset -name "\*.wav" | head -10

   ```

3\. **Service Token Error**

   ```bash

   # Check environment variable

   echo $SERVICE_TOKEN

   ```

4\. **Performance Issues**

   ```bash

   # Use lower quality settings

   ./CarlaUE4.sh -quality-level=Low -windowed -ResX=640 -ResY=480

   ```

### Debug Mode

Run with `--no-cleanup` flag to preserve actors for inspection:

```bash

python carla_bridge.py --no-cleanup

```

```

## 🎯 Key Features

- **Real-time vehicle simulation** with autopilot

- **Dual camera streams** (first-person & third-person)

- **Intelligent audio processing** based on vehicle behavior

- **RESTful API** for external integration

- **Thread-safe operations** with proper cleanup

- **Extensible vehicle models** and spawn locations

- **Comprehensive telemetry** monitoring

This revised documentation reflects the current implementation with enhanced audio processing, better error handling, and more detailed configuration options.
```

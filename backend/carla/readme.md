## This only works on ubuntu

## Run installCarla.sh first.

which contains:

```bash
curl -L -o CARLA_0.9.15.tar.gz https://tiny.carla.org/carla-0-9-15-linux
tar -xvzf CARLA_0.9.15.tar.gz
```

## Might be a good idea to run them on ur home dir instead of here inside the project

## After it is installed, you can run

```bash

#  note that should run the installCarla.sh b4 running this.
./CarlaUE4.sh -windowed -ResX=1280 -ResY=720
#  lower resolution for not laggy
# ./CarlaUE4.sh -quality-level=Low -windowed -ResX=800 -ResY=600
```

## inside the folder where you installed the carla. CarlaUE4.sh is from Carla official within their zipped file.

## Then you can run the

```bash
./installPyReqnRunController.sh
```

## which will do all needed step like install py 3.7, create venv, install requirement.txt inside venv.

## Then u can just run

```bash
./runControlelr.sh
```

## to see the car and controll the car. Note that

```bash

#  note that should run the installCarla.sh b4 running this.
./CarlaUE4.sh -windowed -ResX=1280 -ResY=720
#  lower resolution for not laggy
# ./CarlaUE4.sh -quality-level=Low -windowed -ResX=800 -ResY=600
```

## must be running b4 you run the controller.

## This is just how to configure carla, still need to find out how to import audio files and things.

## Adjust the directory based on where u install carla accordingly.

## 📡 CARLA Bridge API Documentation

The `carla_bridge.py` script serves a Flask API for managing simulated CARLA vehicles. It runs on the base URL: `http://localhost:5001`.

### Configuration Details

| Parameter         | Value              | Description                                                              |
| ----------------- | ------------------ | ------------------------------------------------------------------------ |
| Bridge Port       | `5001`             | The port the Flask API is served on.                                     |
| CARLA Server Port | `2000`             | The port for the CARLA simulator connection (standard).                  |
| TM Port Range     | `8000+`            | Traffic Manager RPC ports are dynamically assigned starting from `8000`. |
| Number of Cars    | `3` (Configurable) | Default number of vehicle actors spawned.                                |
| CORS Enabled      | `Yes`              | Cross-Origin Resource Sharing enabled for all routes                     |

---

### GET /car-list 🚗

Retrieves a list of the unique IDs for all cars currently spawned and managed by the Python bridge server.

bash

CopyDownload

curl http://localhost:5001/car-list

Response:

json

CopyDownload

["CAR1000", "CAR1001", "CAR1002"]

---

### GET /telemetry/<car_id> 🛰️

Retrieves the latest real-time telemetry data (location and speed) for a specific car ID.

bash

CopyDownload

curl http://localhost:5001/telemetry/CAR1001

Response:

json

CopyDownload

{
"car_id": "CAR1001",
"telemetry": {
"lat": 150.25,
"lon": 5.89,
"speed": 65.4,
"timestamp": 1732066423.123
}
}

---

### GET /video-stream/<car_id> 🎥

Provides a continuous, live Motion JPEG (MJPEG) video stream from the RGB camera attached to the specified car.

bash

CopyDownload

# Use in HTML: <img src="http://localhost:5001/video-stream/CAR1002" />

Format: Motion JPEG (MJPEG)\
Resolution: 640x480

---

### GET /health 🩺

Provides health status and basic information about the CARLA bridge server.

bash

CopyDownload

curl http://localhost:5001/health

Response:

json

CopyDownload

{
"status": "healthy",
"cars_connected": 3,
"active_cars": ["CAR1000", "CAR1001", "CAR1002"]
}

---

### POST /add-car ➕

Manually adds a new car to the simulation with custom parameters including model selection and spawn location.

bash

CopyDownload

curl -X POST http://localhost:5001/add-car\
 -H "Content-Type: application/json"\
 -d '{
"car_id": "TESLA_001",
"model": "vehicle.tesla.model3",
"location": {
"lat": 205.0,
"lon": 15.0
}
}'

Available Vehicle Models:

- `vehicle.tesla.model3`

- `vehicle.audi.tt`

- `vehicle.bmw.grandtourer`

- `vehicle.chevrolet.impala`

- `vehicle.dodge.charger`

- `vehicle.ford.mustang`

- `vehicle.jeep.wrangler`

- `vehicle.lincoln.mkz`

- `vehicle.mercedes.coupe`

- `vehicle.mini.cooperst`

- `vehicle.nissan.micra`

- `vehicle.seat.leon`

- `vehicle.toyota.prius`

- `vehicle.volkswagen.t2`

Response:

json

CopyDownload

{
"message": "Car TESLA_001 added successfully",
"car_id": "TESLA_001",
"model": "vehicle.tesla.model3",
"tm_port": 8003
}

---

### POST /remove-car/<car_id> 🗑️

Removes a specific car from the simulation and cleans up its resources.

bash

CopyDownload

curl -X POST http://localhost:5001/remove-car/CAR1001

Response:

json

CopyDownload

{
"message": "Car CAR1001 removed successfully"
}

---

## 🖥️ Command Line Usage

### Standard Mode (Default)

Cleans up CARLA actors on crash or script exit.

bash

CopyDownload

python3 carla_bridge.py

### Debug Mode

Skips cleanup for manual inspection of vehicles.

bash

CopyDownload

python3 carla_bridge.py --no-cleanup

> ⚠️ Warning: If you use `--no-cleanup` and restart the script, the new cars may conflict with the old, remaining actors. You must manually destroy the old actors or restart the CARLA server application between runs.

---

## 🔧 Integration Example

### React Frontend Integration

javascript

CopyDownload

// Adding a new car
const addCar = async () => {
const response = await fetch('http://localhost:5001/add-car', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify({
car_id: 'MY_CAR_001',
model: 'vehicle.audi.tt',
location: {
lat: 210.5,
lon: 18.2
}
}),
});
const result = await response.json();
console.log(result.message);
};

// Removing a car
const removeCar = async (carId) => {
const response = await fetch(`http://localhost:5001/remove-car/${carId}`, {
method: 'POST',
});
const result = await response.json();
console.log(result.message);
};

### Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success

- `400` - Bad Request (missing/invalid parameters)

- `404` - Car not found

- `500` - Internal server error

Error responses include an `error` field with descriptive messages:

json

CopyDownload

{
"error": "Car ID is required"
}

---

## 📋 Notes

- CORS Support: All endpoints support Cross-Origin requests for web frontend integration

- Real-time Updates: Telemetry and video streams update in real-time (telemetry every second, video at ~20fps)

- Thread Safety: All car data access is protected by threading locks

- Automatic Cleanup: Vehicles automatically clean up on exit unless `--no-cleanup` flag is used

- Unique IDs: Car IDs must be unique across the simulation

- Coordinate System: Uses CARLA's coordinate system where X=longitude, Y=latitude

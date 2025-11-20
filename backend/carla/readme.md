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

The following documentation outlines the CARLA Bridge API (`carla_bridge.py`) and its command-line usage based on the fixed script.

---

## 📡 CARLA Bridge API Documentation

The `carla_bridge.py` script serves a Flask API for managing simulated CARLA vehicles. It runs on the base URL: `http://localhost:5001`.

### Configuration Details

| **Parameter**         | **Value**          | **Description**                                                          |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| **Bridge Port**       | `5001`             | The port the Flask API is served on.                                     |
| **CARLA Server Port** | `2000`             | The port for the CARLA simulator connection (standard).                  |
| **TM Port Range**     | `8000+`            | Traffic Manager RPC ports are dynamically assigned starting from `8000`. |
| **Number of Cars**    | `3` (Configurable) | Default number of vehicle actors spawned.                                |

---

### 1\. `GET /car-list` 🚗

Retrieves a list of the unique IDs for all cars currently spawned and managed by the Python bridge server.

| **Detail**   | **Value**   |
| ------------ | ----------- |
| **Method**   | `GET`       |
| **Endpoint** | `/car-list` |

#### Response Body (JSON)

Returns an array of car ID strings.

JSON

```
["CAR1000", "CAR1001", "CAR1002"]

```

---

### 2\. `GET /telemetry/<car_id>` 🛰️

Retrieves the latest real-time telemetry data (location and speed) for a specific car ID. Returns a **404 Not Found** if the car has crashed and been cleaned up, or if the ID is invalid.

| **Detail**   | **Value**                    |
| ------------ | ---------------------------- |
| **Method**   | `GET`                        |
| **Endpoint** | `/telemetry/<string:car_id>` |

#### Path Parameter

| **Name** | **Type** | **Description**                                 |
| -------- | -------- | ----------------------------------------------- |
| `car_id` | `string` | The unique ID of the vehicle (e.g., `CAR1001`). |

#### Response Body (JSON)

| **Field**             | **Type** | **Description**                                           |
| --------------------- | -------- | --------------------------------------------------------- |
| `car_id`              | `string` | The ID of the requested car.                              |
| `telemetry.lat`       | `number` | The vehicle's current **latitude** (CARLA Y-coordinate).  |
| `telemetry.lon`       | `number` | The vehicle's current **longitude** (CARLA X-coordinate). |
| `telemetry.speed`     | `number` | The vehicle's current speed in **km/h**.                  |
| `telemetry.timestamp` | `number` | Unix timestamp of when the data was collected.            |

JSON

```
{
    "car_id": "CAR1001",
    "telemetry": {
        "lat": 150.25,
        "lon": 5.89,
        "speed": 65.4,
        "timestamp": 1732066423.123
    }
}

```

---

### 3\. `GET /video-stream/<car_id>` 🎥

Provides a continuous, live Motion JPEG (MJPEG) video stream from the RGB camera attached to the specified car. Returns a **404 Not Found** if the car is not active.

| **Detail**       | **Value**                                   |
| ---------------- | ------------------------------------------- |
| **Method**       | `GET`                                       |
| **Endpoint**     | `/video-stream/<string:car_id>`             |
| **Content Type** | `multipart/x-mixed-replace; boundary=frame` |

#### Usage Notes

- **Format:** Motion JPEG (MJPEG) for direct streaming.

- **Resolution:** 640x480.

- **Example HTML Usage:** `<img src="http://localhost:5001/video-stream/CAR1002" />`

---

## 🖥️ Command Line Usage

The script supports a command-line argument to control the cleanup behavior of CARLA actors (vehicles and sensors) when the Python thread exits (e.g., due to a crash or `CTRL+C`).

### 1\. Standard Mode (Default)

This mode **cleans up (destroys) the CARLA actors** on crash or script exit. This is the recommended mode for production/stable environments.

Bash

```
python3 carla_bridge.py

```

### 2\. Debug Mode (`--no-cleanup`)

This mode **skips cleanup**, leaving the car and its sensors in the CARLA simulation world at their final location for manual inspection. This is useful for debugging physics or crash locations.

Bash

```
python3 carla_bridge.py --no-cleanup

```

> ⚠️ **Warning:** If you use `--no-cleanup` and restart the script, the new cars may conflict with the old, remaining actors. You must manually destroy the old actors or restart the CARLA server application between runs.

#!/usr/bin/env python

import carla
import random
import time
import cv2
import numpy as np
import requests
import os
import threading
from flask import Flask, jsonify, Response, abort 
import argparse 

# --- CONFIGURATION ---
EXPRESS_HTTP_URL = "http://localhost:5000"
CARLA_BRIDGE_PORT = 5001
AUDIO_FILE_PATH = "your_dataset/acceleration_sound.mp3" 
NUMBER_OF_CARS = 3 
CAR_ID_PREFIX = "CAR"
TM_PORT_BASE = 8000 # Base port for Traffic Manager ports

# Global flag set by command line arguments (Default is to clean up)
CLEANUP_ON_EXIT = True 

# Global data structure to hold all car information
car_agents = {} 

# Flask Application Initialization
app = Flask(__name__)

# --- CARLA HELPER FUNCTIONS (Simplified for space) ---

def upload_audio_to_express(car_id, audio_path=AUDIO_FILE_PATH):
    if not os.path.exists(audio_path):
        return
    try:
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        files = {'audio_file': (f'{car_id}_event.mp3', audio_bytes, 'audio/mp3')}
        requests.post(f"{EXPRESS_HTTP_URL}/audio-upload", files=files, data={'car_id': car_id}, timeout=5)
    except Exception as e:
        print(f"ERROR: [{car_id}] Could not connect to Express backend for audio upload: {e}")

def camera_callback(image, car_id, car_data):
    img_data = np.array(image.raw_data).reshape((image.height, image.width, 4))
    img_bgr = img_data[:, :, :3]
    ret, jpeg = cv2.imencode('.jpeg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
    if ret:
        with car_data['lock']:
            car_data['video_frame'] = jpeg.tobytes()

def update_telemetry_data(car_id, car_data):
    vehicle = car_data['vehicle']
    transform = vehicle.get_transform()
    velocity = vehicle.get_velocity()
    speed = 3.6 * (velocity.x**2 + velocity.y**2 + velocity.z**2)**0.5
    with car_data['lock']:
        car_data['telemetry'].update({
            "lat": transform.location.y, 
            "lon": transform.location.x,
            "speed": round(speed, 2),
            "timestamp": time.time()
        })


def carla_simulation_thread(car_id, spawn_point, tm_port):
    """Connects to CARLA, sets up actors for a single car, and runs its simulation loop."""
    
    vehicle = None
    camera = None
    try:
        client = carla.Client('localhost', 2000)
        client.set_timeout(10.0)
        world = client.get_world()
        bp_library = world.get_blueprint_library() 
        
        # --- Removed: tm = client.get_trafficmanager(tm_port) ---
        
        # --- Setup Vehicle ---
        vehicle_bp = random.choice(bp_library.filter('vehicle.tesla.model3'))
        
        vehicle = world.try_spawn_actor(vehicle_bp, spawn_point)
        if vehicle is None:
            print(f"FATAL ERROR: [{car_id}] Failed to spawn vehicle. Exiting thread.")
            return

        # --- FIX: Use vehicle.set_autopilot with the port argument ---
        # This tells the carla.Vehicle object to use the TM instance on the specified port.
        vehicle.set_autopilot(True, tm_port) 
        print(f"INFO: [{car_id}] Vehicle spawned and set to Autopilot on TM port {tm_port}.")

        # --- Setup Camera Sensor ---
        camera_bp = bp_library.find('sensor.camera.rgb')
        camera_bp.set_attribute('image_size_x', '640')
        camera_bp.set_attribute('image_size_y', '480')
        camera_transform = carla.Transform(carla.Location(x=1.5, z=2.4))
        camera = world.spawn_actor(camera_bp, camera_transform, attach_to=vehicle)
        
        # Initialize the global data store for this car
        car_agents[car_id] = {
            'vehicle': vehicle,
            'camera': camera,
            'telemetry': {'lat': 0.0, 'lon': 0.0, 'speed': 0.0, 'timestamp': time.time()},
            'video_frame': None,
            'lock': threading.Lock()
        }
        car_data = car_agents[car_id]
        camera.listen(lambda image: camera_callback(image, car_id, car_data))

        # --- Main Simulation Loop ---
        last_audio_time = time.time()
        while True:
            update_telemetry_data(car_id, car_data) 
            if time.time() - last_audio_time > 10: 
                upload_audio_to_express(car_id) 
                last_audio_time = time.time()
            time.sleep(0.01)

    except KeyboardInterrupt:
        print(f"\nINFO: [{car_id}] Simulation interrupted by user.")
    except Exception as e:
        print(f"FATAL ERROR in [{car_id}] CARLA thread: {e}")
    finally:
        # Cleanup
        print(f"INFO: [{car_id}] Cleaning up actors...")
        
        if car_id in car_agents:
            del car_agents[car_id]
        
        if CLEANUP_ON_EXIT:
            # Explicitly disable autopilot before destroying vehicle (good practice)
            if vehicle is not None and vehicle.is_alive:
                 vehicle.set_autopilot(False) # Disable autopilot cleanly
            
            if camera is not None and camera.is_alive: camera.destroy()
            if vehicle is not None and vehicle.is_alive: vehicle.destroy()
            print(f"INFO: [{car_id}] Cleanup complete.")
        else:
            print(f"INFO: [{car_id}] Cleanup skipped. Actor remains in world for inspection.")


# --- FLASK API ENDPOINTS (omitted for brevity) ---

@app.route('/telemetry/<string:car_id>', methods=['GET'])
def get_telemetry(car_id):
    if car_id not in car_agents:
        abort(404, description=f"Car ID {car_id} not found.")
    car_data = car_agents[car_id]
    with car_data['lock']:
        return jsonify({
            "car_id": car_id,
            "telemetry": car_data['telemetry']
        })

@app.route('/video-stream/<string:car_id>', methods=['GET'])
def video_feed(car_id):
    if car_id not in car_agents:
        abort(404, description=f"Car ID {car_id} not found.")
    car_data = car_agents[car_id]
    def generate_video_stream():
        while True:
            with car_data['lock']:
                frame = car_data['video_frame']
            if frame is not None:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.05)
    return Response(generate_video_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/car-list', methods=['GET'])
def get_car_list():
    return jsonify(list(car_agents.keys()))


# --- MAIN EXECUTION ---

if __name__ == '__main__':
    # Argument Parsing
    parser = argparse.ArgumentParser(description='CARLA Python Bridge Server.')
    parser.add_argument(
        '--no-cleanup',
        action='store_true',
        help='If set, actors (vehicles/sensors) will NOT be destroyed on thread exit or crash. Useful for debugging.'
    )
    args = parser.parse_args()

    # Assignment to module-level variable
    CLEANUP_ON_EXIT = not args.no_cleanup
    
    if not CLEANUP_ON_EXIT:
        print("\n\n⚠️ WARNING: ACTOR CLEANUP DISABLED. Actors will remain in CARLA world after thread exit. You must clean them up manually later.")

    threads = []
    
    try:
        client = carla.Client('localhost', 2000)
        client.set_timeout(10.0)
        world = client.get_world()
        
        spawn_points = world.get_map().get_spawn_points()
        random.shuffle(spawn_points) 
        
        if len(spawn_points) < NUMBER_OF_CARS:
            print(f"WARNING: Only {len(spawn_points)} spawn points available, reducing cars to match.")
            num_to_spawn = len(spawn_points)
        else:
            num_to_spawn = NUMBER_OF_CARS

        for i in range(num_to_spawn):
            car_id = f"{CAR_ID_PREFIX}{1000 + i}"
            spawn_point = spawn_points[i]
            tm_port = TM_PORT_BASE + i # Calculate unique TM port for this car

            print(f"INFO: Initializing car thread for {car_id} on TM Port {tm_port}...")
            
            carla_thread = threading.Thread(
                target=carla_simulation_thread, 
                args=(car_id, spawn_point, tm_port),
                name=f"CarlaThread-{car_id}"
            )
            carla_thread.start()
            threads.append(carla_thread)
            time.sleep(1.0) 

        print(f"INFO: Starting Python Bridge API on http://localhost:{CARLA_BRIDGE_PORT}")
        app.run(host='0.0.0.0', port=CARLA_BRIDGE_PORT, debug=False, use_reloader=False)

    except Exception as e:
        print(f"FATAL ERROR during startup: {e}")
    finally:
        print("INFO: Waiting for all car threads to shut down...")
        for t in threads:
            t.join() 
        print("INFO: Python Bridge shut down.")
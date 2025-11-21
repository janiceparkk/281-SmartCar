#!/usr/bin/env python

import carla
import random
import time
import cv2
import numpy as np
import requests
import os
import threading
from flask import Flask, jsonify, Response, abort, request
from flask_cors import CORS
import argparse
import tempfile
import wave
import struct 

# --- CONFIGURATION ---
EXPRESS_HTTP_URL = "http://localhost:5000"
CARLA_BRIDGE_PORT = 5001
AUDIO_DATASET_PATH = os.getenv("AUDIO_DATASET_PATH", "backend/audio_dataset")  # Path to audio dataset directory
NUMBER_OF_CARS = 3 
CAR_ID_PREFIX = "CAR"
TM_PORT_BASE = 8000 # Base port for Traffic Manager ports
SERVICE_TOKEN = os.getenv("SERVICE_TOKEN", "carla-bridge-service-token")  # Service token for API auth
MIN_SPEED_FOR_AUDIO = 5.0  # Minimum speed (km/h) to trigger audio processing
AUDIO_INTERVAL = 10.0  # Interval in seconds between audio uploads when car is moving

# Audio file categories mapped to dataset folder names
# Maps internal categories to actual dataset folder names from Google Drive
AUDIO_CATEGORY_FOLDERS = {
    'idle': [],  # No specific folder, will search in road_traffic_dataset
    'low_speed': ['road_traffic_dataset'],
    'medium_speed': ['road_traffic_dataset'],
    'high_speed': ['road_traffic_dataset'],
    'braking': ['road_traffic_dataset'],
    'collision': ['car_crash_dataset', 'glass_breaking_dataset'],
    'horn': ['Alert_sounds'],
    'siren': ['Emergency_sirens'],
    'scream': ['Human_Scream'],  # Can be used for collision scenarios
    'environmental': ['Environmental_Sounds'],
}

# Fallback keywords for filename matching if folder-based search fails
AUDIO_CATEGORY_KEYWORDS = {
    'idle': ['idle', 'stationary', 'engine_idle'],
    'low_speed': ['acceleration', 'low_speed', 'city', 'traffic', 'urban'],
    'medium_speed': ['cruising', 'highway', 'medium_speed', 'road'],
    'high_speed': ['high_speed', 'fast', 'racing', 'speed'],
    'braking': ['braking', 'deceleration', 'stop', 'brake'],
    'collision': ['crash', 'collision', 'accident', 'break', 'glass'],
    'horn': ['horn', 'beep', 'honk', 'alert'],
    'siren': ['siren', 'emergency', 'ambulance', 'police', 'fire'],
    'scream': ['scream', 'human', 'yell', 'shout'],
    'environmental': ['environment', 'ambient', 'background'],
}

# Global flag set by command line arguments (Default is to clean up)
CLEANUP_ON_EXIT = True 

# Global data structure to hold all car information
car_agents = {} 

# Flask Application Initialization
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- CARLA HELPER FUNCTIONS ---

def get_audio_category_from_speed(speed_kmh, previous_speed=0.0):
    """
    Determine audio category based on car speed and state.
    Returns a category string that matches AUDIO_CATEGORY_FOLDERS keys.
    For normal driving, returns speed-based categories that map to road_traffic_dataset.
    """
    speed_diff = speed_kmh - previous_speed
    
    # Check for braking (significant negative speed change)
    if speed_diff < -10:
        return 'braking'
    
    # Categorize by speed (all map to road_traffic_dataset folder)
    if speed_kmh < 5:
        return 'idle'  # Will search in road_traffic_dataset or use keywords
    elif speed_kmh < 30:
        return 'low_speed'  # Maps to road_traffic_dataset
    elif speed_kmh < 70:
        return 'medium_speed'  # Maps to road_traffic_dataset
    else:
        return 'high_speed'  # Maps to road_traffic_dataset

def find_audio_file_from_dataset(category):
    """
    Find an audio file from the dataset based on category.
    First tries to find files in category-specific folders, then falls back to keyword matching.
    Returns path to audio file or None if not found.
    """
    if not os.path.exists(AUDIO_DATASET_PATH):
        print(f"WARNING: Audio dataset path does not exist: {AUDIO_DATASET_PATH}")
        return None
    
    # Supported audio file extensions
    audio_extensions = ['.wav', '.mp3', '.m4a', '.flac', '.ogg']
    
    matching_files = []
    
    # Strategy 1: Look in category-specific folders first
    category_folders = AUDIO_CATEGORY_FOLDERS.get(category, [])
    if category_folders:
        for folder_name in category_folders:
            folder_path = os.path.join(AUDIO_DATASET_PATH, folder_name)
            if os.path.exists(folder_path) and os.path.isdir(folder_path):
                # Search in this specific folder
                for root, dirs, files in os.walk(folder_path):
                    for file in files:
                        file_lower = file.lower()
                        if any(file_lower.endswith(ext) for ext in audio_extensions):
                            matching_files.append(os.path.join(root, file))
    
    # Strategy 2: If no files found in category folders, try keyword matching in all folders
    if not matching_files:
        keywords = AUDIO_CATEGORY_KEYWORDS.get(category, [])
        if keywords:
            for root, dirs, files in os.walk(AUDIO_DATASET_PATH):
                for file in files:
                    file_lower = file.lower()
                    # Check if file has audio extension
                    if any(file_lower.endswith(ext) for ext in audio_extensions):
                        # Check if filename contains any category keyword
                        for keyword in keywords:
                            if keyword.lower() in file_lower:
                                matching_files.append(os.path.join(root, file))
                                break
    
    # Return random file from matches, or None if no matches
    if matching_files:
        selected_file = random.choice(matching_files)
        print(f"DEBUG: Found {len(matching_files)} audio files for category '{category}', selected: {os.path.basename(selected_file)}")
        return selected_file
    
    print(f"WARNING: No audio files found for category '{category}' in dataset path: {AUDIO_DATASET_PATH}")
    return None

def generate_audio_from_speed(speed_kmh, duration=2.0, sample_rate=16000):
    """
    Generate a simple audio signal based on car speed (FALLBACK ONLY).
    Creates a tone that varies with speed to simulate engine/road noise.
    Only used if no audio files are found in the dataset.
    """
    # Create a temporary WAV file
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
    temp_path = temp_file.name
    temp_file.close()
    
    try:
        # Generate audio samples
        num_samples = int(sample_rate * duration)
        # Frequency varies with speed (200-800 Hz range)
        base_freq = 200 + (speed_kmh / 100.0) * 600
        # Amplitude varies with speed
        amplitude = 0.3 + min(speed_kmh / 100.0, 0.7)
        
        with wave.open(temp_path, 'w') as wav_file:
            wav_file.setnchannels(1)  # Mono
            wav_file.setsampwidth(2)   # 16-bit
            wav_file.setframerate(sample_rate)
            
            for i in range(num_samples):
                # Generate a mix of frequencies to simulate engine noise
                t = float(i) / sample_rate
                # Main frequency (engine)
                value1 = amplitude * np.sin(2 * np.pi * base_freq * t)
                # Higher harmonics (road noise)
                value2 = 0.3 * amplitude * np.sin(2 * np.pi * base_freq * 2 * t)
                value3 = 0.2 * amplitude * np.sin(2 * np.pi * base_freq * 3 * t)
                # Add some noise
                noise = 0.1 * amplitude * (random.random() - 0.5)
                
                sample = value1 + value2 + value3 + noise
                # Clamp to valid range
                sample = max(-1.0, min(1.0, sample))
                # Convert to 16-bit integer
                sample_int = int(sample * 32767)
                wav_file.writeframes(struct.pack('<h', sample_int))
        
        return temp_path
    except Exception as e:
        print(f"ERROR: Failed to generate audio: {e}")
        if os.path.exists(temp_path):
            os.unlink(temp_path)
        return None

def upload_audio_to_express(car_id, speed_kmh=0.0, previous_speed=0.0):
    """
    Select audio file from dataset based on car state and upload to Express backend for processing.
    Only processes audio if car is moving above threshold speed.
    """
    if speed_kmh < MIN_SPEED_FOR_AUDIO:
        return  # Don't process audio for stationary or very slow cars
    
    audio_path = None
    is_temp_file = False  # Track if we created a temporary file
    
    try:
        # Determine audio category based on speed and state
        category = get_audio_category_from_speed(speed_kmh, previous_speed)
        
        # Try to find audio file from dataset
        audio_path = find_audio_file_from_dataset(category)
        
        if audio_path:
            print(f"INFO: [{car_id}] Using dataset audio file: {os.path.basename(audio_path)} (category: {category})")
        else:
            # Fallback: Generate audio if no dataset files found
            print(f"WARNING: [{car_id}] No dataset audio found for category '{category}', generating fallback audio")
            audio_path = generate_audio_from_speed(speed_kmh)
            is_temp_file = True
            if not audio_path:
                print(f"ERROR: [{car_id}] Could not generate fallback audio file")
                return
        
        # Determine MIME type based on file extension
        file_ext = os.path.splitext(audio_path)[1].lower()
        mime_types = {
            '.wav': 'audio/wav',
            '.mp3': 'audio/mpeg',
            '.m4a': 'audio/mp4',
            '.flac': 'audio/flac',
            '.ogg': 'audio/ogg'
        }
        mime_type = mime_types.get(file_ext, 'audio/wav')
        
        # Upload to Express backend
        with open(audio_path, 'rb') as f:
            audio_bytes = f.read()
        
        filename = f'{car_id}_event{file_ext}'
        files = {'audio': (filename, audio_bytes, mime_type)}
        headers = {'X-Service-Token': SERVICE_TOKEN}
        data = {'carId': car_id}
        
        response = requests.post(
            f"{EXPRESS_HTTP_URL}/api/ai/process-audio",
            files=files,
            data=data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            analysis = result.get('analysis', {})
            print(f"INFO: [{car_id}] Audio processed successfully. Prediction: {analysis.get('prediction', 'N/A')}, Confidence: {analysis.get('confidence', 0):.2f}")
        else:
            print(f"WARNING: [{car_id}] Audio processing returned status {response.status_code}: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"ERROR: [{car_id}] Could not connect to Express backend for audio upload: {e}")
    except Exception as e:
        print(f"ERROR: [{car_id}] Error processing audio: {e}")
    finally:
        # Clean up temporary file if we generated one
        if is_temp_file and audio_path and os.path.exists(audio_path):
            try:
                os.unlink(audio_path)
            except Exception as e:
                print(f"WARNING: [{car_id}] Failed to delete temporary audio file: {e}")

def camera_callback(image, car_id, car_data, camera_type):
    img_data = np.array(image.raw_data).reshape((image.height, image.width, 4))
    img_bgr = img_data[:, :, :3]
    ret, jpeg = cv2.imencode('.jpeg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
    if ret:
        with car_data['lock']:
            if camera_type == 'first_person':
                car_data['first_person_frame'] = jpeg.tobytes()
            elif camera_type == 'third_person':
                car_data['third_person_frame'] = jpeg.tobytes()

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

def carla_simulation_thread(car_id, spawn_point, tm_port, model='vehicle.tesla.model3'):
    """Connects to CARLA, sets up actors for a single car, and runs its simulation loop."""
    
    vehicle = None
    first_person_camera = None
    third_person_camera = None
    
    try:
        client = carla.Client('localhost', 2000)
        client.set_timeout(10.0)
        world = client.get_world()
        bp_library = world.get_blueprint_library() 
        
        # --- Setup Vehicle ---
        vehicle_bp = bp_library.find(model)
        if not vehicle_bp:
            print(f"WARNING: [{car_id}] Model {model} not found, using Tesla Model 3 as fallback")
            vehicle_bp = random.choice(bp_library.filter('vehicle.tesla.model3'))
        
        vehicle = world.try_spawn_actor(vehicle_bp, spawn_point)
        if vehicle is None:
            print(f"FATAL ERROR: [{car_id}] Failed to spawn vehicle. Exiting thread.")
            return

        # Set autopilot with TM port
        vehicle.set_autopilot(True, tm_port) 
        print(f"INFO: [{car_id}] Vehicle spawned and set to Autopilot on TM port {tm_port}.")

        # --- Setup First Person Camera (Dashboard View) ---
        first_person_camera_bp = bp_library.find('sensor.camera.rgb')
        first_person_camera_bp.set_attribute('image_size_x', '640')
        first_person_camera_bp.set_attribute('image_size_y', '480')
        first_person_transform = carla.Transform(carla.Location(x=1.5, z=2.4))
        first_person_camera = world.spawn_actor(
            first_person_camera_bp, 
            first_person_transform, 
            attach_to=vehicle
        )
        
        # --- Setup Third Person Camera (Behind and Above the Car) ---
        third_person_camera_bp = bp_library.find('sensor.camera.rgb')
        third_person_camera_bp.set_attribute('image_size_x', '640')
        third_person_camera_bp.set_attribute('image_size_y', '480')
        # Position camera behind and above the vehicle for third-person view
        third_person_transform = carla.Transform(
            carla.Location(x=-6.0, z=4.0),  # 6 meters behind, 4 meters above
            carla.Rotation(pitch=-15.0)     # Slightly looking down
        )
        third_person_camera = world.spawn_actor(
            third_person_camera_bp, 
            third_person_transform, 
            attach_to=vehicle  # This camera will follow the vehicle
        )
        
        # Initialize the global data store for this car
        car_agents[car_id] = {
            'vehicle': vehicle,
            'first_person_camera': first_person_camera,
            'third_person_camera': third_person_camera,
            'telemetry': {'lat': 0.0, 'lon': 0.0, 'speed': 0.0, 'timestamp': time.time()},
            'first_person_frame': None,
            'third_person_frame': None,
            'lock': threading.Lock()
        }
        car_data = car_agents[car_id]
        
        # Start listening to both cameras
        first_person_camera.listen(
            lambda image: camera_callback(image, car_id, car_data, 'first_person')
        )
        third_person_camera.listen(
            lambda image: camera_callback(image, car_id, car_data, 'third_person')
        )

        # --- Main Simulation Loop ---
        last_audio_time = time.time()
        while True:
            update_telemetry_data(car_id, car_data)
            
            # Get current and previous speed from telemetry
            with car_data['lock']:
                current_speed = car_data['telemetry'].get('speed', 0.0)
                previous_speed = car_data.get('previous_speed', 0.0)
            
            # Only process audio if car is moving and enough time has passed
            if current_speed >= MIN_SPEED_FOR_AUDIO:
                if time.time() - last_audio_time >= AUDIO_INTERVAL:
                    upload_audio_to_express(car_id, current_speed, previous_speed)
                    # Update previous speed after processing
                    with car_data['lock']:
                        car_data['previous_speed'] = current_speed
                    last_audio_time = time.time()
            else:
                # Reset previous speed when car stops
                with car_data['lock']:
                    car_data['previous_speed'] = 0.0
            
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
            # Explicitly disable autopilot before destroying vehicle
            if vehicle is not None and vehicle.is_alive:
                 vehicle.set_autopilot(False)
            
            if first_person_camera is not None and first_person_camera.is_alive: 
                first_person_camera.destroy()
            if third_person_camera is not None and third_person_camera.is_alive: 
                third_person_camera.destroy()
            if vehicle is not None and vehicle.is_alive: 
                vehicle.destroy()
            print(f"INFO: [{car_id}] Cleanup complete.")
        else:
            print(f"INFO: [{car_id}] Cleanup skipped. Actor remains in world for inspection.")


# --- FLASK API ENDPOINTS ---

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
def video_feed_first_person(car_id):
    """First person/dashboard view"""
    if car_id not in car_agents:
        abort(404, description=f"Car ID {car_id} not found.")
    car_data = car_agents[car_id]
    
    def generate_video_stream():
        while True:
            with car_data['lock']:
                frame = car_data['first_person_frame']
            if frame is not None:
                yield (b'--frame\r\n' 
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.05)
    
    return Response(
        generate_video_stream(), 
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/video-stream-third-person/<string:car_id>', methods=['GET'])
def video_feed_third_person(car_id):
    """Third person/external view of the car"""
    if car_id not in car_agents:
        abort(404, description=f"Car ID {car_id} not found.")
    car_data = car_agents[car_id]
    
    def generate_video_stream():
        while True:
            with car_data['lock']:
                frame = car_data['third_person_frame']
            if frame is not None:
                yield (b'--frame\r\n' 
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.05)
    
    return Response(
        generate_video_stream(), 
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/car-list', methods=['GET'])
def get_car_list():
    return jsonify(list(car_agents.keys()))

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy", 
        "cars_connected": len(car_agents),
        "active_cars": list(car_agents.keys())
    })

# Add car manually endpoint
@app.route('/add-car', methods=['POST'])
def add_car_manual():
    """Manually add a car with custom parameters"""
    try:
        data = request.get_json()
        car_id = data.get('car_id')
        model = data.get('model', 'vehicle.tesla.model3')
        location = data.get('location', {})
        
        if not car_id:
            return jsonify({"error": "Car ID is required"}), 400

        client = carla.Client('localhost', 2000)
        client.set_timeout(10.0)
        world = client.get_world()
        bp_library = world.get_blueprint_library()
        
        # Get vehicle blueprint
        vehicle_bp = bp_library.find(model)
        if not vehicle_bp:
            return jsonify({"error": f"Model {model} not found"}), 400
        
        # Determine spawn point
        if location.get('lat') is not None and location.get('lon') is not None:
            # Use custom location
            spawn_point = carla.Transform(
                carla.Location(x=float(location['lon']), y=float(location['lat']), z=0.5),
                carla.Rotation()
            )
        else:
            # Use random spawn point
            spawn_points = world.get_map().get_spawn_points()
            if not spawn_points:
                return jsonify({"error": "No spawn points available"}), 400
            spawn_point = random.choice(spawn_points)
        
        tm_port = TM_PORT_BASE + len(car_agents)
        
        # Start simulation thread for the new car
        carla_thread = threading.Thread(
            target=carla_simulation_thread, 
            args=(car_id, spawn_point, tm_port, model),
            name=f"CarlaThread-{car_id}"
        )
        carla_thread.start()
        
        # Wait a moment for the car to initialize
        time.sleep(1.0)
        
        return jsonify({
            "message": f"Car {car_id} added successfully",
            "car_id": car_id,
            "model": model,
            "tm_port": tm_port
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to add car: {str(e)}"}), 500

@app.route('/remove-car/<string:car_id>', methods=['POST'])
def remove_car(car_id):
    """Remove a car manually"""
    if car_id not in car_agents:
        return jsonify({"error": f"Car {car_id} not found"}), 404
        
    car_data = car_agents[car_id]
    
    # Cleanup actors
    if CLEANUP_ON_EXIT:
        if car_data['first_person_camera'] and car_data['first_person_camera'].is_alive:
            car_data['first_person_camera'].destroy()
        if car_data['third_person_camera'] and car_data['third_person_camera'].is_alive:
            car_data['third_person_camera'].destroy()
        if car_data['vehicle'] and car_data['vehicle'].is_alive:
            car_data['vehicle'].set_autopilot(False)
            car_data['vehicle'].destroy()
    
    # Remove from tracking
    del car_agents[car_id]
    
    return jsonify({"message": f"Car {car_id} removed successfully"})

@app.route('/camera-positions', methods=['GET'])
def get_camera_positions():
    """Get available camera views for each car"""
    camera_info = {}
    for car_id, car_data in car_agents.items():
        camera_info[car_id] = {
            "first_person": "/video-stream/" + car_id,
            "third_person": "/video-stream-third-person/" + car_id
        }
    return jsonify(camera_info)


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
            tm_port = TM_PORT_BASE + i

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
        print(f"INFO: Available endpoints:")
        print(f"  - First person view: /video-stream/<car_id>")
        print(f"  - Third person view: /video-stream-third-person/<car_id>")
        print(f"  - Camera positions: /camera-positions")
        print(f"INFO: CORS enabled for all routes")
        app.run(host='0.0.0.0', port=CARLA_BRIDGE_PORT, debug=True, use_reloader=True)

    except Exception as e:
        print(f"FATAL ERROR during startup: {e}")
    finally:
        print("INFO: Waiting for all car threads to shut down...")
        for t in threads:
            t.join() 
        print("INFO: Python Bridge shut down.")
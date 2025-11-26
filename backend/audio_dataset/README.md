# Audio Dataset Directory

This directory should contain the audio datasets downloaded from the Google Drive folder.

## Expected Folder Structure

After downloading from [Google Drive](https://drive.google.com/drive/u/1/folders/1nwzjJeujAiiklnoXSmim3zmhTkGKTHsf), your directory should look like:

```
backend/audio_dataset/
├── Emergency_sirens/
│   ├── ambulance11.wav
│   ├── ambulance12.wav
│   ├── ambulance21.wav
│   └── ...
├── Alert_sounds/
│   └── ...
├── Human_Scream/
│   └── ...
├── glass_breaking_dataset/
│   └── ...
├── road_traffic_dataset/
│   └── ...
├── car_crash_dataset/
│   └── ...
└── Environmental_Sounds/
    └── ...
```

## Category Mapping

The system automatically maps car states to dataset folders:

| Car State      | Dataset Folder(s)                             | Description                  |
| -------------- | --------------------------------------------- | ---------------------------- |
| `low_speed`    | `road_traffic_dataset`                        | City driving (5-30 km/h)     |
| `medium_speed` | `road_traffic_dataset`                        | Highway driving (30-70 km/h) |
| `high_speed`   | `road_traffic_dataset`                        | Fast driving (70+ km/h)      |
| `braking`      | `road_traffic_dataset`                        | Deceleration detected        |
| `collision`    | `car_crash_dataset`, `glass_breaking_dataset` | Crash/accident scenarios     |
| `horn`         | `Alert_sounds`                                | Horn/beep sounds             |
| `siren`        | `Emergency_sirens`                            | Emergency vehicle sirens     |

## Supported Audio Formats

- `.wav` (recommended for best compatibility)
- `.mp3`
- `.m4a`
- `.flac`
- `.ogg`

## Configuration

Set the dataset path in your environment or `.env` file:

```env
AUDIO_DATASET_PATH=backend/audio_dataset
```

Or modify the default in `carla_bridge.py`:

```python
AUDIO_DATASET_PATH = os.getenv("AUDIO_DATASET_PATH", "backend/audio_dataset")
```

## How It Works

1. **Folder-based search**: The system first looks in category-specific folders (e.g., `Emergency_sirens` for siren category)

2. **Keyword fallback**: If no files found in folders, it searches all folders for files with matching keywords in filenames

3. **Random selection**: When multiple files match, a random one is selected for variety

4. **API processing**: Selected audio files are uploaded to `/api/ai/process-audio` for ML analysis

5. **Alert generation**: If the ML model detects an event with high confidence (≥0.7), an alert is automatically created

## Notes

- The system recursively searches subdirectories within each folder
- All audio files in matching folders are considered (no need for specific naming)
- If no dataset files are found, the system falls back to generating synthetic audio
- The `process-audio` API endpoint handles the ML analysis and alert creation automatically

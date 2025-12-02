import os
import sys
import json
import argparse
import numpy as np
import torch
import torch.nn as nn
import librosa
import warnings
from transformers import ClapProcessor, ClapModel


# Suppress warnings from librosa and transformers
warnings.filterwarnings('ignore', category=UserWarning, module='librosa')
warnings.filterwarnings('ignore', category=FutureWarning, module='transformers')

# enable GPU
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# --- CRNN for Accident Detection ---

class AudioCRNN(nn.Module):
    def __init__(self, num_classes=3):
        super(AudioCRNN, self).__init__()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, stride=1, padding=1)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, stride=1, padding=1)
        self.conv3 = nn.Conv2d(32, 64, kernel_size=3, stride=1, padding=1)
        self.pool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.relu = nn.ReLU()
        self.bn1 = nn.BatchNorm2d(16)
        self.bn2 = nn.BatchNorm2d(32)
        self.bn3 = nn.BatchNorm2d(64)
        self.gru = nn.GRU(input_size=64 * 16, hidden_size=128, num_layers=1, batch_first=True)
        self.fc1 = nn.Linear(128, 128)
        self.fc2 = nn.Linear(128, num_classes)
        self.dropout = nn.Dropout(0.5)

    def forward(self, x):
        x = self.pool(self.relu(self.bn1(self.conv1(x))))
        x = self.pool(self.relu(self.bn2(self.conv2(x))))
        x = self.pool(self.relu(self.bn3(self.conv3(x))))
        batch, channels, height, width = x.size()
        x = x.permute(0, 3, 1, 2).contiguous()
        x = x.view(batch, width, channels * height)
        x, _ = self.gru(x)
        x = x[:, -1, :]
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        x = self.fc2(x)
        return x


def audio_to_melspec(audio_path, sr=16000, n_mels=128, n_fft=2048, hop_length=512, fixed_length=128):
    try:
        audio, _ = librosa.load(audio_path, sr=sr, duration=2.0)
        if len(audio) == 0:
            return None
    except Exception:
        return None

    mel_spec = librosa.feature.melspectrogram(y=audio, sr=sr, n_mels=n_mels, n_fft=n_fft, hop_length=hop_length)
    mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

    if mel_spec_db.shape[1] > fixed_length:
        mel_spec_db = mel_spec_db[:, :fixed_length]
    else:
        mel_spec_db = np.pad(mel_spec_db, ((0, 0), (0, fixed_length - mel_spec_db.shape[1])), mode='constant')

    min_val, max_val = np.min(mel_spec_db), np.max(mel_spec_db)
    range_val = max_val - min_val
    if range_val == 0 or np.isnan(range_val):
        return np.zeros_like(mel_spec_db)
    else:
        mel_spec_db = (mel_spec_db - min_val) / range_val
    return mel_spec_db


def predict_crnn(model_path, audio_path):
    class_map = {0: 'glass_break', 1: 'traffic', 2: 'car_crash'}
    model = AudioCRNN(num_classes=3).to(DEVICE)
    try:
        # Load model state dict, ensuring it's loaded to the correct device
        model.load_state_dict(torch.load(model_path, map_location=DEVICE))
    except FileNotFoundError:
        return {"error": f"CRNN model file not found at {model_path}"}
    model.eval()

    spec = audio_to_melspec(audio_path)
    if spec is None:
        return {"error": f"Failed to process audio file for CRNN at {audio_path}"}

    try:
        spec_tensor = torch.tensor(spec, dtype=torch.float32).unsqueeze(0).unsqueeze(0).to(DEVICE)
        with torch.no_grad():
            output = model(spec_tensor)
        probabilities = torch.softmax(output, dim=1).cpu().numpy()[0]
        max_prob_idx = np.argmax(probabilities)

        return {
            "prediction": class_map[max_prob_idx],
            "confidence": float(probabilities[max_prob_idx]),
            "probabilities": {name: float(p) for name, p in zip(class_map.values(), probabilities)}
        }
    except Exception as e:
        return {"error": f"An error occurred during CRNN model inference: {str(e)}"}


# --- CLAP for Zero-Shot Classification ---
try:
    CLAP_PROCESSOR = ClapProcessor.from_pretrained("laion/clap-htsat-unfused")
    CLAP_MODEL = ClapModel.from_pretrained("laion/clap-htsat-unfused").to(DEVICE)
    CLAP_MODEL.eval()
except Exception as e:
    CLAP_PROCESSOR = None
    CLAP_MODEL = None
    # This allows the script to run even if Hugging Face is down or there's no internet.
    # The error will be propagated in the final JSON output.


def predict_clap(audio_path):
    # performs zero-shot classification using the CLAP model.
    if not CLAP_MODEL or not CLAP_PROCESSOR:
        return {"error": "CLAP model is not available. Check internet connection or library installation."}

    # text labels
    text_labels = ["car crash", "glass break", "traffic", "siren", "human scream", "dog bark", "gunshot"]

    try:
        audio, sr = librosa.load(audio_path, sr=48000, duration=10.0)  # CLAP 48k SR and 10s audio
        inputs = CLAP_PROCESSOR(text=text_labels, audios=audio, return_tensors="pt", padding=True, sampling_rate=sr).to(
            DEVICE)

        with torch.no_grad():
            logits_per_audio = CLAP_MODEL(**inputs).logits_per_audio

        probabilities = torch.softmax(logits_per_audio, dim=1).cpu().numpy()[0]
        max_prob_idx = np.argmax(probabilities)

        return {
            "prediction": text_labels[max_prob_idx],
            "confidence": float(probabilities[max_prob_idx]),
            "similarities": {label: float(p) for label, p in zip(text_labels, probabilities)}
        }
    except Exception as e:
        return {"error": f"An error occurred during CLAP model inference: {str(e)}"}


# --- Main Execution Block ---
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict audio events from an audio file using multiple models.")
    parser.add_argument("model_path", type=str, help="Path to the trained CRNN .pth model file (accident_model.pth).")
    parser.add_argument("audio_path", type=str, help="Path to the audio file to be classified.")
    args = parser.parse_args()

    if not os.path.exists(args.model_path):
        print(json.dumps({"error": f"CRNN model file not found: {args.model_path}"}), file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.audio_path):
        print(json.dumps({"error": f"Audio file not found: {args.audio_path}"}), file=sys.stderr)
        sys.exit(1)

    # predict
    crnn_result = predict_crnn(args.model_path, args.audio_path)
    clap_result = predict_clap(args.audio_path)

    # results
    final_result = {
        "crnn_result": crnn_result,
        "clap_result": clap_result,
    }

    print(json.dumps(final_result))

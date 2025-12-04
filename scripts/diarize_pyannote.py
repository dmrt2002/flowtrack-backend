#!/usr/bin/env python3
"""
Zero-Cost Speaker Diarization using Pyannote 3.1

Prerequisites:
1. Install dependencies:
   pip install pyannote.audio torch torchaudio

2. Get HuggingFace token (free):
   - Visit: https://huggingface.co/settings/tokens
   - Create new token with "Read" permission
   - Accept model terms: https://huggingface.co/pyannote/speaker-diarization-3.1

3. Set environment variable:
   export HUGGINGFACE_TOKEN="your_token_here"

Usage:
   python diarize_pyannote.py <audio_file_path> [num_speakers]

Output:
   JSONL format to stdout (one segment per line)
"""

import sys
import os
import json
from pyannote.audio import Pipeline

def diarize_audio(audio_path: str, num_speakers: int = None):
    """
    Perform speaker diarization on audio file

    Args:
        audio_path: Path to audio file (wav, mp3, etc.)
        num_speakers: Expected number of speakers (optional, helps accuracy)
    """
    # Get HuggingFace token from environment
    hf_token = os.getenv('HUGGINGFACE_TOKEN')
    if not hf_token:
        print(json.dumps({
            'error': 'HUGGINGFACE_TOKEN environment variable not set',
            'help': 'Visit https://huggingface.co/settings/tokens to create a token'
        }), file=sys.stderr)
        sys.exit(1)

    try:
        # Load Pyannote pipeline (downloads model on first run ~2GB)
        print(json.dumps({
            'status': 'loading_model',
            'message': 'Loading Pyannote speaker diarization model (first run may take a few minutes)...'
        }), file=sys.stderr)

        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )

        print(json.dumps({
            'status': 'processing',
            'message': f'Processing audio file: {audio_path}'
        }), file=sys.stderr)

        # Run diarization
        if num_speakers:
            diarization = pipeline(audio_path, num_speakers=num_speakers)
        else:
            diarization = pipeline(audio_path)

        # Output results as JSONL (one segment per line)
        segment_count = 0
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segment = {
                'start': round(turn.start, 3),  # Start time in seconds
                'end': round(turn.end, 3),      # End time in seconds
                'duration': round(turn.end - turn.start, 3),
                'speaker': speaker,             # e.g., "SPEAKER_00", "SPEAKER_01"
                'startMs': int(turn.start * 1000),  # Milliseconds for easy matching
                'endMs': int(turn.end * 1000),
            }
            print(json.dumps(segment))
            segment_count += 1

        # Summary to stderr (doesn't interfere with stdout)
        print(json.dumps({
            'status': 'completed',
            'segments': segment_count,
            'speakers': len(set(seg['speaker'] for seg in [segment]))
        }), file=sys.stderr)

    except Exception as e:
        print(json.dumps({
            'error': str(e),
            'type': type(e).__name__
        }), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python diarize_pyannote.py <audio_file_path> [num_speakers]", file=sys.stderr)
        sys.exit(1)

    audio_file = sys.argv[1]

    if not os.path.exists(audio_file):
        print(json.dumps({
            'error': f'Audio file not found: {audio_file}'
        }), file=sys.stderr)
        sys.exit(1)

    # Optional: number of expected speakers
    num_speakers = None
    if len(sys.argv) > 2:
        try:
            num_speakers = int(sys.argv[2])
        except ValueError:
            print(json.dumps({
                'warning': f'Invalid num_speakers: {sys.argv[2]}, using auto-detection'
            }), file=sys.stderr)

    diarize_audio(audio_file, num_speakers)

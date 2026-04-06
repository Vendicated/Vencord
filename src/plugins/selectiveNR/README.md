# SelectiveNR

Per-user noise gate for Discord voice channels.

Right-click any user in a VC → **Suppress** to apply a noise gate to their audio stream. Right-click again → **Unsuppress** to restore clean audio. Suppressed state is per-session.

## How it works

Each Discord user's audio is a separate `MediaStream`. This plugin intercepts those streams and routes them through a custom `AudioWorkletProcessor` (noise gate) running on the dedicated audio thread. Whitelisted users get a clean passthrough; suppressed users get their audio gated based on RMS energy per block.

## Settings

| Setting | Description | Default |
|---|---|---|
| Threshold | Gate open threshold in dBFS — audio below this is suppressed | -40 dB |
| Attack | How fast the gate opens when someone speaks (ms) | 5 ms |
| Release | How fast the gate closes after they stop (ms) | 120 ms |
| Hold | Extra time to keep gate open after signal drops — prevents word clipping (ms) | 200 ms |
| Reduction | Gain applied when gate is closed (dBFS) | -60 dB |

## Usage

1. Join a voice channel
2. Right-click any user in the member list
3. Click **Suppress** — their background noise will be gated
4. Click **Unsuppress** to restore their audio

## Author

ARM9000

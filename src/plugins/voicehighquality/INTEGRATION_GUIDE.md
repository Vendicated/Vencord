# Integration Guide: Purify Studio Audio + Discord Voice Module

## Overview
This guide explains how the Vencord plugin and discord_voice module modifications work together to provide professional studio-quality audio.

---

## Two-Layer Architecture

### Layer 1: Vencord Plugin (WebRTC Level)
**Location:** `src/userplugins/voicehighquality/`

**What it does:**
- Patches Discord's WebRTC audio implementation
- Controls bitrate (up to 512kbps)
- Manages audio processing settings
- Sets sample rate preferences
- Enables experimental features

**Patches Applied:**
```javascript
voiceBitrate: -> Forces custom bitrate
audioSampleRate: -> Sets custom sample rate
noiseSuppression: -> Controls noise suppression
echoCancellation: -> Controls echo cancellation
autoGainControl: -> Controls auto gain
noiseCancellation: -> Controls Krisp AI
```

### Layer 2: Discord Voice Module (Native Audio Engine)
**Location:** `C:\Users\[User]\AppData\Local\Discord\app-[version]\modules\discord_voice-1\discord_voice\index.js`

**What it does:**
- Captures audio from microphone at 192kHz
- Implements professional downsampling (SINC algorithm)
- Configures advanced OPUS parameters
- Optimizes network transmission
- Disables audio processing at engine level

**Modifications Applied:**
```javascript
// Ultra HD Microphone Configuration
preferredSampleRate: 192000
maxInputSampleRate: 192000
downsamplingAlgorithm: 'sinc_best_quality'

// Advanced OPUS Parameters
channels: 2 (Stereo)
bitrate: 512000
complexity: 10
signal: 'music'
bandwidth: 'fullband'
```

---

## How They Work Together

### Audio Signal Flow

```
1. MICROPHONE (192kHz) 
   ↓
2. discord_voice module captures at 192kHz
   ↓
3. SINC Best Quality downsampling to 48kHz
   ↓
4. Vencord plugin sets 512kbps OPUS encoding
   ↓
5. discord_voice applies advanced OPUS parameters
   ↓
6. Network transmission with FEC + RTX
   ↓
7. LISTENER receives studio-quality audio
```

### Configuration Sync

**Vencord Plugin Settings:**
```
audioBitrate: 512 kbps
audioSampleRate: 48 kHz
enableKrispNoiseSuppression: false
enableEchoCancellation: false
enableAutoGainControl: false
```

**discord_voice Module:**
```javascript
// Automatically applies when Vencord plugin is enabled
options.audioEncoder.bitrate = 512000
options.audioEncoder.rate = 48000
options.echoCancellation = false
options.noiseSuppression = false
options.automaticGainControl = false
```

---

## Setup Process

### Step 1: Install Vencord Plugin
```bash
# Place plugin in Vencord
src/userplugins/voicehighquality/
  ├── index.ts
  └── README.md

# Enable in Vencord settings
Settings -> Vencord -> Plugins -> PurifyStudioAudio
```

### Step 2: Modify discord_voice Module
```javascript
// Edit index.js in discord_voice module
// Add Ultra HD configuration at line ~200 and ~600

// setTransportOptions modifications (line ~200)
// VoiceEngine.initialize modifications (line ~600)
```

### Step 3: Configure Windows Audio
```
Control Panel -> Sound -> Recording
  -> Microphone Properties
  -> Advanced
  -> 2 channel, 24 bit, 192000 Hz (Studio Quality)
```

### Step 4: Configure Discord Settings
```
Discord Settings -> Voice & Video
  -> Input Device: [Your 192kHz Microphone]
  -> Input Volume: 100%
  -> DISABLE: Echo Cancellation
  -> DISABLE: Noise Suppression
  -> DISABLE: Automatic Gain Control
```

### Step 5: Restart Discord
```
1. Close Discord completely
2. Check Task Manager (no Discord processes)
3. Start Discord
4. Verify in console (Ctrl+Shift+I)
```

---

## Verification Checklist

### Vencord Plugin Active
- [ ] Console shows: `[Purify Studio Audio] Plugin activated`
- [ ] Console shows: `Settings: 512kbps @ 48000Hz`
- [ ] Plugin appears in Vencord Plugins list

### discord_voice Module Active
- [ ] Console shows: `PURIFY: Ultra HD 192kHz Microphone Configuration Loaded!`
- [ ] Console shows: `Stereo @ 512kbps @ 48kHz - ACTIVATED!`

### Windows Audio Configured
- [ ] Microphone shows 192000 Hz in properties
- [ ] Discord recognizes the microphone
- [ ] Input levels show activity when speaking

### Discord Settings Configured
- [ ] Correct input device selected
- [ ] Input volume at 100%
- [ ] Audio processing disabled (all OFF)
- [ ] Voice Activity sensitivity set

---

## Testing Audio Quality

### Quick Test
1. Join a voice channel
2. Press Ctrl+Shift+I (Console)
3. Check for activation messages
4. Ask someone to confirm audio quality
5. Record a voice message and play it back

### Professional Test
1. Use voice recording software (Audacity, etc.)
2. Record Discord output
3. Analyze frequency response (should see 0-20kHz)
4. Check bitrate (should be 512kbps)
5. Verify stereo separation

### Comparison Test
1. Record with plugin enabled
2. Disable plugin and record again
3. Compare quality, clarity, presence
4. Note improvements in high frequencies
5. Check for better transient response

---

## Troubleshooting Integration

### Plugin Works but Module Doesn't
**Symptoms:**
- Console shows plugin activation
- No "192kHz Configuration Loaded" message
- Quality improvement is minimal

**Solutions:**
- Verify discord_voice index.js is modified
- Check modifications are at correct line numbers
- Ensure no syntax errors in modified code
- Restart Discord completely

### Module Works but Plugin Doesn't
**Symptoms:**
- Console shows "192kHz Configuration Loaded"
- Vencord plugin not appearing
- Settings don't apply

**Solutions:**
- Rebuild Vencord (pnpm build)
- Check plugin is in correct folder
- Verify no TypeScript errors
- Enable plugin in Vencord settings

### Neither Working
**Symptoms:**
- No console messages
- Standard Discord quality
- No settings change effect

**Solutions:**
- Reinstall Discord
- Re-apply discord_voice modifications
- Rebuild and reinstall Vencord
- Check for conflicts with other plugins

### Audio Quality Not Improved
**Symptoms:**
- Both active but quality same as before
- No noticeable difference

**Solutions:**
- Verify Windows audio is 192kHz
- Check internet upload speed (1+ Mbps)
- Disable Discord audio processing
- Test with high-quality headphones
- Ask listener to confirm their end

---

## Advanced Configuration

### Custom Bitrates
Edit plugin settings:
```typescript
audioBitrate: {
    markers: [64, 96, 128, 192, 256, 320, 384, 448, 512],
    default: 512
}
```

Edit discord_voice module:
```javascript
options.audioEncoder.bitrate = YOUR_CUSTOM_BITRATE;
options.audioEncoder.maxBitrate = YOUR_CUSTOM_BITRATE;
```

### Custom Sample Rates
Plugin settings:
```typescript
audioSampleRate: {
    options: [
        { label: "44.1 kHz", value: 44100 },
        { label: "48 kHz", value: 48000 },
        { label: "96 kHz", value: 96000 }
    ]
}
```

discord_voice module:
```javascript
options.audioEncoder.rate = YOUR_SAMPLE_RATE;
preferredSampleRate: YOUR_INPUT_SAMPLE_RATE;
```

### Experimental Features
Enable in plugin:
```typescript
enableExperimentalEncoders: true
enableHardwareAcceleration: true
```

Enable in discord_voice:
```javascript
options.experimentalEncoders = true;
options.hardwareAcceleration = true;
```

---

## Performance Optimization

### CPU Usage
- 192kHz processing is CPU-intensive
- Expected: 5-15% CPU usage increase
- Reduce: Use 96kHz instead of 192kHz
- Reduce: Lower bitrate to 384kbps

### Network Usage
- 512kbps = ~0.5 Mbps upload
- Monitor: Check Discord connection quality
- Reduce: Lower bitrate if unstable

### Memory Usage
- Expected: 50-100MB additional RAM
- Normal for high-quality audio buffers
- Close other programs if needed

---

## FAQ

**Q: Do I need both plugin and module modifications?**
A: Plugin alone provides improvements. Module adds 192kHz support.

**Q: Will others hear the quality improvement?**
A: Yes, but they need good internet and audio equipment.

**Q: Can I use this with 48kHz microphone?**
A: Yes, you'll still get 512kbps and quality improvements.

**Q: Does this work on Mac/Linux?**
A: Plugin: Yes. Module: Windows only currently.

**Q: Will Discord ban me?**
A: Modifications are client-side. No known bans.

**Q: Can I revert changes?**
A: Yes, disable plugin and reinstall Discord for module.

---

## Support

For issues or questions:
1. Check console for error messages
2. Verify both components are active
3. Test with standard settings first
4. Review troubleshooting section

---

## Technical Reference

### Vencord Patches
```typescript
patches: [
    { find: "voiceBitrate:", ... },
    { find: "audioSampleRate", ... },
    { find: "noiseSuppression:", ... },
    { find: "echoCancellation:", ... },
    { find: "autoGainControl:", ... }
]
```

### discord_voice Modifications
```javascript
// setTransportOptions (line ~200)
options.audioEncoder = {
    channels: 2,
    bitrate: 512000,
    rate: 48000,
    complexity: 10,
    // ... more settings
}

// VoiceEngine.initialize (line ~600)
{
    preferredSampleRate: 192000,
    enableHighResolutionAudio: true,
    downsamplingAlgorithm: 'sinc_best_quality',
    // ... more settings
}
```

---

**Professional studio audio on Discord - Made possible by two-layer integration.**



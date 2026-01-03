/* eslint-disable no-console */
// eslint-disable-next-line import/no-unresolved, import/extensions
const VoiceEngine = require('./discord_voice.node');
const fs = require('fs');
const os = require('os');
const process = require('process');
const path = require('path');

const isElectronRenderer =
  typeof window !== 'undefined' && window != null && window.DiscordNative && window.DiscordNative.isRenderer;

const appSettings = isElectronRenderer ? window.DiscordNative.settings : global.appSettings;
const features = isElectronRenderer ? window.DiscordNative.features : global.features;
const mainArgv = isElectronRenderer ? window.DiscordNative.processUtils.getMainArgvSync() : [];

let dataDirectory;
if (isElectronRenderer) {
  try {
    dataDirectory =
      isElectronRenderer && window.DiscordNative.fileManager.getModuleDataPathSync
        ? path.join(window.DiscordNative.fileManager.getModuleDataPathSync(), 'discord_voice')
        : null;
  } catch (e) {
    console.error('Failed to get data directory: ', e);
  }
  if (dataDirectory != null) {
    try {
      fs.mkdirSync(dataDirectory, {recursive: true});
    } catch (e) {
      console.warn("Couldn't create voice data directory ", dataDirectory, ':', e);
    }
  }
}

// Init logging
const isFileManagerAvailable = window?.DiscordNative?.fileManager;
const isLogDirAvailable = isFileManagerAvailable?.getAndCreateLogDirectorySync;
let logDirectory;
if (isLogDirAvailable) {
  logDirectory = window.DiscordNative.fileManager.getAndCreateLogDirectorySync();
  // TODO If/when we move away from utilizing webRTC logging in voice:
  //   This module uses a different approach to the log-level, particularly an integer value rather than a string.
  //   We should eventually try to align on the string approach (and querying it from our common settings) used by other modules.
  // logLevel = window.DiscordNative.fileManager.logLevelSync();
} else {
  console.warn('Unable to find log directory');
}

const useLegacyAudioDevice = appSettings ? appSettings.getSync('useLegacyAudioDevice') : false;
const audioSubsystemSelected = appSettings ? appSettings.getSync('audioSubsystem', 'standard') : 'standard';
const audioSubsystem = useLegacyAudioDevice || audioSubsystemSelected;
const debugLogging = appSettings ? appSettings.getSync('debugLogging', true) : true;

function versionGreaterThanOrEqual(v1, v2) {
  const v1parts = v1.split('.').map(Number);
  const v2parts = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const num1 = i < v1parts.length ? v1parts[i] : 0;
    const num2 = i < v2parts.length ? v2parts[i] : 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return true;
}

function parseArguments(args) {
  const parsed = {
    'log-level': -1,
  };

  const descriptions = {
    'log-level': 'Logging level.',
    'use-fake-video-capture': 'Use fake video capture device.',
    'use-file-for-fake-video-capture': 'Use local file for fake video capture.',
    'use-fake-audio-capture': 'Use fake audio capture device.',
    'use-file-for-fake-audio-capture': 'Use local file for fake audio capture.',
  };

  for (let i = 0; i < args.length; i++) {
    const parts = args[i].split('=');
    const arg = parts[0];
    const inlineValue = parts.slice(1).join('='); // Join the rest back together in case there are '=' in the value

    function getValue() {
      if (inlineValue !== undefined) {
        return inlineValue;
      }
      return args[++i];
    }

    switch (arg) {
      case '-h':
      case '--help':
        console.log('Help requested:');
        for (const [key, value] of Object.entries(descriptions)) {
          console.log(`--${key}: ${value}`);
        }
        process.exit(0);
        break;
      case '--log-level':
        parsed['log-level'] = parseInt(getValue(), 10);
        break;
      case '--use-fake-video-capture':
        parsed['use-fake-video-capture'] = true;
        break;
      case '--use-file-for-fake-video-capture':
        parsed['use-file-for-fake-video-capture'] = getValue();
        break;
      case '--use-fake-audio-capture':
        parsed['use-fake-audio-capture'] = true;
        break;
      case '--use-file-for-fake-audio-capture':
        parsed['use-file-for-fake-audio-capture'] = getValue();
        break;
    }
  }

  return parsed;
}

const argv = parseArguments(mainArgv.slice(1));
const logLevel = argv['log-level'] === -1 ? (debugLogging ? 2 : -1) : argv['log-level'];
const useFakeVideoCapture = argv['use-fake-video-capture'];
const useFileForFakeVideoCapture = argv['use-file-for-fake-video-capture'];
const useFakeAudioCapture = argv['use-fake-audio-capture'];
const useFileForFakeAudioCapture = argv['use-file-for-fake-audio-capture'];

features.declareSupported('voice_panning');
features.declareSupported('voice_multiple_connections');
features.declareSupported('media_devices');
features.declareSupported('media_video');
features.declareSupported('debug_logging');
features.declareSupported('set_audio_device_by_id');
features.declareSupported('set_video_device_by_id');
features.declareSupported('loopback');
features.declareSupported('experiment_config');
features.declareSupported('remote_locus_network_control');
features.declareSupported('connection_replay');
features.declareSupported('simulcast');
features.declareSupported('simulcast_bugfix');
features.declareSupported('direct_video');
features.declareSupported('electron_video');
features.declareSupported('fixed_keyframe_interval');
features.declareSupported('first_frame_callback');
features.declareSupported('remote_user_multi_stream');
features.declareSupported('go_live_hardware');
features.declareSupported('bandwidth_estimation_experiments');
features.declareSupported('mls_pairwise_fingerprints');
features.declareSupported('soundshare');
features.declareSupported('screen_soundshare');

if (process.platform === 'darwin') {
  features.declareSupported('screen_capture_kit');
  if (versionGreaterThanOrEqual(os.release(), '23.0.0')) {
    features.declareSupported('native_screenshare_picker');
  }
}

if (process.platform === 'linux') {
  // from WebRTC DesktopCapturer::IsRunningUnderWayland()
  const sessionType = process.env.XDG_SESSION_TYPE;
  if (sessionType?.startsWith('wayland') && process.env.WAYLAND_DISPLAY != null) {
    features.declareSupported('native_screenshare_picker');
  }
}

if (
  process.platform === 'win32' ||
  (process.platform === 'darwin' && versionGreaterThanOrEqual(os.release(), '16.0.0'))
) {
  features.declareSupported('mediapipe');
  features.declareSupported('mediapipe_animated');
}

if (process.platform === 'win32' || process.platform === 'darwin' || process.platform === 'linux') {
  features.declareSupported('image_quality_measurement');
}

if (process.platform === 'win32') {
  features.declareSupported('voice_legacy_subsystem');
  features.declareSupported('wumpus_video');
  features.declareSupported('hybrid_video');
  features.declareSupported('elevated_hook');
  features.declareSupported('soundshare_loopback');
  features.declareSupported('screen_previews');
  features.declareSupported('window_previews');
  features.declareSupported('audio_debug_state');
  features.declareSupported('video_effects');
  features.declareSupported('voice_experimental_subsystem');
  features.declareSupported('voice_automatic_subsystem');
  features.declareSupported('voice_subsystem_deferred_switch');
  // NOTE(jvass): currently there's no experimental encoders! Add this back if you
  // add one and want to re-enable the UI for them.
  // features.declareSupported('experimental_encoders');
  features.declareSupported('capture_timeout_experiments');
  features.declareSupported('clips');
}

function bindConnectionInstance(instance) {
  return {
    destroy: () => instance.destroy(),

    setTransportOptions: (options) => instance.setTransportOptions(options),
    setSelfMute: (mute) => instance.setSelfMute(mute),
    setSelfDeafen: (deaf) => instance.setSelfDeafen(deaf),

    mergeUsers: (users) => instance.mergeUsers(users),
    destroyUser: (userId) => instance.destroyUser(userId),

    prepareSecureFramesTransition: (transitionId, version, callback) =>
      instance.prepareSecureFramesTransition(transitionId, version, callback),
    prepareSecureFramesEpoch: (epoch, version, groupId) => instance.prepareSecureFramesEpoch(epoch, version, groupId),
    executeSecureFramesTransition: (transitionId) => instance.executeSecureFramesTransition(transitionId),

    updateMLSExternalSender: (externalSenderPackage) => instance.updateMLSExternalSender(externalSenderPackage),
    getMLSKeyPackage: (callback) => instance.getMLSKeyPackage(callback),
    processMLSProposals: (message, callback) => instance.processMLSProposals(message, callback),
    prepareMLSCommitTransition: (transitionId, commit, callback) =>
      instance.prepareMLSCommitTransition(transitionId, commit, callback),
    processMLSWelcome: (transitionId, welcome, callback) => instance.processMLSWelcome(transitionId, welcome, callback),
    getMLSPairwiseFingerprint: (version, userId, callback) =>
      instance.getMLSPairwiseFingerprint(version, userId, callback),
    setOnMLSFailureCallback: (callback) => instance.setOnMLSFailureCallback(callback),
    setSecureFramesStateUpdateCallback: (callback) => instance.setSecureFramesStateUpdateCallback(callback),

    setLocalVolume: (userId, volume) => instance.setLocalVolume(userId, volume),
    setLocalMute: (userId, mute) => instance.setLocalMute(userId, mute),
    fastUdpReconnect: () => instance.fastUdpReconnect(),
    setLocalPan: (userId, left, right) => instance.setLocalPan(userId, left, right),
    setDisableLocalVideo: (userId, disabled) => instance.setDisableLocalVideo(userId, disabled),

    setMinimumOutputDelay: (delay) => instance.setMinimumOutputDelay(delay),
    getEncryptionModes: (callback) => instance.getEncryptionModes(callback),
    configureConnectionRetries: (baseDelay, maxDelay, maxAttempts) =>
      instance.configureConnectionRetries(baseDelay, maxDelay, maxAttempts),
    setOnSpeakingCallback: (callback) => instance.setOnSpeakingCallback(callback),
    setOnNativeMuteToggleCallback: (callback) => instance.setOnNativeMuteToggleCallback?.(callback),
    setOnNativeMuteChangedCallback: (callback) => instance.setOnNativeMuteChangedCallback?.(callback),
    setOnSpeakingWhileMutedCallback: (callback) => instance.setOnSpeakingWhileMutedCallback(callback),
    setPingInterval: (interval) => instance.setPingInterval(interval),
    setPingCallback: (callback) => instance.setPingCallback(callback),
    setPingTimeoutCallback: (callback) => instance.setPingTimeoutCallback(callback),
    setRemoteUserSpeakingStatus: (userId, speaking) => instance.setRemoteUserSpeakingStatus(userId, speaking),
    setRemoteUserCanHavePriority: (userId, canHavePriority) =>
      instance.setRemoteUserCanHavePriority(userId, canHavePriority),

    setOnVideoCallback: (callback) => instance.setOnVideoCallback(callback),
    setOnFirstFrameCallback: (callback) => instance.setOnFirstFrameCallback(callback),
    setVideoBroadcast: (broadcasting) => instance.setVideoBroadcast(broadcasting),
    setDesktopSource: (id, videoHook, type) => instance.setDesktopSource(id, videoHook, type),
    setDesktopSourceWithOptions: (options) => instance.setDesktopSourceWithOptions(options),
    setGoLiveDevices: (options) => instance.setGoLiveDevices(options),
    clearGoLiveDevices: () => instance.clearGoLiveDevices(),
    clearDesktopSource: () => instance.clearDesktopSource(),
    setDesktopSourceStatusCallback: (callback) => instance.setDesktopSourceStatusCallback(callback),
    setOnDesktopSourceEnded: (callback) => instance.setOnDesktopSourceEnded(callback),
    setOnSoundshare: (callback) => instance.setOnSoundshare(callback),
    setOnSoundshareEnded: (callback) => instance.setOnSoundshareEnded(callback),
    setOnSoundshareFailed: (callback) => instance.setOnSoundshareFailed(callback),
    setPTTActive: (active, priority) => instance.setPTTActive(active, priority),
    getStats: (callback) => instance.getStats(callback),
    getFilteredStats: (filter, callback) => instance.getFilteredStats(filter, callback),
    startReplay: () => instance.startReplay(),
    setClipRecordUser: (userId, dataType, shouldRecord) => instance.setClipRecordUser(userId, dataType, shouldRecord),
    setRtcLogMarker: (marker) => instance.setRtcLogMarker(marker),
    startSamplesLocalPlayback: (samplesId, options, channels, callback) =>
      instance.startSamplesLocalPlayback(samplesId, options, channels, callback),
    stopSamplesLocalPlayback: (sourceId) => instance.stopSamplesLocalPlayback(sourceId),
    stopAllSamplesLocalPlayback: () => instance.stopAllSamplesLocalPlayback(),
    setOnVideoEncoderFallbackCallback: (codecName) => instance.setOnVideoEncoderFallbackCallback(codecName),
    setOnRtcpMessageCallback: (callback) => instance.setOnRtcpMessageCallback?.(callback),
    presentDesktopSourcePicker: (style) => instance.presentDesktopSourcePicker(style),
  };
}

VoiceEngine.createTransport = VoiceEngine._createTransport;

if (isElectronRenderer) {
  VoiceEngine.setImageDataAllocator((width, height) => new window.ImageData(width, height));
}

VoiceEngine.createVoiceConnectionWithOptions = function (userId, connectionOptions, onConnectCallback) {
  const instance = new VoiceEngine.VoiceConnection(userId, connectionOptions, onConnectCallback);
  return bindConnectionInstance(instance);
};
VoiceEngine.createOwnStreamConnectionWithOptions = VoiceEngine.createVoiceConnectionWithOptions;

// TODO(dyc): |audioEngineId| is vestigial and does not actually get used.
// "default" was (we deleted audio engine IDs with the removal of android's
// separate gameAudio engine) hardcoded within nativelib. update the API to
// reflect this.
VoiceEngine.createReplayConnection = function (audioEngineId, callback, replayLog) {
  if (replayLog == null) {
    return null;
  }

  return bindConnectionInstance(new VoiceEngine.VoiceReplayConnection(replayLog, audioEngineId, callback));
};

const setAudioSubsystemInternal = function (subsystem, forceRestart) {
  if (appSettings == null) {
    log('warn', 'Unable to access app settings.');
    return;
  }

  appSettings.set('audioSubsystem', subsystem);
  appSettings.set('useLegacyAudioDevice', false);

  if (isElectronRenderer) {
    if (forceRestart) {
      // DANGER: any unconditional call to setAudioSubsytem will bootloop if we don't
      // debounce noop changes.
      if (subsystem === audioSubsystem) {
        return;
      }
      window.DiscordNative.app.relaunch();
    } else {
      console.log(`deffering audio subsystem switch to ${subsystem} until next restart`);
    }
  }
};

VoiceEngine.setAudioSubsystem = function (subsystem) {
  setAudioSubsystemInternal(subsystem, true);
};

VoiceEngine.queueAudioSubsystem = function (subsystem) {
  setAudioSubsystemInternal(subsystem, false);
};

VoiceEngine.setDebugLogging = function (enable) {
  if (appSettings == null) {
    log('warn', 'Unable to access app settings.');
    return;
  }

  if (debugLogging === enable) {
    return;
  }

  appSettings.set('debugLogging', enable);

  if (isElectronRenderer) {
    window.DiscordNative.app.relaunch();
  }
};

VoiceEngine.getDebugLogging = function () {
  return debugLogging;
};

const videoStreams = {};
const directVideoStreams = {};

const ensureCanvasContext = function (sinkId) {
  let canvas = document.getElementById(sinkId);
  if (canvas == null) {
    for (const popout of window.popouts.values()) {
      const element = popout.document != null && popout.document.getElementById(sinkId);
      if (element != null) {
        canvas = element;
        break;
      }
    }

    if (canvas == null) {
      return null;
    }
  }

  const context = canvas.getContext('2d');
  if (context == null) {
    log('info', `Failed to initialize context for sinkId ${sinkId}`);
    return null;
  }

  return context;
};

let activeSinksChangeCallback;
VoiceEngine.setActiveSinksChangeCallback = function (callback) {
  activeSinksChangeCallback = callback;
};

function notifyActiveSinksChange(streamId) {
  if (activeSinksChangeCallback == null) {
    return;
  }
  const sinks = videoStreams[streamId];
  const hasVideoStreamSink = sinks != null && sinks.size > 0;
  const hasDirectVideoStreamSink = directVideoStreams[streamId] != null;

  activeSinksChangeCallback(streamId, hasVideoStreamSink || hasDirectVideoStreamSink);
}

// [adill] NB: with context isolation it has become extremely costly (both memory & performance) to provide the image
// data directly to clients at any reasonably fast interval so we've replaced setVideoOutputSink with a direct canvas
// renderer via addVideoOutputSink
const setVideoOutputSink = VoiceEngine.setVideoOutputSink;
const clearVideoOutputSink = (streamId) => {
  // [adill] NB: if you don't pass a frame callback setVideoOutputSink clears the sink
  setVideoOutputSink(streamId);
};
const signalVideoOutputSinkReady = VoiceEngine.signalVideoOutputSinkReady;
delete VoiceEngine.setVideoOutputSink;
delete VoiceEngine.signalVideoOutputSinkReady;

function addVideoOutputSinkInternal(sinkId, streamId, frameCallback) {
  let sinks = videoStreams[streamId];
  if (sinks == null) {
    sinks = videoStreams[streamId] = new Map();
  }

  // notifyActiveSinksChange relies on videoStreams having the correct state
  const needsToSubscribeToFrames = sinks.size === 0;
  sinks.set(sinkId, frameCallback);

  if (needsToSubscribeToFrames) {
    log('info', `Subscribing to frames for streamId ${streamId}`);
    const onFrame = (imageData) => {
      const sinks = videoStreams[streamId];
      if (sinks != null) {
        for (const callback of sinks.values()) {
          if (callback != null) {
            callback(imageData);
          }
        }
      }
      signalVideoOutputSinkReady(streamId);
    };
    setVideoOutputSink(streamId, onFrame, true);
    notifyActiveSinksChange(streamId);
  }
}

VoiceEngine.addVideoOutputSink = function (sinkId, streamId, frameCallback) {
  let canvasContext = null;
  addVideoOutputSinkInternal(sinkId, streamId, (imageData) => {
    if (canvasContext == null) {
      canvasContext = ensureCanvasContext(sinkId);
      if (canvasContext == null) {
        return;
      }
    }
    if (frameCallback != null) {
      frameCallback(imageData.width, imageData.height);
    }
    // [adill] NB: Electron 9+ on macOS would show massive leaks in the the GPU helper process when a non-Discord
    // window completely occludes the Discord window. Adding this tiny readback ameliorates the issue. We tried WebGL
    // rendering which did not exhibit the issue, however, the context limit of 16 was too small to be a real
    // alternative.
    canvasContext.getImageData(0, 0, 1, 1);
    canvasContext.putImageData(imageData, 0, 0);
  });
};

VoiceEngine.removeVideoOutputSink = function (sinkId, streamId) {
  const sinks = videoStreams[streamId];
  if (sinks != null) {
    sinks.delete(sinkId);
    if (sinks.size === 0) {
      delete videoStreams[streamId];
      log('info', `Unsubscribing from frames for streamId ${streamId}`);
      clearVideoOutputSink(streamId);
      notifyActiveSinksChange(streamId);
    }
  }
};

// We wrap the direct video calls so we can keep track of all active
// video output sinks
const addDirectVideoOutputSink_ = VoiceEngine.addDirectVideoOutputSink;
const removeDirectVideoOutputSink_ = VoiceEngine.removeDirectVideoOutputSink;
VoiceEngine.addDirectVideoOutputSink = function (streamId) {
  log('info', `Subscribing to direct frames for streamId ${streamId}`);
  addDirectVideoOutputSink_(streamId);
  directVideoStreams[streamId] = true;
  notifyActiveSinksChange(streamId);
};
VoiceEngine.removeDirectVideoOutputSink = function (streamId) {
  log('info', `Unsubscribing from direct frames for streamId ${streamId}`);
  removeDirectVideoOutputSink_(streamId);
  delete directVideoStreams[streamId];
  notifyActiveSinksChange(streamId);
};

let sinkId = 0;
VoiceEngine.getNextVideoOutputFrame = function (streamId) {
  const nextVideoFrameSinkId = `getNextVideoFrame_${++sinkId}`;

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      VoiceEngine.removeVideoOutputSink(nextVideoFrameSinkId, streamId);
      reject(new Error('getNextVideoOutputFrame timeout'));
    }, 5000);

    addVideoOutputSinkInternal(nextVideoFrameSinkId, streamId, (imageData) => {
      VoiceEngine.removeVideoOutputSink(nextVideoFrameSinkId, streamId);
      resolve({
        width: imageData.width,
        height: imageData.height,
        data: new Uint8ClampedArray(imageData.data.buffer),
      });
    });
  });
};

function log(level, message) {
  const consoleLogFn = (() => {
    if (!['trace', 'debug', 'info', 'warn', 'error', 'log'].includes(level)) {
      return console.info;
    }
    return console[level];
  })();
  consoleLogFn(message);

  // Note: this currently races with the VoiceEngine initialization,
  // not all logs may get logged here early in the process
  VoiceEngine.consoleLog(level, message);
}

console.log(`Initializing voice engine with audio subsystem: ${audioSubsystem}`);
VoiceEngine.platform = process.platform;
VoiceEngine.initialize({
  audioSubsystem,
  logLevel,
  dataDirectory,
  logDirectory,
  useFakeVideoCapture,
  useFileForFakeVideoCapture,
  useFakeAudioCapture,
  useFileForFakeAudioCapture,
});

module.exports = VoiceEngine;

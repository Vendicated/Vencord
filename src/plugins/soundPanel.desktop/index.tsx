/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { onRtcConnectionState, onVoiceChannelSelect } from "./audio/joinSound";
import { applyOutputDevice, installMicrophoneHook, uninstallMicrophoneHook } from "./audio/mixer";
import { disposePlayer } from "./audio/player";
import { PanelButton } from "./components/PanelButton";
import { revokeAllFileUrls } from "./data/library";
import { settings } from "./settings";
import { detectVoiceEngine, getVoiceActivityThreshold, usesDesktopWebRTC } from "./webrtc/engine";
import { applyMaxVideoQuality, getStartBitrateParam, getVideoBitrateKbps, syncGoLiveQuality } from "./webrtc/quality";
import { captureDesktopSource, installScreenShareHook, prepareDesktopSource, uninstallScreenShareHook } from "./webrtc/screenShare";

const webrtcMode = () => IS_DISCORD_DESKTOP && settings.store.webrtcEngine;

export default definePlugin({
    name: "SoundPanel",
    description: "Adds a sound panel to the voice controls: play soundboard sounds, your own sounds and music through your microphone",
    authors: [Devs.cegged],

    settings,

    patches: [
        {
            find: '"SoundboardRTCPanelButton"',
            replacement: {
                match: /(?<=\?\(0,\i\.jsx\)\(\i,\{channel:(\i),focusProps:\i\}\):null)\]/,
                replace: ",$self.renderPanelButton({channel:$1})]"
            }
        },
        {
            find: ".WEBRTC].find(",
            predicate: webrtcMode,
            replacement: {
                match: /\[(\i\.\i\.NATIVE),(\i\.\i\.WEBRTC)\]/,
                replace: "[$2,$1]"
            }
        },
        {
            find: "startDavePreload(){",
            predicate: webrtcMode,
            replacement: [
                {
                    match: /(?<=fetchDave:)\(0,\i\.\i\)\(\)/,
                    replace: "!0"
                },
                {
                    match: /(?<=startDavePreload\(\)\{.{0,40}?)\(0,\i\.\i\)\(\)(?=&&\i\.fetchAsyncResources\()/,
                    replace: "!0"
                }
            ]
        },
        {
            find: '"OculusBrowser"',
            predicate: webrtcMode,
            replacement: {
                match: /(?<=\i="Chrome"===(\i)\(\)\.name)(?=\|\|"Safari"===\i\(\)\.name\|\|"Firefox")/,
                replace: '||"Electron"===$1().name'
            }
        },
        {
            find: "Unable to find a unique rtx SSRC!",
            predicate: webrtcMode,
            replacement: [
                {
                    match: /\[(\i\.\i)\.H265,\i\.\i\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]/,
                    replace: "[$1.VP8,$1.VP9,$1.H265,$1.H264]"
                },
                {
                    match: /\[(\i\.\i)\.H264,\i\.\i\.VP8,\i\.\i\.VP9\]/,
                    replace: "[$1.VP8,$1.VP9,$1.H264]"
                },
                {
                    match: /videoBitRate:2500(?=,)/g,
                    replace: "videoBitRate:$self.getVideoBitrateKbps(this)"
                },
                {
                    match: /let (\i)=`x-google-max-bitrate=\$\{(\i)\}`/,
                    replace: "let $1=`x-google-max-bitrate=${$2}`+$self.getStartBitrateParam($2)"
                }
            ]
        },
        {
            find: "shouldSendSpeaking(",
            predicate: webrtcMode,
            replacement: {
                match: /(?<=shouldSendSpeaking\(\i,\i\)\{if\()\(0,\i\.\i\)\(\)(?=\)return!0)/,
                replace: "!0"
            }
        },
        {
            find: "this.input.setAudioMode(",
            predicate: webrtcMode,
            replacement: {
                match: /(?<=this\.input\.setAudioMode\(\i,\{delay:\i\.pttReleaseDelay,threshold:)(\i)\.vadThreshold/,
                replace: "$self.getVoiceActivityThreshold($1)"
            }
        },
        {
            find: "mediaEngineConnectionId=`WebRTC-${",
            predicate: webrtcMode,
            replacement: {
                match: /updateVideoQuality\(\i\)\{(?=let \i=this\.videoStreamParameters\.findIndex\()/,
                replace: "$&$self.applyMaxVideoQuality(this);"
            }
        },
        {
            find: '"startStreamWithSource"',
            predicate: webrtcMode,
            replacement: {
                match: /(if\(null==\i\)return\[!1,"no source"\];(\i)=\i\})(return\(0,\i\.\i\)\(\{preset:(\i),resolution:(\i),frameRate:(\i),soundshareEnabled:(\i)\}\))/,
                replace: "$1$2=await $self.prepareDesktopSource($2,{preset:$4,resolution:$5,frameRate:$6,audio:$7});$3"
            }
        },
        {
            find: "desktopInputPool.get(",
            predicate: webrtcMode,
            replacement: [
                {
                    match: /(setGoLiveSource\((\i),(\i)\)\{.{0,200}?(\i)=this\.desktopInputPool\.get\(\2\.desktopDescription\.id\);)if\(null==\4\)return;/,
                    replace: "$1if(null==$4)return void $self.captureDesktopSource(this,$2,$3);"
                },
                {
                    match: /video:\{\.\.\.(\i),frameRate:30\}/,
                    replace: "video:{frameRate:30,...$1}"
                },
                {
                    match: /(\i)=\{width:"number"==typeof (\i)\.width.{0,160}?\},(\i)=\(\1\?\.height\?\?0\)>720\?(\i\.\i):(\i\.\i);this\.videoQualityManager\.setGoliveQuality\(\{encode:\1,capture:\1,bitrateMax:\3\}\)/,
                    replace: "$&,$self.syncGoLiveQuality(this,$2,$4,$5)"
                }
            ]
        }
    ],

    renderPanelButton: ErrorBoundary.wrap(PanelButton, { noop: true }),
    prepareDesktopSource,
    captureDesktopSource,
    syncGoLiveQuality,
    applyMaxVideoQuality,
    getVideoBitrateKbps,
    getStartBitrateParam,
    getVoiceActivityThreshold,

    flux: {
        AUDIO_SET_OUTPUT_DEVICE: applyOutputDevice,
        VOICE_CHANNEL_SELECT: onVoiceChannelSelect,
        RTC_CONNECTION_STATE: onRtcConnectionState
    },

    start() {
        detectVoiceEngine();
        installMicrophoneHook();
        if (usesDesktopWebRTC()) installScreenShareHook();
    },

    stop() {
        disposePlayer();
        uninstallMicrophoneHook();
        uninstallScreenShareHook();
        revokeAllFileUrls();
    }
});

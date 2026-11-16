/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Heading } from "@components/Heading";
import {
    Divider,
    Paragraph,
    Span,
} from "@components/index";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationStreamingSettingsStore, GoLiveQuality, GoLiveSourceOptions, MediaEngine, VideoSize, WebRTCConnection } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Checkbox, closeModal, FluxDispatcher, Modal, openModal, useState } from "@webpack/common";

import managedStyle from "./styles.css?managed";

const cl = classNameFactory("vc-screen-picker-");

class NotAllowedError extends Error {
    name = "NotAllowedError";
}

const logger = new Logger("VencordScreenShare");

const ApplicationStreamingSettingsStore: ApplicationStreamingSettingsStore = findStoreLazy("ApplicationStreamingSettingsStore");

const getDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

function openScreenSharePicker(options: DisplayMediaStreamOptions) {
    return new Promise<MediaStream>((resolve, reject) => {
        const key = openModal(
            props => (
                <ModalComponent
                    modalProps={props}
                    submit={resolve}
                    options={options}
                    close={() => {
                        props.onClose();
                        reject(new NotAllowedError("Permission denied by user"));
                    }}
                />
            ),
            {
                onCloseRequest() {
                    closeModal(key);
                    reject(new NotAllowedError("Permission denied by user"));
                },
                onCloseCallback() {
                    reject(new NotAllowedError("Permission denied by user"));
                }
            }
        );
    });
}

function OptionRadio<Settings extends object, Key extends keyof Settings, Options extends ReadonlyArray<string | number>>(props: {
    options: Options;
    labels?: Array<string>;
    settings: Settings;
    settingsKey: Key;
    onChange: (option: Options[number]) => void;
}) {
    const { options, settings, settingsKey, labels, onChange } = props;

    return (
        <div className={cl("padding")}>
            <div className={cl("option-radios")}>
                {options.map((option, idx) => (
                    <label className={cl("option-radio")} data-checked={settings[settingsKey] === option} key={option}>
                        <Span weight="bold">{labels?.[idx] ?? option}</Span>
                        <input
                            type="radio"
                            name={settingsKey.toString()}
                            value={option}
                            checked={settings[settingsKey] === option}
                            onChange={() => onChange(option)}
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

function ModalComponent({ modalProps, submit, close, options }: {
    modalProps: any;
    submit: (data: Promise<MediaStream>) => void;
    close: () => void;
    options: DisplayMediaStreamOptions;
}) {
    const liveSettings = settings.use();
    const disableStreamPreviewsValue = disableStreamPreviews.useSetting();
    const [quality, setQuality] = useState(() => {
        const { resolution, fps, soundshareEnabled } = ApplicationStreamingSettingsStore.getState();
        return { resolution, frameRate: fps, soundshareEnabled };
    });

    async function stream() {
        try {
            const { resolution, frameRate, soundshareEnabled } = quality;

            FluxDispatcher.dispatch({
                type: "STREAM_UPDATE_SETTINGS",
                preset: PRESET_CUSTOM,
                resolution,
                frameRate,
                soundshareEnabled
            });

            const videoOptions = typeof options?.video !== "boolean" && !!options.video ? options.video : {};
            const audioOptions = typeof options?.audio !== "boolean" && !!options.audio ? options.audio : {};
            // Discord requests a fixed size. Remove it, applyStreamQuality makes Discord limit the size to the selected quality
            delete videoOptions.width;
            delete videoOptions.height;

            submit(
                getDisplayMedia({
                    video: {
                        ...videoOptions,
                        frameRate: { max: frameRate }
                    },
                    audio: {
                        ...audioOptions,
                        restrictOwnAudio: true,
                    },
                    surfaceSwitching: "include",
                    systemAudio: soundshareEnabled ? "include" : "exclude"
                }).then(t => {
                    // w3c says this can fail, they don't say why, so just to be safe
                    try {
                        const video = t.getVideoTracks()?.[0];
                        if (video) video.contentHint = liveSettings.contentHint;
                    } catch { }
                    return t;
                })
            );
        } catch (error) {
            logger.error("Error while submitting stream.", error);
        } finally {
            close();
        }
    }

    return (
        <div className={cl("modal")}>
            <Modal
                {...modalProps}

                size="lg"
                actionBarInput={
                    <div className={cl("summary")}>
                        <Paragraph size="md" weight="semibold" style={{ color: "var(--text-strong, var(--text-default))" }} className={cl("source-or-preset-name")}>{liveSettings.contentHint === "motion" ? "Gaming" : liveSettings.contentHint === "detail" ? "Screenshare" : "Custom"}</Paragraph>
                        <Paragraph size="xs" weight="medium" style={{ color: "var(--text-muted, var(--text-default))" }} className={cl("summary-detail")}>
                            <span>{liveSettings.contentHint === "motion" ? "Smoother video" : liveSettings.contentHint === "detail" ? "Cleaner text" : "User preset"}</span>
                            <span className={cl("ellipsis")}>•</span>
                            <span>{quality.resolution === 0 ? "Source" : `${quality.resolution}p`}</span>
                            <span className={cl("ellipsis")}>•</span>
                            <span>{quality.frameRate}fps</span>
                            {!quality.soundshareEnabled ? <span className={cl("ellipsis")}>•</span> : ""}
                            {!quality.soundshareEnabled ? <span>Stream Muted</span> : ""}
                        </Paragraph>
                    </div>
                }
                actions={[
                    {
                        variant: "primary",
                        text: "Stream",
                        onClick: stream
                    }
                ]}
            >

                <div>
                    <div className={cl("flex", "padding")}>
                        <section className={cl("quality-section")}>
                            <Heading tag="h4">Resolution</Heading>
                            <OptionRadio
                                options={StreamResolution}
                                labels={StreamResolutionLabels}
                                settings={quality}
                                settingsKey="resolution"
                                onChange={resolution => setQuality({ ...quality, resolution })}
                            />
                        </section>

                        <section className={cl("quality-section")}>
                            <Heading tag="h4">Frame Rate</Heading>
                            <OptionRadio
                                options={StreamFps}
                                settings={quality}
                                settingsKey="frameRate"
                                onChange={frameRate => setQuality({ ...quality, frameRate })}
                            />
                        </section>
                    </div>
                    <div>
                        <Heading tag="h4">Stream Mode</Heading>
                        <div>
                            <OptionRadio
                                options={StreamContentHint}
                                labels={["Smoother video", "Cleaner text", "Custom"]}
                                settings={liveSettings}
                                settingsKey="contentHint"
                                onChange={option => (liveSettings.contentHint = option)}
                            />
                        </div>
                    </div>
                    <Divider />
                    <div className={cl("padding", "pointer")}>
                        <Checkbox
                            value={!quality.soundshareEnabled}
                            onChange={(_e, value) => setQuality({ ...quality, soundshareEnabled: !value })}
                            shape="box"
                            reverse={true}>
                            <div className={cl("control-content")}>
                                <Heading tag="h4">Mute Stream Audio</Heading>
                                <Paragraph style={{ color: "var(--text-subtle, var(--text-default))" }}>Prevents system audio from being included in your stream.</Paragraph>
                            </div>
                        </Checkbox>
                    </div>
                    <div className={cl("padding", "pointer")}>
                        <Checkbox
                            value={!disableStreamPreviewsValue}
                            onChange={(_e, value) => disableStreamPreviews.updateSetting(() => !value)}
                            shape="box"
                            reverse={true}>
                            <div className={cl("control-content")}>
                                <Heading tag="h4">Show Stream Previews</Heading>
                                <Paragraph style={{ color: "var(--text-subtle, var(--text-default))" }}>Allows others to see a preview of your stream before they join.</Paragraph>
                            </div>
                        </Checkbox>
                    </div>
                    <Divider />
                </div>
            </Modal>
        </div>
    );
}

const StreamResolution = [480, 720, 1080, 1440, 2160, 0] as const;
const StreamResolutionLabels = ["480", "720", "1080", "1440", "2160", "Source"];
const StreamFps = [15, 30, 60, 120] as const;
const StreamContentHint = ["motion", "detail", ""] as const;

const PRESET_CUSTOM = 3;

// The native client uses 9Mbps above 720p30 and for the source resolution, and 3.5Mbps for the rest.
// Use that as the minimum and scale higher pixel rates above it
function getMaxBitrate(resolution: number, width: number, height: number, frameRate: number) {
    const nativeBitrate = resolution === 0 || resolution > 720 || frameRate > 30 ? 9e6 : 3.5e6;
    return Math.round(Math.min(Math.max(width * height * frameRate * 0.08, nativeBitrate), 20e6));
}

// getSettings() can report a wrong size right after applyConstraints, so calculate the size from the source size
function getCaptureSize(track: MediaStreamTrack, resolution: number) {
    const trackSettings = track.getSettings();
    const capabilities = track.getCapabilities?.() ?? {};
    const sourceWidth = capabilities.width?.max ?? trackSettings.width ?? 0;
    const sourceHeight = capabilities.height?.max ?? trackSettings.height ?? resolution;
    // Only limit the height, the width follows the aspect ratio of the source
    const scale = resolution ? Math.min(1, resolution / sourceHeight) : 1;
    return { width: Math.round(sourceWidth * scale), height: Math.round(sourceHeight * scale) };
}

function applyStreamQuality(conn: WebRTCConnection, track: MediaStreamTrack, { resolution, frameRate }: GoLiveQuality) {
    const { width, height } = getCaptureSize(track, resolution);
    const size = { width, height, framerate: frameRate };
    const bitrateMax = getMaxBitrate(resolution, width, height, frameRate);

    conn.videoQualityManager.setGoliveQuality({ capture: size, encode: size, bitrateMax });

    const params = conn.videoStreamParameters.find(p => p.quality === 100) ?? conn.videoStreamParameters[0];
    if (params) {
        params.maxResolution = resolution
            ? { type: "fixed", width, height }
            : { type: "source", width: 0, height: 0 };
    }

    logger.info("Applied stream quality", { width, height, frameRate, bitrateMax });
}

const settings = definePluginSettings({
    contentHint: {
        type: OptionType.SELECT,
        description: "Content Hint",
        hidden: true,
        options: StreamContentHint.map(hint => ({ label: hint, value: hint, default: hint === "motion" }))
    }
});

const disableStreamPreviews = getUserSettingLazy<boolean>("voiceAndVideo", "disableStreamPreviews")!;

export default definePlugin({
    name: "WebScreenShare",
    authors: [Devs.ThaUnknown],
    description: "Adds a screenshare options menu. Allows for changing resolution, framerate, encoding hints, and system audio settings.",
    tags: ["Voice", "Utility"],
    enabledByDefault: true,
    settings,
    managedStyle,

    start() {
        navigator.mediaDevices.getDisplayMedia = openScreenSharePicker;
    },
    stop() {
        navigator.mediaDevices.getDisplayMedia = getDisplayMedia;
    },

    patches: [
        {
            // Discord resets the streaming settings to 720p or 1080p at 30fps before it opens the picker on web, keep the saved settings
            find: ".getMediaEngine().getDesktopSource(",
            replacement: {
                match: /\(0,\i\.\i\)\(\{preset:\i\.\i\.PRESET_CUSTOM,resolution:\i\.height,frameRate:\i\.\i\.FPS_30,soundshareEnabled:!0\}\),(?=\i\.\i\.getMediaEngine\(\)\.getDesktopSource\()/,
                replace: ""
            }
        },
        {
            // Discord ignores the quality on web. It derives the quality from the track constraints, without the frame rate
            // and with a fixed bitrate, and cannot change the quality of an ongoing stream
            find: "BaseWebRTCConnection.updateVideoQuality",
            replacement: {
                // Run after the rest of setGoLiveSource, which gives the stream its desktop input
                match: /setGoLiveSource\((\i),\i\)\{(?=if\(null==\1\)this\.eachConnection\(\i=>\i\.setDesktopInput\(null\))/,
                replace: "$&queueMicrotask(()=>$self.applyGoLiveQuality(this,$1));"
            }
        },
        {
            find: "getDefaultGoliveQuality(){",
            replacement: {
                // When viewers want a smaller resolution, Discord lowers the bitrate but keeps the full encode resolution.
                // Lower the encode resolution too, like the native client does
                match: /(getGoliveQuality\(\i,(\i)\)\{.+?return new \i\(\{encode:)this\.goliveMaxQuality\.encode/,
                replace: "$1$self.scaleEncodeToSinkWants(this.goliveMaxQuality.encode,$2)"
            }
        },
        {
            // Discord shows the Stream Settings submenu only in the native client
            find: '"stream-settings-audio-enable"',
            replacement: {
                match: /\i\.isPlatformEmbedded(?=\?\(0,\i\.jsx\)\(\i\.\i,\{id:"stream-settings")/,
                replace: "true"
            }
        }
    ],

    // Discord only calls this when the viewers want fewer pixels than the encode size
    scaleEncodeToSinkWants(encode: VideoSize, sinkPixelCount: number) {
        const scale = Math.sqrt(sinkPixelCount / (encode.width * encode.height));
        return {
            ...encode,
            width: Math.round(encode.width * scale),
            height: Math.round(encode.height * scale)
        };
    },

    // Called when a stream starts and when its quality changes
    async applyGoLiveQuality(engine: MediaEngine, source: GoLiveSourceOptions | null) {
        if (!source?.desktopDescription) return;

        try {
            const connections: WebRTCConnection[] = [];
            engine.eachConnection(c => c.streamUserId === c.userId && connections.push(c as WebRTCConnection), "stream");

            for (const conn of connections) {
                const track = conn.input.getVideoStream()?.getVideoTracks()[0];
                if (!track) continue;

                // Discord limits the size in updateVideoQuality, from the capture size of applyStreamQuality
                await track.applyConstraints({ frameRate: { max: source.quality.frameRate } });
                // The streaming settings store can update after this handler, so use the requested quality
                applyStreamQuality(conn, track, source.quality);
                conn.updateVideoQuality();
                conn.handleVideo(conn.input.getVideoStreamId());
            }
        } catch (e) {
            logger.error("Failed to apply the stream quality", e);
        }
    }
});

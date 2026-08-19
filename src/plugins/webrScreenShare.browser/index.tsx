/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, useSettings } from "@api/Settings";
import {
    BaseText,
    Divider,
} from "@components/index";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Checkbox, closeModal, Modal, openModal, Select, Slider } from "@webpack/common";

import managedStyle from "./styles.css?managed";

const cl = classNameFactory("vc-screen-picker-");

class NotAllowedError extends Error {
    name = "NotAllowedError";
}

const logger = new Logger("VencordScreenShare");

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

function ModalComponent({ modalProps, submit, close, options }: {
    modalProps: any;
    submit: (data: Promise<MediaStream>) => void;
    close: () => void;
    options: DisplayMediaStreamOptions;
}) {
    const settings = useSettings(["plugins.webScreenShare.*"]).plugins.webScreenShare;

    async function stream() {
        try {
            const frameRate = Number(settings.frameRate);
            const height = Number(settings.resolution);

            // const conn = [...MediaEngineStore.getMediaEngine().connections].find(
            //     connection => connection.userId === UserStore.getCurrentUser().id
            // );
            // console.log(MediaEngineStore.getMediaEngine());

            const videoOptions = typeof options?.video !== "boolean" && !!options.video ? options.video : {};
            const audioOptions = typeof options?.audio !== "boolean" && !!options.audio ? options.audio : {};
            // allow browser to constrain itself
            delete videoOptions.width;

            submit(
                getDisplayMedia({
                    video: {
                        ...videoOptions,
                        frameRate,
                        height,
                    },
                    audio: {
                        ...audioOptions,
                        restrictOwnAudio: true,
                    },
                    surfaceSwitching: "include",
                    systemAudio: settings.systemAudio ? "exclude" : "include"
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
                actions={[
                    {
                        text: "Stream",
                        onClick: stream
                    }
                ]}
            >
                <div>
                    <div style={{ padding: "var(--space-sm) 0" }}>
                        <BaseText size="md" weight="medium" >Resolution</BaseText>
                        <Slider
                            markers={[480, 720, 1080, 1440, 2160]}
                            minValue={480}
                            maxValue={2160}
                            initialValue={Number(settings.resolution)}
                            onValueChange={value => settings.resolution = value.toString()}
                            stickToMarkers={true}
                        />
                    </div>
                    <div style={{ padding: "var(--space-sm) 0" }}>
                        <BaseText size="md" weight="medium" >Frame Rate</BaseText>
                        <Slider
                            markers={[15, 30, 60]}
                            minValue={15}
                            maxValue={60}
                            initialValue={Number(settings.frameRate)}
                            onValueChange={value => settings.frameRate = value.toString()}
                            stickToMarkers={true}
                        />
                    </div>
                    <div style={{ padding: "var(--space-sm) 0" }}>
                        <BaseText size="md" weight="medium" >Stream Mode</BaseText>
                        <Select
                            options={[
                                { label: "Smoother video", value: "motion", default: true },
                                { label: "Cleaner text", value: "detail" },
                            ]}
                            serialize={String}
                            select={value => (settings.contentHint = value)}
                            isSelected={v => v === settings.contentHint}
                            closeOnSelect={true}
                            placeholder="Stream Mode"
                        />
                    </div>
                    <div style={{ padding: "var(--space-sm) 0" }}>
                        <Checkbox
                            value={settings.systemAudio}
                            onChange={(_e, value) => (settings.systemAudio = value)}
                            shape="box"
                            reverse={true}>
                            <BaseText size="md" weight="medium" >Mute stream audio</BaseText>
                            <BaseText size="sm" style={{ color: "var(--text-subtle)" }}>Mute stream audio</BaseText>
                        </Checkbox>
                    </div>
                    <div style={{ padding: "var(--space-sm) 0" }}>
                        <Checkbox
                            value={false}
                            onChange={(_e, value) => { }}
                            shape="box"
                            reverse={true}>
                            <BaseText size="md" weight="medium" >Show Stream Previews</BaseText>
                            <BaseText size="sm" style={{ color: "var(--text-subtle)" }}>Allows others to see a preview of your stream before they join. // TODO IMPLEMENTME :)</BaseText>
                        </Checkbox>
                    </div>
                </div>
                <Divider />
            </Modal>
        </div>
    );
}

// this is kinda shit and it really should be done via videoQualityManager
const StreamResolution = ["480", "720", "1080", "1440", "2160"] as const;
const StreamFps = ["15", "30", "60"] as const;
const StreamContentHint = ["motion", "detail"] as const;

const settings = definePluginSettings({
    resolution: {
        type: OptionType.SELECT,
        description: "Resolution",
        hidden: true,
        options: StreamResolution.map(res => ({ label: res, value: res, default: res === "1080" }))
    },
    frameRate: {
        type: OptionType.SELECT,
        description: "Frame Rate",
        hidden: true,
        options: StreamFps.map(fps => ({ label: fps, value: fps, default: fps === "60" }))
    },
    contentHint: {
        type: OptionType.SELECT,
        description: "Frame Rate",
        hidden: true,
        options: StreamContentHint.map(hint => ({ label: hint, value: hint, default: hint === "motion" }))
    },
    systemAudio: {
        type: OptionType.BOOLEAN,
        description: "Mute system audio",
        hidden: true
    }
});

export default definePlugin({
    name: "webScreenShare",
    authors: [Devs.ThaUnknown],
    description: "Screenshare UI on browser. TODO better description :)",
    tags: ["Voice"],
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
            find: "this.getDefaultGoliveQuality()",
            replacement: {
                match: /this\.getDefaultGoliveQuality\(\)/,
                replace: "$self.getGoliveMaxQuality($&)"
            }
        }
    ],
    // this is a maximum, not a true default, this is later constrained properly in GDM anyways
    // and this way we don't pre-emptively neuter the max stream quality
    getGoliveMaxQuality(opts: any) {
        const framerate = 120;
        const height = 2160;
        const width = 3840;

        Object.assign(opts, {
            bitrateMin: 500000,
            bitrateMax: 8000000,
            bitrateTarget: 600000
        });
        if (opts?.encode) {
            Object.assign(opts.encode, {
                framerate,
                width,
                height,
                pixelCount: height * width
            });
        }
        Object.assign(opts.capture, {
            framerate,
            width,
            height,
            pixelCount: height * width
        });
        return opts;
    }
});

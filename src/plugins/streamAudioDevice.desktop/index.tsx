/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Button, closeModal, MediaEngineStore, Menu, Modal, openModal, Select, showToast, Toasts, useEffect, useState } from "@webpack/common";

import { StreamAudioCapture } from "./capture";
import { NativeSource, NativeStreamAudio, NativeStreamConnection } from "./nativeCapture";

migratePluginSettings("StreamAudioDevice", "StreamAudio");

const logger = new Logger("StreamAudioDevice");
const settings = definePluginSettings({
    audioSource: {
        type: OptionType.COMPONENT,
        component: () => <AudioSourceSettings />
    }
}).withPrivateSettings<{
    desktopDeviceId?: string;
    vesktopDeviceId?: string;
}>();
const capture = new StreamAudioCapture(reportError);
const nativeCapture = new NativeStreamAudio();
let originalDisplayMedia: MediaDevices["getDisplayMedia"] | undefined;
let wrappedDisplayMedia: MediaDevices["getDisplayMedia"] | undefined;
let running = false;

interface InputOption { label: string; value: string; }

function selectedDevice() {
    return (IS_DISCORD_DESKTOP ? settings.store.desktopDeviceId : settings.store.vesktopDeviceId) ?? "";
}

function selectDevice(value: string) {
    if (IS_DISCORD_DESKTOP) settings.store.desktopDeviceId = value;
    else settings.store.vesktopDeviceId = value;
}

function reportError(message: string) {
    logger.error(message);
    showToast(message, Toasts.Type.FAILURE);
}

function nativeDevices() {
    return Object.values(MediaEngineStore.getInputDevices()).filter(device => !device.disabled);
}

async function listInputs(): Promise<InputOption[]> {
    if (IS_DISCORD_DESKTOP)
        return nativeDevices().map(device => ({ label: device.name, value: device.guid || device.id }));
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === "audioinput" && device.deviceId)
        .map((device, index) => ({ label: device.label || `Microphone ${index + 1}`, value: device.deviceId }));
}

function AudioSourceSettings() {
    settings.use(["desktopDeviceId", "vesktopDeviceId"]);
    const [inputs, setInputs] = useState<InputOption[]>([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let mounted = true;
        let revision = 0;
        const refresh = async () => {
            const request = ++revision;
            try {
                const devices = await listInputs();
                if (mounted && request === revision) { setInputs(devices); setError(""); }
            } catch {
                if (mounted) setError("Could not list audio inputs. Check microphone access.");
            }
        };
        void refresh();
        navigator.mediaDevices.addEventListener("devicechange", refresh);
        if (IS_DISCORD_DESKTOP) MediaEngineStore.addChangeListener(refresh);
        return () => {
            mounted = false;
            navigator.mediaDevices.removeEventListener("devicechange", refresh);
            if (IS_DISCORD_DESKTOP) MediaEngineStore.removeChangeListener(refresh);
        };
    }, []);

    const value = selectedDevice();
    const options = [{ label: "Discord Default", value: "" }, ...inputs];
    if (value && !inputs.some(input => input.value === value))
        options.push({ label: "Selected input (unavailable)", value });

    return <>
        <Heading tag="h3">Stream Audio</Heading>
        <Select
            options={options}
            placeholder="Discord Default"
            select={selectDevice}
            isSelected={option => option === value}
            serialize={option => option}
            closeOnSelect
        />
        <Paragraph>Choose Discord Default or an audio input such as Wave Link Stream. The input replaces stream audio; your voice-chat microphone stays unchanged. Restart screen sharing after changing this setting.</Paragraph>
        <Paragraph>For Wave Link, exclude Discord voices from this mix to prevent viewers hearing themselves.</Paragraph>
        {!IS_DISCORD_DESKTOP && <Button disabled={busy} onClick={async () => {
            setBusy(true);
            let permissionStream: MediaStream | undefined;
            try {
                permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                setInputs(await listInputs());
                setError("");
            } catch {
                setError("Microphone access was denied or no input is available.");
            } finally {
                permissionStream?.getTracks().forEach(track => track.stop());
                setBusy(false);
            }
        }}>Allow microphone access / refresh inputs</Button>}
        {error && <Paragraph>{error}</Paragraph>}
    </>;
}

function openSettings() {
    const key = openModal(props => <Modal {...props} title="Stream Audio" actions={[
        { text: "Done", variant: "primary", onClick: () => closeModal(key) }
    ]}><AudioSourceSettings /></Modal>);
}

function checkNativeDevices() {
    if (nativeCapture.removeUnavailable(new Set(nativeDevices().map(device => device.guid || device.id))))
        reportError("Stream Audio input disconnected. Select an available input and restart sharing.");
}

export default definePlugin({
    name: "StreamAudioDevice",
    description: "Use a microphone or virtual mix as screen-share audio, independently of your voice-chat microphone",
    authors: [Devs.Wuerfelhusten],
    tags: ["Voice", "Media"],
    searchTerms: ["Wave Link", "microphone", "stream mix", "screenshare"],
    settings,
    toolboxActions: { "Stream Audio": openSettings },
    requiresRestart: true,
    patches: [
        {
            find: "stream-settings-audio-enable",
            replacement: {
                match: /(?<=children:\[)(?=\i,\i\?\i:null,\i,\i,\i\])/,
                replace: "$self.renderMenu(),"
            }
        },
        {
            find: "createOwnStreamConnectionWithOptions",
            predicate: () => IS_DISCORD_DESKTOP,
            group: true,
            replacement: [
                {
                    match: /setGoLiveSource\((\i)\)\{(?=let\{resolution:)/,
                    replace: "setGoLiveSource($1){$1=$self.prepareNativeSource(this,$1);"
                },
                {
                    match: /clearDesktopSource\(\)\{(?=this\.goLiveSourceIdentifier)/,
                    replace: "clearDesktopSource(){$self.releaseNative(this);"
                },
                {
                    match: /this\.conn\.destroy\(\i\)/g,
                    replace: "($self.releaseNative(this),$&)"
                }
            ]
        }
    ],

    renderMenu: () => <Menu.MenuItem id="vc-stream-audio" label="Stream Audio" action={openSettings} />,

    prepareNativeSource(connection: NativeStreamConnection, source: NativeSource) {
        if (!running) return source;
        const device = selectedDevice();
        try {
            return nativeCapture.prepare(connection, source, device,
                !device || nativeDevices().some(input => (input.guid || input.id) === device));
        } catch (error) {
            reportError(error instanceof Error ? error.message : "Could not open Stream Audio input.");
            throw error;
        }
    },

    releaseNative: (connection: NativeStreamConnection) => nativeCapture.release(connection),

    start() {
        running = true;
        if (IS_DISCORD_DESKTOP) {
            MediaEngineStore.addChangeListener(checkNativeDevices);
            return;
        }
        originalDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        const original = originalDisplayMedia;
        wrappedDisplayMedia = function (this: MediaDevices, options) {
            const device = selectedDevice();
            if (!running || !device) return original.call(this, options);
            // Call synchronously: getDisplayMedia requires transient user activation.
            return capture.capture(original.call(this, { ...options, audio: false }), device,
                constraints => navigator.mediaDevices.getUserMedia(constraints));
        };
        navigator.mediaDevices.getDisplayMedia = wrappedDisplayMedia;
    },

    stop() {
        running = false;
        capture.stop();
        nativeCapture.stop();
        if (IS_DISCORD_DESKTOP) MediaEngineStore.removeChangeListener(checkNativeDevices);
        if (wrappedDisplayMedia && navigator.mediaDevices.getDisplayMedia === wrappedDisplayMedia)
            navigator.mediaDevices.getDisplayMedia = originalDisplayMedia!;
    }
});

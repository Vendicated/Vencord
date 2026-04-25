/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { identity } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { MediaEngineStore, Select, Slider, useState, useStateFromStores } from "@webpack/common";

const VoiceActions = findByPropsLazy("getOutputVolume");

const settings = definePluginSettings({
    saveDropdownState: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Saves the dropdown state of the settings"
    },
});

function VolumeSlider({ label, max, getVal, setVal }: {
    label: string;
    max: number;
    getVal: () => number;
    setVal: (v: number) => void;
}) {
    const value = useStateFromStores([MediaEngineStore], getVal);

    return (
        <Slider
            maxValue={max}
            minValue={0}
            label={label}
            initialValue={value}
            onValueChange={setVal}
        />
    );
}

function DeviceSelect({ label, getDeviceId, getDevices, setDevice, disabled }: {
    label: string;
    getDeviceId: () => string;
    getDevices: () => any[];
    setDevice: (id: string) => void;
    disabled?: boolean;
}) {
    const selected = useStateFromStores([MediaEngineStore], getDeviceId);
    const devices = useStateFromStores([MediaEngineStore], getDevices);

    return (
        <Select
            options={devices.map(d => ({
                value: d.id,
                label: d.name || "No camera available"
            }))}
            serialize={identity}
            label={label}
            disabled={disabled}
            isSelected={v => v === selected}
            select={setDevice}
        />
    );
}

function VoiceSettings() {
    const [open, setOpen] = useState(settings.store.saveDropdownState);
    const videoDevices = useStateFromStores([MediaEngineStore], () => Object.values(MediaEngineStore.getVideoDevices()));
    const noCamera = videoDevices.length === 0 || videoDevices.every((d: any) => d.disabled || !d.name);

    return (
        <div style={{ marginTop: "20px" }}>
            <div style={{ marginBottom: "10px" }}>
                <Link className="vc-panelsettings-button" onClick={() => {
                    settings.store.saveDropdownState = !open;
                    setOpen(!open);
                }}>
                    {open ? "▼ Hide" : "► Settings"}
                </Link>
            </div>

            {open && (
                <Flex flexDirection="column" gap={6}>
                    <VolumeSlider label="Output volume" max={200} getVal={() => MediaEngineStore.getOutputVolume()} setVal={VoiceActions.setOutputVolume} />
                    <VolumeSlider label="Input volume" max={100} getVal={() => MediaEngineStore.getInputVolume()} setVal={VoiceActions.setInputVolume} />
                    <DeviceSelect label="Output device" getDeviceId={() => MediaEngineStore.getOutputDeviceId()} getDevices={() => Object.values(MediaEngineStore.getOutputDevices())} setDevice={VoiceActions.setOutputDevice} />
                    <DeviceSelect label="Input device" getDeviceId={() => MediaEngineStore.getInputDeviceId()} getDevices={() => Object.values(MediaEngineStore.getInputDevices())} setDevice={VoiceActions.setInputDevice} />
                    <DeviceSelect label="Camera" getDeviceId={() => MediaEngineStore.getVideoDeviceId()} getDevices={() => Object.values(MediaEngineStore.getVideoDevices())} setDevice={VoiceActions.setVideoDevice} disabled={noCamera} />
                </Flex>
            )}
        </div>
    );
}

export default definePlugin({
    name: "VcPanelSettings",
    description: "Control voice settings inside the voice panel",
    authors: [Devs.nin0dev, Devs.RoScripter999],
    settings,

    VoiceSettings: ErrorBoundary.wrap(VoiceSettings, { noop: true }),

    patches: [
        {
            find: ".renderChannelButtons()",
            replacement: {
                match: /(?<=this\.renderChannelButtons\(\))/,
                replace: ",$self.VoiceSettings()"
            }
        }
    ]
});

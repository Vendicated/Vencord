/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, showToast } from "@webpack/common";

import { SoundOverrideComponent } from "./components/SoundOverrideComponent";
import { makeEmptyOverride, SoundOverride, soundTypes } from "./types";

const OVERRIDES_KEY = "CustomSounds_overrides";

let overrides: Record<string, SoundOverride> = soundTypes.reduce(
    (result, sound) => ({
        ...result,
        [sound.id]: makeEmptyOverride(),
    }),
    {}
);

const settings = definePluginSettings({
    overrides: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const [resetTrigger, setResetTrigger] = React.useState(0);
            const fileInputRef = React.useRef<HTMLInputElement>(null);

            const resetOverrides = () => {
                soundTypes.forEach(type => {
                    overrides[type.id] = makeEmptyOverride();
                });
                DataStore.set(OVERRIDES_KEY, overrides);
                setResetTrigger(prev => prev + 1);
            };

            const triggerFileUpload = () => {
                fileInputRef.current?.click();
            };

            const handleSettingsUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e: ProgressEvent<FileReader>) => {
                        try {
                            resetOverrides();

                            const importedSettings = JSON.parse(e.target?.result as string);

                            importedSettings.forEach((setting: any) => {
                                if (overrides[setting.id]) {
                                    overrides[setting.id] = {
                                        enabled: setting.enabled ?? false,
                                        selectedSound: setting.selectedSound ?? "default",
                                        url: setting.selectedSound === "custom" ? (setting.url || "") : "",
                                        volume: setting.volume ?? 100,
                                        useFile: setting.useFile ?? false
                                    };
                                }
                            });

                            DataStore.set(OVERRIDES_KEY, overrides);

                            setResetTrigger(prev => prev + 1);

                            showToast("Settings imported successfully!");
                        } catch (error) {
                            console.error("Error importing settings:", error);
                            showToast("Error importing settings. Check console for details.");
                        }
                    };

                    reader.readAsText(file);
                    event.target.value = "";
                }
            };

            const downloadSettings = () => {
                const settingsData = Object.entries(overrides).map(([key, value]) => ({
                    id: key,
                    enabled: value.enabled,
                    selectedSound: value.selectedSound,
                    url: value.selectedSound === "custom" ? value.url : null,
                    volume: value.volume,
                    useFile: value.useFile,
                }));
                const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "customSounds-settings.json";
                a.click();
                URL.revokeObjectURL(url);
            };

            return (
                <>
                    <div className="vc-custom-sounds-buttons">
                        <Button
                            color={Button.Colors.BRAND}
                            onClick={triggerFileUpload}
                        >
                            Import
                        </Button>
                        <Button
                            color={Button.Colors.PRIMARY}
                            onClick={downloadSettings}
                        >
                            Export
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            style={{ display: "none" }}
                            onChange={handleSettingsUpload}
                        />
                    </div>

                    {soundTypes.map(type => (
                        <SoundOverrideComponent
                            key={`${type.id}-${resetTrigger}`}
                            type={type}
                            override={overrides[type.id]}
                            overrides={overrides}
                            onChange={() => DataStore.set(OVERRIDES_KEY, overrides)}
                        />
                    ))}
                </>
            );
        },
    },
});

export function isOverriden(id: string): boolean {
    return overrides[id]?.enabled ?? false;
}

export function findOverride(id: string): SoundOverride | null {
    const result = overrides[id];
    if (!result?.enabled) return null;

    return result;
}

export default definePlugin({
    name: "CustomSounds",
    description: "Customize Discord's sounds.",
    authors: [Devs.ScattrdBlade, Devs.TheKodeToad],
    nexulien: true,
    patches: [
        // sound class
        {
            find: 'Error("could not play audio")',
            replacement: [
                // override URL
                {
                    match: /(?<=new Audio;\i\.src=)\i\([0-9]+\)\("\.\/"\.concat\(this\.name,"\.mp3"\)/,
                    replace: "$self.findOverride(this.name)?.url || $&",
                },
                // override volume
                {
                    match: /Math.min\(\i\.\i\.getOutputVolume\(\)\/100\*this\._volume/,
                    replace: "$& * ($self.findOverride(this.name)?.volume ?? 100) / 100",
                },
            ],
        },
        // force classic soundpack for overridden sounds
        {
            find: ".playWithListener().then",
            replacement: {
                match: /\i\.\i\.getSoundpack\(\)/,
                replace: '$self.isOverriden(arguments[0]) ? "classic" : $&',
            },
        },
    ],
    settings,
    findOverride,
    isOverriden,
    async start() {
        overrides = (await DataStore.get(OVERRIDES_KEY)) ?? {};
        for (const type of soundTypes) overrides[type.id] ??= makeEmptyOverride();
    },
});

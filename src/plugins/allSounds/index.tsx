/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { Select, useState } from "@webpack/common";

import { eventPreset, getAudioOptions, Overrides, SOUND_KEYS } from "./types";

type SoundMap = Record<string, string>;

const settings = definePluginSettings({
    overrides: {
        type: OptionType.COMPONENT,
        default: {} as Overrides,
        component: () => <SoundEditor />
    }
});

function SoundEditor() {
    const { overrides } = settings.use(["overrides"]);
    const { WebAudioSound } = findByProps("WebAudioSound");

    const options = getAudioOptions();
    const setOverrides = (next: Overrides) => {
        settings.store.overrides = next;
    };

    const [selectedPreviewSound, setSelectedPreviewSound] = useState<string>("");
    const [currentPreviewInstance, setCurrentPreviewInstance] = useState<any>(null);

    const isPreviewPlaying = currentPreviewInstance !== null;

    const playPreview = async (sound: string) => {
        if (!sound) return;

        if (currentPreviewInstance) {
            currentPreviewInstance.stop();
        }

        const soundInstance = new WebAudioSound(sound, null, 1.0, 0);
        setCurrentPreviewInstance(soundInstance);

        try {
            const audio = await soundInstance.ensureAudio();
            audio.onended = () => {
                setCurrentPreviewInstance(prev => (prev === soundInstance ? null : prev));
            };

            soundInstance.play();
        } catch (e) {
            console.error("Preview Error:", e);
            setCurrentPreviewInstance(null);
        }
    };

    const stopPreview = () => {
        if (currentPreviewInstance) {
            currentPreviewInstance.stop();
            setCurrentPreviewInstance(null);
        }
    };

    return (
        <Flex flexDirection="column" gap={12} >
            <SettingsSection id="preview" name="Preview" description="Preview any sound you can find.">
                <Flex alignItems="center" gap={12}>
                    <Select
                        options={options}
                        placeholder="Select a sound"
                        closeOnSelect
                        isSelected={v => v === selectedPreviewSound}
                        select={v => {
                            setSelectedPreviewSound(v);
                        }}
                        serialize={v => String(v)}
                    />
                    <Button variant={isPreviewPlaying ? "dangerPrimary" : "primary"} onClick={() => {
                        if (isPreviewPlaying) {
                            stopPreview();
                        } else {
                            playPreview(selectedPreviewSound);
                        }
                    }}>{isPreviewPlaying ? "Stop" : "Preview"}</Button>
                </Flex>
            </SettingsSection>

            <SettingsSection id="presets" name="Presets" description="Select presets or reset all sounds.">
                <Flex gap={8} flexDirection="row" alignItems={"center"} justifyContent={"between"}>
                    <Button style={{ flex: 1 }} onClick={() => setOverrides(eventPreset("halloween"))}>Halloween</Button>
                    <Button style={{ flex: 1 }} onClick={() => setOverrides(eventPreset("winter"))}>Winter</Button>
                    <Button style={{ flex: 1 }} variant="dangerPrimary" onClick={() => setOverrides({})}>Reset</Button>
                </Flex>
            </SettingsSection>

            <SettingsSection id="sounds" name="Sounds" description="Change all sounds to whatever you want.">
                {SOUND_KEYS.map(key => {
                    const current = overrides[key] ?? key;
                    return (
                        <Flex key={key} alignItems="center" gap={12} >
                            <span style={{ flex: "0 0 200px", color: "var(--text-default, var(--text-normal))" }}>
                                {key.replace(/_/g, " ")}
                            </span>
                            <div style={{ flex: 1 }}>
                                <Select
                                    options={options}
                                    placeholder="Select a sound"
                                    closeOnSelect
                                    isSelected={v => v === current}
                                    select={v => {
                                        setOverrides({ ...overrides, [key]: v });
                                    }}
                                    serialize={v => String(v)}
                                />
                            </div>
                        </Flex>
                    );
                })}
            </SettingsSection>
        </Flex>
    );
}

let classicMap: SoundMap | null = null;
let defaultSounds: SoundMap | null = null;

export default definePlugin({
    name: "AllSounds",
    description: "Allowes you to customize every single Discord sound with all the already existing sounds on Discord (Even the hidden ones you might never heard)!",
    authors: [Devs.lil_aleks],
    settings,

    patches: [
        {
            find: 'call_ringing:"halloween_call_ringing"',
            replacement: {
                match: /function (\i)\((\i)\)\{return (\i)\[\2\]\}/,
                replace: "function $1($2){return $self.getSoundMap($2,$3)}"
            }
        }
    ],

    getSoundMap(pack: string, maps: Record<string, SoundMap>) {
        classicMap ??= Object.values(maps).find(m => m?.discodo === "discodo") ?? null;
        if (!classicMap) return maps[pack];

        defaultSounds ??= { ...classicMap };

        Object.assign(classicMap, defaultSounds, settings.store.overrides);
        return classicMap;
    },

    stop() {
        if (classicMap && defaultSounds) Object.assign(classicMap, defaultSounds);
    }
});

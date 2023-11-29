/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextArea, TextInput, useState } from "@webpack/common";
import { Channel } from "discord-types/general/index.js";
import { LiteralUnion } from "type-fest";

const DATASTORE_KEY = "DMPresets_presets";

interface Preset {
    name: string;
    text: string;
}

const createPreset: () => Preset = (name?: string, text?: string) => ({
    name: name ?? "",
    text: text ?? ""
});

let presets: Preset[] = [createPreset()];

interface PresetProps {
    presets: Preset[];
    update: () => void;
}

function Divider() {
    return <hr style={{ width: "100%", height: 0, border: "none", borderTop: "1px solid var(--background-modifier-accent)" }} />;
}

function Input({ initialValue, onChange, placeholder, style }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
    style?: React.CSSProperties;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
            style={style}
            required={true}
        />
    );
}

function Area({ initialValue, onChange, placeholder, style }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
    style?: React.CSSProperties;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextArea
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
            style={style}
            required={true}
        />
    );
}

function PresetRules({ presets, update }: PresetProps) {

    async function onClickRemove(index: number) {
        if (index === presets.length - 1) return;
        presets.splice(index, 1);

        await DataStore.set(DATASTORE_KEY, presets);
        update();
    }

    async function onChange(e: string, index: number, key: LiteralUnion<keyof Preset, string>) {
        if (index === presets.length - 1)
            presets.push(createPreset());

        presets[index][key] = e;

        if (presets[index].name === "" && presets[index].text === "" && index !== presets.length - 1)
            presets.splice(index, 1);

        await DataStore.set(DATASTORE_KEY, presets);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">Presets</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    presets.map((preset, index) =>
                        <React.Fragment key={`${preset.name}-${index}`}>
                            <Flex flexDirection="row" style={{ gap: 0 }}>
                                <Flex flexDirection="column" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <Input
                                        placeholder="Name"
                                        initialValue={preset.name}
                                        onChange={e => onChange(e, index, "name")}
                                        style={{ width: "100%" }}
                                    />
                                    <Area
                                        placeholder="Text"
                                        initialValue={preset.text}
                                        onChange={e => onChange(e, index, "text")}
                                        style={{ flexGrow: 1, width: "100%" }}
                                    />
                                </Flex>
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        color: "var(--status-danger)",
                                        ...(index === presets.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                >
                                    <DeleteIcon />
                                </Button>
                            </Flex>
                            <Divider />
                        </React.Fragment>
                    )
                }
            </Flex>
        </>
    );
}

const settings = definePluginSettings({
    presets: {
        type: OptionType.COMPONENT,
        description: "Manage presets for DMs.",
        component: () => {
            const update = useForceUpdater();

            return (
                <PresetRules
                    presets={presets}
                    update={update}
                />
            );
        }
    }
});

export default definePlugin({
    name: "DMPresets",
    description: "Reply to DMs with a single click.",
    authors: [Devs.Nickyux],

    settings,

    patches: [
        {
            find: ".BEGINNING_DM",
            replacement: {
                match: /if\((\i)===(\i).ChannelTypes.DM\)(.{0,300}),channel:(\i)(.{1,20})\]\}/,
                replace: "if($1===$2.ChannelTypes.DM)$3,channel:$4$5,$self.presetRow($4)]}"
            }
        }
    ],

    presetRow(channel: Channel) {
        if (!presets || (presets.length === 1 && presets[0].name === "" && presets[0].text === "")) return null;

        return <ul style={{ display: "flex", width: "100%", gap: "0.5rem", alignItems: "center", paddingTop: "16px", maxWidth: "100%", flexWrap: "wrap" }}>
            {
                presets.map((preset, index) => preset.name && preset.text &&
                    <li key={`${preset.name}-${index}`} style={{ listStyle: "none", maxWidth: "100%", overflow: "hidden" }}>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={() => {
                                sendMessage(channel.id, {
                                    content: preset.text
                                });
                            }}
                        >
                            {preset.name}
                        </Button>
                    </li>
                )
            }
        </ul>;
    },

    async start() {
        presets = await DataStore.get(DATASTORE_KEY) ?? [createPreset()];
    }
});

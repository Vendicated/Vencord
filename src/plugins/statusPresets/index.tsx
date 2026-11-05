/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

const cl = classNameFactory("vc-status-presets-");

interface StatusEmoji {
    id: string | null;
    name: string;
    animated: boolean;
}

interface Preset {
    text: string;
    emoji: StatusEmoji | null;
}

interface PresetsProps {
    text: string;
    setText(text: string): void;
    emoji: StatusEmoji | null;
    setEmoji(emoji: StatusEmoji | null): void;
}

const CustomStatusSetting = getUserSettingLazy("status", "customStatus")!;

const settings = definePluginSettings({
    presets: {
        type: OptionType.CUSTOM,
        default: [] as Preset[]
    }
});

const isSamePreset = (a: Preset, b: Preset) =>
    a.text === b.text && a.emoji?.id === b.emoji?.id && a.emoji?.name === b.emoji?.name;

function PresetLabel({ preset: { text, emoji } }: { preset: Preset; }) {
    return (
        <>
            {emoji?.id
                ? <img className={cl("emoji")} src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}?size=32`} alt={emoji.name} />
                : emoji?.name}
            {text && <span>{text}</span>}
        </>
    );
}

function applyPreset({ text, emoji }: Preset) {
    CustomStatusSetting.updateSetting({
        text,
        emojiId: emoji?.id ?? "0",
        emojiName: emoji?.name ?? "",
        expiresAtMs: "0",
        createdAtMs: String(Date.now())
    });
}

function Presets({ text, setText, emoji, setEmoji }: PresetsProps) {
    const { presets } = settings.use(["presets"]);
    const current: Preset = { text: text.trim(), emoji };
    const canSave = (current.text || emoji) && !presets.some(p => isSamePreset(p, current));

    return (
        <div className={cl("list")}>
            {presets.map((preset, i) => (
                <div className={cl("preset")} key={i}>
                    <button
                        className={cl("apply")}
                        onClick={() => {
                            setText(preset.text);
                            setEmoji(preset.emoji);
                        }}
                    >
                        <PresetLabel preset={preset} />
                    </button>
                    <button
                        className={cl("delete")}
                        aria-label="Delete preset"
                        onClick={() => settings.store.presets = presets.filter(p => p !== preset)}
                    >
                        ×
                    </button>
                </div>
            ))}
            <Button
                size="min"
                variant="secondary"
                disabled={!canSave}
                onClick={() => settings.store.presets = [...presets, current]}
            >
                Save as Preset
            </Button>
        </div>
    );
}

const StatusMenuPatch: NavContextMenuPatchCallback = children => {
    const { presets } = settings.store;
    if (!presets.length) return;

    children.push(
        <Menu.MenuSeparator />,
        ...presets.map((preset, i) => (
            <Menu.MenuItem
                id={`vc-status-preset-${i}`}
                key={i}
                label={<PresetLabel preset={preset} />}
                action={() => applyPreset(preset)}
            />
        ))
    );
};

export default definePlugin({
    name: "StatusPresets",
    description: "Save custom statuses as presets and switch between them in one click",
    tags: ["Utility", "Customisation"],
    authors: [Devs.Osheun],
    settings,

    patches: [
        {
            find: '"custom-status-input"',
            replacement: {
                match: /(?<=\[(\i),(\i)\]=\i\.useState\(\i\?\.state\?\?""\),\[(\i),(\i)\]=\i\.useState\(\i\?\.emoji\?\?null\).+?)children:\[(?=\(0,\i\.jsx\)\(\i\.\i,{tag:"label",htmlFor:)/,
                replace: "children:[$self.renderPresets({text:$1,setText:$2,emoji:$3,setEmoji:$4}),"
            }
        }
    ],

    contextMenus: {
        "set-status-submenu": StatusMenuPatch
    },

    renderPresets: ErrorBoundary.wrap(Presets, { noop: true })
});

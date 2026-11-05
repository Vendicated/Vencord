/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

interface CustomStatus {
    text: string;
    emojiId: string;
    emojiName: string;
    expiresAtMs: string;
    createdAtMs: string;
}

type Preset = Pick<CustomStatus, "text" | "emojiId" | "emojiName">;

const CustomStatusSetting = getUserSettingLazy<CustomStatus | undefined>("status", "customStatus")!;

const settings = definePluginSettings({
    presets: {
        type: OptionType.CUSTOM,
        default: [] as Preset[]
    }
});

const isSamePreset = (a: Preset, b: Preset) => a.text === b.text && a.emojiId === b.emojiId && a.emojiName === b.emojiName;

function getLabel({ text, emojiId, emojiName }: Preset) {
    return emojiId === "0" && emojiName ? `${emojiName} ${text}` : text || emojiName;
}

function applyPreset(preset: Preset) {
    CustomStatusSetting.updateSetting({
        ...preset,
        expiresAtMs: "0",
        createdAtMs: String(Date.now())
    });
}

const StatusMenuPatch: NavContextMenuPatchCallback = children => {
    const current = CustomStatusSetting.getSetting();
    const currentPreset = current && { text: current.text, emojiId: current.emojiId, emojiName: current.emojiName };
    const { presets } = settings.store;

    children.push(
        <Menu.MenuSeparator />,
        ...presets.map((preset, i) => (
            <Menu.MenuItem
                id={`vc-status-preset-${i}`}
                key={i}
                label={getLabel(preset)}
                action={() => applyPreset(preset)}
            >
                <Menu.MenuItem
                    id={`vc-status-preset-${i}-delete`}
                    label="Delete"
                    color="danger"
                    action={() => settings.store.presets = presets.filter(p => p !== preset)}
                />
            </Menu.MenuItem>
        )),
        <Menu.MenuItem
            id="vc-status-preset-save"
            label="Save Current Status"
            disabled={!currentPreset || presets.some(p => isSamePreset(p, currentPreset))}
            action={() => currentPreset && (settings.store.presets = [...presets, currentPreset])}
        />
    );
};

export default definePlugin({
    name: "StatusPresets",
    description: "Save custom statuses and switch between them from the status menu",
    tags: ["Utility", "Customisation"],
    authors: [Devs.Osheun],
    settings,

    contextMenus: {
        "set-status-submenu": StatusMenuPatch
    }
});

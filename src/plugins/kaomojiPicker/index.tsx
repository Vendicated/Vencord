/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ActiveView } from "@vencord/discord-types";
import { ExpressionPickerStore } from "@webpack/common";
import { ComponentType } from "react";

import { cl } from "./cl";
import { KaomojiPicker } from "./components/KaomojiPicker";
import { KAOMOJI_VIEW } from "./data/kaomoji";
import { loadUserData } from "./store";

export const settings = definePluginSettings({
    showRecent: {
        type: OptionType.BOOLEAN,
        description: "Show the Recent section",
        default: true
    },
    showCustom: {
        type: OptionType.BOOLEAN,
        description: "Show the Custom section",
        default: true
    },
    recentCap: {
        type: OptionType.NUMBER,
        description: "How many recently used kaomoji to keep",
        default: 16
    }
});

export default definePlugin({
    name: "KaomojiPicker",
    description: "Adds a Kaomoji Tab",
    tags: ["Emotes", "Chat"],
    authors: [Devs.Shiro],
    settings,

    patches: [
        {
            find: /onlyEmojis[\s\S]*?role:"tablist"/,
            group: true,
            replacement: [
                {
                    // https://regex101.com/r/3sNGIb/2
                    match: /(role:"tablist"[^>}]*?children:\s*\[(?:[\w$]+\s*,\s*)*([\w$]+),)/,
                    replace: "$1$self.renderKaomojiTab($2.type,$self.useActiveView()===\"vc-kaomoji-picker-tab\"),"
                },
                {
                    // https://regex101.com/r/yjxYE4/1
                    match: /([\w$]+===[\w$.]+\.EMOJI\|\|[\w$.?]+onlyEmojis\s*===?\s*(?:!0|true)\?)/,
                    replace: "$self.useActiveView()===\"vc-kaomoji-picker-tab\"?$self.renderKaomojiGrid():$1"
                }
            ]
        }
    ],

    start() {
        loadUserData();
        document.addEventListener("keydown", onKeyDown);
    },

    stop() {
        document.removeEventListener("keydown", onKeyDown);
        if (chordTimeout) clearTimeout(chordTimeout);
        chordArmed = false;
    },

    renderKaomojiTab(Tab: ComponentType<any>, active: boolean) {
        return (
            <Tab
                id={cl("picker-tab")}
                aria-controls={cl("tab-panel")}
                aria-selected={active}
                isActive={active}
                viewType="vc-kaomoji-picker-tab"
            >
                (＾▽＾)
            </Tab>
        );
    },

    renderKaomojiGrid() {
        return (
            <div
                id={cl("tab-panel")}
                aria-labelledby={cl("picker-tab")}
                role="tabpanel"
                className={cl("panel")}
            >
                <KaomojiPicker />
            </div>
        );
    },

    useActiveView(): ActiveView | null {
        return ExpressionPickerStore.useExpressionPickerStore(s => s.activeView) ?? null;
    },

    openKaomojiView
});

export function openKaomojiView() {
    ExpressionPickerStore.setExpressionPickerView(KAOMOJI_VIEW);
}

let chordArmed = false;
let chordTimeout: ReturnType<typeof setTimeout> | null = null;

const isCtrl = (e: KeyboardEvent) => (IS_MAC ? e.metaKey : e.ctrlKey);

function onKeyDown(e: KeyboardEvent) {
    if (isCtrl(e) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "e") {
        chordArmed = true;
        if (chordTimeout) clearTimeout(chordTimeout);
        chordTimeout = setTimeout(() => {
            chordArmed = false;
        }, 2000);
        return;
    }

    if (chordArmed && isCtrl(e) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        e.stopPropagation();
        chordArmed = false;
        if (chordTimeout) clearTimeout(chordTimeout);
        openKaomojiView();
    }
}

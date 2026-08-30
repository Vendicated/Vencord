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
import { findByPropsLazy } from "@webpack";
import { ExpressionPickerStore } from "@webpack/common";
import { ComponentType } from "react";

import { cl } from "./cl";
import { KaomojiPicker } from "./components/KaomojiPicker";
import { BUILTIN_KAOMOJI, Kaomoji } from "./data/kaomoji";
import { customEntries, loadUserData } from "./store";

const Autocomplete = findByPropsLazy("Generic", "Title", "Divider");

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
        type: OptionType.SLIDER,
        description: "How many recently used kaomoji to keep",
        markers: [4, 8, 12, 16, 20],
        default: 16,
        stickToMarkers: true
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
        },
        {
            find: "numEmojiResults:",
            group: true,
            replacement: [
                {
                    // https://regex101.com/r/QHX6nu/1
                    match: /return\{results:\{emojis:([\w$]+),stickers:([\w$]+),soundmoji:([\w$]+)\},metadata:/,
                    replace: "return{results:{emojis:$1,stickers:$2,soundmoji:$3,kaomoji:$self.getKaomoji(n)},metadata:"
                },
                {
                    // https://regex101.com/r/WOheSy/1
                    match: /(key:"emoji"\}\),)/,
                    replace: "$1...$self.renderKaomojiAutoComplete(arguments[0]),"
                },
                {
                    // https://regex101.com/r/IhJKa2/1
                    match: /(key:"(?:stickers|soundmoji)",indexOffset:)([\w$]+)\.length/g,
                    replace: "$1$2.length+($self.getKaomojiCount(arguments[0]))"
                },
                {
                    // https://regex101.com/r/0aVxg5/1
                    match: /if\(\(i-=([\w$]+)\.length\)<([\w$]+)\.length\)\{/,
                    replace: "let _km=$self.onSelectKaomoji(e,i-$1.length);if(_km)return _km;if((i-=$1.length+($self.getKaomojiCount(e)))<$2.length){"
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
                viewType={cl("picker-tab")}
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

    getKaomojiCount(e: any): number {
        return e.results.kaomoji.length ?? 0;
    },

    getKaomoji(search: string): Kaomoji[] {
        const query = search.toLowerCase().trim();
        if (!query || query.length < 2) return [];

        const allKaomoji = [...customEntries, ...BUILTIN_KAOMOJI];
        return allKaomoji
            .filter(e =>
                e.id.toLowerCase().includes(query)
                || e.value.toLowerCase().includes(query)
                || e.tags.some(t => t.toLowerCase().includes(query))
            )
            .slice(0, 6);
    },

    renderKaomojiAutoComplete(args: any) {
        const { results, selectedIndex, onClick, onHover, query } = args;
        const kaomojiList: Kaomoji[] = results.kaomoji;
        if (!kaomojiList.length) return [];

        const offset = results.emojis.length ?? 0;
        const hasEmojis = offset > 0;

        return [
            hasEmojis && (
                <Autocomplete.Divider
                    key="kaomoji-divider"
                    className={cl("autocomplete-divider")}
                />
            ),
            <Autocomplete.Title
                key="kaomoji-title"
                title={`Kaomoji matching ${query}`}
                className={cl("autocomplete-title")}
            />,
            ...kaomojiList.map((item, idx) => {
                const itemIndex = offset + idx;
                return (
                    <Autocomplete.Generic
                        key={`kaomoji-${item.id}-${idx}`}
                        text={item.value}
                        description={item.id}
                        selected={selectedIndex === itemIndex}
                        index={itemIndex}
                        onClick={() => onClick?.(itemIndex)}
                        onHover={() => onHover?.(itemIndex)}
                    />
                );
            })
        ];
    },

    onSelectKaomoji(e: any, kaomojiIndex: number) {
        const kaomojiList: Kaomoji[] = e.results.kaomoji;
        if (!kaomojiList.length) return null;

        if (kaomojiIndex >= 0 && kaomojiIndex < kaomojiList.length) {
            const selected = kaomojiList[kaomojiIndex];
            if (selected) {
                e.options.insertText(selected.value);
                return { type: "KAOMOJI" };
            }
        }

        return null;
    },

    useActiveView(): ActiveView | null {
        return ExpressionPickerStore.useExpressionPickerStore(s => s.activeView) ?? null;
    },

    openKaomojiView
});

export function openKaomojiView() {
    ExpressionPickerStore.setExpressionPickerView(cl("picker-tab"));
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

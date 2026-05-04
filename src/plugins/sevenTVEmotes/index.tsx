/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles/style.css";

import { openPluginModal } from "@components/settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel as DiscordChannel } from "@vencord/discord-types";
import type { ComponentType } from "react";

import { emoteSearchReplacer } from "./api/api";
import { SevenTVPicker } from "./components/sevenTVPicker";
import { settings } from "./utils/settings";
import { type ExpressionPickerTabProps, ExpressionPickerView } from "./utils/types";

const sevenTVPlugin = definePlugin({
    name: "7TVEmotes",
    description: "Adds a 7TV tab to the Discord expression picker",
    tags: ["Chat", "Emotes"],
    authors: [Devs.yuki6942],
    settings,

    patches: [
        {
            find: "#{intl::EXPRESSION_PICKER_CATEGORIES_A11Y_LABEL}",
            replacement: [
                {
                    match: /\(0,\i\.jsx\)\((\i),[^}]{20,40}?"aria-selected":(\i)[^}]{50,100}?#{intl::EXPRESSION_PICKER_GIF}\)\}\)/,
                    replace: "$self.renderTabs($1,$2)"
                },
                {
                    match: /\{onSelectGIF:(\i),[^}]{20,40}\}\):null,(?=(\i)===)/,
                    replace: "$&$self.renderSevenTVPicker($2),"
                }
            ]
        },
    ],

    renderTabs(Tab: ComponentType<ExpressionPickerTabProps>, activeView: ExpressionPickerView) {
        return (
            <>
                <Tab
                    id="gif-picker-tab"
                    key="gif-picker-tab"
                    aria-controls="gif-picker-tab-panel"
                    aria-selected={activeView === ExpressionPickerView.GIF}
                    isActive={activeView === ExpressionPickerView.GIF}
                    viewType={ExpressionPickerView.GIF}
                >
                    GIFs
                </Tab>
                <Tab
                    id="7tv-picker-tab"
                    key="7tv-picker-tab"
                    aria-controls="7tv-picker-tab-panel"
                    aria-selected={activeView === ExpressionPickerView.SEVEN_TV}
                    isActive={activeView === ExpressionPickerView.SEVEN_TV}
                    viewType={ExpressionPickerView.SEVEN_TV}
                >
                    7TV
                </Tab>
            </>
        );
    },

    async onBeforeMessageSend(_, msg) {
        if (!msg.content) return;

        const matched = msg.content.match(/^:\+(.+):$/);
        if (!matched) return;

        const emote = await emoteSearchReplacer(matched[1]);
        if (emote) msg.content = emote;
    },

    renderSevenTVPicker(activeView: ExpressionPickerView) {
        return activeView === ExpressionPickerView.SEVEN_TV
            ? (
                <SevenTVPicker
                    closePopout={() => { }}
                    onOpenSettings={() => openPluginModal(sevenTVPlugin)}
                />
            )
            : null;
    },

    sevenTVComponent({ closePopout }: { channel: DiscordChannel; closePopout: () => void; }) {
        return (
            <SevenTVPicker
                closePopout={closePopout}
                onOpenSettings={() => openPluginModal(sevenTVPlugin)}
            />
        );
    },
});

export default sevenTVPlugin;

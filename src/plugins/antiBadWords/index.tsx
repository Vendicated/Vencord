/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

import { banlist } from "./banlist";

const settings = definePluginSettings({
    version: {
        type: OptionType.SELECT,
        description: "The version you want your message to render",
        options: [
            { label: "None", value: -1 },
            { label: "Roblox Version", value: 1 },
            { label: "Hard Version", value: 1 }
        ]
    }
});

const normalizeWord = w => w.replace(/0/g, 'o').replace(/1/g, 'i').replace(/l/g, 'i');
const normalizeMsg = s => s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/l/g, 'i');

const robloxVersion = (e, patterns) => {
    const parts = e.message.content.split(/([^a-zA-Z0-9]+)/);
    for (let i = 0; i < parts.length; i += 2) {
        const norm = normalizeMsg(parts[i]);
        for (const re of patterns) {
            if (re.test(norm)) {
                parts[i] = "#".repeat(parts[i].length);
                break;
            }
        }
    }
    e.message.content = parts.join("");

};

const hardVersion = (e, patterns) => {
    const n = normalizeMsg(e.message.content);
    for (const re of patterns) {
        if (re.test(n)) {
            e.message.content = `🔒 Message has been Redacted.
-# Discord now requires ID verification in order to see certain messages. [Learn More](https://support.discord.com/hc/en-us/articles/18210995019671-Discord-Sensitive-Content-Filters)`;
            break;
        }
    }
};

export default definePlugin({
    name: "AntiBadWords",
    description: "Use Roblox chat filter directly in Discord!",
    authors: [Devs.fox3000foxy],
    dependencies: ["UserSettingsAPI"],
    settings,
    start: () => {
        const clean = {};
        for (const w of banlist) {
            const n = normalizeWord(w);
            clean[n] = true;
        }
        const cleanWords = Object.keys(clean).sort((a, b) => b.length - a.length);
        const patterns = cleanWords.map(w => new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '\\w*?'), 'gi'));

        findByProps("_dispatch").addInterceptor(e => {
            if (e.type === "MESSAGE_CREATE" || e.type === "MESSAGE_UPDATE") {
                switch (settings.store.version) {
                    case -1:
                        break;
                    case 1:
                        return robloxVersion(e, patterns);
                    case 2:
                        return hardVersion(e, patterns);
                }
            }
        });
    }
});



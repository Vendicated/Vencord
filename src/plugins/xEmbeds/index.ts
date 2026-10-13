/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

function readxlink(input: string): string | null {
    const name = input.trim().toLowerCase() || "fixupx";
    const domain = name.includes(".") ? name : `${name}.com`;
    if (domain.length > 253) return null;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) return null;
    return domain;
}

export function xembeds(content: string, site = "fixupx"): string {
    const xhost = readxlink(site) ?? "fixupx.com";
    function xswap(text: string) {
        return text.replace(/(?<![\p{L}\p{N}_@./:\\-])https?:\/\/[^\s<>`]+/giu, url =>
            url.replace(/^(https?:\/\/)(?:www\.)?x\.com(?=$|[/?#]|[.,!;:)"'\]}]+$)/i,
                (_, protocol: string) => `${protocol}${xhost}`)
        );
    }

    let fixed = "";
    let start = 0;
    let fence = "";

    for (const match of content.matchAll(/`+/g)) {
        const ticks = match[0];
        const pos = match.index;
        if (!fence) {
            fixed += xswap(content.slice(start, pos)) + ticks;
            fence = ticks;
        } else {
            fixed += content.slice(start, pos) + ticks;
            if (ticks === fence) fence = "";
        }
        start = pos + ticks.length;
    }
    const rest = content.slice(start);
    return fixed + (fence ? rest : xswap(rest));
}

const settings = definePluginSettings({
    replacementhost: {
        type: OptionType.STRING,
        description: "Which embed site you want to use for X posts. default is fixupx",
        default: "fixupx",
        isValid: value => typeof value === "string"
            ? readxlink(value) !== null || "Just the site name."
            : "Just the site name."
    }
});

export default definePlugin({
    name: "XEmbeds",
    description: "Fixes embeds for X posts by swapping x.com for an embed site when you send a message.",
    authors: [Devs.rot],
    settings,
    onBeforeMessageSend(_, message) {
        message.content = xembeds(message.content, settings.store.replacementhost);
    },
    onBeforeMessageEdit(_channelId, _messageId, message) {
        message.content = xembeds(message.content, settings.store.replacementhost);
    }
});

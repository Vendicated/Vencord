/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    spoilerFilenames: {
        description: "Strings in filenames that should be spoilered. Comma separated.",
        type: OptionType.STRING,
        default: "",
    },
    spoilerLinks: {
        description: "Strings in link attachments that should be spoilered. Comma separated.",
        type: OptionType.STRING,
        default: ""
    },
    gifSpoilersOnly: {
        description: "Should the links only be gifs?",
        type: OptionType.BOOLEAN,
        default: true

    },
});

export default definePlugin({
    name: "TriggerWarning",
    authors: [EquicordDevs.Joona],
    description: "Spoiler attachments based on filenames and links.",
    patches: [
        {
            find: "SimpleMessageAccessories:",
            replacement: [
                {
                    match: /function \i\((\i),\i\){return/,
                    replace: "$& $self.shouldSpoiler($1.originalItem.filename) || "
                },
                {
                    match: /(\i)=\(0,\i\.getOb.{27,35}\);(?=if\((\i).type)/,
                    replace: "$&$1=$self.spoilerLink($1,$2.url,$2.type);"
                }
            ]
        }
    ],
    settings,
    shouldSpoiler(filename: string): string | null {
        const { spoilerFilenames } = settings.store;
        if (!filename || !spoilerFilenames) return null;
        const strings = spoilerFilenames.split(",").map(s => s.trim());
        return strings.some(s => filename.includes(s)) ? "spoiler" : null;
    },
    spoilerLink(alreadySpoilered: string, link: string, type: string): string | null {
        if (alreadySpoilered) return alreadySpoilered;
        const { spoilerLinks, gifSpoilersOnly } = settings.store;
        if (!link || !spoilerLinks) return null;

        const strings = spoilerLinks.split(",").map(s => s.trim());
        const isLinkSpoiler = strings.some(s => link.includes(s));

        if (gifSpoilersOnly) {
            return type === "gifv" && isLinkSpoiler ? "spoiler" : null;
        } else {
            return isLinkSpoiler ? "spoiler" : null;
        }
    }
});

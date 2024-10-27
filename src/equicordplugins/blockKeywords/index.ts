/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { MessageJSON } from "discord-types/general";

let blockedKeywords: Array<RegExp>;

const settings = definePluginSettings({
    blockedWords: {
        type: OptionType.STRING,
        description: "Comma-seperated list of words to block",
        default: "",
        restartNeeded: true
    },
    useRegex: {
        type: OptionType.BOOLEAN,
        description: "Use each value as a regular expression when checking message content (advanced)",
        default: false,
        restartNeeded: true
    },
    caseSensitive: {
        type: OptionType.BOOLEAN,
        description: "Whether to use a case sensitive search or not",
        default: false,
        restartNeeded: true
    },
    ignoreBlockedMessages: {
        description: "Completely ignores (recent) new messages bar",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true,
    },
});

export default definePlugin({
    name: "BlockKeywords",
    description: "Blocks messages containing specific user-defined keywords, as if the user sending them was blocked.",
    authors: [EquicordDevs.catcraft],
    patches: [
        {
            find: '"_channelMessages",{})',
            replacement: {
                match: /static commit\((.{1,2})\){/g,
                replace: "$&$1=$self.blockMessagesWithKeywords($1);"
            }
        },
        ...[
            '"ReadStateStore"'
        ].map(find => ({
            find,
            predicate: () => Settings.plugins.BlockKeywords.ignoreBlockedMessages && !Settings.plugins.NoBlockedMessages.ignoreBlockedMessages,
            replacement: [
                {
                    match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                    replace: (_, props) => `if($self.containsBlockedKeywords(${props}.message))return;`
                }
            ]
        })),
    ],

    settings,

    start() {
        const blockedWordsList: Array<string> = Settings.plugins.BlockKeywords.blockedWords.split(",");
        const caseSensitiveFlag = Settings.plugins.BlockKeywords.caseSensitive ? "" : "i";

        if (Settings.plugins.BlockKeywords.useRegex) {
            blockedKeywords = blockedWordsList.map(word => {
                return new RegExp(word, caseSensitiveFlag);
            });
        }
        else {
            blockedKeywords = blockedWordsList.map(word => {
                // escape regex chars in word https://stackoverflow.com/a/6969486
                return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, caseSensitiveFlag);
            });
        }
        console.log(blockedKeywords);
    },

    containsBlockedKeywords(message: MessageJSON) {
        if (blockedKeywords.length === 0) { return false; }

        // can't use forEach because we need to return from inside the loop
        // message content loop
        for (let wordIndex = 0; wordIndex < blockedKeywords.length; wordIndex++) {
            if (blockedKeywords[wordIndex].test(message.content)) {
                return true;
            }
        }

        // embed content loop (e.g. twitter embeds)
        for (let embedIndex = 0; embedIndex < message.embeds.length; embedIndex++) {
            const embed = message.embeds[embedIndex];
            for (let wordIndex = 0; wordIndex < blockedKeywords.length; wordIndex++) {
                // doing this because undefined strings get converted to the string "undefined" in regex tests
                // @ts-ignore
                const descriptionHasKeywords = embed.rawDescription != null && blockedKeywords[wordIndex].test(embed.rawDescription);
                // @ts-ignore
                const titleHasKeywords = embed.rawTitle != null && blockedKeywords[wordIndex].test(embed.rawTitle);
                if (descriptionHasKeywords || titleHasKeywords) {
                    return true;
                }
            }
        }

        return false;
    },

    blockMessagesWithKeywords(messageList: any) {
        return messageList.reset(messageList.map(
            message => message.set("blocked", message.blocked || this.containsBlockedKeywords(message))
        ));
    }
});

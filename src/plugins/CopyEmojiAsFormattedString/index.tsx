/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu } from "@webpack/common";

const { convertNameToSurrogate } = findByPropsLazy("convertNameToSurrogate");

interface Emoji {
    type: string;
    id: string;
    name: string;
}

interface Target {
    dataset: Emoji;
    firstChild: HTMLImageElement;
}

function removeCountingPostfix(name: string): string {
    return name.replace(/~\d+$/, "");
}

function getEmojiFormattedString(target: Target, copyUnicode: boolean): string {
    const { id: emojiId, name: emojiName } = target.dataset;

    if (!emojiId) {
        return (
            (copyUnicode && convertNameToSurrogate(emojiName)) ||
            `:${emojiName}:`
        );
    }

    const extension = target?.firstChild.src.match(
        /https:\/\/cdn\.discordapp\.com\/emojis\/\d+\.(\w+)/
    )?.[1];

    return extension === "gif"
        ? `<a:${removeCountingPostfix(emojiName)}:${emojiId}>`
        : `<:${removeCountingPostfix(emojiName)}:${emojiId}>`;
}

const settings = definePluginSettings({
    copyUnicode: {
        type: OptionType.BOOLEAN,
        description: "Copy the Unicode symbol instead of the name for standard emojis (👽)",
        default: true,
    },
});

export default definePlugin({
    name: "CopyEmojiMarkdown",
    description: "Allows you to copy emojis as formatted string (<:blobcatcozy:1026533070955872337>)",
    authors: [Devs.HappyEnderman, Devs.Vishnya],
    settings: settings,
    contextMenus: {
        "expression-picker"(children, { target }: { target: Target }) {
            if (target.dataset.type !== "emoji") return;

            children.push(
                <Menu.MenuItem
                    id="vc-copy-formatted-string"
                    label="Copy as formatted string"
                    action={() => {
                        copyWithToast(
                            getEmojiFormattedString(
                                target,
                                settings.store.copyUnicode
                            ),
                            "Success! Copied to clipboard as formatted string."
                        );
                    }}
                />
            );
        },
    },
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { Menu } from "@webpack/common";
import { copyWithToast } from "@utils/misc";
import { findByPropsLazy } from "@webpack";

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

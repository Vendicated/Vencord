/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Clipboard, Menu, showToast, Toasts } from "@webpack/common";

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

function getEmojiFormattedString(target: Target): string {
    const { dataset } = target;

    if (!dataset.id) {
        const fiberKey = Object.keys(target).find(key =>
            /^__reactFiber\$\S+$/gm.test(key)
        );

        if (!fiberKey) return `:${dataset.name}:`;

        const emojiUnicode =
            target[fiberKey]?.child?.memoizedProps?.emoji?.surrogates;

        return emojiUnicode || `:${dataset.name}:`;
    }

    const extension = target?.firstChild.src.match(
        /https:\/\/cdn\.discordapp\.com\/emojis\/\d+\.(\w+)/
    )?.[1];

    const emojiName = removeCountingPostfix(dataset.name);
    const emojiId = dataset.id;

    return extension === "gif"
        ? `<a:${emojiName}:${emojiId}>`
        : `<:${emojiName}:${emojiId}>`;
}

export default definePlugin({
    name: "CopyEmojiAsString",
    description: "Add's button to copy emoji as formatted string!",
    authors: [{
        name: "Happy enderman",
        id: 1083437693347827764n
    }, {
        name: "Vishnya",
        id: 282541644484575233n
    }],
    contextMenus: {
        "expression-picker"(children, { target }: { target: Target; }) {
            if (target.dataset.type !== "emoji") return;

            children.push(
                <Menu.MenuItem
                    id="copy-formatted-string"
                    key="copy-formatted-string"
                    label={"Copy as formatted string"}
                    action={() => {
                        Clipboard.copy(getEmojiFormattedString(target));
                        showToast(
                            "Success! Copied to clipboard as formatted string.",
                            Toasts.Type.SUCCESS
                        );
                    }}
                />
            );
        },
    },
});

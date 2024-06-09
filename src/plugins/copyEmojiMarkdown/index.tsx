/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu } from "@webpack/common";
import { Message } from "discord-types/general";
import { ReactElement } from "react";

const { convertNameToSurrogate, hasSurrogates, convertSurrogateToName } =
    findByPropsLazy("convertNameToSurrogate");

interface Emoji {
    type: string;
    id: string;
    name: string;
}

interface Target {
    dataset: Emoji;
    firstChild: HTMLImageElement;
}

function getEmojiMarkdown(target: Target, copyUnicode: boolean): string {
    const { id: emojiId, name: emojiName } = target.dataset;

    if (!emojiId) {
        return copyUnicode
            ? convertNameToSurrogate(emojiName)
            : `:${emojiName}:`;
    }

    const extension = target?.firstChild.src.match(
        /https:\/\/cdn\.discordapp\.com\/emojis\/\d+\.(\w+)/
    )?.[1];

    return `<${extension === "gif" ? "a" : ""}:${emojiName.replace(
        /~\d+$/,
        ""
    )}:${emojiId}>`;
}

const patchExpressionPickerContextMenu = (
    children: Array<ReactElement | null>,
    { target }: { target: Target }
) => {
    if (target.dataset.type !== "emoji") return;

    children.push(
        <Menu.MenuItem
            id="vc-copy-emoji-markdown"
            label="Copy Emoji Markdown"
            action={() => {
                copyWithToast(
                    getEmojiMarkdown(target, settings.store.copyUnicode),
                    "Success! Copied emoji markdown."
                );
            }}
        />
    );
};

const addCopyButton = (
    children: Array<ReactElement | null>,
    emojiMarkdown: string
) => {
    findGroupChildrenByChildId("copy-link", children)?.push(
        <Menu.MenuItem
            id="vc-copy-emoji-markdown"
            label="Copy Emoji Markdown"
            action={() => {
                copyWithToast(emojiMarkdown, "Success! Copied emoji markdown.");
            }}
        />
    );
};

const patchMessageContextMenu = (
    children: Array<ReactElement | null>,
    props: {
        favoriteableId: string | null;
        favoriteableName: string | null;
        favoriteableType: string | null;
        message: Message;
    } | null
) => {
    if (!props) return;

    if (props.favoriteableType !== "emoji") return;

    const emojiName = props.favoriteableName;

    if (hasSurrogates(emojiName)) {
        addCopyButton(
            children,
            settings.store.copyUnicode
                ? emojiName
                : convertSurrogateToName(emojiName)
        );
        return;
    }

    const emojiId = props.favoriteableId;

    if (!emojiId) {
        if (emojiName) {
            const emojiMarkdown = settings.store.copyUnicode
                ? convertNameToSurrogate(emojiName.replace(/(^:|:$)/g, ""))
                : emojiName;

            addCopyButton(
                children,
                emojiMarkdown !== "" ? emojiMarkdown : emojiName
            );
        }
        return;
    }

    const messageEmojiMarkdown = props.message.content.match(
        RegExp(`(<a?:\\S+:${emojiId}>)`)
    )?.[1];

    if (messageEmojiMarkdown) {
        addCopyButton(children, messageEmojiMarkdown.replace(/~\d+/, ""));
        return;
    }

    const reactionEmojiObject = props.message.reactions.find(
        ({ emoji: { id } }) => id === emojiId
    )?.emoji;

    if (!reactionEmojiObject) return;

    const reactionEmojiName = reactionEmojiObject.name;

    if (hasSurrogates(reactionEmojiName)) {
        addCopyButton(
            children,
            settings.store.copyUnicode
                ? reactionEmojiName
                : convertSurrogateToName(reactionEmojiName)
        );
        return;
    }

    addCopyButton(
        children,
        `<${
            reactionEmojiObject.animated ? "a" : ""
        }:${reactionEmojiName.replace(/~\d+$/, "")}:${emojiId}>`
    );
};

const settings = definePluginSettings({
    copyUnicode: {
        type: OptionType.BOOLEAN,
        description:
            "Copy the raw unicode character instead of :name: for default emojis (👽)",
        default: true,
    },
});

export default definePlugin({
    name: "CopyEmojiMarkdown",
    description:
        "Allows you to copy emojis as formatted string (<:blobcatcozy:1026533070955872337>)",
    authors: [Devs.HappyEnderman, Devs.Vishnya],
    settings,

    contextMenus: {
        "expression-picker": patchExpressionPickerContextMenu,
        "message": patchMessageContextMenu,
    },
});

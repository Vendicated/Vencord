/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants.js";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const SlateTransforms = findByPropsLazy("insertText", "selectCommandOption");

const settings = definePluginSettings({
    disableEmbed: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Wrap the link inbetween < > to prevent it from embedding.",
        restartNeeded: false
    }
});

export default definePlugin({
    name: "MaskedLinkPaste",
    authors: [Devs.TheSun, Devs.Neo],
    description: "Pasting a link while having text selected will paste a hyperlink",
    settings,
    patches: [
        {
            find: ".selection,preventEmojiSurrogates:",
            replacement: {
                match: /(?<=\i.delete.{0,50})(\i)\.insertText\((\i)\)/,
                replace: "$self.handlePaste($1, $2, () => $&)"
            }
        }
    ],

    handlePaste(editor, content: string, originalBehavior: () => void) {
        if (content && linkRegex.test(content) && editor.operations?.[0]?.type === "remove_text") {
            if (settings.store.disableEmbed) {
                SlateTransforms.insertText(
                    editor,
                    `[${editor.operations[0].text}](<${content}>)`
                );
            } else {
                SlateTransforms.insertText(
                    editor,
                    `[${editor.operations[0].text}](${content})`
                );
            }
        }
        else originalBehavior();
    }
});

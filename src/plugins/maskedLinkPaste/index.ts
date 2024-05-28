/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants.js";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const { SlateTransforms } = findByPropsLazy("SlateTransforms");

export default definePlugin({
    name: "MaskedLinkPaste",
    authors: [Devs.TheSun],
    description: "Pasting a link while having text selected will paste a hyperlink",
    patches: [{
        find: ".selection,preventEmojiSurrogates:",
        replacement: {
            match: /(?<=SlateTransforms.delete.{0,50})(\i)\.insertText\((\i)\)/,
            replace: "$self.handlePaste($1, $2, () => $&)"
        }
    }],

    handlePaste(editor, content: string, originalBehavior: () => void) {
        if (content && linkRegex.test(content) && editor.operations?.[0]?.type === "remove_text") {
            SlateTransforms.insertText(
                editor,
                `[${editor.operations[0].text}](${content})`
            );
        }
        else originalBehavior();
    }
});

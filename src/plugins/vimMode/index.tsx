/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { vim } from "./vim";
import { VimStatus } from "./VimStatus";

export let currentEditor: any = null;

export default definePlugin({
    name: "VimMode",
    authors: [Devs.iamvpk_],
    description: "Vim-style navigation & motions",

    onKeyDown(e: KeyboardEvent) {
        const { block } = vim.handleKey(e.key);
        if (block) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    TextAreaWrapper({ VencordOriginal, ...props }) {
        return (
            <>
                <VimStatus />
                <VencordOriginal {...props} />
            </>
        );
    },

    captureEditor(editor) {
        currentEditor = editor;
    },

    patches: [
        {
            find: "ChannelTextAreaFormComponent",
            replacement: {
                match: /(?<=\i\.jsx\)\()(\i),\{/,
                replace: "$self.TextAreaWrapper,{VencordOriginal:$1,"
            }
        },

        {
            find: "ChannelTextAreaFormComponent",
            replacement: {
                match: /"handleInputKeyDown",\s*\(([^)]*)\)\s*=>\s*\{/,
                replace: "\"handleInputKeyDown\", ($1) => { $self.onKeyDown($1);"
            }
        },
        {
            find: "ChannelTextAreaFormComponent",
            replacement: {
                match: /setEditorRef:\s*([a-zA-Z0-9_$]+)\s*=>\s*this\.editorRef\s*=\s*\1,/,
                replace: "setEditorRef: $1 => { this.editorRef = $1; $self.captureEditor($1); },"
            }
        }
    ],
});

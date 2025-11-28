/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { vim } from "./vim";
import { VimStatus } from "./VimStatus";

export let currentEditor: any = null;
export let currentSearchBar: any = null;

export const settings = definePluginSettings({
    useJkScroll: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "j/k for scroll chat up/down"
    }
});

export default definePlugin({
    name: "VimMode",
    authors: [Devs.iamvpk_],
    description: "Vim-style navigation & motions",
    settings: settings,

    onKeyDown(e: KeyboardEvent) {
        const { block } = vim.handleKey(e);
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
    captureSearchBar(instance) {
        currentSearchBar = instance;
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
        },
        {
            find: "handleFocusSearch",
            replacement: {
                match: /componentDidMount\(\)\s*\{/,
                replace: "componentDidMount(){ $self.captureSearchBar(this);"
            }
        }
    ],
});

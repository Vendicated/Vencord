/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Menu } from "@webpack/common";

const languages = [
    { label: "Plain Text", value: "" },
    { label: "TypeScript/JavaScript", value: "ts" },
    { label: "Python", value: "py" },
    { label: "Java", value: "java" },
    { label: "C++", value: "cpp" },
    { label: "C#", value: "cs" },
    { label: "HTML", value: "html" },
    { label: "CSS", value: "css" },
    { label: "PHP", value: "php" },
    { label: "Ruby", value: "ruby" },
    { label: "Go", value: "go" },
    { label: "Rust", value: "rs" },
    { label: "SQL", value: "sql" },
    { label: "Shell", value: "sh" },
    { label: "JSON", value: "json" },
    { label: "YAML", value: "yaml" },
    { label: "XML", value: "xml" },
    { label: "Markdown", value: "md" },
];

const insertCodeBlock = (language: string) => {
    const prefix = "```" + language + "\n";
    const suffix = "\n```";
    insertTextIntoChatInputBox(prefix + suffix);
    // Move cursor between the backticks
    const textArea = document.querySelector('[role="textbox"]') as HTMLTextAreaElement;
    if (textArea) {
        const cursorPosition = textArea.value.length - suffix.length;
        textArea.setSelectionRange(cursorPosition, cursorPosition);
    }
};

const contextMenuPatch: NavContextMenuPatchCallback = (children) => {
    const menuItem = (
        <Menu.MenuItem
            id="vc-markdown-codeblock"
            label="Insert Code Block"
        >
            {languages.map(lang => (
                <Menu.MenuItem
                    id={`vc-markdown-codeblock-${lang.value || "plain"}`}
                    key={lang.value}
                    label={lang.label}
                    action={() => insertCodeBlock(lang.value)}
                />
            ))}
        </Menu.MenuItem>
    );

    const group = findGroupChildrenByChildId("submit-button", children);
    if (!group) {
        children.push(menuItem);
        return;
    }

    const idx = group.findIndex(c => c?.props?.id === "submit-button");
    group.splice(idx + 1, 0, menuItem);
};

export default definePlugin({
    name: "MarkdownToolTip",
    description: "Adds a context menu option to insert code blocks with syntax highlighting",
    authors: [Devs.iLazer],
    contextMenus: {
        "textarea-context": contextMenuPatch
    },
});
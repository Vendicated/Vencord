/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin, { IconComponent } from "@utils/types";
import { ChannelStore, ComponentDispatch, FluxDispatcher, Menu, UserStore } from "@webpack/common";

const QuoteIcon: IconComponent = props => (
    <svg {...props} viewBox="0 0 24 24">
        <path fill="currentColor" d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
    </svg>
);

export default definePlugin({
    name: "SelectToQuote",
    authors: [{ name: "Foxiezi", id: 684965357609549842n }],
    description: "Add a button to the context menu to quote & reply with the selected text",

    contextMenus: {
        message(children, props) {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.rangeCount) return;

            const text = selection.toString().trim();
            if (!text) return;

            const { anchorNode } = selection;
            const element = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement;

            // Strict DOM Check: Ensure selection is inside the message content
            // Usage of this ID selector is consistent with other plugins (e.g. QuickReply)
            const messageElement = element?.closest(`#message-content-${props.message.id}`);
            if (!messageElement) return;

            const codeBlock = element?.closest("code, pre");
            const isCodeBlock = !!codeBlock;
            const language = getCodeLanguage(codeBlock);

            children.push(
                <Menu.MenuItem
                    key="vc-select-to-quote"
                    label="Reply with Quote"
                    id="vc-select-to-quote"
                    icon={QuoteIcon}
                    action={e => {
                        const channel = ChannelStore.getChannel(props.message.channel_id);

                        // Use FluxDispatcher to trigger native reply
                        // This sets up the UI state (reply bar) but doesn't insert text
                        if (channel) {
                            FluxDispatcher.dispatch({
                                type: "CREATE_PENDING_REPLY",
                                channel,
                                message: props.message,
                                shouldMention: true,
                                showMentionToggle: !channel.isPrivate() && props.message.author.id !== UserStore.getCurrentUser().id
                            });
                            ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
                        }

                        const mode = e.shiftKey ? "diff" : "quote";
                        const replyText = formatQuote(text, isCodeBlock, language, mode);
                        insertTextIntoChatInputBox(replyText);
                    }}
                />
            );
        }
    }
});

/**
 * Formats the selected text into a quote or diff block
 * @param text The raw text to quote
 * @param isCodeBlock Whether the source text was inside a code block
 * @param language The language of the code block (if any)
 * @param mode "quote" for standard quoting, "diff" for strict diff block
 */
function formatQuote(text: string, isCodeBlock: boolean, language: string, mode: "quote" | "diff" = "quote") {
    if (mode === "diff") {
        const fence = "```";
        const content = text.split("\n").map(line => `- ${line}`).join("\n");
        return `${fence}diff\n${content}\n+ \n${fence}\n`;
    }

    if (isCodeBlock) {
        // Formatting with fences (handles nested backticks)
        const backticks = text.match(/`+/g);
        const maxBackticks = backticks ? Math.max(...backticks.map(s => s.length)) : 0;
        const fenceLength = Math.max(3, maxBackticks + 1);
        const fence = "`".repeat(fenceLength);

        // Ensure newline formatting for blocks
        return `${fence}${language}\n${text}\n${fence}\n`;
    }

    // Generic quote
    return `> ${text.split("\n").join("\n> ")}\n`;
}

function getCodeLanguage(codeBlock: Element | null | undefined): string {
    if (!codeBlock) return "";
    const classes = Array.from(codeBlock.classList);

    // Priority A: Check for language- prefix (Standard)
    const prefixedClass = classes.find(c => c.startsWith("language-"));
    if (prefixedClass) return prefixedClass.replace("language-", "");

    // Priority B: Fallback for blocks without language- prefix (e.g. "hljs python")
    if (classes.includes("hljs")) {
        return classes.find(c => c !== "hljs" && !c.startsWith("scrollbar")) ?? "";
    }

    return "";
}

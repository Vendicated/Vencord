/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export default definePlugin({
    name: "CtrlEnterSend",
    authors: [Devs.UlyssesZhan],
    description: "Use Ctrl+Enter to send messages (customizable)",
    settings: definePluginSettings({
        submitRule: {
            description: "The way to send a message",
            type: OptionType.SELECT,
            options: [
                {
                    label: "Ctrl+Enter",
                    value: "ctrl+enter"
                },
                {
                    label: "Shift+Enter",
                    value: "shift+enter"
                },
                {
                    label: "Enter (Discord default)",
                    value: "enter"
                }
            ],
            default: "ctrl+enter"
        },
        sendMessageInTheMiddleOfACodeBlock: {
            description: "Whether to send a message in the middle of a code block (otherwise insert a newline)",
            type: OptionType.BOOLEAN,
            default: true,
        }
    }),
    patches: [
        {
            find: "KeyboardKeys.ENTER){if",
            replacement: {
                match: /if\(!(\i).shiftKey&&!(\i.hasOpenCodeBlock\(\))&&\(!(\i.props).disableEnterToSubmit\|\|\i.ctrlKey\)\).{0,150}?\}/,
                replace: "$self.handleEnter($1, $2, $3)}"
            }
        }
    ],
    shouldSubmit(event: KeyboardEvent, codeblock: boolean): boolean {
        let result = false;
        switch (this.settings.store.submitRule) {
            case "shift+enter":
                result = event.shiftKey;
                break;
            case "ctrl+enter":
                result = event.ctrlKey;
                break;
            case "enter":
                result = true;
                break;
        }
        if (!this.settings.store.sendMessageInTheMiddleOfACodeBlock) {
            result &&= !codeblock;
        }
        return result;
    },
    handleEnter(event: KeyboardEvent, codeblock: boolean, props: any): void {
        event.preventDefault();
        if (this.shouldSubmit(event, codeblock)) {
            props.onSubmit(props.value);
        } else {
            const textArea = event.target as HTMLTextAreaElement;
            textArea.value += "\r\n";
            textArea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        }
    }
});

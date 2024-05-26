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
                    label: "Ctrl+Enter (Enter or Shift+Enter for new line) (cmd+enter on macOS)",
                    value: "ctrl+enter"
                },
                {
                    label: "Shift+Enter (Enter for new line)",
                    value: "shift+enter"
                },
                {
                    label: "Enter (Shift+Enter for new line; Discord default)",
                    value: "enter"
                }
            ],
            default: "ctrl+enter"
        },
        sendMessageInTheMiddleOfACodeBlock: {
            description: "Whether to send a message in the middle of a code block",
            type: OptionType.BOOLEAN,
            default: true,
        }
    }),
    patches: [
        {
            find: "KeyboardKeys.ENTER&&(!",
            replacement: {
                match: /(?<=(\i)\.which===\i\.KeyboardKeys.ENTER&&).{0,100}(\(0,\i\.hasOpenPlainTextCodeBlock\)\(\i\)).{0,100}(?=&&\(\i\.preventDefault)/,
                replace: "$self.shouldSubmit($1, $2)"
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
                result = navigator.platform.includes("Mac") ? event.metaKey : event.ctrlKey;
                break;
            case "enter":
                result = !event.shiftKey && !event.ctrlKey;
                break;
        }
        if (!this.settings.store.sendMessageInTheMiddleOfACodeBlock) {
            result &&= !codeblock;
        }
        return result;
    }
});

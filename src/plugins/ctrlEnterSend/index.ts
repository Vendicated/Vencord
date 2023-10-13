/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let compiledSubmitRule: ((event: KeyboardEvent, codeblock: boolean) => boolean) | null = null;
let compiledNewlineRule: ((event: KeyboardEvent, codeblock: boolean) => boolean) | null = null;

const plugin = definePlugin({
    name: "CtrlEnterSend",
    authors: [Devs.UlyssesZhan],
    description: "Use Ctrl+Enter to send messages (customizable)",
    settings: definePluginSettings({
        submitRule: {
            description: "The condition on sending message, supported variables: 'shift', 'ctrl', 'codeblock' (all lowercase) " +
                "(Discord default: !shift && !codeblock)",
            type: OptionType.STRING,
            default: "ctrl",
            isValid(value: string): boolean {
                return plugin.compileSubmitRule(value);
            }
        },
        newlineRule: {
            description: "The condition on inserting newline (if the previous condition fails) " +
                "(Discord default: !ctrl)",
            type: OptionType.STRING,
            default: "true",
            isValid(value: string): boolean {
                return plugin.compileNewlineRule(value);
            }
        }
    }),
    patches: [
        {
            find: "EXPRESSION_SUGGESTIONS_STICKER_DISABLE,",
            replacement: {
                match: /if\(!(\i).shiftKey&&!(\i.hasOpenCodeBlock\(\))&&\(!(\i.props).disableEnterToSubmit\|\|\i.ctrlKey\)\)\{.{0,150}?\}/,
                replace: "$self.handleEnter($1, $2, $3)"
            }
        }
    ],
    shouldSubmit(event: KeyboardEvent, codeblock: boolean): boolean {
        return compiledSubmitRule?.(event, codeblock) ?? (!event.shiftKey && !codeblock);
    },
    shouldNewline(event: KeyboardEvent, codeblock: boolean): boolean {
        return compiledNewlineRule?.(event, codeblock) ?? (!event.ctrlKey && !event.altKey);
    },
    handleEnter(event: KeyboardEvent, codeblock: boolean, props: any): void {
        console.log(event, codeblock, props);
        event.preventDefault();
        if (this.shouldSubmit(event, codeblock)) {
            props.onSubmit(props.value);
        } else if (this.shouldNewline(event, codeblock)) {
            const textArea = event.target as HTMLTextAreaElement;
            textArea.value += "\r\n";
            textArea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        }
    },
    start() {
        this.compileSubmitRule(this.settings.store.submitRule);
    },
    compileSubmitRule(rule: string): boolean {
        try {
            compiledSubmitRule = new Function("event", "codeblock", `
                const { shiftKey: shift, ctrlKey: ctrl, altKey: alt } = event;
                return !!(${rule});
            `) as (event: KeyboardEvent, codeblock: boolean) => boolean;
        } catch (e) {
            if (e instanceof SyntaxError) {
                return false;
            } else {
                throw e;
            }
        }
        return true;
    },
    compileNewlineRule(rule: string): boolean {
        try {
            compiledNewlineRule = new Function("event", "codeblock", `
                const { shiftKey: shift, ctrlKey: ctrl, altKey: alt } = event;
                return !!(${rule});
            `) as (event: KeyboardEvent, codeblock: boolean) => boolean;
        } catch (e) {
            if (e instanceof SyntaxError) {
                return false;
            } else {
                throw e;
            }
        }
        return true;
    }
});

export default plugin;

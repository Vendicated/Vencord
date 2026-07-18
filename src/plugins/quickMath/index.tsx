/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

let lastCalculation = "";
let calculating = false;

type ChatInputBoxEditor = {
    insertText(text: string): void;
    onChange(): void;
};

const settings = definePluginSettings({
    disableUndoHint: {
        type: OptionType.BOOLEAN,
        displayName: "Disable undo hint",
        description: "Disable undo hint after inserting calculation result",
        default: false
    }
});

function handleChatBarChanging(text: string, editor: ChatInputBoxEditor) {
    if (calculating) return;

    const answer = calculate(text);

    if (answer === null) return;

    calculating = true;

    try {
        editor.insertText(
            settings.store.disableUndoHint
                ? answer.toString()
                : `${answer} (CTRL + Z to undo)`
        );
        editor.onChange();
    } finally {
        calculating = false;
    }
}

function calculate(text: string): number | null {
    if (!text.includes("=")) return null;

    const [expressionText, existingAnswer] = text.split("=");

    const match = expressionText.match(/\d+(?:\s*[+\-*/]\s*\d+)+/g);

    if (!match) return null;

    const expression = match.at(-1);

    let answer: number;

    // Only basic math expressions are allowed by the regex above
    try {
        answer = Function(`"use strict"; return (${expression})`)();
    } catch {
        return null;
    }

    if (!Number.isFinite(answer)) return null;

    if (answer.toString() === existingAnswer?.trim()) return null;

    const calculationId = `${expression}=${answer}`;

    if (calculationId === lastCalculation) return null;

    lastCalculation = calculationId;

    return answer;
}

export default definePlugin({
    name: "QuickMath",
    description: "Automatically calculates simple math expressions in the Discord chat input",
    authors: [Devs.imnotplayinginreallife],

    patches: [
        {
            find: /let{editor:\i,channel:\i,disableEnterToSubmit:\i,onKeyDown:\i,onKeyUp:\i,onTab:\i,onEnter:\i,allowNewLines:\i,submit:\i,hideAutocomplete:\i,moveSelection:_}=\i;/,
            replacement: {
                match: /let{editor:\i,channel:\i,disableEnterToSubmit:\i,onKeyDown:\i,onKeyUp:\i,onTab:\i,onEnter:\i,allowNewLines:\i,submit:\i,hideAutocomplete:\i,moveSelection:_}=\i;/,
                replace: "$self.handleChatBarChanging(e.editor.children[0].children[0].text, e.editor);$&"
            }
        }
    ],

    settings,
    handleChatBarChanging
});

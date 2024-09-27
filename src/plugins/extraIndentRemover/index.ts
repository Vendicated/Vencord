/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageEvents } from "@api/index";
import { removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ExtraIndentRemover",
    description: "A plugin that removes all the extra indent when pasting code in the discord codeblock.",
    authors: [Devs.ArshiaAghaei],
    start() {
        this.preSend = MessageEvents.addPreSendListener((channelId, messageObj, extra) => {
            if(!messageObj.content.includes("```"))
                return;
            messageObj.content = fixIndent(messageObj.content);
        });
        this.preEdit = MessageEvents.addPreEditListener((channelId, messageId, messageObj) => {
            if(!messageObj.content.includes("```"))
                return;
            messageObj.content = fixIndent(messageObj.content);
        });
    },
    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});

function findOccurrences(lines: string[]): number[] {
    const occurrences: number[] = [];
	lines.forEach((line, index) => {
		if(line.startsWith("```"))
            occurrences.push(index);
	});
	return occurrences;
}

function fixIndent(message: string): string {
    const lines = message.split("\n");
	const occurrences = findOccurrences(lines);

	if (occurrences.length === 0)
		return message;

	if (occurrences.length % 2 === 1)
		// Extra ```
		occurrences.pop();

	for (let i = 0; i < occurrences.length; i += 2) {
		const startIndex = occurrences[i] + 1;
		const endIndex = occurrences[i + 1];
		const firstLine = lines[startIndex];
		const indentPattern: string[] = [];

		for(const char of firstLine) {
			if (!(char === " " || char === "\t"))
                break;
			indentPattern.push(char);
		}

		if(indentPattern.length === 0)
            continue; // No edits required for this one.
		const pattern = indentPattern.join("");
		for(let index = startIndex; index < endIndex; ++index)
			lines[index] = lines[index].replace(pattern, "");
	}
	return lines.join("\n");
}


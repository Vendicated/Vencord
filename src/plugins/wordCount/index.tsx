/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessageAccessory } from "@api/MessageAccessories";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Text } from "@webpack/common";

function WordCount({ messageContent }: { messageContent: string; }) {
    const words = messageContent.split(/\s+/).filter((word: string) => word.length > 0);
    if (words.length <= 5) return null;
    const characters = messageContent.length;

    return (
        <div>
            <Text
                variant="text-xs/normal"
                style={{ color: "var(--text-muted)" }}
            >
                {words.length} words, {characters} characters
            </Text>
        </div>
    );
}

export default definePlugin({
    name: "WordCount",
    description: "Shows the word count of a message below it",
    authors: [Devs.rz30],
    dependencies: ["MessageAccessoriesAPI"],
    async start() {
        addMessageAccessory("word-count", (props: Record<string, any>) => (
            <WordCount messageContent={props.message.content} />
        ), 2);
    }
});






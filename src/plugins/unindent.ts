/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreEditListener, addPreSendListener, MessageObject, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "Unindent",
    description: "Trims leading indentation from codeblocks",
    authors: [Devs.Ven],
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            find: "inQuote:",
            replacement: {
                match: /,content:([^,]+),inQuote/,
                replace: (_, content) => `,content:Vencord.Plugins.plugins.Unindent.unindent(${content}),inQuote`
            }
        }
    ],

    unindent(str: string) {
        // Users cannot send tabs, they get converted to spaces. However, a bot may send tabs, so convert them to 4 spaces first
        str = str.replace(/\t/g, "    ");
        const minIndent = str.match(/^ *(?=\S)/gm)
            ?.reduce((prev, curr) => Math.min(prev, curr.length), Infinity) ?? 0;

        if (!minIndent) return str;
        return str.replace(new RegExp(`^ {${minIndent}}`, "gm"), "");
    },

    unindentMsg(msg: MessageObject) {
        msg.content = msg.content.replace(/```(.|\n)*?```/g, m => {
            const lines = m.split("\n");
            if (lines.length < 2) return m; // Do not affect inline codeblocks
            let suffix = "";
            if (lines[lines.length - 1] === "```") suffix = lines.pop()!;
            return `${lines[0]}\n${this.unindent(lines.slice(1).join("\n"))}\n${suffix}`;
        });
    },

    start() {
        this.preSend = addPreSendListener((_, msg) => this.unindentMsg(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) => this.unindentMsg(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    }
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addPreEditListener, addPreSendListener, MessageObject, removePreEditListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import { getPrettier, getPrettierParser } from "@utils/dependencies";
import { makeCodeblock } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    formatOnSend: {
        type: OptionType.BOOLEAN,
        description: "Whether the plugin should format your code upon sending a message.",
        default: true,
    },
});

let formatter = (c: string) => c;

const MAX_CACHE_SIZE = 25;
const cache = new Map<string, string>();

export default definePlugin({
    name: "PrettierCodeblocks",
    description: "Formats code in codeblocks with Prettier.",
    dependencies: ["MessageEventsAPI"],
    authors: [Devs.Duro],
    settings,
    patches: [
        {
            find: "inQuote:",
            replacement: {
                match: /,content:([^,]+),inQuote/,
                replace: ",content:$self.format($1),inQuote"
            }
        }
    ],

    async start() {
        const [{ default: { format } }, { default: babelParser }] = await Promise.all([getPrettier(), getPrettierParser()]);

        formatter = (c: string) => format(c, { parser: "babel", plugins: [babelParser] });

        this.preSend = addPreSendListener((_, msg) => this.formatMessage(msg));
        this.preEdit = addPreEditListener((_cid, _mid, msg) => this.formatMessage(msg));
    },

    stop() {
        removePreSendListener(this.preSend);
        removePreEditListener(this.preEdit);
    },

    formatMessage(msg: MessageObject) {
        if (!settings.store.formatOnSend) return;

        msg.content = msg.content.replace(/```(.|\n)*?```/g, m => {
            const lang = m.split("\n")[0]?.replace("```", "");
            const lines = m.split("\n").filter(l => !l.trim().includes("```"));

            return makeCodeblock(this.format(lines.join("\n"), lang), lang);
        });
    },

    format(code: string, lang?: string) {
        const cached = cache.get(code);

        if (cached) return cached;

        try {
            if (lang?.toLowerCase() === "json") {
                const formatted = JSON.stringify(JSON.parse(code), null, 2).trim();
                this.updateCache(code, formatted);

                return formatted;
            }

            const formatted = formatter(code).trim();
            this.updateCache(code, formatted);

            return formatted;
        } catch (_) {
            return code.trim();
        }
    },

    updateCache(code: string, formatted: string) {
        cache.set(code, formatted);

        if (cache.size > MAX_CACHE_SIZE) {
            cache.delete(cache.keys().next().value);
        }
    },
});

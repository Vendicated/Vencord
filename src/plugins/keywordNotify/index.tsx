/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 exhq
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

import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { TextArea, useState, Forms } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { DataStore } from "@api/index";

let regexes = [];

async function setRegexes(regs: string) {
    regexes = regs.split("\n");
    await DataStore.set("KeywordNotify_rules", regexes);
}

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const [value, setValue] = useState(regexes.join("\n"));
            return (
                <>
                    <Forms.FormTitle tag="h4">Keyword Regexes (newline-separated)</Forms.FormTitle>
                    <TextArea
                        placeholder={"example|regex\n\\d+"}
                        spellCheck={false}
                        value={value}
                        onChange={setValue}
                        onBlur={() => setRegexes(value)}
                    />
                </>
            );
        }
    },
});

export default definePlugin({
    name: "KeywordNotify",
    authors: [Devs.camila314],
    description: "Sends a notification if a given message matches certain keywords or regexes",
    settings,
    patches: [{
	    find: "isRawMessageMentioned:",
	    replacement: {
            match: /isRawMessageMentioned:function\(\){return (.{1,2}).{1,512}function \1\(.{1,512}?=(.{1,2});return/,
            replace: "$& Vencord.Plugins.plugins.KeywordNotify.contains($2) ||"
	    }
	}],

    async start() {
        regexes = await DataStore.get("KeywordNotify_rules") ?? [];
    },

    contains(e) {
        //console.log("message: ", e);
        return regexes.some(a => e.rawMessage.content.match(new RegExp(a)));
    }
});
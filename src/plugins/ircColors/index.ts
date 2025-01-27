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

import { definePluginSettings } from "@api/Settings";
import { hash as h64 } from "@intrnl/xxhash64";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { useMemo } from "@webpack/common";

// Calculate a CSS color string based on the user ID
function calculateNameColorForUser(id: string) {
    const { lightness } = settings.use(["lightness"]);
    const idHash = useMemo(() => h64(id), [id]);

    return `hsl(${idHash % 360n}, 100%, ${lightness}%)`;
}

const settings = definePluginSettings({
    lightness: {
        description: "Lightness, in %. Change if the colors are too light or too dark",
        type: OptionType.NUMBER,
        default: 70,
    },
    memberListColors: {
        description: "Replace role colors in the member list",
        restartNeeded: true,
        type: OptionType.BOOLEAN,
        default: true
    }
});

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    authors: [Devs.Grzesiek11],
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(?<=className:\i\.username,style:.{0,50}:void 0,)/,
                replace: "style:{color:$self.calculateNameColorForMessageContext(arguments[0])},"
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(?<=\.MEMBER_LIST}\),\[\]\),)(.+?color:)null!=.{0,50}?(?=,)/,
                replace: (_, rest) => `ircColor=$self.calculateNameColorForListContext(arguments[0]),${rest}ircColor`
            },
            predicate: () => settings.store.memberListColors
        }
    ],

    calculateNameColorForMessageContext(context: any) {
        const id = context?.message?.author?.id;
        if (id == null) {
            return null;
        }
        return calculateNameColorForUser(id);
    },
    calculateNameColorForListContext(context: any) {
        const id = context?.user?.id;
        if (id == null) {
            return null;
        }
        return calculateNameColorForUser(id);
    }
});

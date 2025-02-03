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
import { ChannelStore } from "@webpack/common";

function calculateHSLforId(id: string) {
    // No hooks here because it breaks RoleColorsEverywhere
    // There is a condition to use this function, so react will refure to render the component
    // If we remove the condition, then the hash will be calculated even if this plugin is disabled
    // And everything would seem fine except mentions, those are still under some condition inside of discord code
    return {
        hue: Number(h64(id) % 360n),
        saturation: 100,
        lightness: settings.store.lightness
    };
}

// Calculate a CSS color string based on the user ID
function calculateNameColorForUser(id?: string) {
    if (!id) return null;
    const { hue, saturation, lightness } = calculateHSLforId(id);

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
    },
    applyColorOnlyToUsersWithoutColor: {
        description: "Apply colors only to users who don't have a predefined color",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    },
    applyColorOnlyInDms: {
        description: "Apply colors only in direct messages; do not apply colors in servers.",
        restartNeeded: false,
        type: OptionType.BOOLEAN,
        default: false
    }
});

export default definePlugin({
    name: "IrcColors",
    description: "Makes username colors in chat unique, like in IRC clients",
    authors: [Devs.Grzesiek11, Devs.jamesbt365, Devs.hen],
    settings,

    patches: [
        {
            find: '"Result cannot be null because the message is not null"',
            replacement: {
                match: /let (\i)=\i\(\i\);(?=.{1,25}"Result cannot be null because the message is not null")/,
                replace: "$&$1.colorString=$self.calculateNameColorForMessageContext(arguments[0],$1.colorString);"
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
    calculateHSLforId,
    calculateNameColorForMessageContext(message: any, colorString: string) {
        const id = message?.author?.id;
        const color = calculateNameColorForUser(id);
        const channel = ChannelStore.getChannel(message.channel_id);

        if (settings.store.applyColorOnlyInDms && !channel?.isPrivate()) {
            return colorString;
        }

        return (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString)
            ? color
            : colorString;
    },
    calculateNameColorForListContext(context: any) {
        const id = context?.user?.id;
        const colorString = context?.colorString;
        const color = calculateNameColorForUser(id);

        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) {
            return colorString;
        }

        return (!settings.store.applyColorOnlyToUsersWithoutColor || !colorString)
            ? color
            : colorString;
    }
});

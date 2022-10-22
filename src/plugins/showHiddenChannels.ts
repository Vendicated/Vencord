/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import definePlugin, { OptionType } from "../utils/types";
import { Settings } from "../Vencord";
import { waitFor } from "../webpack";

const VIEW_CHANNEL = 1024n;

let can = (permission, channel) => false;
waitFor(m => m.can && m.initialize, m => ({ can } = m.can));

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Show hidden channels",
    authors: [
        {
            name: "BigDuck",
            id: 1024588272623681609n
        }
    ],
    options: {
        hideUnreads: {
            description: "Hide unreads",
            type: OptionType.BOOLEAN,
            default: true,
            restartNeeded: true // Restart is needed to refresh channel list
        }
    },
    patches: [
        {
            // RenderLevel defines if a channel is hidden, collapsed in category, visible, etc
            find: ".CannotShow",
            replacement: {
                match: /renderLevel:(\w+)\.CannotShow/g,
                replace: "renderLevel:$1.Show"
            }
        },
        {
            // This is where the logic that chooses the icon is, we overide it to be a locked voice channel if it's hidden
            find: ".rulesChannelId))",
            replacement: {
                match: /(\w+)\.locked(.*?)switch\((\w+)\.type\)({case \w+\.\w+\.GUILD_ANNOUNCEMENT)/g,
                replace: "Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($3)||$1.locked$2switch($3._isHiddenChannel?2:$3.type)$4"
            }
        },
        {
            find: "?\"button\":\"link\"",
            predicate: () => Settings.plugins.ShowHiddenChannels.hideUnreads === true,
            replacement: {
                match: /(\w)\.connected,(\w)=(\w\.unread),(\w=\w\.canHaveDot)/g,
                replace: "$1.connected,$2=Vencord.Plugins.plugins.ShowHiddenChannels.isHiddenChannel($1.channel)?false:$3,$4"
            }
        }
    ],
    isHiddenChannel(channel) {
        if (!channel) return false;
        channel._isHiddenChannel = !can(VIEW_CHANNEL, channel);
        return channel._isHiddenChannel;
    }
});

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

import { definePluginSettings } from "@api/settings";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";

import { VoiceChannelField } from "./components/VoiceChannelField";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel in their profile modal",
        default: true,
    }
});

export default definePlugin({
    name: "User Voice Show",
    description: "See the channel a user is sitting in and click join that channel",
    authors: [
        {
            id: 319460781567639554n,
            name: "LordElias",
        },
    ],
    settings,

    getVoiceChannelField(props: any, origin: string) {
        if (origin === "modal" && !settings.store.showInUserProfileModal) return;

        // console.log(e);
        const { user } = props;
        const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
        if (!channelId) return;
        const channel = ChannelStore.getChannel(channelId);
        const guild = GuildStore.getGuild(channel.guild_id);

        const result = `${guild.name} | ${channel.name}`;
        // console.log(result);

        return (
            <VoiceChannelField
                channel={channel}
                label={result}
            />
        );
    },

    patches: [
        {
            find: ".showCopiableUsername",
            replacement: {
                // $1: argument name (currently "e")
                // $2: the rest inbetween the argument name and my actual match
                // $3: my actual match
                match: /(?<=function \w+\()(\w)(.*)(\(0,\w\.jsx\))(?=(.(?!\3))+?canDM)/,
                // paste my fancy custom button above the message field
                replace: "$1$2$self.getVoiceChannelField($1, \"popout\"),$3",
            }
        },
        {
            find: ".USER_PROFILE_MODAL",
            replacement: {
                // $1: argument name (currently "e")
                // $2: the rest inbetween the argument name and my actual match
                // $3: my actual match
                match: /(?<=function \w+\()(\w)(.*)((\(0,\w\.jsx\))(.(?!\4))+?user:\w{1,2}}\))/,
                // paste my fancy custom button above the message field
                replace: "$1$2$3,$self.getVoiceChannelField($1, \"modal\")",
            }
        }
    ],
    // Delete these two below if you are only using code patches
    start() {

    },
    stop() {

    },
});

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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";

import { VoiceChannelSection } from "./components/VoiceChannelSection";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel in their profile modal",
        default: true,
    },
    showVoiceChannelSectionHeader: {
        type: OptionType.BOOLEAN,
        description: 'Whether to show "IN A VOICE CHANNEL" above the join button',
        default: true,
    }
});

const getVoiceChannelField = (props: any) => {
    // console.log(e);
    const { user } = props;
    const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
    if (!channelId) return;
    const channel = ChannelStore.getChannel(channelId);
    const guild = GuildStore.getGuild(channel.guild_id);
    if (!guild) return; // When in DM call

    const result = `${guild.name} | ${channel.name}`;
    // console.log(result);

    return (
        <VoiceChannelSection
            channel={channel}
            label={result}
            showHeader={settings.store.showVoiceChannelSectionHeader}
        />
    );
};

export default definePlugin({
    name: "User Voice Show",
    description: "See the channel a user is sitting in and click join that channel",
    authors: [Devs.LordElias],
    settings,

    patchModal(props: any) {
        if (settings.store.showInUserProfileModal)
            return (
                <div style={{ margin: "0 12px" }} >
                    {getVoiceChannelField(props)}
                </div>
            );
    },

    patchPopout(props: any) {
        return getVoiceChannelField(props);
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
                replace: "$1$2$self.patchPopout($1),$3",
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
                replace: "$1$2$3,$self.patchModal($1)",
            }
        }
    ],
    // Delete these two below if you are only using code patches
    start() {

    },
    stop() {

    },
});

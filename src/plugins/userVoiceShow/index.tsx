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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { User } from "discord-types/general";

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

interface UserProps {
    user: User;
}

const VoiceChannelField = ErrorBoundary.wrap(({ user }: UserProps) => {
    const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
    if (!channelId) return null;

    const channel = ChannelStore.getChannel(channelId);
    const guild = GuildStore.getGuild(channel.guild_id);

    if (!guild) return null; // When in DM call

    const result = `${guild.name} | ${channel.name}`;

    return (
        <div style={{ marginBottom: 14 }}>
            <VoiceChannelSection
                channel={channel}
                label={result}
                showHeader={settings.store.showVoiceChannelSectionHeader}
            />
        </div>
    );
});

export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows whether a User is currently in a voice channel somewhere in their profile",
    authors: [Devs.LordElias],
    settings,

    patchModal({ user }: UserProps) {
        if (!settings.store.showInUserProfileModal)
            return null;

        return (
            <div className="vc-uvs-modal-margin">
                <VoiceChannelField user={user} />
            </div>
        );
    },

    patchPopout: ({ user }: UserProps) => <VoiceChannelField user={user} />,

    patches: [
        {
            find: ".showCopiableUsername",
            replacement: {
                match: /\(0,\w\.jsx\)\(\w{2},{user:\w,setNote/,
                // paste my fancy custom button above the message field
                replace: "$self.patchPopout(arguments[0]),$&",
            }
        },
        {
            find: ".USER_PROFILE_MODAL",
            replacement: {
                match: /,{user:\w{1,2}}\)(?!;case)/,
                // paste my fancy custom button below the username
                replace: "$&,$self.patchModal(arguments[0])",
            }
        }
    ],
});

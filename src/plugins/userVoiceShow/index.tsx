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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { VoiceChannelIdSection } from "./components/VoiceChannelIdSection";
import { VoiceChannelSection } from "./components/VoiceChannelSection";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

export const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel in their profile modal",
        default: true,
    },
    showVoiceChannelSectionHeader: {
        type: OptionType.BOOLEAN,
        description: 'Whether to show "IN A VOICE CHANNEL" above the join button',
        default: true,
    },
});

interface UserProps {
    user: User;
}

const VoiceChannelField = ErrorBoundary.wrap(({ user }: UserProps) => {
    const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
    if (!channelId) return null;

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return (
        <VoiceChannelIdSection
            channelId={channelId}
            showHeader={settings.store.showVoiceChannelSectionHeader}
        />
    );

    const guild = GuildStore.getGuild(channel.guild_id);

    if (!guild) return null; // When in DM call

    return (
        <VoiceChannelSection
            channel={channel}
            joinDisabled={VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser().id)?.channelId === channelId}
            showHeader={settings.store.showVoiceChannelSectionHeader}
        />
    );
});


export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows whether a User is currently in a voice channel somewhere in their profile",
    authors: [Devs.LordElias, Devs.Johannes7k75],
    tags: ["voice", "activity"],
    settings,

    patchModal: ErrorBoundary.wrap(({ user }: UserProps) => {
        if (!settings.store.showInUserProfileModal)
            return null;

        return (
            <div className="vc-uvs-modal-margin">
                <VoiceChannelField user={user} />
            </div>
        );
    }, { noop: true }),

    patchPopout: ErrorBoundary.wrap(({ user }: UserProps) => {
        const isSelfUser = user.id === UserStore.getCurrentUser().id;
        return (
            <div className={isSelfUser ? "vc-uvs-popout-margin-self" : ""}>
                <VoiceChannelField user={user} />
            </div>
        );
    }, { noop: true }),

    patchProfilePanel: ErrorBoundary.wrap(({ id }: { id: string; }) => {
        const user = UserStore.getUser(id);
        return (
            <div className={""}>
                <VoiceChannelField user={user} />
            </div>
        );
    }, { noop: true }),

    patchPrivateChannelProfile: ErrorBoundary.wrap(({ user }: UserProps) => {
        if (!user) return null;

        return <div className="vc-uvs-private-channel">
            <VoiceChannelField user={user} />
        </div>;
    }, { noop: true }),

    patches: [
        // User Profile Modal - below user info
        {
            find: ".popularApplicationCommandIds,",
            replacement: {
                match: /applicationId:\i\.id}\),(?=.{0,50}setNote:\i)/,
                replace: "$&$self.patchPopout(arguments[0]),",
            }
        },

        // User Popout Modal - above Notes
        {
            find: ".Messages.MUTUAL_GUILDS_WITH_END_COUNT", // Lazy-loaded
            replacement: {
                match: /\.body.+?displayProfile:\i}\),/,
                // paste my fancy custom button below the username
                replace: "$&$self.patchModal(arguments[0]),",
            }
        },
        {
            find: "\"Profile Panel: user cannot be undefined\"",
            replacement: {
                // createElement(Divider, {}), createElement(NoteComponent)
                match: /\(0,\i\.jsx\)\(\i\.\i,\{\}\).{0,100}setNote:(?=.+?channelId:(\i).id)/,
                replace: "$self.patchProfilePanel({ id: $1.recipients[0] }),$&"
            }
        },

        // Private Channel Profile - above Activities
        {
            find: "UserProfileTypes.PANEL,useDefaultClientTheme",
            replacement: {
                match: /user:(\i){1,2}.+?voiceGuild,voiceChannel.+?:null,/,
                replace: "$&$self.patchPrivateChannelProfile({user:$1}),"
            }
        }
    ],
});

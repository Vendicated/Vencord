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

import { addDecorator, removeDecorator } from "@api/MemberListDecorators";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore } from "@webpack/common";
import { User } from "discord-types/general";

import { VoiceChannelIndicator } from "./components/VoiceChannelIndicator";
import { VoiceChannelSection } from "./components/VoiceChannelSection";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const UserModalSection = findByCodeLazy("heading:", "subheading:", "scrollIntoView:");

const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel in their profile modal",
        default: true,
    },
    showVoiceChannelIndicator: {
        type: OptionType.BOOLEAN,
        description: "Indicator in the member list wether a user is in a voice channel",
        default: true,
    }
});

interface UserProps {
    user: User;
}
interface VoiceChannelFieldProps {
    user: User;
    isPopout?: boolean;
}

const VoiceChannelField = ErrorBoundary.wrap(({ user, isPopout = false }: VoiceChannelFieldProps) => {
    const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
    if (!channelId) return null;

    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return null;

    const guild = GuildStore.getGuild(channel.guild_id);

    if (!guild) return null; // When in DM call

    const result = `${guild.name} | ${channel.name}`;

    // when popout do padding and show header, when in modal no pad and no header
    return isPopout ? (
        <div style={{ padding: "4px 16px 8px" }}>
            <VoiceChannelSection
                channel={channel}
                label={result}
                showHeader
            />
        </div>
    ) : (
        <VoiceChannelSection
            channel={channel}
            label={result}
        />
    );
});

export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows whether a User is currently in a voice channel somewhere in their profile",
    authors: [Devs.LordElias],
    settings,

    start() {
        VoiceStateStore.getAllVoiceStates(); // reduces api spam i hope

        addDecorator("uvs-indicator", props => {
            if (!props.user) return null;

            const { channelId } = VoiceStateStore.getVoiceStateForUser(props.user.id) ?? {};
            if (!channelId) return null;

            const channel = ChannelStore.getChannel(channelId);
            if (!channel) return null;

            const guild = GuildStore.getGuild(channel.guild_id);

            if (!guild) return null; // When in DM call

            const result = `${guild.name} | ${channel.name}`;

            return (
                <ErrorBoundary noop>
                    <VoiceChannelIndicator tooltipText={result} channel={channel}></VoiceChannelIndicator>
                </ErrorBoundary>
            );
        });
    },

    stop() {
        removeDecorator("uvs-indicator");
    },

    patchModal({ user }: UserProps) {
        if (!settings.store.showInUserProfileModal) return null;

        return (
            <UserModalSection heading="In a voice channel">
                <VoiceChannelField user={user} />
            </UserModalSection>
        );
    },

    patchPopout: ({ user }: UserProps) => {
        return (
            <VoiceChannelField user={user} isPopout />
        );
    },

    patches: [
        // in profile popout above message box
        {
            find: ":\"BITE_SIZE_POPOUT_RESTRICTED_BLOCKER_PROFILE",
            replacement: {
                match: /\(0,\i\.jsx\)\(\i\.\i,{user:\i,guildId:\i,channelId:\i,onClose:\i}\)\]}\),/,
                replace: "$self.patchPopout(arguments[0]),$&",
            }
        },
        // in profile modal
        {
            find: "action:\"PRESS_APP_CONNECTION\"",
            replacement: {
                // match: /scroller,children:\[/, // at very top
                match: /setLineClamp:!\d}\),/, // after bio
                replace: "$&$self.patchModal(arguments[0]),"
            }
        }
    ],
});

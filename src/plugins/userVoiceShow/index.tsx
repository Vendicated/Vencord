/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { VoiceChannelSection } from "./components/VoiceChannelSection";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const UserPopoutSectionCssClasses = findByPropsLazy("section", "lastSection");

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
    if (!channel) return null;

    const guild = GuildStore.getGuild(channel.guild_id);

    if (!guild) return null; // When in DM call

    const result = `${guild.name} | ${channel.name}`;

    return (
        <VoiceChannelSection
            channel={channel}
            label={result}
            showHeader={settings.store.showVoiceChannelSectionHeader}
        />
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

    patchPopout: ({ user }: UserProps) => {
        const isSelfUser = user.id === UserStore.getCurrentUser().id;
        return (
            <div className={isSelfUser ? `vc-uvs-popout-margin ${UserPopoutSectionCssClasses.lastSection}` : ""}>
                <VoiceChannelField user={user} />
            </div>
        );
    },

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
                match: /\(\)\.body.+?displayProfile:\i}\),/,
                // paste my fancy custom button below the username
                replace: "$&$self.patchModal(arguments[0]),",
            }
        }
    ],
});

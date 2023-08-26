/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Copyright (c) 2022 Neodymium
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

import "./VoiceActivityIcon.css";

import { classNameFactory } from "@api/Styles";
import { LazyComponent } from "@utils/react";
import { findByCode, findByCodeLazy, findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, PermissionStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import { settings } from "..";

const CONNECT = 1n << 20n;

const Icons = {
    CallJoin: findByCodeLazy("M11 5V3C16.515 3 21 7.486"),
    People: findByCodeLazy("M14 8.00598C14 10.211 12.206 12.006"),
    Speaker: findByCodeLazy("M11.383 3.07904C11.009 2.92504 10.579 3.01004"),
    Muted: findByCodeLazy("M6.7 11H5C5 12.19 5.34 13.3"),
    Deafened: findByCodeLazy("M6.16204 15.0065C6.10859 15.0022 6.05455 15"),
    Video: findByCodeLazy("M21.526 8.149C21.231 7.966 20.862 7.951"),
    Stage: findByCodeLazy("M14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11C13.1 11 14 11.9 14 13ZM8.5 20V19.5C8.5"),
};

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const transitionTo: (path: string) => null = findByCodeLazy("transitionTo -");
const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

interface VoiceActivityIconProps {
    user: User;
}
interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

function groupDMName(members: any[]): string {
    if (members.length === 1) {
        return UserStore.getUser(members[0]).username;
    } else if (members.length > 1) {
        let name = "";
        for (let i = 0; i < members.length; i++) {
            if (i === members.length - 1) name += UserStore.getUser(members[i]).username;
            else name += UserStore.getUser(members[i]).username + ", ";
        }
        return name;
    }
    return "Unnamed";
}

function makeRenderMoreUsers(users: User[], count = 5) {
    return function renderMoreUsers(_label: string, _count: number) {
        return (
            <Tooltip text={users.slice(count).map(u => u.username).join(", ")} >
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{users.length - count + 1}
                    </div>
                )}
            </Tooltip >
        );
    };
}

const cl = classNameFactory("vc-uvs-");
export const VoiceActivityClassFactory = cl;

export default ({ user }: VoiceActivityIconProps) => {
    let channelPath: string;
    let text: string;
    let subtext: string;
    let TooltipIcon: React.FunctionComponent<{ width: string; height: string; className: string; }>;
    let className = cl("icon");
    let voiceChannelUsers: User[] | undefined;

    if (!user?.id) return null;

    const voiceState = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(user.id));
    const currentUserVoiceState = useStateFromStores([VoiceStateStore], () =>
        VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser()?.id)
    );
    if (!voiceState) return null;
    const channel = ChannelStore.getChannel(voiceState.channelId);
    if (!channel) return null;
    const guild = GuildStore.getGuild(channel.guild_id);

    if (settings.store.showUsersInVoiceActivity) {
        voiceChannelUsers = (Object.values(VoiceStateStore.getVoiceStatesForChannel(channel?.id)) as VoiceState[]).map(vs => UserStore.getUser(vs.userId));
    }

    if (channel.id === currentUserVoiceState?.channelId)
        className = `${cl("icon")} ${cl("iconCurrentCall")}`;
    if (voiceState.selfStream) className = cl("iconLive");

    if (guild) {
        text = guild.name;
        subtext = channel.name;
        TooltipIcon = Icons.Speaker;
        channelPath = `/channels/${guild.id}/${channel.id}`;
    } else {
        text = channel.name;
        subtext = "Voice Call";
        TooltipIcon = Icons.CallJoin;
        channelPath = `/channels/@me/${channel.id}`;
    }
    switch (channel.type) {
        case 1:
            text = UserStore.getUser(channel.recipients[0]).username;
            subtext = "Private Call";
            break;
        case 3:
            text = channel.name || groupDMName(channel.recipients);
            subtext = "Group Call";
            TooltipIcon = Icons.People;
            break;
        case 13:
            TooltipIcon = Icons.Stage;
    }

    let Icon = Icons.Speaker;
    if ((voiceState.selfDeaf || voiceState.deaf)) Icon = Icons.Deafened;
    else if ((voiceState.selfMute || voiceState.mute)) Icon = Icons.Muted;
    else if (voiceState.selfVideo) Icon = Icons.Video;

    const canConnect = PermissionStore.can(CONNECT, channel);
    if (!canConnect) className = `${className} ${cl("iconLocked")}`;

    return (
        <div className={className} onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            if (!canConnect && guild) transitionTo(`/channels/${guild.id}`);
            if (channelPath) transitionTo(channelPath);
        }}>
            <Tooltip text={
                <div className={cl("tooltip")}>
                    <div className={cl("header")} style={{ fontWeight: "600" }}>
                        {text}
                    </div>
                    <div className={cl("subtext")}>
                        <div style={{ fontWeight: "400" }}>{subtext}</div>
                        {voiceChannelUsers && <div style={{ width: "fit-content", marginTop: 6, display: "flex", alignItems: "center" }}>
                            <TooltipIcon className={cl("tooltipIcon")} width="18" height="18" />
                            <UserSummaryItem
                                users={voiceChannelUsers}
                                guildId={guild.id}
                                renderIcon={false}
                                max={5}
                                size={24}
                                renderMoreUsers={makeRenderMoreUsers(voiceChannelUsers, 5)}
                            />
                        </div>}
                    </div>
                </div>
            }>

                {tooltipProps => !voiceState.selfStream ? <Icon {...tooltipProps} width="14" height="14" /> : <div {...tooltipProps}>Live</div>}
            </Tooltip>
        </div>
    );
};

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
import { findByCode, findByPropsLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, PermissionStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";
import { PropsWithChildren, SVGProps } from "react";

import { settings } from "..";

const CONNECT = 1n << 20n;

interface BaseIconProps extends SVGProps<SVGSVGElement> {
    viewBox?: string;
    className?: string;
    height?: string | number;
    width?: string | number;
}

function SvgIcon({ height = 24, width = 24, className, path, children, viewBox = "0 0 24 24", ...svgProps }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={cl("svg").concat(" ", className ?? "")}
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            <path fill="currentColor" d={path}></path>
        </svg>
    );
}


const Icons = {
    CallJoin: "M11 5V3C16.515 3 21 7.486 21 13H19C19 8.589 15.411 5 11 5ZM17 13H15C15 10.795 13.206 9 11 9V7C14.309 7 17 9.691 17 13ZM11 11V13H13C13 11.896 12.105 11 11 11ZM14 16H18C18.553 16 19 16.447 19 17V21C19 21.553 18.553 22 18 22H13C6.925 22 2 17.075 2 11V6C2 5.447 2.448 5 3 5H7C7.553 5 8 5.447 8 6V10C8 10.553 7.553 11 7 11H6C6.063 14.938 9 18 13 18V17C13 16.447 13.447 16 14 16Z", // M11 5V3C16.515 3 21 7.486
    People: "M14 8.00598C14 10.211 12.206 12.006 10 12.006C7.795 12.006 6 10.211 6 8.00598C6 5.80098 7.794 4.00598 10 4.00598C12.206 4.00598 14 5.80098 14 8.00598ZM2 19.006C2 15.473 5.29 13.006 10 13.006C14.711 13.006 18 15.473 18 19.006V20.006H2V19.006Z", // M14 8.00598C14 10.211 12.206 12.006
    Speaker: "M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 8.00204H3C2.45 8.00204 2 8.45304 2 9.00204V15.002C2 15.552 2.45 16.002 3 16.002H6L10.293 20.71C10.579 20.996 11.009 21.082 11.383 20.927C11.757 20.772 12 20.407 12 20.002V4.00204C12 3.59904 11.757 3.23204 11.383 3.07904ZM14 5.00195V7.00195C16.757 7.00195 19 9.24595 19 12.002C19 14.759 16.757 17.002 14 17.002V19.002C17.86 19.002 21 15.863 21 12.002C21 8.14295 17.86 5.00195 14 5.00195ZM14 9.00195C15.654 9.00195 17 10.349 17 12.002C17 13.657 15.654 15.002 14 15.002V13.002C14.551 13.002 15 12.553 15 12.002C15 11.451 14.551 11.002 14 11.002V9.00195Z", // M11.383 3.07904C11.009 2.92504 10.579 3.01004
    Muted: "M6.7 11H5C5 12.19 5.34 13.3 5.9 14.28L7.13 13.05C6.86 12.43 6.7 11.74 6.7 11 M9.01 11.085C9.015 11.1125 9.02 11.14 9.02 11.17L15 5.18V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 11.03 9.005 11.0575 9.01 11.085 M11.7237 16.0927L10.9632 16.8531L10.2533 17.5688C10.4978 17.633 10.747 17.6839 11 17.72V22H13V17.72C16.28 17.23 19 14.41 19 11H17.3C17.3 14 14.76 16.1 12 16.1C11.9076 16.1 11.8155 16.0975 11.7237 16.0927 M21 4.27L19.73 3L3 19.73L4.27 21L8.46 16.82L9.69 15.58L11.35 13.92L14.99 10.28L21 4.27Z", // M6.7 11H5C5 12.19 5.34 13.3
    Deafened: "M6.16204 15.0065C6.10859 15.0022 6.05455 15 6 15H4V12C4 7.588 7.589 4 12 4C13.4809 4 14.8691 4.40439 16.0599 5.10859L17.5102 3.65835C15.9292 2.61064 14.0346 2 12 2C6.486 2 2 6.485 2 12V19.1685L6.16204 15.0065 M3.20101 23.6243L1.7868 22.2101L21.5858 2.41113L23 3.82535L3.20101 23.6243 M19.725 9.91686C19.9043 10.5813 20 11.2796 20 12V15H18C16.896 15 16 15.896 16 17V20C16 21.104 16.896 22 18 22H20C21.105 22 22 21.104 22 20V12C22 10.7075 21.7536 9.47149 21.3053 8.33658L19.725 9.91686Z", // M6.16204 15.0065C6.10859 15.0022 6.05455 15
    Video: "M21.526 8.149C21.231 7.966 20.862 7.951 20.553 8.105L18 9.382V7C18 5.897 17.103 5 16 5H4C2.897 5 2 5.897 2 7V17C2 18.104 2.897 19 4 19H16C17.103 19 18 18.104 18 17V14.618L20.553 15.894C20.694 15.965 20.847 16 21 16C21.183 16 21.365 15.949 21.526 15.851C21.82 15.668 22 15.347 22 15V9C22 8.653 21.82 8.332 21.526 8.149Z", // M21.526 8.149C21.231 7.966 20.862 7.951
    Stage: "M14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11C13.1 11 14 11.9 14 13ZM8.5 20V19.5C8.5 17.8 9.94 16.5 12 16.5C14.06 16.5 15.5 17.8 15.5 19.5V20H8.5ZM7 13C7 10.24 9.24 8 12 8C14.76 8 17 10.24 17 13C17 13.91 16.74 14.75 16.31 15.49L17.62 16.25C18.17 15.29 18.5 14.19 18.5 13C18.5 9.42 15.58 6.5 12 6.5C8.42 6.5 5.5 9.42 5.5 13C5.5 14.18 5.82 15.29 6.38 16.25L7.69 15.49C7.26 14.75 7 13.91 7 13ZM2.5 13C2.5 7.75 6.75 3.5 12 3.5C17.25 3.5 21.5 7.75 21.5 13C21.5 14.73 21.03 16.35 20.22 17.75L21.51 18.5C22.45 16.88 23 15 23 13C23 6.93 18.07 2 12 2C5.93 2 1 6.93 1 13C1 15 1.55 16.88 2.48 18.49L3.77 17.74C2.97 16.35 2.5 14.73 2.5 13Z", // M14 13C14 14.1 13.1 15 12 15C10.9 15 10 14.1 10 13C10 11.9 10.9 11 12 11C13.1 11 14 11.9 14 13ZM8.5 20V19.5C8.5
};

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");

interface VoiceActivityIconProps {
    user: User;
    dmChannel: boolean;
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

export default ({ user, dmChannel }: VoiceActivityIconProps) => {
    let channelPath: string;
    let text: string;
    let subtext: string;
    let TooltipIcon: string;
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
        className = `${className} ${cl("icon-current-call")}`;
    if (voiceState.selfStream) className = cl("icon-live");

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

    let Icon: string = Icons.Speaker;
    if ((voiceState.selfDeaf || voiceState.deaf)) Icon = Icons.Deafened;
    else if ((voiceState.selfMute || voiceState.mute)) Icon = Icons.Muted;
    else if (voiceState.selfVideo) Icon = Icons.Video;

    const canConnect = PermissionStore.can(CONNECT, channel);
    if (!canConnect) className = `${className} ${cl("icon-locked")}`;
    if (dmChannel) className = `${className} ${cl("icon-container")}`;

    return (
        <div className={className} onClick={() => {
            if (!canConnect && guild)
                Vencord.Webpack.Common.NavigationRouter.transitionToGuild(guild.id);
            else
                Vencord.Webpack.Common.NavigationRouter.transitionTo(channelPath);
        }}>
            <Tooltip text={
                <div className={cl("tooltip")}>
                    <div className={cl("tooltip-header")} style={{ fontWeight: "600" }}>
                        {text}
                    </div>
                    <div className={cl("tooltip-subtext")}>
                        <div style={{ fontWeight: "400" }}>{subtext}</div>
                        {voiceChannelUsers && <div style={{ width: "fit-content", marginTop: 6, display: "flex", alignItems: "center" }}>
                            <SvgIcon className={cl("tooltip-icon")} width="18" height="18" path={TooltipIcon}></SvgIcon>
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

                {tooltipProps => !voiceState.selfStream ? <SvgIcon {...tooltipProps} width="14" height="14" path={Icon} /> : <div {...tooltipProps}>Live</div>}
            </Tooltip>
        </div>
    );
};

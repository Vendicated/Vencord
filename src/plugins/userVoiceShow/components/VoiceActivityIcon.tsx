/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, PermissionsBits, PermissionStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { Channel, Guild, User } from "discord-types/general";

import { Icons } from "..";
import { settings } from "../settings";
import { SvgIconProps, VoiceActivityIconProps } from "../types";

const cl = classNameFactory("vc-uvs-");

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const UsersList = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

const SvgIcon = ({ className, height = 24, path, viewBox = "0 0 24 24", width = 24, ...props }: SvgIconProps) => (
    <svg className={cl("svg", className)} height={height} viewBox={viewBox} width={width} {...props}>
        <path fill-rule="evenodd" clip-rule="evenodd" d={path} fill="currentColor" />
    </svg>
);

function getHeaderText(guild: Guild, channel: Channel) {
    return guild.name ?? (channel.type === 3) ? "Private Call" : "Group Call";
}

function getSubText(channel: Channel) {
    return channel.name ?? UserStore.getUser(channel.recipients.find(r => r !== UserStore.getCurrentUser().id)!).username;
}

function getTooltipIcon(guild: Guild, channel: Channel, voiceState) {
    const canConnectToChannel = PermissionStore.can(PermissionsBits.CONNECT, channel);

    let tooltipIcon = Icons.Speaker;
    if (!canConnectToChannel && guild) tooltipIcon = Icons.Locked;
    else if (voiceState.selfVideo) tooltipIcon = Icons.Video;
    else if (voiceState.selfDeaf || voiceState.deaf) tooltipIcon = Icons.Deafened;
    else if (voiceState.selfMute || voiceState.mute) tooltipIcon = Icons.Muted;

    return tooltipIcon;
}

function getTooltipSubIcon(channel: Channel) {
    let tooltipSubIcon = Icons.Speaker;

    if (channel.type === 13) tooltipSubIcon = Icons.Stage;
    else if (channel.type === 1) tooltipSubIcon = Icons.Private;
    else if (channel.type === 3) tooltipSubIcon = Icons.Group;

    return tooltipSubIcon;
}

export default function VoiceActivityIcon({ user, needContainer, inProfile }: VoiceActivityIconProps) {
    const currentUserVoiceState = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser().id));
    const targetUserVoiceState = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(user.id));
    if (!targetUserVoiceState) return null;

    const channel = ChannelStore.getChannel(targetUserVoiceState.channelId);
    if (!channel) return null;

    const guild = GuildStore.getGuild(channel.guild_id);
    const channelPath = `/channels/${guild ? guild.id : "@me"}/${channel.id}`;
    const tooltipIcon = getTooltipIcon(guild, channel, targetUserVoiceState);
    const TooltipSubIcon = getTooltipSubIcon(channel);
    const headerText = getHeaderText(guild, channel);
    const subtext = getSubText(channel);

    let className = inProfile ? cl("profile-icon") : cl("icon");

    if (targetUserVoiceState.selfStream) className = cl("icon-live");
    else if (channel.id === currentUserVoiceState?.channelId) className += ` ${cl("icon-current-call")}`;

    if (needContainer) className += ` ${cl("icon-container")}`;

    let voiceChannelUsers: User[] | undefined;
    if (settings.store.showUsersInVoiceActivity) {
        voiceChannelUsers = (Object.values(VoiceStateStore.getVoiceStatesForChannel(channel?.id)) as { userId: string; }[]).map(vs => UserStore.getUser(vs.userId));
    }

    return (
        <div
            className={className}
            onClick={
                () => { Vencord.Webpack.Common.NavigationRouter.transitionTo(channelPath); }
            }
        >
            <Tooltip
                text={
                    <div className={cl("tooltip")}>
                        <div className={cl("tooltip-header")}>{headerText}</div>
                        <div className={cl("tooltip-subtext")}>{subtext}</div>
                        {
                            voiceChannelUsers && <div className={cl("users-list")}>
                                <SvgIcon className={cl("tooltip-icon")} width="18" height="18" path={TooltipSubIcon}></SvgIcon>
                                <UsersList
                                    users={voiceChannelUsers}
                                    renderIcon={false}
                                    max={5}
                                    size={24}
                                />
                            </div>
                        }
                    </div>
                }
            >
                {
                    tooltipProps => targetUserVoiceState.selfStream
                        ? <div {...tooltipProps}>Live</div>
                        : inProfile
                            ? <SvgIcon {...tooltipProps} width="20" height="20" path={tooltipIcon} />
                            : <SvgIcon {...tooltipProps} width="14" height="14" path={tooltipIcon} style={{ position: "absolute" }} />
                }

            </Tooltip>
        </div>
    );
}

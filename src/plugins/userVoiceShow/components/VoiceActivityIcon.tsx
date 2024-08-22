/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, PermissionsBits, PermissionStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

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


export default function VoiceActivityIcon({ user, needContainer, inProfile }: VoiceActivityIconProps) {
    const currentUserVoiceState = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(UserStore.getCurrentUser().id));
    const targetUserVoiceState = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(user.id));
    if (!targetUserVoiceState) return null;

    const channel = ChannelStore.getChannel(targetUserVoiceState.channelId);
    if (!channel) return null;
    const canConnectToChannel = PermissionStore.can(PermissionsBits.CONNECT, channel);

    const guild = GuildStore.getGuild(channel.guild_id);
    const channelPath = `/channels/${guild ? guild.id : "@me"}/${channel.id}`;

    let className = inProfile ? cl("profile-icon") : cl("icon");
    if (targetUserVoiceState.selfStream) className = cl("icon-live");
    else if (channel.id === currentUserVoiceState?.channelId) className += ` ${cl("icon-current-call")}`;
    if (needContainer) className += ` ${cl("icon-container")}`;

    let TooltipIcon = Icons.Speaker;
    let TooltipSubIcon = Icons.Speaker;
    if (!canConnectToChannel && guild) TooltipIcon = Icons.Locked;
    else if (targetUserVoiceState.selfVideo) TooltipIcon = Icons.Video;
    else if (targetUserVoiceState.selfDeaf || targetUserVoiceState.deaf) TooltipIcon = Icons.Deafened;
    else if (targetUserVoiceState.selfMute || targetUserVoiceState.mute) TooltipIcon = Icons.Muted;

    let headerText = "";
    let subtext = "";
    if (guild) {
        headerText = guild.name;
        subtext = channel.name;
        if (channel.type === 13) TooltipSubIcon = Icons.Stage;
    } else {
        headerText = channel.type === 1 ? "Private Call" : "Group Call";
        subtext = channel.type === 1 ? UserStore.getUser(channel.recipients.find(r => r !== UserStore.getCurrentUser().id)!).username : channel.name;
        TooltipSubIcon = channel.type === 1 ? Icons.Private : Icons.Group;
    }

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
                {tooltipProps => targetUserVoiceState.selfStream ? <div {...tooltipProps}>Live</div> :
                    inProfile ? <SvgIcon {...tooltipProps} width="20" height="20" path={TooltipIcon} /> :
                        <SvgIcon {...tooltipProps} width="14" height="14" path={TooltipIcon} style={{ position: "absolute" }} />}
            </Tooltip>
        </div>
    );
}

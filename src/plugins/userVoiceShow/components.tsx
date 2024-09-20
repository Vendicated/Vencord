/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { filters, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { ChannelStore, GuildStore, IconUtils, match, NavigationRouter, P, PermissionsBits, PermissionStore, React, showToast, Text, Toasts, Tooltip, useMemo, UserStore, useStateFromStores } from "@webpack/common";
import { Channel } from "discord-types/general";

const cl = classNameFactory("vc-uvs-");

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");
const { useChannelName } = mapMangledModuleLazy(".Messages.GROUP_DM_ALONE", {
    useChannelName: filters.byCode("()=>null==")
});
const getDMChannelIcon = findByCodeLazy(".getChannelIconURL({");
const VoiceStateStore = findStoreLazy("VoiceStateStore");

const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");
const Avatar = findComponentByCodeLazy(".AVATAR_STATUS_TYPING_16;");
const GroupDMAvatars = findComponentByCodeLazy(".AvatarSizeSpecs[", "getAvatarURL");

interface IconProps extends React.ComponentPropsWithoutRef<"div"> {
    size?: number;
}

function SpeakerIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            role={props.onClick != null ? "button" : undefined}
            className={classes(cl("speaker"), props.onClick != null ? cl("clickable") : undefined, props.className)}
        >
            <svg
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" />
                <path d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
            </svg>
        </div>
    );
}

function LockedSpeakerIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            role={props.onClick != null ? "button" : undefined}
            className={classes(cl("speaker"), props.onClick != null ? cl("clickable") : undefined, props.className)}
        >
            <svg
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path fillRule="evenodd" clipRule="evenodd" d="M16 4h.5v-.5a2.5 2.5 0 0 1 5 0V4h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4-.5V4h-2v-.5a1 1 0 1 1 2 0Z" />
                <path d="M11 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-.06a1 1 0 0 1-.74-.32L5.92 17H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.92l4.28-4.68a1 1 0 0 1 .74-.32H11ZM20.5 12c-.28 0-.5.22-.52.5a7 7 0 0 1-5.13 6.25c-.48.13-.85.55-.85 1.05v.03c0 .6.52 1.06 1.1.92a9 9 0 0 0 6.89-8.25.48.48 0 0 0-.49-.5h-1ZM16.5 12c-.28 0-.5.23-.54.5a3 3 0 0 1-1.33 2.02c-.35.23-.63.6-.63 1.02v.14c0 .63.59 1.1 1.16.83a5 5 0 0 0 2.82-4.01c.02-.28-.2-.5-.48-.5h-1Z" />
            </svg>
        </div>
    );
}

interface VoiceChannelTooltipProps {
    channel: Channel;
}

function VoiceChannelTooltip({ channel }: VoiceChannelTooltipProps) {
    const voiceStates = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStatesForChannel(channel.id));

    const users = useMemo(
        () => Object.values<any>(voiceStates).map(voiceState => UserStore.getUser(voiceState.userId)).filter(user => user != null),
        [voiceStates]
    );

    const guild = channel.getGuildId() == null ? undefined : GuildStore.getGuild(channel.getGuildId());
    const guildIcon = guild?.icon == null ? undefined : IconUtils.getGuildIconURL({
        id: guild.id,
        icon: guild.icon,
        size: 30
    });

    const channelIcon = match(channel.type)
        .with(P.union(1, 3), () => {
            return channel.recipients.length >= 2 && channel.icon == null
                ? <GroupDMAvatars recipients={channel.recipients} size="SIZE_32" />
                : <Avatar src={getDMChannelIcon(channel)} size="SIZE_32" />;
        })
        .otherwise(() => null);
    const channelName = useChannelName(channel);

    return (
        <>
            {guild != null && (
                <div className={cl("name")}>
                    {guildIcon != null && <img className={cl("guild-icon")} src={guildIcon} alt="" />}
                    <Text variant="text-sm/bold">{guild.name}</Text>
                </div>
            )}
            <div className={cl("name")}>
                {channelIcon}
                <Text variant="text-sm/semibold">{channelName}</Text>
            </div>
            <div className={cl("vc-members")}>
                <SpeakerIcon size={18} />
                <UserSummaryItem
                    users={users}
                    renderIcon={false}
                    max={13}
                    size={18}
                />
            </div>
        </>
    );
}

interface VoiceChannelIndicatorProps {
    userId: string;
    size?: number;
    isActionButton?: boolean;
}

const clickTimers = {} as Record<string, any>;

export const VoiceChannelIndicator = ErrorBoundary.wrap(({ userId, size, isActionButton }: VoiceChannelIndicatorProps) => {
    const channelId = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(userId)?.channelId as string | undefined);

    const channel = channelId == null ? undefined : ChannelStore.getChannel(channelId);
    if (channel == null) return null;

    const isDM = channel.isDM() || channel.isMultiUserDM();
    const isLocked = !isDM && (!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) || !PermissionStore.can(PermissionsBits.CONNECT, channel));

    function onClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (channel == null || channelId == null) return;

        if (!isDM && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel)) {
            showToast("You cannot view the user's Voice Channel", Toasts.Type.FAILURE);
            return;
        }

        clearTimeout(clickTimers[channelId]);
        delete clickTimers[channelId];

        if (e.detail > 1) {
            if (!isDM && !PermissionStore.can(PermissionsBits.CONNECT, channel)) {
                showToast("You cannot join the user's Voice Channel", Toasts.Type.FAILURE);
                return;
            }

            selectVoiceChannel(channelId);
        } else {
            clickTimers[channelId] = setTimeout(() => {
                NavigationRouter.transitionTo(`/channels/${channel.getGuildId() ?? "@me"}/${channelId}`);
                delete clickTimers[channelId];
            }, 250);
        }
    }

    return (
        <Tooltip
            text={<VoiceChannelTooltip channel={channel} />}
            tooltipClassName={cl("tooltip-container")}
            tooltipContentClassName={cl("tooltip-content")}
        >
            {props => {
                const iconProps = {
                    ...props,
                    onClick,
                    size,
                    className: isActionButton ? cl("indicator-action-button") : cl("speaker-padding")
                };

                return isLocked ?
                    <LockedSpeakerIcon {...iconProps} />
                    : <SpeakerIcon {...iconProps} />;
            }}
        </Tooltip>
    );
}, { noop: true });

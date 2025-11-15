/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import ShowHiddenChannelsPlugin from "@plugins/showHiddenChannels";
import { classes } from "@utils/misc";
import { Channel } from "@vencord/discord-types";
import { filters, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { ChannelRouter, ChannelStore, Parser, PermissionsBits, PermissionStore, React, showToast, Text, Toasts, Tooltip, useMemo, UserStore, UserSummaryItem, useStateFromStores, VoiceStateStore } from "@webpack/common";
import { PropsWithChildren } from "react";

const cl = classNameFactory("vc-uvs-");

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");
const { useChannelName } = mapMangledModuleLazy("#{intl::GROUP_DM_ALONE}", {
    useChannelName: filters.byCode("()=>null==")
});

const ActionButtonClasses = findByPropsLazy("actionButton", "highlight");

type IconProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
    size?: number;
    iconClassName?: string;
};

function Icon(props: PropsWithChildren<IconProps>) {
    const {
        size = 16,
        className,
        iconClassName,
        ...restProps
    } = props;

    return (
        <div
            {...restProps}
            className={classes(cl("speaker"), className)}
        >
            <svg
                className={iconClassName}
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                {props.children}
            </svg>
        </div>
    );
}

function SpeakerIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" />
            <path d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
        </Icon>
    );
}

function LockedSpeakerIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path fillRule="evenodd" clipRule="evenodd" d="M16 4h.5v-.5a2.5 2.5 0 0 1 5 0V4h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4-.5V4h-2v-.5a1 1 0 1 1 2 0Z" />
            <path d="M11 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-.06a1 1 0 0 1-.74-.32L5.92 17H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.92l4.28-4.68a1 1 0 0 1 .74-.32H11ZM20.5 12c-.28 0-.5.22-.52.5a7 7 0 0 1-5.13 6.25c-.48.13-.85.55-.85 1.05v.03c0 .6.52 1.06 1.1.92a9 9 0 0 0 6.89-8.25.48.48 0 0 0-.49-.5h-1ZM16.5 12c-.28 0-.5.23-.54.5a3 3 0 0 1-1.33 2.02c-.35.23-.63.6-.63 1.02v.14c0 .63.59 1.1 1.16.83a5 5 0 0 0 2.82-4.01c.02-.28-.2-.5-.48-.5h-1Z" />
        </Icon>
    );
}

function MutedIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m2.7 22.7 20-20a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4ZM10.8 17.32c-.21.21-.1.58.2.62V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06A8 8 0 0 0 20 10a1 1 0 0 0-2 0c0 1.45-.52 2.79-1.38 3.83l-.02.02A5.99 5.99 0 0 1 12.32 16a.52.52 0 0 0-.34.15l-1.18 1.18ZM15.36 4.52c.15-.15.19-.38.08-.56A4 4 0 0 0 8 6v4c0 .3.03.58.1.86.07.34.49.43.74.18l6.52-6.52ZM5.06 13.98c.16.28.53.31.75.09l.75-.75c.16-.16.19-.4.08-.61A5.97 5.97 0 0 1 6 10a1 1 0 0 0-2 0c0 1.45.39 2.81 1.06 3.98Z" />
        </Icon>
    );
}

function DeafIcon(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4l20-20ZM17.06 2.94a.48.48 0 0 0-.11-.77A11 11 0 0 0 2.18 16.94c.14.3.53.35.76.12l3.2-3.2c.25-.25.15-.68-.2-.76a5 5 0 0 0-1.02-.1H3.05a9 9 0 0 1 12.66-9.2c.2.09.44.05.59-.1l.76-.76ZM20.2 8.28a.52.52 0 0 1 .1-.58l.76-.76a.48.48 0 0 1 .77.11 11 11 0 0 1-4.5 14.57c-1.27.71-2.73.23-3.55-.74a3.1 3.1 0 0 1-.17-3.78l1.38-1.97a5 5 0 0 1 4.1-2.13h1.86a9.1 9.1 0 0 0-.75-4.72ZM10.1 17.9c.25-.25.65-.18.74.14a3.1 3.1 0 0 1-.62 2.84 2.85 2.85 0 0 1-3.55.74.16.16 0 0 1-.04-.25l3.48-3.48Z" />
        </Icon>
    );
}

interface VoiceChannelTooltipProps {
    channel: Channel;
    isLocked: boolean;
}

function VoiceChannelTooltip({ channel, isLocked }: VoiceChannelTooltipProps) {
    const voiceStates = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStatesForChannel(channel.id));

    const users = useMemo(
        () => Object.values(voiceStates).map(voiceState => UserStore.getUser(voiceState.userId)).filter(user => user != null),
        [voiceStates]
    );

    const Icon = isLocked ? LockedSpeakerIcon : SpeakerIcon;
    return (
        <>
            <Text variant="text-sm/bold">In Voice Chat</Text>
            <Text variant="text-sm/bold">{Parser.parse(`<#${channel.id}>`)}</Text>
            <div className={cl("vc-members")}>
                <Icon size={18} />
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

export interface VoiceChannelIndicatorProps {
    userId: string;
    isProfile?: boolean;
    isActionButton?: boolean;
    shouldHighlight?: boolean;
}

const clickTimers = new Map<string, any>();

export const VoiceChannelIndicator = ErrorBoundary.wrap(({ userId, isProfile, isActionButton, shouldHighlight }: VoiceChannelIndicatorProps) => {
    const channelId = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(userId)?.channelId);

    const { isMuted, isDeaf } = useStateFromStores([VoiceStateStore], () => {
        const voiceState = VoiceStateStore.getVoiceStateForUser(userId);
        return {
            isMuted: voiceState?.mute || voiceState?.selfMute || false,
            isDeaf: voiceState?.deaf || voiceState?.selfDeaf || false
        };
    });

    const channel = channelId == null ? undefined : ChannelStore.getChannel(channelId);
    if (channel == null) return null;

    const isDM = channel.isDM() || channel.isMultiUserDM();
    if (!isDM && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) && !isPluginEnabled(ShowHiddenChannelsPlugin.name)) return null;

    const isLocked = !isDM && (!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) || !PermissionStore.can(PermissionsBits.CONNECT, channel));

    function onClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (channel == null || channelId == null) return;

        clearTimeout(clickTimers.get(channelId));
        clickTimers.delete(channelId);

        if (e.detail > 1) {
            if (!isDM && !PermissionStore.can(PermissionsBits.CONNECT, channel)) {
                showToast("You cannot join the user's Voice Channel", Toasts.Type.FAILURE);
                return;
            }

            selectVoiceChannel(channelId);
        } else {
            const timeoutId = setTimeout(() => {
                ChannelRouter.transitionToChannel(channelId);
                clickTimers.delete(channelId);
            }, 250);
            clickTimers.set(channelId, timeoutId);
        }
    }

    const IconComponent =
        isLocked
            ? LockedSpeakerIcon
            : isDeaf
                ? DeafIcon
                : isMuted
                    ? MutedIcon
                    : SpeakerIcon;

    return (
        <Tooltip
            text={<VoiceChannelTooltip channel={channel} isLocked={isLocked} />}
            tooltipClassName={cl("tooltip-container")}
            tooltipContentClassName={cl("tooltip-content")}
        >
            {props => (
                <IconComponent
                    {...props}
                    role="button"
                    onClick={onClick}
                    className={classes(cl("clickable"), isActionButton && ActionButtonClasses.actionButton, isActionButton && shouldHighlight && ActionButtonClasses.highlight)}
                    iconClassName={classes(cl(isProfile && "profile-speaker"))}
                    size={isActionButton ? 20 : 16}
                />
            )}
        </Tooltip>
    );
}, { noop: true });

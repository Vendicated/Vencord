/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import type { ChannelRecord, Store } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ChannelStore, GuildStore, IconUtils, Permissions, PermissionStore, RouterUtils, showToast, Text, Toasts, Tooltip, useCallback, useMemo, UserStore, useStateFromStores } from "@webpack/common";
import type { HTMLAttributes, MouseEvent } from "react";

const cl = classNameFactory("vc-uvs-");

const { selectVoiceChannel } = findByPropsLazy("selectChannel", "selectVoiceChannel");
const VoiceStateStore: Store & Record<string, any> = findStoreLazy("VoiceStateStore");
const UserSummaryItem = findComponentByCodeLazy("defaultRenderUser", "showDefaultAvatarsForNullUsers");

interface IconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

function SpeakerIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            role={props.onClick != null ? "button" : undefined}
            className={classes(cl("speaker"), props.onClick != null ? cl("clickable") : undefined)}
        >
            <svg
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3Zm3.1 17.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Zm.06-4.24c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
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
            className={classes(cl("speaker"), props.onClick != null ? cl("clickable") : undefined)}
        >
            <svg
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M16 4h.5v-.5a2.5 2.5 0 0 1 5 0V4h.5a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4-.5V4h-2v-.5a1 1 0 1 1 2 0ZM11 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1h-.06a1 1 0 0 1-.74-.32L5.92 17H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.92l4.28-4.68a1 1 0 0 1 .74-.32H11Zm9.5 10c-.28 0-.5.22-.52.5a7 7 0 0 1-5.13 6.25c-.48.13-.85.55-.85 1.05v.03c0 .6.52 1.06 1.1.92a9 9 0 0 0 6.89-8.25.48.48 0 0 0-.49-.5h-1Zm-4 0c-.28 0-.5.23-.54.5a3 3 0 0 1-1.33 2.02c-.35.23-.63.6-.63 1.02v.14c0 .63.59 1.1 1.16.83a5 5 0 0 0 2.82-4.01c.02-.28-.2-.5-.48-.5h-1Z" />
            </svg>
        </div>
    );
}

interface VoiceChannelTooltipProps {
    channel: ChannelRecord;
}

function VoiceChannelTooltip({ channel }: VoiceChannelTooltipProps) {
    const voiceStates = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStatesForChannel(channel.id));
    const users = useMemo(
        () => Object.values<any>(voiceStates).map(voiceState => UserStore.getUser(voiceState.userId)).filter(user => user != null),
        [voiceStates]
    );

    const guild = useMemo(
        () => channel.getGuildId() == null ? undefined : GuildStore.getGuild(channel.getGuildId()),
        [channel]
    );

    const guildIcon = useMemo(
        () => guild?.icon == null
            ? undefined
            : IconUtils.getGuildIconURL({
                id: guild.id,
                icon: guild.icon,
                size: 30
            }),
        [guild]
    );

    return (
        <>
            {guild != null && (
                <div className={cl("guild-name")}>
                    {guildIcon != null && <img className={cl("guild-icon")} src={guildIcon} alt="" />}
                    <Text variant="text-sm/bold">{guild.name}</Text>
                </div>
            )}
            <Text variant="text-sm/semibold">{channel.name}</Text>
            <div className={cl("vc-members")}>
                <SpeakerIcon size={18} />
                <UserSummaryItem
                    users={users}
                    renderIcon={false}
                    max={7}
                    size={18}
                />
            </div>
        </>
    );
}

// Must export to avoid TS4082, since VoiceChannelIndicator is used in the default export of './index.tsx'.
export interface VoiceChannelIndicatorProps {
    userId: string;
}

const clickTimers: Record<string, any> = {};

export const VoiceChannelIndicator = ErrorBoundary.wrap(({ userId }: VoiceChannelIndicatorProps) => {
    const channelId = useStateFromStores(
        [VoiceStateStore],
        () => VoiceStateStore.getVoiceStateForUser(userId)?.channelId
    );
    const channel = useMemo(
        () => channelId == null ? undefined : ChannelStore.getChannel(channelId),
        [channelId]
    );

    const onClick = useCallback((e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (channel == null || channelId == null) return;

        if (!PermissionStore.can(Permissions.VIEW_CHANNEL, channel)) {
            showToast("You cannot view the user's Voice Channel", Toasts.Type.FAILURE);
            return;
        }

        clearTimeout(clickTimers[channelId]);
        delete clickTimers[channelId];

        if (e.detail > 1) {
            if (!PermissionStore.can(Permissions.CONNECT, channel)) {
                showToast("You cannot join the user's Voice Channel", Toasts.Type.FAILURE);
                return;
            }

            selectVoiceChannel(channelId);
        } else {
            clickTimers[channelId] = setTimeout(() => {
                RouterUtils.transitionTo(`/channels/${channel.getGuildId() ?? "@me"}/${channelId}`);
                delete clickTimers[channelId];
            }, 250);
        }
    }, [channelId]);

    const isLocked = useMemo(
        () => !PermissionStore.can(Permissions.VIEW_CHANNEL, channel) ||
            !PermissionStore.can(Permissions.CONNECT, channel),
        [channelId]
    );

    if (channel == null) return null;

    return (
        <Tooltip
            text={<VoiceChannelTooltip channel={channel} />}
            tooltipClassName={cl("tooltip-container")}
        >
            {props =>
                isLocked ?
                    <LockedSpeakerIcon {...props} onClick={onClick} />
                    : <SpeakerIcon {...props} onClick={onClick} />
            }
        </Tooltip>
    );
}, { noop: true });

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes } from "@utils/misc";
import { Channel } from "@vencord/discord-types";
import { filters, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { ChannelRouter, ChannelStore, GuildStore, IconUtils, match, P, PermissionsBits, PermissionStore, React, showToast, Text, Toasts, Tooltip, useMemo, UserStore, UserSummaryItem, useStateFromStores } from "@webpack/common";

const cl = classNameFactory("vc-uvs-");

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");
const { useChannelName } = mapMangledModuleLazy("#{intl::GROUP_DM_ALONE}", {
    useChannelName: filters.byCode("()=>null==")
});
const getDMChannelIcon = findByCodeLazy(".getChannelIconURL({");
const VoiceStateStore = findStoreLazy("VoiceStateStore");

const Avatar = findComponentByCodeLazy(".status)/2):0");
const GroupDMAvatars = findComponentByCodeLazy("frontSrc:", "getAvatarURL");

const ActionButtonClasses = findByPropsLazy("actionButton", "highlight");

interface IconProps extends React.ComponentPropsWithoutRef<"div"> {
    size?: number;
    iconClassName?: string;
}

function SpeakerIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            className={classes(cl("speaker"), props.className)}
        >
            <svg
                className={props.iconClassName}
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
            className={classes(cl("speaker"), props.className)}
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

function MuteIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            className={classes(cl("speaker"), props.className)}
        >
            <svg
                className={props.iconClassName}
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="m2.7 22.7 20-20a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4ZM10.8 17.32c-.21.21-.1.58.2.62V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06A8 8 0 0 0 20 10a1 1 0 0 0-2 0c0 1.45-.52 2.79-1.38 3.83l-.02.02A5.99 5.99 0 0 1 12.32 16a.52.52 0 0 0-.34.15l-1.18 1.18ZM15.36 4.52c.15-.15.19-.38.08-.56A4 4 0 0 0 8 6v4c0 .3.03.58.1.86.07.34.49.43.74.18l6.52-6.52ZM5.06 13.98c.16.28.53.31.75.09l.75-.75c.16-.16.19-.4.08-.61A5.97 5.97 0 0 1 6 10a1 1 0 0 0-2 0c0 1.45.39 2.81 1.06 3.98Z" />
            </svg>
        </div>
    );
}

function DeafIcon(props: IconProps) {
    props.size ??= 16;

    return (
        <div
            {...props}
            className={classes(cl("speaker"), props.className)}
        >
            <svg
                className={props.iconClassName}
                width={props.size}
                height={props.size}
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M22.7 2.7a1 1 0 0 0-1.4-1.4l-20 20a1 1 0 1 0 1.4 1.4l20-20ZM17.06 2.94a.48.48 0 0 0-.11-.77A11 11 0 0 0 2.18 16.94c.14.3.53.35.76.12l3.2-3.2c.25-.25.15-.68-.2-.76a5 5 0 0 0-1.02-.1H3.05a9 9 0 0 1 12.66-9.2c.2.09.44.05.59-.1l.76-.76ZM20.2 8.28a.52.52 0 0 1 .1-.58l.76-.76a.48.48 0 0 1 .77.11 11 11 0 0 1-4.5 14.57c-1.27.71-2.73.23-3.55-.74a3.1 3.1 0 0 1-.17-3.78l1.38-1.97a5 5 0 0 1 4.1-2.13h1.86a9.1 9.1 0 0 0-.75-4.72ZM10.1 17.9c.25-.25.65-.18.74.14a3.1 3.1 0 0 1-.62 2.84 2.85 2.85 0 0 1-3.55.74.16.16 0 0 1-.04-.25l3.48-3.48Z" />
            </svg>
        </div>
    );
}

interface VoiceChannelTooltipProps {
    channel: Channel;
    isLocked: boolean;
}

function VoiceChannelTooltip({ channel, isLocked }: VoiceChannelTooltipProps) {
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
                {isLocked ? <LockedSpeakerIcon size={18} /> : <SpeakerIcon size={18} />}
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

const clickTimers = {} as Record<string, any>;

export const VoiceChannelIndicator = ErrorBoundary.wrap(({ userId, isProfile, isActionButton, shouldHighlight }: VoiceChannelIndicatorProps) => {
    const channelId = useStateFromStores([VoiceStateStore], () => VoiceStateStore.getVoiceStateForUser(userId)?.channelId as string | undefined);

    const { isMute, isDeaf } = useStateFromStores([VoiceStateStore], () => {
        const voiceState = VoiceStateStore.getVoiceStateForUser(userId);
        return {
            isMute: voiceState?.mute || voiceState?.selfMute || false,
            isDeaf: voiceState?.deaf || voiceState?.selfDeaf || false
        };
    });

    const channel = channelId == null ? undefined : ChannelStore.getChannel(channelId);
    if (channel == null) return null;

    const isDM = channel.isDM() || channel.isMultiUserDM();
    if (!isDM && !PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) && !Vencord.Plugins.isPluginEnabled("ShowHiddenChannels")) return null;

    const isLocked = !isDM && (!PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel) || !PermissionStore.can(PermissionsBits.CONNECT, channel));

    function onClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (channel == null || channelId == null) return;

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
                ChannelRouter.transitionToChannel(channelId);
                delete clickTimers[channelId];
            }, 250);
        }
    }

    return (
        <Tooltip
            text={<VoiceChannelTooltip channel={channel} isLocked={isLocked} />}
            tooltipClassName={cl("tooltip-container")}
            tooltipContentClassName={cl("tooltip-content")}
        >
            {props => {
                const iconProps: IconProps = {
                    ...props,
                    className: classes(cl("clickable"), isActionButton && ActionButtonClasses.actionButton, isActionButton && shouldHighlight && ActionButtonClasses.highlight),
                    iconClassName: classes(cl(isProfile && "profile-speaker")),
                    size: isActionButton ? 20 : 16,
                    role: "button",
                    onClick
                };

                return isDeaf
                    ? <DeafIcon {...iconProps} />
                    : isMute
                        ? <MuteIcon {...iconProps} />
                        : isLocked
                            ? <LockedSpeakerIcon {...iconProps} />
                            : <SpeakerIcon {...iconProps} />;
            }}
        </Tooltip>
    );
}, { noop: true });

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentChannel } from "@utils/discord";
import { isObjectEmpty } from "@utils/misc";
import { ChannelStore, GuildMemberCountStore, PermissionsBits, PermissionStore, SelectedChannelStore, Tooltip, useEffect, useStateFromStores, VoiceStateStore } from "@webpack/common";

import { ChannelMemberStore, cl, numberFormat, settings, ThreadMemberListStore } from ".";
import { CircleIcon } from "./CircleIcon";
import { OnlineMemberCountStore } from "./OnlineMemberCountStore";
import { VoiceIcon } from "./VoiceIcon";

export function MemberCount({ isTooltip, tooltipGuildId }: { isTooltip?: true; tooltipGuildId?: string; }) {
    const { voiceActivity } = settings.use(["voiceActivity"]);
    const includeVoice = voiceActivity && !isTooltip;

    const currentChannel = useStateFromStores(
        [SelectedChannelStore], () => isTooltip ? undefined : getCurrentChannel(),
        [], (a, b) => a?.id === b?.id
    );

    const guildId = tooltipGuildId ?? currentChannel?.guild_id;

    const voiceActivityCount = useStateFromStores(
        [VoiceStateStore],
        () => {
            if (!includeVoice || !guildId) return 0;

            const voiceStates = VoiceStateStore.getVoiceStates(guildId);
            if (!voiceStates) return 0;

            return Object.values(voiceStates)
                .filter(({ channelId }) => {
                    if (!channelId) return false;

                    const channel = ChannelStore.getChannel(channelId);
                    return channel && PermissionStore.can(PermissionsBits.VIEW_CHANNEL, channel);
                })
                .length;
        }
    );

    const totalCount = useStateFromStores(
        [GuildMemberCountStore],
        () => guildId ? GuildMemberCountStore.getMemberCount(guildId) : null
    );

    let onlineCount = useStateFromStores(
        [OnlineMemberCountStore],
        () => guildId ? OnlineMemberCountStore.getCount(guildId) : null
    );

    const memberListOnlineCount = useStateFromStores(
        [ChannelMemberStore],
        () => {
            if (isTooltip || !guildId) return null;

            const { groups } = ChannelMemberStore.getProps(guildId, currentChannel?.id);

            if (groups.length >= 1 || groups[0].id !== "unknown") {
                return groups.reduce(
                    (total, curr) => total + (curr.id === "offline" ? 0 : curr.count),
                    0
                );
            }

            return null;
        }
    );

    const threadListOnlineCount = useStateFromStores(
        [ThreadMemberListStore],
        () => {
            if (isTooltip) return null;

            const threadGroups = ThreadMemberListStore.getMemberListSections(currentChannel?.id);

            if (threadGroups && !isObjectEmpty(threadGroups)) {
                return Object.values(threadGroups).reduce(
                    (total, curr) => total + (curr.sectionId === "offline" ? 0 : curr.userIds.length),
                    0
                );
            }

            return null;
        }
    );

    if (memberListOnlineCount != null) onlineCount = memberListOnlineCount;
    if (threadListOnlineCount != null) onlineCount = threadListOnlineCount;

    useEffect(() => {
        if (guildId) {
            OnlineMemberCountStore.ensureCount(guildId);
        }
    }, [guildId]);

    if (totalCount == null)
        return null;

    const formattedVoiceCount = numberFormat(voiceActivityCount ?? 0);
    const formattedOnlineCount = onlineCount != null ? numberFormat(onlineCount) : "?";

    return (
        <div className={cl("widget", { tooltip: isTooltip, "member-list": !isTooltip })}>
            <Tooltip text={`${formattedOnlineCount} online in this channel`} position="bottom">
                {props => (
                    <div {...props} className={cl("container")}>
                        <CircleIcon className={cl("online-count")} />
                        <span className={cl("online")}>{formattedOnlineCount}</span>
                    </div>
                )}
            </Tooltip>

            <Tooltip text={`${numberFormat(totalCount)} total server members`} position="bottom">
                {props => (
                    <div {...props} className={cl("container")}>
                        <CircleIcon className={cl("total-count")} />
                        <span className={cl("total")}>{numberFormat(totalCount)}</span>
                    </div>
                )}
            </Tooltip>

            {includeVoice && voiceActivityCount > 0 &&
                <Tooltip text={`${formattedVoiceCount} members in voice`} position="bottom">
                    {props => (
                        <div {...props} className={cl("container")}>
                            <VoiceIcon className={cl("voice-icon")} />
                            <span className={cl("voice")}>{formattedVoiceCount}</span>
                        </div>
                    )}
                </Tooltip>
            }
        </div>
    );
}

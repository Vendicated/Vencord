/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getCurrentChannel } from "@utils/discord";
import { isObjectEmpty } from "@utils/misc";
import { SelectedChannelStore, Tooltip, useEffect, useStateFromStores } from "@webpack/common";

import { ChannelMemberStore, cl, GuildMemberCountStore, numberFormat, ThreadMemberListStore } from ".";
import { MemberVoiceCountStore } from "./MemberVoiceCountStore";
import { OnlineMemberCountStore } from "./OnlineMemberCountStore";

export function MemberCount({ isTooltip, tooltipGuildId, voiceEnabled }: { isTooltip?: true; tooltipGuildId?: string; voiceEnabled?: boolean; }) {
    const currentChannel = useStateFromStores([SelectedChannelStore], () => getCurrentChannel());
    const guildId = isTooltip ? tooltipGuildId! : currentChannel?.guild_id;

    const voiceActivityCount = useStateFromStores(
        [MemberVoiceCountStore],
        () => MemberVoiceCountStore.getCount(guildId)
    );

    const totalCount = useStateFromStores(
        [GuildMemberCountStore],
        () => GuildMemberCountStore.getMemberCount(guildId)
    );

    let onlineCount = useStateFromStores(
        [OnlineMemberCountStore],
        () => OnlineMemberCountStore.getCount(guildId)
    );

    const { groups } = useStateFromStores(
        [ChannelMemberStore],
        () => ChannelMemberStore.getProps(guildId, currentChannel?.id)
    );

    const threadGroups = useStateFromStores(
        [ThreadMemberListStore],
        () => ThreadMemberListStore.getMemberListSections(currentChannel?.id)
    );

    if (!isTooltip && (groups.length >= 1 || groups[0].id !== "unknown")) {
        onlineCount = groups.reduce((total, curr) => total + (curr.id === "offline" ? 0 : curr.count), 0);
    }

    if (!isTooltip && threadGroups && !isObjectEmpty(threadGroups)) {
        onlineCount = Object.values(threadGroups).reduce((total, curr) => total + (curr.sectionId === "offline" ? 0 : curr.userIds.length), 0);
    }

    useEffect(() => {
        OnlineMemberCountStore.ensureCount(guildId);
    }, [guildId]);

    if (totalCount == null) return null;

    const formattedVoiceCount = voiceActivityCount != null ? numberFormat(voiceActivityCount) : 0;
    const formattedOnlineCount = onlineCount != null ? numberFormat(onlineCount) : "?";

    return (
        <div className={cl("widget", { tooltip: isTooltip, "member-list": !isTooltip })}>
            <Tooltip text={`${formattedOnlineCount} online in this channel`} position="bottom">
                {props => (
                    <div {...props} className={cl("block")}>
                        <span className={cl("online-dot")} />
                        <span className={cl("online")}>{formattedOnlineCount}</span>
                    </div>
                )}
            </Tooltip>
            <Tooltip text={`${numberFormat(totalCount)} total server members`} position="bottom">
                {props => (
                    <div {...props} className={cl("block")}>
                        <span className={cl("total-dot")} />
                        <span className={cl("total")}>{numberFormat(totalCount)}</span>
                    </div>
                )}
            </Tooltip>
            {voiceEnabled &&
                <Tooltip text={`${formattedVoiceCount} members in voice`} position="bottom">
                    {props => (
                        <div {...props} className={cl("block")}>
                            <svg className={cl("voice-icon")} width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 2.66675C14.5855 2.66675 13.229 3.22865 12.2288 4.22885C11.2286 5.22904 10.6667 6.58559 10.6667 8.00008V13.3334C10.6667 14.7479 11.2286 16.1045 12.2288 17.1047C13.229 18.1048 14.5855 18.6667 16 18.6667C17.4145 18.6667 18.771 18.1048 19.7712 17.1047C20.7714 16.1045 21.3333 14.7479 21.3333 13.3334V8.00008C21.3333 6.58559 20.7714 5.22904 19.7712 4.22885C18.771 3.22865 17.4145 2.66675 16 2.66675Z" fill="#C7C8CE"/>
                                <path d="M8 13.3333C8 12.9797 7.85952 12.6406 7.60947 12.3905C7.35942 12.1405 7.02028 12 6.66666 12C6.31304 12 5.9739 12.1405 5.72385 12.3905C5.4738 12.6406 5.33333 12.9797 5.33333 13.3333C5.33244 15.932 6.28025 18.4416 7.99878 20.391C9.71732 22.3403 12.0884 23.5952 14.6667 23.92V26.6667H12C11.6464 26.6667 11.3072 26.8071 11.0572 27.0572C10.8071 27.3072 10.6667 27.6464 10.6667 28C10.6667 28.3536 10.8071 28.6928 11.0572 28.9428C11.3072 29.1929 11.6464 29.3333 12 29.3333H20C20.3536 29.3333 20.6928 29.1929 20.9428 28.9428C21.1929 28.6928 21.3333 28.3536 21.3333 28C21.3333 27.6464 21.1929 27.3072 20.9428 27.0572C20.6928 26.8071 20.3536 26.6667 20 26.6667H17.3333V23.92C19.9116 23.5952 22.2827 22.3403 24.0012 20.391C25.7197 18.4416 26.6676 15.932 26.6667 13.3333C26.6667 12.9797 26.5262 12.6406 26.2761 12.3905C26.0261 12.1405 25.6869 12 25.3333 12C24.9797 12 24.6406 12.1405 24.3905 12.3905C24.1405 12.6406 24 12.9797 24 13.3333C24 15.4551 23.1571 17.4899 21.6568 18.9902C20.1566 20.4905 18.1217 21.3333 16 21.3333C13.8783 21.3333 11.8434 20.4905 10.3431 18.9902C8.84285 17.4899 8 15.4551 8 13.3333Z" fill="#C7C8CE"/>
                            </svg>
                            <span className={cl("total")}>{formattedVoiceCount}</span>
                        </div>
                    )}
                </Tooltip>
            }
        </div>
    );
}

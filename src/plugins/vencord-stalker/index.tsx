/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import "./styles.css";

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import ErrorBoundary from "@components/ErrorBoundary";
import { fetchUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ChannelStore, GuildStore, Menu, PresenceStore, useEffect, UserProfileStore, UserStore,useState } from "@webpack/common";

import { openPresenceHistoryModal, StalkerIcon } from "./components";
import { getWhitelistedIds, settings } from "./settings";
import {
    activityLogCooldowns,
    addPresenceLog,
    captureProfileSnapshot,
    detectProfileChanges,
    getProfileChangeLabel,
    getUserConfig,
    lastKnownActivities,
    lastKnownStatuses,
    lastKnownUsers,
    lastOfflineTimestamps,
    lastOnlineTimestamps,
    loadLastOfflineTimestamps,
    loadPresenceLogs,
    loadProfileSnapshots,
    loadUserConfigs,
    mergeProfileSnapshots,
    offlineDurations,
    onlineDurations,
    pendingOnlineLogs,
    persistLastOfflineTimestamp,
    persistProfileSnapshot,
    presenceLogs,
    recentCurrentUserMessages,
    typingCooldowns
} from "./store";
import { ProfileChanges, ProfileSnapshot } from "./types";
import {
    addToWhitelist,
    formatActivitySummary,
    getActivitySnapshots,
    getDurationLabel,
    isInWhitelist,
    logger,
    removeFromWhitelist,
    summarizeClientStatus
} from "./utils";

const _HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

const HeaderBarIcon = _HeaderBarIcon ?? ((props: any) => {
    const Icon = props.icon;
    return (
        <div
            className={props.className}
            onClick={props.onClick}
            title={props.tooltip}
            style={{ display: "inline-flex", alignItems: "center", cursor: "pointer", height: 24 }}
        >
            {Icon ? <Icon /> : null}
        </div>
    );
});

function OpenStalkerButton() {
    return (
        <HeaderBarIcon
            className="stalker-toolbox-btn"
            onClick={() => openPresenceHistoryModal()}
            tooltip={"Stalker"}
            icon={StalkerIcon}
        />
    );
}

function getClientStatusSnapshot(userId: string) {
    const stateStatuses = (PresenceStore as any)?.getState?.()?.clientStatuses?.[userId];
    const direct = (PresenceStore as any)?.getClientStatuses?.(userId);
    return { ...(stateStatuses ?? {}), ...(direct ?? {}) };
}


async function stalkUser(id: string) {
    addToWhitelist(id);
    try {
        const u = UserStore.getUser(id);
        if (u) {
            logger.info(`Stalking user ${u.username}, fetching profile...`);
            const userProfile = await fetchUserProfile(id);
            await new Promise(resolve => setTimeout(resolve, 800));

            if (userProfile && !lastKnownUsers.has(id)) {
                const avatar = u.avatar ?? null;
                const banner = userProfile.banner ?? u.banner ?? null;
                const avatarDecorationData = (userProfile as any).avatarDecorationData ?? (u as any).avatarDecorationData ?? (u as any).avatar_decoration_data ?? null;

                // capture custom status
                const currentActivities = PresenceStore.getActivities(id) || [];
                const customStatusActivity = currentActivities.find(a => a?.type === 4);
                const customStatus = customStatusActivity?.state ?? null;

                const currentSnapshot: ProfileSnapshot = {
                    username: u.username,
                    avatar,
                    discriminator: u.discriminator,
                    global_name: (u as any).global_name ?? (u as any).globalName ?? null,
                    bio: userProfile.bio ?? null,
                    banner,
                    banner_color: (userProfile as any).bannerColor ?? (u as any).banner_color ?? (u as any).bannerColor ?? null,
                    avatarDecoration: avatarDecorationData?.asset ?? null,
                    avatarDecorationData,
                    customStatus
                };
                await persistProfileSnapshot(id, currentSnapshot);
                logger.info(`Profile fetched for ${u.username}, baseline established`);
            }
        }
    } catch (e) {
        logger.error("Failed to fetch profile for stalked user", e);
    }
}

function unStalkUser(id: string) {
    removeFromWhitelist(id);
    lastKnownUsers.delete(id);
}

const Section = findComponentByCodeLazy("headingVariant:", ".section", ".header");

export default definePlugin({
    name: "احبك غبي",
    description: "Advanced user tracking plugin that logs presence changes, profile updates, and activities. Track when users go online/offline, monitor profile changes, view activity history, and receive customizable notifications for each tracked user.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }, {
        name: "l2cu",
        id: 1208352443512004648n
}],
    dependencies: [],
    settings,
    patches: [
        {
            find: ".connections,userId:",
            replacement: {
                match: /#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.StalkerOverviewComponent({userId:$1})"
            }
        },
        {
            find: ".MODAL_V2,onClose:",
            replacement: {
                match: /#{intl::USER_PROFILE_MEMBER_SINCE}\),.{0,100}userId:(\i\.id),.{0,100}}\)}\),/,
                replace: "$&,$self.StalkerOverviewComponent({userId:$1})"
            }
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: {
                match: /\i\|\|\i(?=\?\(0,\i\.jsxs?\)\(\i\.\i\.Overlay,)/,
                replace: "$&||$self.shouldShowStalkerOverview(arguments[0].user.id)"
            }
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: {
                match: /\.openUserProfileModal.+?\)}\)}\)(?<=,(\i)&&(\i)&&\(0,\i\.jsxs?\)\((\i(?:\.\i)?),{className:(\i)\.divider}\).+?)/,
                replace: (m, hasMutualGuilds, hasMutualFriends, DividerComponent) => "" +
                    `${m},$self.StalkerOverviewComponent({userId:arguments[0].user.id, hasDivider:${hasMutualGuilds}||${hasMutualFriends}, Divider:${DividerComponent}})`
            }
        }
    ],
    shouldShowStalkerOverview: (userId: string) => {
        return getWhitelistedIds().includes(userId);
    },
    StalkerOverviewComponent: ErrorBoundary.wrap(({ userId, Divider }: { userId: string; Divider?: any; }) => {
        const [_, forceUpdate] = useState(0);

        useEffect(() => {
            const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
            return () => clearInterval(interval);
        }, []);

        const whitelisted = getWhitelistedIds();
        if (!whitelisted.includes(userId)) return null;

        const isOnline = (status: string | null) => status && !["offline", "invisible"].includes(status?.toLowerCase() ?? "");
        const currentStatus = PresenceStore.getStatus(userId);
        const online = isOnline(currentStatus);

        // calculate online/offline time
        const userLogs = presenceLogs.filter(log => log.userId === userId);
        const now = Date.now();
        let text: string;
        let lastSeenText = "Unknown";

        if (online) {
            // Find when they came online (last offline->online transition)
            const lastOnlineLog = userLogs.find(log =>
                isOnline(log.currentStatus) && !isOnline(log.previousStatus ?? null)
            );

            if (lastOnlineLog) {
                const duration = now - lastOnlineLog.timestamp;
                text = `Online for ${getDurationLabel(duration)}`;
            } else {
                text = "Online";
            }
        } else {
            // Find when they went offline (last online->offline transition)
            const lastOfflineLog = userLogs.find(log =>
                !isOnline(log.currentStatus) && isOnline(log.previousStatus ?? null)
            );

            if (lastOfflineLog) {
                const duration = now - lastOfflineLog.timestamp;
                text = `Offline for ${getDurationLabel(duration)}`;
                lastSeenText = new Date(lastOfflineLog.timestamp).toLocaleString();
            } else {
                text = "Offline";
            }
        }

        const totalLogs = userLogs.length;

        if (Divider !== undefined) {
            return (
                <div className="stalker-overview-card">
                    <div className="stalker-overview-card-header">STALKER OVERVIEW</div>
                    <div className="stalker-overview-card-body">
                        <div className="stalker-overview-stat">
                            <span className="stalker-overview-stat-label">Status:</span>
                            <span className="stalker-overview-stat-value">{text}</span>
                        </div>
                        {!online && (
                            <div className="stalker-overview-stat">
                                <span className="stalker-overview-stat-label">Last Seen:</span>
                                <span className="stalker-overview-stat-value">{lastSeenText}</span>
                            </div>
                        )}
                        <div className="stalker-overview-stat">
                            <span className="stalker-overview-stat-label">Total Logs:</span>
                            <span className="stalker-overview-stat-value">{totalLogs}</span>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <Section title="Stalker Overview">
                <div className="stalker-overview-text">{text}</div>
            </Section>
        );
    }),
    flux: {
        async USER_PROFILE_FETCH_SUCCESS(payload: any) {
            try {
                const userProfile = payload?.userProfile;
                if (!userProfile) return;

                const { user } = userProfile;
                if (!user || !user.id) return;

                const { id } = user;
                const whitelisted = getWhitelistedIds();
                if (!whitelisted.includes(id)) return;

                const cur = UserStore.getUser(id);
                if (!cur) return;

                const prev = lastKnownUsers.get(id);
                const profileData = userProfile.user_profile || {};

                const connectedAccounts = (userProfile.connected_accounts || []).map((acc: any) => ({
                    type: acc.type,
                    name: acc.name,
                    verified: acc.verified
                }));

                const currentAvatar = cur.avatar ?? null;
                const currentBanner = profileData.banner ?? user.banner ?? cur.banner ?? null;
                const avatarDecorationData = profileData.avatar_decoration_data ?? (cur as any).avatarDecorationData ?? (cur as any).avatar_decoration_data ?? null;

                // custom status only when online
                const status = PresenceStore.getStatus(id);
                const isOnline = status && status !== "offline" && status !== "invisible";
                const currentActivities = PresenceStore.getActivities(id) || [];
                const customStatusActivity = currentActivities.find(a => a?.type === 4);
                const customStatus = isOnline ? (customStatusActivity?.state ?? null) : (prev?.customStatus ?? null);

                const newSnapshot: ProfileSnapshot = {
                    username: cur.username,
                    avatar: currentAvatar,
                    discriminator: cur.discriminator,
                    global_name: (cur as any).global_name ?? (cur as any).globalName ?? null,
                    bio: profileData.bio ?? null,
                    banner: currentBanner,
                    banner_color: profileData.banner_color ?? (cur as any).banner_color ?? (cur as any).bannerColor ?? null,
                    avatarDecoration: avatarDecorationData?.asset ?? null,
                    avatarDecorationData,
                    connected_accounts: connectedAccounts,
                    pronouns: profileData.pronouns ?? null,
                    theme_colors: profileData.theme_colors ?? null,
                    emoji: profileData.emoji ?? null,
                    customStatus
                };

                // merge with previous
                const mergedSnapshot = mergeProfileSnapshots(prev, newSnapshot);

                if (!prev) {
                    await persistProfileSnapshot(id, mergedSnapshot);
                    return;
                }

                // Detect real changes
                const changes = detectProfileChanges(prev, mergedSnapshot);

                if (changes.length > 0) {
                    logger.info(`Profile changes detected for ${cur.username}:`, changes);
                    await persistProfileSnapshot(id, mergedSnapshot);

                    const userConfig = getUserConfig(id);
                    if (userConfig.logProfileChanges) {
                        const profileChanges: ProfileChanges = {
                            changedFields: changes,
                            before: prev,
                            after: mergedSnapshot
                        };

                        addPresenceLog({
                            userId: id,
                            username: cur.username,
                            discriminator: cur.discriminator,
                            timestamp: Date.now(),
                            previousStatus: undefined,
                            currentStatus: PresenceStore.getStatus(id) ?? null,
                            guildId: undefined,
                            clientStatus: {},
                            activitySummary: `profile:${changes.join(",")}`,
                            clientStatusSummary: undefined,
                            guildName: null,
                            type: "profile",
                            profileChanges
                        } as any);

                        if (userConfig.notifyProfileChanges) {
                            // filter by notification prefs
                            const filteredChanges = changes.filter(change => {
                                if (change === "username" && userConfig.notifyUsername !== false) return true;
                                if (change === "avatar" && userConfig.notifyAvatar !== false) return true;
                                if (change === "banner" && userConfig.notifyBanner !== false) return true;
                                if (change === "bio" && userConfig.notifyBio !== false) return true;
                                if (change === "pronouns" && userConfig.notifyPronouns !== false) return true;
                                if (change === "display_name" && userConfig.notifyGlobalName !== false) return true;
                                if (!["username", "avatar", "banner", "bio", "pronouns", "display_name"].includes(change)) return true;
                                return false;
                            });

                            if (filteredChanges.length > 0) {
                                try {
                                    const changeLabels = filteredChanges.map(c => getProfileChangeLabel(c));
                                    showNotification({
                                        title: `${cur.username} updated profile`,
                                        body: changeLabels.join(", "),
                                        icon: cur.avatar ? `https://cdn.discordapp.com/avatars/${id}/${cur.avatar}.png?size=64` : undefined
                                    });
                                } catch (e) { /* ignore */ }
                            }
                        }
                    }
                } else {
                    // still update snapshot
                    await persistProfileSnapshot(id, mergedSnapshot);
                }
            } catch (e) {
                logger.error("Error in USER_PROFILE_FETCH_SUCCESS handler", e);
            }
        },
        USER_UPDATE(payload: any) {
            try {
                const user = payload?.user;
                if (!user || !user.id) return;

                const { id } = user;
                const whitelisted = getWhitelistedIds();
                if (!whitelisted.includes(id)) return;

                const prev = lastKnownUsers.get(id);
                if (!prev) return;

                const cur = UserStore.getUser(id);
                if (!cur) return;

                // get activities for custom status
                const status = PresenceStore.getStatus(id);
                const isOnline = status && status !== "offline" && status !== "invisible";
                const currentActivities = PresenceStore.getActivities(id) || [];
                const capturedSnapshot = captureProfileSnapshot(cur, UserProfileStore, currentActivities);

                // fetch profile if missing
                if (capturedSnapshot.bio === undefined) {
                    fetchUserProfile(id);
                }

                // preserve custom status when offline
                if (!isOnline && prev.customStatus !== undefined) {
                    capturedSnapshot.customStatus = prev.customStatus;
                }

                // merge with previous
                const mergedSnapshot = mergeProfileSnapshots(prev, capturedSnapshot);

                // detect changes
                const changes = detectProfileChanges(prev, mergedSnapshot);

                if (changes.length > 0) {
                    logger.info(`USER_UPDATE changes for ${cur.username}:`, changes);
                    lastKnownUsers.set(id, mergedSnapshot);

                    const userConfig = getUserConfig(id);
                    if (userConfig.logProfileChanges) {
                        const profileChanges: ProfileChanges = {
                            changedFields: changes,
                            before: prev,
                            after: mergedSnapshot
                        };

                        addPresenceLog({
                            userId: id,
                            username: cur.username,
                            discriminator: cur.discriminator,
                            timestamp: Date.now(),
                            previousStatus: undefined,
                            currentStatus: PresenceStore.getStatus(id) ?? null,
                            guildId: undefined,
                            clientStatus: {},
                            activitySummary: `profile:${changes.join(",")}`,
                            clientStatusSummary: undefined,
                            guildName: null,
                            type: "profile",
                            profileChanges
                        } as any);

                        if (userConfig.notifyProfileChanges) {
                            // filter by notification prefs
                            const filteredChanges = changes.filter(change => {
                                if (change === "username" && userConfig.notifyUsername !== false) return true;
                                if (change === "avatar" && userConfig.notifyAvatar !== false) return true;
                                if (change === "banner" && userConfig.notifyBanner !== false) return true;
                                if (change === "bio" && userConfig.notifyBio !== false) return true;
                                if (change === "pronouns" && userConfig.notifyPronouns !== false) return true;
                                if (change === "display_name" && userConfig.notifyGlobalName !== false) return true;
                                if (!["username", "avatar", "banner", "bio", "pronouns", "display_name"].includes(change)) return true;
                                return false;
                            });

                            if (filteredChanges.length > 0) {
                                try {
                                    const changeLabels = filteredChanges.map(c => getProfileChangeLabel(c));
                                    showNotification({
                                        title: `${cur.username} updated profile`,
                                        body: changeLabels.join(", "),
                                        icon: cur.avatar ? `https://cdn.discordapp.com/avatars/${id}/${cur.avatar}.png?size=64` : undefined
                                    });
                                } catch (e) { /* ignore */ }
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error("Error in USER_UPDATE handler", e);
            }
        },
        TYPING_START(evt: any) {
            try {
                const userId = evt?.user?.id ?? evt?.userId ?? evt?.actor?.id;
                if (!userId) return;
                const channelId = evt?.channelId ?? evt?.channel?.id ?? null;

                const user = UserStore.getUser(userId);
                if (!user) return;

                const whitelisted = getWhitelistedIds();
                if (!whitelisted.includes(userId)) return;

                const now = Date.now();
                const cooldownExpiry = typingCooldowns.get(userId);
                if (cooldownExpiry && now < cooldownExpiry) return;

                const userConfig = getUserConfig(userId);
                const conversationWindowMinutes = userConfig.typingConversationWindow ?? 10;
                const conversationWindow = conversationWindowMinutes * 60_000;

                const lastCurrentUserMessage = recentCurrentUserMessages.get(channelId);
                if (lastCurrentUserMessage && (now - lastCurrentUserMessage) < conversationWindow) return;

                const lastStalkedUserMessage = recentCurrentUserMessages.get(`${channelId}-${userId}`);
                if (lastStalkedUserMessage && (now - lastStalkedUserMessage) < conversationWindow) return;

                if (userConfig.notifyTyping) {
                    try {
                        const channel = channelId ? ChannelStore.getChannel(channelId) : null;
                        const guildId = channel?.guild_id;
                        const guild = guildId ? GuildStore.getGuild(guildId) : null;

                        let contextText = "in DMs";
                        if (guild) {
                            contextText = `in ${guild.name}`;
                        } else if (channel && channel.type === 3) {
                            contextText = `in ${channel.name || "Group DM"}`;
                        }

                        const snapshot = lastKnownUsers.get(userId);
                        const avatarUrl = snapshot ? (snapshot.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${snapshot.avatar}.png?size=64` : null) : null;

                        showNotification({
                            title: `${user.username} is typing`,
                            body: contextText,
                            icon: avatarUrl ?? undefined
                        });

                        typingCooldowns.set(userId, now + 20_000);
                    } catch (e) { /* ignore */ }
                }
            } catch (e) {
                logger.error("Typing listener error", e);
            }
        },
        MESSAGE_CREATE(msg: any) {
            try {
                const payload = msg?.message ?? msg;
                const author = payload?.author ?? msg?.author ?? msg?.message?.author ?? msg?.user;
                const authorId = author?.id ?? msg?.authorId;

                if (!authorId) return;

                const channelId = payload?.channel_id ?? payload?.channelId ?? msg?.channel_id ?? msg?.channelId ?? msg?.channel?.id ?? null;
                const messageId = payload?.id ?? msg?.id ?? null;
                const channel = channelId ? ChannelStore.getChannel(channelId) : null;
                const channelName = channel?.name;

                if (authorId === UserStore.getCurrentUser().id && channelId) {
                    recentCurrentUserMessages.set(channelId, Date.now());
                }

                const whitelisted = getWhitelistedIds();
                if (!whitelisted.includes(authorId)) return;

                if (channelId) {
                    recentCurrentUserMessages.set(`${channelId}-${authorId}`, Date.now());
                }

                const guildId = payload?.guild_id ?? payload?.guildId ?? msg?.guild_id ?? msg?.guildId ?? msg?.guild?.id ?? null;
                if (!guildId || guildId === "@me") return;

                const userConfig = getUserConfig(authorId);

                const shouldProcess = (() => {
                    if (userConfig.serverFilterMode === "all") return true;
                    if (userConfig.serverFilterMode === "whitelist") return userConfig.serverList.includes(guildId);
                    if (userConfig.serverFilterMode === "blacklist") return !userConfig.serverList.includes(guildId);
                    return true;
                })();

                if (!shouldProcess) return;
                if (!userConfig.logMessages) return;

                let content = payload?.content ?? msg.content ?? "";
                const limit = 100;
                if (limit > 0 && content.length > limit) content = content.slice(0, limit) + "...";

                const user = UserStore.getUser(authorId) ?? author;
                const guildName = guildId ? GuildStore?.getGuild?.(guildId)?.name : undefined;

                if (userConfig.logMessages) {
                    addPresenceLog({
                        userId: authorId,
                        username: user?.username ?? author?.username ?? "unknown",
                        discriminator: user?.discriminator ?? author?.discriminator,
                        timestamp: Date.now(),
                        previousStatus: undefined,
                        currentStatus: PresenceStore.getStatus(authorId) ?? null,
                        guildId,
                        clientStatus: {},
                        activitySummary: "message",
                        clientStatusSummary: undefined,
                        guildName: guildName ?? null,
                        type: "message",
                        channelId,
                        messageContent: content,
                        messageId,
                        channelName
                    } as any);
                }

                typingCooldowns.set(authorId, Date.now() + 20_000);

                if (userConfig.notifyMessages) {
                    try {
                        const channel = channelId ? ChannelStore.getChannel(channelId) : null;
                        const guild = guildId ? GuildStore.getGuild(guildId) : null;

                        let contextText = "in DMs";
                        if (guild) {
                            contextText = `in ${guild.name}`;
                        } else if (channel && channel.type === 3) {
                            contextText = `in ${channel.name || "Group DM"}`;
                        }

                        const snapshot = lastKnownUsers.get(authorId);
                        const avatarUrl = snapshot ? (snapshot.avatar ? `https://cdn.discordapp.com/avatars/${authorId}/${snapshot.avatar}.png?size=64` : null) : null;

                        showNotification({
                            title: `${user?.username ?? author?.username ?? "User"} sent a message ${contextText}`,
                            body: content || "(message hidden)",
                            icon: avatarUrl ?? (user?.avatar ? `https://cdn.discordapp.com/avatars/${authorId}/${user.avatar}.png?size=64` : undefined)
                        });
                    } catch (e) { /* ignore */ }
                }
            } catch (e) {
                logger.error("Message listener error", e);
            }
        }
    },
    addIconToToolBar(e: { toolbar: any; }) {
        if (Array.isArray(e.toolbar))
            return e.toolbar.unshift(
                <ErrorBoundary noop={true}>
                    <OpenStalkerButton />
                </ErrorBoundary>
            );

        e.toolbar = [
            <ErrorBoundary noop={true} key="stalker-button">
                <OpenStalkerButton />
            </ErrorBoundary>,
            e.toolbar,
        ];
    },
    TrailingWrapper({ children }: any) {
        try {

            return (
                <>
                    {children}
                    <ErrorBoundary noop>
                        <OpenStalkerButton />
                    </ErrorBoundary>
                </>
            );
        } catch (e) {
            logger.error("Failed to render trailing wrapper for Stalker button", e);
            return children;
        }
    },
    presenceListener: null as any,
    presencePrimed: false,
    async start() {
        this.presencePrimed = false;


        await Promise.all([
            loadLastOfflineTimestamps(),
            loadProfileSnapshots(),
            loadUserConfigs()
        ]);

        this.presenceListener = async () => {
            try {
                const whitelistedIds = getWhitelistedIds();
                if (!this.presencePrimed) {
                    for (const userId of whitelistedIds) {
                        const currentStatus = PresenceStore.getStatus(userId) ?? null;
                        const currentActivities = PresenceStore.getActivities(userId) || [];
                        lastKnownStatuses.set(userId, currentStatus);
                        lastKnownActivities.set(userId, currentActivities);

                        const isOnline = (status: string | null) => status && !["offline", "invisible"].includes(status?.toLowerCase() ?? "");
                        if (isOnline(currentStatus)) {
                            lastOnlineTimestamps.set(userId, Date.now());
                        } else {
                            if (!lastOfflineTimestamps.has(userId)) {
                                persistLastOfflineTimestamp(userId, Date.now());
                            }
                        }
                    }
                    this.presencePrimed = true;
                    return;
                }

                for (const userId of whitelistedIds) {
                    const currentStatus = PresenceStore.getStatus(userId);
                    const previousStatus = lastKnownStatuses.get(userId) ?? null;

                    const currentActivities = PresenceStore.getActivities(userId) || [];
                    const previousActivities = lastKnownActivities.get(userId) || [];

                    // Extract custom status (type 4) separately
                    const currentCustomStatus = currentActivities.find(a => a?.type === 4);
                    const previousCustomStatus = previousActivities.find(a => a?.type === 4);
                    const customStatusChanged = currentCustomStatus?.state !== previousCustomStatus?.state;

                    const filteredCurrentActivities = currentActivities.filter(a => a?.type !== 4);
                    const filteredPreviousActivities = previousActivities.filter(a => a?.type !== 4);

                    const activitySnapshot = getActivitySnapshots(filteredCurrentActivities);
                    const activitySummary = formatActivitySummary(filteredCurrentActivities);

                    const statusChanged = previousStatus !== currentStatus && currentStatus !== undefined;
                    const activitiesChanged = JSON.stringify(filteredPreviousActivities) !== JSON.stringify(filteredCurrentActivities);

                    if (UserStore.getCurrentUser().id === userId && currentStatus === "online") continue;

                    // Update profile snapshot if custom status changed (only when online)
                    if (customStatusChanged) {
                        const user = UserStore.getUser(userId);
                        const isOnline = (status: string | null) => status && !["offline", "invisible"].includes(status?.toLowerCase() ?? "");

                        if (user && isOnline(currentStatus)) {
                            const currentSnapshot = captureProfileSnapshot(user, UserProfileStore, currentActivities);
                            const prev = lastKnownUsers.get(userId);

                            if (prev) {
                                // Merge with previous to preserve data that wasn't fetched
                                const mergedSnapshot = mergeProfileSnapshots(prev, currentSnapshot);

                                // Detect real changes
                                const changes = detectProfileChanges(prev, mergedSnapshot);

                                if (changes.length > 0) {
                                    lastKnownUsers.set(userId, mergedSnapshot);
                                    await persistProfileSnapshot(userId, mergedSnapshot);

                                    const userConfig = getUserConfig(userId);
                                    if (userConfig.logProfileChanges) {
                                        const profileChanges: ProfileChanges = {
                                            changedFields: changes,
                                            before: prev,
                                            after: mergedSnapshot
                                        };

                                        addPresenceLog({
                                            userId,
                                            username: user.username,
                                            discriminator: user.discriminator,
                                            timestamp: Date.now(),
                                            previousStatus: undefined,
                                            currentStatus: PresenceStore.getStatus(userId) ?? null,
                                            guildId: undefined,
                                            clientStatus: {},
                                            activitySummary: `profile:${changes.join(",")}`,
                                            clientStatusSummary: undefined,
                                            guildName: null,
                                            type: "profile",
                                            profileChanges
                                        } as any);

                                        if (userConfig.notifyProfileChanges) {
                                            try {
                                                const changeLabels = changes.map(c => getProfileChangeLabel(c));
                                                showNotification({
                                                    title: `${user.username} updated profile`,
                                                    body: changeLabels.join(", "),
                                                    icon: user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=64` : undefined
                                                });
                                            } catch (e) { /* ignore */ }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if (statusChanged || activitiesChanged) {
                        lastKnownStatuses.set(userId, currentStatus);
                        lastKnownActivities.set(userId, currentActivities);
                        const clientStatusMap = getClientStatusSnapshot(userId);
                        const clientStatusSummary = summarizeClientStatus(clientStatusMap);

                        const user = UserStore.getUser(userId);
                        if (!user) continue;

                        let offlineDuration: number | undefined;
                        let onlineDuration: number | undefined;
                        const now = Date.now();

                        const isOnline = (status: string | null) => status && !["offline", "invisible"].includes(status?.toLowerCase() ?? "");

                        if (statusChanged) {
                            if (isOnline(currentStatus)) {
                                if (!isOnline(previousStatus)) {
                                    const lastOffline = lastOfflineTimestamps.get(userId);
                                    if (lastOffline) offlineDuration = now - lastOffline;
                                }
                                lastOnlineTimestamps.set(userId, now);
                            } else if (!isOnline(currentStatus)) {
                                const lastOnline = lastOnlineTimestamps.get(userId);
                                if (lastOnline) onlineDuration = now - lastOnline;
                                persistLastOfflineTimestamp(userId, now);
                            }
                        }

                        if (isOnline(currentStatus)) {
                            const lastOnline = lastOnlineTimestamps.get(userId);
                            if (lastOnline) onlineDuration = now - lastOnline;
                        } else {
                            const lastOffline = lastOfflineTimestamps.get(userId);
                            if (lastOffline) offlineDuration = now - lastOffline;
                        }

                        if (statusChanged) {
                            offlineDuration ? offlineDurations.set(userId, offlineDuration) : offlineDurations.delete(userId);
                            onlineDuration ? onlineDurations.set(userId, onlineDuration) : onlineDurations.delete(userId);
                        }

                        const userConfig = getUserConfig(userId);
                        if (userConfig.logPresenceChanges) {
                            const isOnlineTransition = statusChanged && isOnline(currentStatus) && !isOnline(previousStatus);

                            if (isOnlineTransition) {
                                const pending = pendingOnlineLogs.get(userId);
                                if (pending) clearTimeout(pending.timeout);

                                const entry = {
                                    userId,
                                    username: user.username,
                                    discriminator: user.discriminator,
                                    timestamp: Date.now(),
                                    previousStatus,
                                    currentStatus,
                                    guildId: undefined,
                                    clientStatus: clientStatusMap,
                                    activitySummary,
                                    clientStatusSummary,
                                    guildName: null,
                                    offlineDuration,
                                    onlineDuration,
                                    activities: activitySnapshot,
                                    type: "presence" as const
                                };

                                const timeout = setTimeout(() => {
                                    pendingOnlineLogs.delete(userId);
                                    addPresenceLog(entry);
                                }, 5000);

                                pendingOnlineLogs.set(userId, { timeout, entry });
                            } else if (activitiesChanged && pendingOnlineLogs.has(userId)) {
                                const pending = pendingOnlineLogs.get(userId)!;
                                clearTimeout(pending.timeout);
                                pending.entry.activitySummary = activitySummary;
                                pending.entry.activities = activitySnapshot;

                                pending.timeout = setTimeout(() => {
                                    pendingOnlineLogs.delete(userId);
                                    addPresenceLog(pending.entry);
                                }, 5000);
                            } else {
                                if (!pendingOnlineLogs.has(userId)) {
                                    const now = Date.now();
                                    const lastActivityLog = activityLogCooldowns.get(userId);
                                    if (!activitiesChanged || !lastActivityLog || (now - lastActivityLog) >= 60_000) {
                                        addPresenceLog({
                                            userId,
                                            username: user.username,
                                            discriminator: user.discriminator,
                                            timestamp: now,
                                            previousStatus: statusChanged ? previousStatus : undefined,
                                            currentStatus,
                                            guildId: undefined,
                                            clientStatus: clientStatusMap,
                                            activitySummary,
                                            clientStatusSummary,
                                            guildName: null,
                                            offlineDuration,
                                            onlineDuration,
                                            activities: activitySnapshot,
                                            type: "presence" as const
                                        });
                                        if (activitiesChanged) {
                                            activityLogCooldowns.set(userId, now);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                logger.error("Error in presence listener", e);
            }
        };

        PresenceStore.addChangeListener(this.presenceListener);
        addContextMenuPatch("user-context", contextMenuPatch);

        await loadPresenceLogs();
    },
    async stop() {
        if (this.presenceListener) {
            PresenceStore.removeChangeListener(this.presenceListener);
            this.presenceListener = null;
        }
        removeContextMenuPatch("user-context", contextMenuPatch);
    }
});

const contextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props || props?.user?.id === UserStore.getCurrentUser().id) return;

    if (!children.some(child => child?.props?.id === "stalker-v1")) {
        const userId = props.user.id;
        const isWhitelisted = isInWhitelist(userId);
        const menuItems = [
            <Menu.MenuSeparator key="stalker-sep" />,
            <Menu.MenuItem
                key="stalker-item"
                id="stalker-v1"
                label={isWhitelisted ? "وقف يا تعبان خلاص" : "راقب الورع السعيل"}
                action={() => isWhitelisted ? unStalkUser(userId) : stalkUser(userId)}
            />
        ];

        if (isWhitelisted) {
            menuItems.push(
                <Menu.MenuItem
                    id="stalker-view-log"
                    label="لوق التتبع"
                    action={() => openPresenceHistoryModal(userId)}
                />
            );
        }

        children.push(...menuItems);
    }
};

export { settings };

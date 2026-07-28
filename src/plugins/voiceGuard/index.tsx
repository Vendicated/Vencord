/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    Alerts,
    AuthenticationStore,
    ChannelStore,
    GuildStore,
    Parser,
    RelationshipStore,
    SelectedChannelStore,
    UserStore,
    VoiceStateStore
} from "@webpack/common";

const voiceActions = findByPropsLazy("selectVoiceChannel", "selectChannel");

const settings = definePluginSettings({
    handleBlockedUsers: {
        description: "Protect against blocked users in voice channels",
        type: OptionType.BOOLEAN,
        default: true
    },
    handleIgnoredUsers: {
        description: "Protect against ignored users in voice channels",
        type: OptionType.BOOLEAN,
        default: true
    }
});

const DISCONNECT_COOLDOWN = 1_500;

interface VoiceStateUpdate {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    sessionId?: string;
}

type SelectVoiceChannel = (
    channelId: string | null,
    ...args: any[]
) => unknown;

let originalSelectVoiceChannel: SelectVoiceChannel | undefined;
let patchedSelectVoiceChannel: SelectVoiceChannel | undefined;

let approvedChannelId: string | null = null;
let promptChannelId: string | null = null;
let promptId = 0;
let lastDisconnectAt = 0;

const approvedUsers = new Set<string>();

function selectVoiceChannel(channelId: string | null, args: any[] = []) {
    return originalSelectVoiceChannel?.call(voiceActions, channelId, ...args);
}

function clearApproval() {
    approvedChannelId = null;
    approvedUsers.clear();
}

function clearPrompt(id: number) {
    if (id === promptId)
        promptChannelId = null;
}

function getCurrentVoiceChannel(userId: string) {
    return VoiceStateStore.getVoiceStateForUser(userId)?.channelId
        ?? SelectedChannelStore.getVoiceChannelId();
}

function isHandledBlockedUser(userId: string) {
    return settings.store.handleBlockedUsers
        && RelationshipStore.isBlocked(userId);
}

function isHandledIgnoredUser(userId: string) {
    return settings.store.handleIgnoredUsers
        && RelationshipStore.isIgnored(userId);
}

function isHandledUser(userId: string) {
    return isHandledBlockedUser(userId)
        || isHandledIgnoredUser(userId);
}

function getUserRelationship(userId: string) {
    const blocked = isHandledBlockedUser(userId);
    const ignored = isHandledIgnoredUser(userId);

    if (blocked && ignored) return "Blocked and Ignored";
    if (blocked) return "Blocked";
    if (ignored) return "Ignored";

    return "Restricted";
}

function getRelationshipGroup(userIds: string[]) {
    const hasBlocked = userIds.some(isHandledBlockedUser);
    const hasIgnored = userIds.some(isHandledIgnoredUser);

    if (hasBlocked && hasIgnored) return "blocked or ignored";
    return hasIgnored ? "ignored" : "blocked";
}

function getArticle(text: string) {
    return /^[aeiou]/i.test(text) ? "an" : "a";
}

function getCallName(channel: any) {
    if (channel?.name?.trim())
        return channel.name.trim();

    const names = channel?.recipients
        ?.map((userId: string) => {
            const user = UserStore.getUser(userId);
            return user?.globalName ?? user?.username;
        })
        .filter(Boolean)
        .join(", ");

    return names || "Private Call";
}

function getLocation(channelId: string) {
    const channel = ChannelStore.getChannel(channelId);

    if (!channel?.guild_id) {
        const name = getCallName(channel);

        return {
            text: `"${name}"`,
            element: <strong>{name}</strong>
        };
    }

    const channelName = channel.name?.trim() || "Unknown Voice Channel";
    const guildName =
        GuildStore.getGuild(channel.guild_id)?.name || "Unknown Server";

    return {
        text: `"${channelName}" in "${guildName}"`,
        element: (
            <>
                <strong>{channelName}</strong>
                {" in "}
                <strong>{guildName}</strong>
            </>
        )
    };
}

function getHandledUsers(channelId: string, currentUserId: string) {
    const states = VoiceStateStore.getVoiceStatesForChannel(channelId) as Record<string, VoiceStateUpdate>;

    return [
        ...new Set(
            Object.values(states)
                .map(state => state.userId)
                .filter(userId =>
                    userId !== currentUserId
                    && isHandledUser(userId)
                )
        )
    ];
}

function haveSameUsers(first: string[], second: string[]) {
    if (first.length !== second.length)
        return false;

    const secondSet = new Set(second);
    return first.every(userId => secondSet.has(userId));
}

function HandledUserList({ userIds }: { userIds: string[]; }) {
    return (
        <div
            role="list"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                margin: "12px 0 16px"
            }}
        >
            {userIds.map(userId => {
                const user = UserStore.getUser(userId);
                const username = user?.username ?? "Unknown";
                const relationship = getUserRelationship(userId);

                return (
                    <div
                        key={userId}
                        role="listitem"
                        style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 8,
                            lineHeight: 1.4
                        }}
                    >
                        <span aria-hidden="true">•</span>

                        <span>
                            {Parser.parse(`<@${userId}>`)}
                            {" — "}
                            <strong>@{username}</strong>
                            {" "}
                            ({relationship})
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function finishJoin(
    channelId: string,
    args: any[],
    displayedUsers: string[]
) {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser) return;

    const currentUsers = getHandledUsers(channelId, currentUser.id);

    // Ask again if someone joined or left while the prompt was open.
    if (!haveSameUsers(displayedUsers, currentUsers)) {
        requestJoin(channelId, args);
        return;
    }

    approvedChannelId = channelId;
    approvedUsers.clear();

    for (const userId of currentUsers)
        approvedUsers.add(userId);

    selectVoiceChannel(channelId, args);
}

function requestJoin(channelId: string, args: any[]) {
    const currentUser = UserStore.getCurrentUser();

    if (!currentUser)
        return selectVoiceChannel(channelId, args);

    if (getCurrentVoiceChannel(currentUser.id) === channelId)
        return selectVoiceChannel(channelId, args);

    const users = getHandledUsers(channelId, currentUser.id);

    if (!users.length) {
        clearApproval();
        return selectVoiceChannel(channelId, args);
    }

    if (promptChannelId)
        return;

    const location = getLocation(channelId);
    const relationship = getRelationshipGroup(users);
    const currentPromptId = ++promptId;

    promptChannelId = channelId;

    Alerts.show({
        title: `${users.length === 1 ? "Restricted User" : "Restricted Users"} in Voice Channel`,

        body: (
            <div>
                <p style={{ margin: 0 }}>
                    {location.element} currently contains{" "}
                    {users.length === 1
                        ? `${getArticle(relationship)} ${relationship} user`
                        : `${users.length} ${relationship} users`}
                    :
                </p>

                <HandledUserList userIds={users} />

                <p style={{ margin: 0 }}>
                    Do you still want to join this voice channel?
                </p>
            </div>
        ),

        confirmText: "Join Anyway",
        cancelText: "Cancel",

        onConfirm() {
            clearPrompt(currentPromptId);
            finishJoin(channelId, args, users);
        },

        onCancel() {
            clearPrompt(currentPromptId);
        },

        onCloseCallback() {
            clearPrompt(currentPromptId);
        }
    });
}

function leaveForUser(channelId: string, userId: string) {
    const currentUser = UserStore.getCurrentUser();

    if (!currentUser) return;
    if (getCurrentVoiceChannel(currentUser.id) !== channelId) return;

    const now = Date.now();
    if (now - lastDisconnectAt < DISCONNECT_COOLDOWN) return;

    lastDisconnectAt = now;

    const user = UserStore.getUser(userId);
    const relationship = getUserRelationship(userId);
    const relationshipLower = relationship.toLowerCase();
    const article = getArticle(relationshipLower);
    const username = user?.username ?? "Unknown";
    const notificationName = user
        ? `@${user.username}`
        : `user ID ${userId}`;

    const location = getLocation(channelId);

    clearApproval();
    selectVoiceChannel(null);

    showNotification({
        title: `${relationship} User Joined Voice`,
        body:
            `Automatically left ${location.text} because `
            + `${article} ${relationshipLower} user ${notificationName} `
            + "joined the same voice channel."
    });

    Alerts.show({
        title: `${relationship} User Joined Voice`,
        body: (
            <span>
                Automatically left {location.element} because{" "}
                {article} {relationshipLower} user (
                {Parser.parse(`<@${userId}>`)}
                {" with username "}
                <strong>@{username}</strong>
                ) joined the same voice channel.
            </span>
        ),
        confirmText: "OK"
    });
}

export default definePlugin({
    name: "VoiceGuard",
    description:
        "Warns before joining voice channels with blocked or ignored users and leaves when one joins",

    authors: [Devs.GuikiPT],
    settings,

    start() {
        originalSelectVoiceChannel = voiceActions.selectVoiceChannel;

        patchedSelectVoiceChannel = (
            channelId: string | null,
            ...args: any[]
        ) => {
            if (channelId)
                return requestJoin(channelId, args);

            promptId++;
            promptChannelId = null;
            clearApproval();

            return selectVoiceChannel(null, args);
        };

        voiceActions.selectVoiceChannel = patchedSelectVoiceChannel;
    },

    flux: {
        VOICE_STATE_UPDATES({
            voiceStates
        }: {
            voiceStates: VoiceStateUpdate[];
        }) {
            const currentUser = UserStore.getCurrentUser();
            if (!currentUser) return;

            const currentSessionId = AuthenticationStore.getSessionId();

            for (const state of voiceStates) {
                if (state.userId === currentUser.id) {
                    if (
                        state.sessionId
                        && currentSessionId
                        && state.sessionId !== currentSessionId
                    ) continue;

                    if (state.channelId !== approvedChannelId)
                        clearApproval();

                    continue;
                }

                if (
                    approvedChannelId
                    && approvedUsers.has(state.userId)
                    && state.oldChannelId === approvedChannelId
                    && state.channelId !== approvedChannelId
                ) {
                    approvedUsers.delete(state.userId);
                }

                if (!state.channelId) continue;
                if (state.channelId === state.oldChannelId) continue;
                if (!isHandledUser(state.userId)) continue;

                const currentChannelId =
                    getCurrentVoiceChannel(currentUser.id);

                if (state.channelId !== currentChannelId)
                    continue;

                if (
                    state.channelId === approvedChannelId
                    && approvedUsers.has(state.userId)
                ) continue;

                leaveForUser(state.channelId, state.userId);
                break;
            }
        }
    },

    stop() {
        promptId++;
        promptChannelId = null;
        clearApproval();

        if (
            originalSelectVoiceChannel
            && patchedSelectVoiceChannel
            && voiceActions.selectVoiceChannel === patchedSelectVoiceChannel
        ) {
            voiceActions.selectVoiceChannel = originalSelectVoiceChannel;
        }

        originalSelectVoiceChannel = undefined;
        patchedSelectVoiceChannel = undefined;
        lastDisconnectAt = 0;
    }
});

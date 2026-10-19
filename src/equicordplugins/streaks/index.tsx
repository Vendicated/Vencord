/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DecoratorProps } from "@api/MemberListDecorators";
import { FireIcon } from "@components/Icons";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, MessageActions, MessageStore, Tooltip, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { useAuthorizationStore } from "./stores/AuthorizationStore";
import { type RemoteStreak, useStreaksStore } from "./stores/StreaksStore";

const cl = classNameFactory("vc-streaks-");

const STREAK_THRESHOLDS = {
    ELITE: 100,
    DIAMOND: 60,
    PLATINUM: 45,
    GOLD: 30,
    SILVER: 14,
    BRONZE: 7
};

const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function dateInTimezone(timezone: string, date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
}

async function backfillRecentActivity() {
    const me = UserStore.getCurrentUser()?.id;
    if (!me) return;

    const streaks = Object.values<RemoteStreak>(useStreaksStore.getState().streaks);
    for (const streak of streaks) {
        const meIsA = streak.user_a_id === me;
        const recipientId = meIsA ? streak.user_b_id : streak.user_a_id;
        const channelId = ChannelStore.getDMFromUserId(recipientId);
        if (!channelId) continue;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel?.isDM?.()) continue;

        const timezoneA = streak.timezone_a || (meIsA ? localTimezone : streak.timezone_b) || localTimezone;
        const timezoneB = streak.timezone_b || (!meIsA ? localTimezone : streak.timezone_a) || localTimezone;
        const needsA = !streak.user_a_activity_date || streak.user_a_activity_date !== dateInTimezone(timezoneA);
        const needsB = !streak.user_b_activity_date || streak.user_b_activity_date !== dateInTimezone(timezoneB);
        if (!needsA && !needsB) continue;

        try {
            await MessageActions.fetchMessages({ channelId, limit: 100 });
            const messages = MessageStore.getMessages(channelId)?._array ?? [];
            const todayActivity = new Map<string, Date>();
            for (const message of messages) {
                const authorId = message.author?.id;
                if (authorId !== streak.user_a_id && authorId !== streak.user_b_id) continue;
                const sentAt = new Date(message.timestamp);
                if (Number.isNaN(sentAt.getTime())) continue;

                const authorTimezone = authorId === streak.user_a_id ? timezoneA : timezoneB;
                if (dateInTimezone(authorTimezone, sentAt) !== dateInTimezone(authorTimezone)) continue;
                const previous = todayActivity.get(authorId);
                if (!previous || sentAt > previous) todayActivity.set(authorId, sentAt);
            }

            if (needsA && todayActivity.has(streak.user_a_id)) {
                await useStreaksStore.getState().update(recipientId, streak.user_a_id);
            }
            if (needsB && todayActivity.has(streak.user_b_id)) {
                await useStreaksStore.getState().update(recipientId, streak.user_b_id);
            }
            if ((needsA && todayActivity.has(streak.user_a_id)) || (needsB && todayActivity.has(streak.user_b_id))) {
                await useStreaksStore.getState().refresh(recipientId);
            }
        } catch (error) {
            console.error("Failed to sync recent streak messages", error);
        }
    }
}

function didUserSendToday(streak: RemoteStreak, isA: boolean) {
    const timezone = isA ? streak.timezone_a : streak.timezone_b;
    const activityDate = isA ? streak.user_a_activity_date : streak.user_b_activity_date;
    const flag = isA ? streak.user_a_today : streak.user_b_today;
    const reportedDate = isA ? streak.user_a_today_date : streak.user_b_today_date;
    const today = dateInTimezone(timezone || localTimezone);
    if (activityDate) return activityDate === today;
    return flag && (reportedDate || streak.today_date) === today;
}

const colorFor = (streak: number) => {
    if (streak >= STREAK_THRESHOLDS.ELITE) return settings.store.eliteColor;
    if (streak >= STREAK_THRESHOLDS.DIAMOND) return settings.store.diamondColor;
    if (streak >= STREAK_THRESHOLDS.PLATINUM) return settings.store.platinumColor;
    if (streak >= STREAK_THRESHOLDS.GOLD) return settings.store.goldColor;
    if (streak >= STREAK_THRESHOLDS.SILVER) return settings.store.silverColor;
    if (streak >= STREAK_THRESHOLDS.BRONZE) return settings.store.bronzeColor;
    return settings.store.defaultColor;
};

const StreakBadge = ({ userId }: { userId: string; }) => {
    const streaks = useStreaksStore(state => state.streaks);
    const streak = streaks[userId];

    if (!streak || streak.count < 1) return null;

    const active = didUserSendToday(streak, true) && didUserSendToday(streak, false);
    const color = active ? colorFor(streak.count) : "#9ca3af";

    return (
        <Tooltip text={`${streak.count} day streak`}>
            {tooltipProps => (
                <span {...tooltipProps} className={cl("badge")} style={{ color }}>
                    {<FireIcon width={16} height={16} fill={color} />}
                    <span className={cl("count")}>{streak.count}</span>
                </span>
            )}
        </Tooltip>
    );
};

export default definePlugin({
    name: "Streaks",
    description: "Shows a streak next to a user when you exchange DMs with them on consecutive days.",
    authors: [EquicordDevs.Moowi, Devs.thororen],
    tags: ["Friends", "Fun"],
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI", "ConcatenatedModules"],
    settings,

    flux: {
        async CONNECTION_OPEN() {
            useAuthorizationStore.getState().init();
            if (useAuthorizationStore.getState().isAuthorized()) {
                await useStreaksStore.getState().migrate();
                await useStreaksStore.getState().fetch();
                await backfillRecentActivity();
            }
        },
        async MESSAGE_CREATE({ optimistic, type, message, channelId }: { optimistic: boolean; type: string; message: Message; channelId: string; }) {
            if (optimistic || type !== "MESSAGE_CREATE" || message.state === "SENDING") return;
            if (message.author?.bot) return;

            const channel = ChannelStore.getChannel(channelId);
            if (!channel.isDM()) return;

            const recipientId = channel.recipients[0];
            if (!recipientId) return;

            const me = UserStore.getCurrentUser()?.id;
            if (!useAuthorizationStore.getState().isAuthorized()) return;

            const cached = useStreaksStore.getState().streaks[recipientId];
            const myIsA = cached?.user_a_id === me;
            const myFlag = cached && didUserSendToday(cached, myIsA);
            const theirFlag = cached && didUserSendToday(cached, !myIsA);
            const myTimezone = localTimezone;
            const cachedMyTimezone = cached && (myIsA ? cached.timezone_a : cached.timezone_b);
            const timezoneReported = cached && (myIsA ? cached.timezone_a_known : cached.timezone_b_known);
            const needsTimezoneReport = !timezoneReported || !cachedMyTimezone || cachedMyTimezone !== myTimezone;

            if (myFlag && theirFlag && !needsTimezoneReport) return;

            if (message.author.id === me && (!myFlag || needsTimezoneReport)) {
                useStreaksStore.getState().update(recipientId, message.author.id);
            } else if (message.author.id === recipientId && (!theirFlag || needsTimezoneReport)) {
                useStreaksStore.getState().update(recipientId, message.author.id);
            }
        },
    },

    renderMessageDecoration({ message }) {
        const userId = message?.author?.id;
        if (!userId || userId === UserStore.getCurrentUser()?.id) return null;
        return <StreakBadge userId={userId} />;
    },

    renderMemberListDecorator({ user, type }: DecoratorProps) {
        if (type !== "dm" || !user || user.id === UserStore.getCurrentUser()?.id) return null;
        return <StreakBadge userId={user.id} />;
    },
});

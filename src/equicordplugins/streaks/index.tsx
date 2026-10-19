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
import { ChannelStore, moment, Tooltip, UserStore } from "@webpack/common";

import { settings } from "./settings";
import { useAuthorizationStore } from "./stores/AuthorizationStore";
import { useStreaksStore } from "./stores/StreaksStore";

const cl = classNameFactory("vc-streaks-");

const STREAK_THRESHOLDS = {
    ELITE: 100,
    DIAMOND: 60,
    PLATINUM: 45,
    GOLD: 30,
    SILVER: 14,
    BRONZE: 7
};

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

    const today = moment().format("YYYY-MM-DD");
    const active = streak.last_streak_date === today;
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

            const today = moment().format("YYYY-MM-DD");
            const cached = useStreaksStore.getState().streaks[recipientId];
            const myFlag = cached && cached.today_date != null && cached.today_date === today && (cached.user_a_id === me ? cached.user_a_today : cached.user_b_today);
            const theirFlag = cached && cached.today_date != null && cached.today_date === today && (cached.user_a_id === me ? cached.user_b_today : cached.user_a_today);

            if (message.author.id === me) {
                if (!myFlag) {
                    useStreaksStore.getState().update(recipientId);
                }
            } else if (message.author.id === recipientId) {
                if (!theirFlag) {
                    setTimeout(async () => {
                        const before = useStreaksStore.getState().streaks[recipientId]?.count;
                        await useStreaksStore.getState().refresh(recipientId);
                        const after = useStreaksStore.getState().streaks[recipientId]?.count;

                        if (before === after) {
                            useStreaksStore.getState().update(recipientId);
                        }
                    }, 1000);
                }
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addBadge, BadgePosition, ProfileBadge, removeBadge } from "@api/Badges";
import { addDecorator, removeDecorator } from "@api/MemberListDecorators";
import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { SnowflakeUtils, Tooltip } from "@webpack/common";
import { User } from "discord-types/general";



const getTimeDiff = (now: Date, user: Date) => {
    // Get days since creation
    return Math.floor(((now.getTime() - user.getTime()) / 1000) / 86400);
};

const checkUser = (user: User, indType: string) => {
    if (!user || user.bot) return null;
    const currentDate = new Date();
    const userCreatedDate = new Date(SnowflakeUtils.extractTimestamp(user.id));
    const diff = getTimeDiff(currentDate, userCreatedDate);
    const tooltip = `Account created ${diff} days ago`;
    const enabled = settings.store[indType] as Boolean;

    if (settings.store.days > diff && enabled) {
        return <Tooltip text={tooltip}>
            {(tooltipProps: any) => (
                <span {...tooltipProps} tabIndex={0}>❗</span>
            )}
        </Tooltip>;
    }
    return null;
};

const badge: ProfileBadge = {
    component: u => checkUser(u.user, "badges"),
    position: BadgePosition.START,
    shouldShow: _ => true,
    key: "newuser-indicator"
};


const settings = definePluginSettings({
    badges: {
        description: "Enable on badges.",
        type: OptionType.BOOLEAN,
        default: true,
    },
    decorators: {
        description: "Enable on member list.",
        type: OptionType.BOOLEAN,
        default: true,
    },
    decorations: {
        description: "Enable on messages.",
        type: OptionType.BOOLEAN,
        default: true,
    },
    days: {
        description: "Amount of days to trigger badge.",
        type: OptionType.NUMBER,
        default: 30,
    },
});

export default definePlugin({
    name: "NewUserIndicator",
    description: "Adds a indicator if users account is created recently",
    authors: [
        Devs.evergreen,
    ],
    patches: [],
    settings,
    start() {
        addBadge(badge);
        addDecoration("newuser-indicator", props =>
            <ErrorBoundary noop>
                {checkUser(props.message.author, "decorations")}
            </ErrorBoundary>
        );
        addDecorator("newuser-indicator", props =>
            <ErrorBoundary noop>
                {checkUser(props.user, "decorators")}
            </ErrorBoundary>
        );

    },
    stop() {
        removeDecoration("newuser-indicator");
        removeDecorator("newuser-indicator");
        removeBadge(badge);
    },

});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addProfileBadge,
    BadgePosition,
    ProfileBadge,
    removeProfileBadge
} from "@api/Badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { getBadges, RelationshipIndicator } from "./utils";

const indicatorLocations = {
    list: {
        description: "In the member list",
        onEnable: () => addMemberListDecorator("friend-indicator", props =>
            <ErrorBoundary noop>
                <RelationshipIndicator user={props.user} />
            </ErrorBoundary>
        ),
        onDisable: () => removeMemberListDecorator("friend-indicator")
    },
    badges: {
        description: "In user profiles, as badges",
        onEnable: () => addProfileBadge(badge),
        onDisable: () => removeProfileBadge(badge)
    },
    messages: {
        description: "Inside messages",
        onEnable: () => addMessageDecoration("friend-indicator", props =>
            <ErrorBoundary noop>
                <RelationshipIndicator user={props.message?.author} wantTopMargin={true} />
            </ErrorBoundary>
        ),
        onDisable: () => removeMessageDecoration("friend-indicator")
    }
};

const badge: ProfileBadge = {
    getBadges,
    position: BadgePosition.START
};

const settings = definePluginSettings({
    ...Object.fromEntries(
        Object.entries(indicatorLocations).map(([key, value]) => {
            return [key, {
                type: OptionType.BOOLEAN,
                description: `Show indicators ${value.description.toLowerCase()}`,
                // onChange doesn't give any way to know which setting was changed, so restart required
                restartNeeded: true,
                default: true
            }];
        })
    ),
});

export default definePlugin({
    name: "RelationshipIndicators",
    authors: [Devs.Scyye],
    settings,
    description: "Adds icons to indicate relationships with users.",
    start() {
        Object.entries(indicatorLocations).forEach(([key, value]) => {
            if (settings.store[key]) value.onEnable();
        });
    },
    stop() {
        Object.entries(indicatorLocations).forEach(([key, value]) => {
            if (settings.store[key]) value.onDisable();
        });
    },
});




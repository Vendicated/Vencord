/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./style.css";

import { addProfileBadge, BadgePosition, BadgeUserArgs, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/MemberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { PresenceStore, Tooltip, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

export interface Session {
    sessionId: string;
    status: string;
    active: boolean;
    clientInfo: {
        version: number;
        os: string;
        client: string;
    };
}

const SessionsStore = findStoreLazy("SessionsStore") as {
    getSessions(): Record<string, Session>;
};

function Icon(path: string, opts?: { viewBox?: string; width?: number; height?: number; }) {
    return ({ color, tooltip, small }: { color: string; tooltip: string; small: boolean; }) => (
        <Tooltip text={tooltip} >
            {(tooltipProps: any) => (
                <svg
                    {...tooltipProps}
                    height={(opts?.height ?? 20) - (small ? 3 : 0)}
                    width={(opts?.width ?? 20) - (small ? 3 : 0)}
                    viewBox={opts?.viewBox ?? "0 0 24 24"}
                    fill={color}
                >
                    <path d={path} />
                </svg>
            )}
        </Tooltip>
    );
}

const Icons = {
    desktop: Icon("M4 2.5c-1.103 0-2 .897-2 2v11c0 1.104.897 2 2 2h7v2H7v2h10v-2h-4v-2h7c1.103 0 2-.896 2-2v-11c0-1.103-.897-2-2-2H4Zm16 2v9H4v-9h16Z"),
    web: Icon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93Zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39Z"),
    mobile: Icon("M 187 0 L 813 0 C 916.277 0 1000 83.723 1000 187 L 1000 1313 C 1000 1416.277 916.277 1500 813 1500 L 187 1500 C 83.723 1500 0 1416.277 0 1313 L 0 187 C 0 83.723 83.723 0 187 0 Z M 125 1000 L 875 1000 L 875 250 L 125 250 Z M 500 1125 C 430.964 1125 375 1180.964 375 1250 C 375 1319.036 430.964 1375 500 1375 C 569.036 1375 625 1319.036 625 1250 C 625 1180.964 569.036 1125 500 1125 Z", { viewBox: "0 0 1000 1500", height: 17, width: 17 }),
    embedded: Icon("M14.8 2.7 9 3.1V47h3.3c1.7 0 6.2.3 10 .7l6.7.6V2l-4.2.2c-2.4.1-6.9.3-10 .5zm1.8 6.4c1 1.7-1.3 3.6-2.7 2.2C12.7 10.1 13.5 8 15 8c.5 0 1.2.5 1.6 1.1zM16 33c0 6-.4 10-1 10s-1-4-1-10 .4-10 1-10 1 4 1 10zm15-8v23.3l3.8-.7c2-.3 4.7-.6 6-.6H43V3h-2.2c-1.3 0-4-.3-6-.6L31 1.7V25z", { viewBox: "0 0 50 50" }),
};
type Platform = keyof typeof Icons;

const { useStatusFillColor } = mapMangledModuleLazy(".concat(.5625*", {
    useStatusFillColor: filters.byCode(".hex")
});

const PlatformIcon = ({ platform, status, small }: { platform: Platform, status: string; small: boolean; }) => {
    const tooltip = platform === "embedded"
        ? "Console"
        : platform[0].toUpperCase() + platform.slice(1);

    const Icon = Icons[platform] ?? Icons.desktop;

    return <Icon color={useStatusFillColor(status)} tooltip={tooltip} small={small} />;
};

function ensureOwnStatus(user: User) {
    if (user.id === UserStore.getCurrentUser().id) {
        const sessions = SessionsStore.getSessions();
        if (typeof sessions !== "object") return null;
        const sortedSessions = Object.values(sessions).sort(({ status: a }, { status: b }) => {
            if (a === b) return 0;
            if (a === "online") return 1;
            if (b === "online") return -1;
            if (a === "idle") return 1;
            if (b === "idle") return -1;
            return 0;
        });

        const ownStatus = Object.values(sortedSessions).reduce((acc, curr) => {
            if (curr.clientInfo.client !== "unknown")
                acc[curr.clientInfo.client] = curr.status;
            return acc;
        }, {});

        const { clientStatuses } = PresenceStore.getState();
        clientStatuses[UserStore.getCurrentUser().id] = ownStatus;
    }
}

function getBadges({ userId }: BadgeUserArgs): ProfileBadge[] {
    const user = UserStore.getUser(userId);

    if (!user || user.bot) return [];

    ensureOwnStatus(user);

    const status = PresenceStore.getState()?.clientStatuses?.[user.id] as Record<Platform, string>;
    if (!status) return [];

    return Object.entries(status).map(([platform, status]) => ({
        component: () => (
            <span className="vc-platform-indicator">
                <PlatformIcon
                    key={platform}
                    platform={platform as Platform}
                    status={status}
                    small={false}
                />
            </span>
        ),
        key: `vc-platform-indicator-${platform}`
    }));
}

const PlatformIndicator = ({ user, small = false }: { user: User; small?: boolean; }) => {
    if (!user || user.bot) return null;

    ensureOwnStatus(user);

    const status = PresenceStore.getState()?.clientStatuses?.[user.id] as Record<Platform, string>;
    if (!status) return null;

    const icons = Object.entries(status).map(([platform, status]) => (
        <PlatformIcon
            key={platform}
            platform={platform as Platform}
            status={status}
            small={small}
        />
    ));

    if (!icons.length) return null;

    return (
        <span
            className="vc-platform-indicator"
            style={{ gap: "2px" }}
        >
            {icons}
        </span>
    );
};

const badge: ProfileBadge = {
    getBadges,
    position: BadgePosition.START,
};

const indicatorLocations = {
    list: {
        description: "In the member list",
        onEnable: () => addMemberListDecorator("platform-indicator", props =>
            <ErrorBoundary noop>
                <PlatformIndicator user={props.user} small={true} />
            </ErrorBoundary>
        ),
        onDisable: () => removeMemberListDecorator("platform-indicator")
    },
    badges: {
        description: "In user profiles, as badges",
        onEnable: () => addProfileBadge(badge),
        onDisable: () => removeProfileBadge(badge)
    },
    messages: {
        description: "Inside messages",
        onEnable: () => addMessageDecoration("platform-indicator", props =>
            <ErrorBoundary noop>
                <PlatformIndicator user={props.message?.author} />
            </ErrorBoundary>
        ),
        onDisable: () => removeMessageDecoration("platform-indicator")
    }
};

export default definePlugin({
    name: "PlatformIndicators",
    description: "Adds platform indicators (Desktop, Mobile, Web...) to users",
    authors: [Devs.kemo, Devs.TheSun, Devs.Nuckyz, Devs.Ven],
    dependencies: ["MessageDecorationsAPI", "MemberListDecoratorsAPI"],

    start() {
        const settings = Settings.plugins.PlatformIndicators;
        const { displayMode } = settings;

        // transfer settings from the old ones, which had a select menu instead of booleans
        if (displayMode) {
            if (displayMode !== "both") settings[displayMode] = true;
            else {
                settings.list = true;
                settings.badges = true;
            }
            settings.messages = true;
            delete settings.displayMode;
        }

        Object.entries(indicatorLocations).forEach(([key, value]) => {
            if (settings[key]) value.onEnable();
        });
    },

    stop() {
        Object.entries(indicatorLocations).forEach(([_, value]) => {
            value.onDisable();
        });
    },

    patches: [
        {
            find: ".Masks.STATUS_ONLINE_MOBILE",
            predicate: () => Settings.plugins.PlatformIndicators.colorMobileIndicator,
            replacement: [
                {
                    // Return the STATUS_ONLINE_MOBILE mask if the user is on mobile, no matter the status
                    match: /\.STATUS_TYPING;switch(?=.+?(if\(\i\)return \i\.\i\.Masks\.STATUS_ONLINE_MOBILE))/,
                    replace: ".STATUS_TYPING;$1;switch"
                },
                {
                    // Return the STATUS_ONLINE_MOBILE mask if the user is on mobile, no matter the status
                    match: /switch\(\i\)\{case \i\.\i\.ONLINE:(if\(\i\)return\{[^}]+\})/,
                    replace: "$1;$&"
                }
            ]
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            predicate: () => Settings.plugins.PlatformIndicators.colorMobileIndicator,
            replacement: [
                {
                    // Return the AVATAR_STATUS_MOBILE size mask if the user is on mobile, no matter the status
                    match: /\i===\i\.\i\.ONLINE&&(?=.{0,70}\.AVATAR_STATUS_MOBILE_16;)/,
                    replace: ""
                },
                {
                    // Fix sizes for mobile indicators which aren't online
                    match: /(?<=\(\i\.status,)(\i)(?=,(\i),\i\))/,
                    replace: (_, userStatus, isMobile) => `${isMobile}?"online":${userStatus}`
                },
                {
                    // Make isMobile true no matter the status
                    match: /(?<=\i&&!\i)&&\i===\i\.\i\.ONLINE/,
                    replace: ""
                }
            ]
        },
        {
            find: "}isMobileOnline(",
            predicate: () => Settings.plugins.PlatformIndicators.colorMobileIndicator,
            replacement: {
                // Make isMobileOnline return true no matter what is the user status
                match: /(?<=\i\[\i\.\i\.MOBILE\])===\i\.\i\.ONLINE/,
                replace: "!= null"
            }
        }
    ],

    options: {
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
        colorMobileIndicator: {
            type: OptionType.BOOLEAN,
            description: "Whether to make the mobile indicator match the color of the user status.",
            default: true,
            restartNeeded: true
        }
    }
});

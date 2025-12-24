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
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { DiscordPlatform, OnlineStatus, User } from "@vencord/discord-types";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { AuthenticationStore, PresenceStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";
import desktopIcon from "file://icons/desktopIcon.svg?minify";
import embeddedIcon from "file://icons/embeddedIcon.svg?minify";
import mobileIcon from "file://icons/mobileIcon.svg?minify";
import webIcon from "file://icons/webIcon.svg?minify";
import type { JSX } from "react";

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
const { useStatusFillColor } = mapMangledModuleLazy(".concat(.5625*", {
    useStatusFillColor: filters.byCode(".hex")
});

function Icon(svg: string, size = 20) {
    return ({ color, tooltip, small }: { color: string; tooltip: string; small: boolean; }) => (
        <Tooltip text={tooltip} >
            {tooltipProps => (
                <img
                    {...tooltipProps}
                    src={"data:image/svg+xml;utf8," + encodeURIComponent(svg.replace("#123456", color))}
                    height={size - (small ? 3 : 0)}
                    width={size - (small ? 3 : 0)}
                />
            )}
        </Tooltip>
    );
}

type IconData = {
    svg: string,
    size: number,
    component: (props: { color: string, tooltip: string, small: boolean; }) => JSX.Element;
};

const Icons: Record<DiscordPlatform, IconData> = {
    desktop: iconData(desktopIcon),
    web: iconData(webIcon),
    mobile: iconData(mobileIcon),
    embedded: iconData(embeddedIcon),
};

function iconData(svg: string, size: number = 20): IconData {
    return {
        svg,
        size,
        component: Icon(svg, size),
    };
}

function getPlatformTooltip(platform: DiscordPlatform): string {
    return platform === "embedded"
        ? "Console"
        : platform[0].toUpperCase() + platform.slice(1);
}

const PlatformIcon = ({ platform, status, small }: { platform: DiscordPlatform, status: OnlineStatus; small: boolean; }) => {
    const tooltip = getPlatformTooltip(platform as DiscordPlatform);

    const Icon = (Icons[platform] ?? Icons.desktop).component;

    return <Icon color={useStatusFillColor(status)} tooltip={tooltip} small={small} />;
};

function ensureOwnStatus(user: User) {
    if (user.id === AuthenticationStore.getId()) {
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
        clientStatuses[AuthenticationStore.getId()] = ownStatus;
    }
}

function getBadges({ userId }: BadgeUserArgs): ProfileBadge[] {
    const colorMap = {
        online: useStatusFillColor("online"),
        idle: useStatusFillColor("idle"),
        dnd: useStatusFillColor("dnd"),
        offline: useStatusFillColor("offline"),
        streaming: useStatusFillColor("streaming"),
    };

    const user = UserStore.getUser(userId);

    if (!user || user.bot) return [];

    ensureOwnStatus(user);

    const status = PresenceStore.getClientStatus(user.id);
    if (!status) return [];

    return Object.entries(status).map(([platform, status]) => {
        const tooltip = getPlatformTooltip(platform as DiscordPlatform);

        const icon = Icons[platform as DiscordPlatform] ?? Icons.desktop;

        return {
            description: tooltip,
            iconSrc: "data:image/svg+xml;utf8," + encodeURIComponent(icon.svg.replace("#123456", colorMap[status] ?? colorMap.offline)),
            props: {
                style: { width: icon.size, height: icon.size },
            },
            key: `vc-platform-indicator-${platform}`,
        } satisfies ProfileBadge;
    });
}

const PlatformIndicator = ({ user, small = false }: { user: User; small?: boolean; }) => {
    ensureOwnStatus(user);

    const status = useStateFromStores([PresenceStore], () => PresenceStore.getClientStatus(user.id));
    if (!status) return null;

    const icons = Object.entries(status).map(([platform, status]) => (
        <PlatformIcon
            key={platform}
            platform={platform as DiscordPlatform}
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
        onEnable: () => addMemberListDecorator("platform-indicator", ({ user }) =>
            user && !user.bot ? <PlatformIndicator user={user} small={true} /> : null
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
        onEnable: () => addMessageDecoration("platform-indicator", props => {
            const user = props.message?.author;
            return user && !user.bot ? <PlatformIndicator user={props.message?.author} /> : null;
        }),
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

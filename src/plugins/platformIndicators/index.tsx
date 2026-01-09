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

import { definePluginSettings, migratePluginSetting, Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { DiscordPlatform, User } from "@vencord/discord-types";
import { filters, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { AuthenticationStore, PresenceStore, Tooltip, UserStore, useStateFromStores } from "@webpack/common";

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

function Icon(path: string, opts?: { viewBox?: string; width?: number; height?: number; }) {
    return ({ color, tooltip, small }: { color: string; tooltip: string; small: boolean; }) => (
        <Tooltip text={tooltip}>
            {tooltipProps => (
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
    embedded: Icon("M3.06 20.4q-1.53 0-2.37-1.065T.06 16.74l1.26-9q.27-1.8 1.605-2.97T6.06 3.6h11.88q1.8 0 3.135 1.17t1.605 2.97l1.26 9q.21 1.53-.63 2.595T20.94 20.4q-.63 0-1.17-.225T18.78 19.5l-2.7-2.7H7.92l-2.7 2.7q-.45.45-.99.675t-1.17.225Zm14.94-7.2q.51 0 .855-.345T19.2 12q0-.51-.345-.855T18 10.8q-.51 0-.855.345T16.8 12q0 .51.345 .855T18 13.2Zm-2.4-3.6q.51 0 .855-.345T16.8 8.4q0-.51-.345-.855T15.6 7.2q-.51 0-.855.345T14.4 8.4q0 .51.345 .855T15.6 9.6ZM6.9 13.2h1.8v-2.1h2.1v-1.8h-2.1v-2.1h-1.8v2.1h-2.1v1.8h2.1v2.1Z", { viewBox: "0 0 24 24", height: 20, width: 20 }),
    suncord: Icon("M7 4a6 6 0 00-6 6v4a6 6 0 006 6h10a6 6 0 006-6v-4a6 6 0 00-6-6H7zm0 11a1 1 0 01-1-1v-1H5a1 1 0 010-2h1v-1a1 1 0 012 0v1h1a1 1 0 010 2H8v1a1 1 0 01-1 1zm10-4a1 1 0 100-2 1 1 0 000 2zm1 3a1 1 0 11-2 0 1 1 0 012 0zm0-2a1 1 0 102 0 1 1 0 00-2 0zm-3 1a1 1 0 110-2 1 1 0 010 2z", { viewBox: "0 0 24 24", height: 24, width: 24 }),
    vencord: Icon("M14.8 2.7 9 3.1V47h3.3c1.7 0 6.2.3 10 .7l6.7.6V2l-4.2.2c-2.4.1-6.9.3-10 .5zm1.8 6.4c1 1.7-1.3 3.6-2.7 2.2C12.7 10.1 13.5 8 15 8c.5 0 1.2.5 1.6 1.1zM16 33c0 6-.4 10-1 10s-1-4-1-10 .4-10 1-10 1 4 1 10zm15-8v23.3l3.8-.7c2-.3 4.7-.6 6-.6H43V3h-2.2c-1.3 0-4-.3-6-.6L31 1.7V25z", { viewBox: "0 0 50 50" }),
};

const PlatformIcon = ({ platform, status, small }) => {
    const tooltip = platform === "embedded"
        ? "Console"
        : platform[0].toUpperCase() + platform.slice(1);
    let Icon = Icons[platform] ?? Icons.desktop;
    const { ConsoleIcon } = settings.store;
    if (platform === "embedded") {
        switch (ConsoleIcon) {
            case "equicord":
                Icon = Icons.embedded;
                break;
            case "suncord":
                Icon = Icons.suncord;
                break;
            case "vencord":
                Icon = Icons.vencord;
                break;
            default:
                Icon = Icons.embedded;
                break;
        }
    }

    return <Icon color={useStatusFillColor(status)} tooltip={tooltip} small={small} />;
};

function useEnsureOwnStatus(user: User) {
    if (user.id !== AuthenticationStore.getId()) {
        return;
    }

    const sessions = useStateFromStores([SessionsStore], () => SessionsStore.getSessions());
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

interface PlatformIndicatorProps {
    user: User;
    isProfile?: boolean;
    isMessage?: boolean;
    isMemberList?: boolean;
}

const PlatformIndicator = ({ user, isProfile, isMessage, isMemberList }: PlatformIndicatorProps) => {
    if (user == null || (user.bot && !Settings.plugins.PlatformIndicators.showBots)) return null;
    useEnsureOwnStatus(user);

    const status = useStateFromStores([PresenceStore], () => PresenceStore.getClientStatus(user.id));
    if (!status) return null;

    const icons = Array.from(Object.entries(status), ([platform, status]) => (
        <PlatformIcon
            key={platform}
            platform={platform as DiscordPlatform}
            status={status}
            small={isProfile || isMemberList}
        />
    ));

    if (!icons.length) {
        return null;
    }

    return (
        <div
            className={classes("vc-platform-indicator", isProfile && "vc-platform-indicator-profile", isMessage && "vc-platform-indicator-message")}
            style={{ marginLeft: isMemberList ? "4px" : undefined }}
        >
            {icons}
        </div>
    );
};

migratePluginSetting("PlatformIndicators", "profiles", "badges");
const settings = definePluginSettings({
    list: {
        type: OptionType.BOOLEAN,
        description: "Show indicators in the member list",
        default: true,
    },
    profiles: {
        type: OptionType.BOOLEAN,
        description: "Show indicators in user profiles",
        default: true,
    },
    messages: {
        type: OptionType.BOOLEAN,
        description: "Show indicators inside messages",
        default: true,
    },
    colorMobileIndicator: {
        type: OptionType.BOOLEAN,
        description: "Whether to make the mobile indicator match the color of the user status.",
        default: true,
        restartNeeded: true
    },
    showBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to show platform indicators on bots",
        default: false,
        restartNeeded: false
    },
    ConsoleIcon: {
        type: OptionType.SELECT,
        description: "What console icon to use",
        restartNeeded: true,
        options: [
            {
                label: "Equicord",
                value: "equicord",
                default: true
            },
            {
                label: "Suncord",
                value: "suncord",
            },
            {
                label: "Vencord",
                value: "vencord",
            },
        ],
    }
});

export default definePlugin({
    name: "PlatformIndicators",
    description: "Adds platform indicators (Desktop, Mobile, Web...) to users",
    authors: [Devs.kemo, Devs.TheSun, Devs.Nuckyz, Devs.Ven],
    settings,
    renderNicknameIcon(props) {
        if (!settings.store.profiles) return null;
        return (
            <PlatformIndicator user={UserStore.getUser(props.userId)} isProfile />
        );
    },
    renderMemberListDecorator(props) {
        if (!settings.store.list) return null;
        return <PlatformIndicator user={props.user} isMemberList />;

    },
    renderMessageDecoration(props) {
        if (!settings.store.messages) return null;
        return <PlatformIndicator user={props.message?.author} isMessage />;
    },

    patches: [
        {
            find: ".Masks.STATUS_ONLINE_MOBILE",
            predicate: () => settings.store.colorMobileIndicator,
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
            predicate: () => settings.store.colorMobileIndicator,
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
            predicate: () => settings.store.colorMobileIndicator,
            replacement: {
                // Make isMobileOnline return true no matter what is the user status
                match: /(?<=\i\[\i\.\i\.MOBILE\])===\i\.\i\.ONLINE/,
                replace: "!= null"
            }
        }
    ]
});

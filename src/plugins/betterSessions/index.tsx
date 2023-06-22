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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, FluxDispatcher, React, Tooltip } from "@webpack/common";
import { ChromeIcon, DiscordIcon, EdgeIcon, FirefoxIcon, IEIcon, MobileIcon, OperaIcon, SafariIcon, UnknownIcon } from "./components/icons";
import { openModal } from "@utils/modal";
import { RenameModal } from "./components/RenameModal";
import { fetchNamesFromDataStore, getDefaultName, saveNamesToDataStore, savedNamesCache } from "./utils";
import { SessionInfo } from "./types";

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");

function GetOsColor(os: string) {
    switch (os) {
        case "Windows Mobile":
        case "Windows":
            return "#55a6ef"; // Light blue
        case "Linux":
            return "#ffff6b"; // Yellow
        case "Android":
            return "#7bc958"; // Green
        case "Mac OS X":
        case "iOS":
            return ""; // Default to white/black (theme-dependent)
        default:
            return "#f3799a"; // Pink
    }
}

function GetPlatformIcon(platform: string) {
    switch (platform) {
        case "Discord Android":
        case "Discord iOS":
        case "Discord Client":
            return DiscordIcon;
        case "Android Chrome":
        case "Chrome iOS":
        case "Chrome":
            return ChromeIcon;
        case "Edge":
            return EdgeIcon;
        case "Firefox":
            return FirefoxIcon;
        case "Internet Explorer":
            return IEIcon;
        case "Opera Mini":
        case "Opera":
            return OperaIcon;
        case "Mobile Safari":
        case "Safari":
            return SafariIcon;
        case "BlackBerry":
        case "Facebook Mobile":
        case "Android Mobile":
            return MobileIcon;
        default:
            return UnknownIcon;
    }
}

export default definePlugin({
    name: "BetterSessions",
    description: "Enhances the sessions menu. Allows you to view exact timestamps and add notes.",
    authors: [Devs.amia],

    patches: [
        {
            find: "Messages.AUTH_SESSIONS_SESSION_LOG_OUT",
            replacement: [
                // Replace children with a single label with state
                {
                    match: /({variant:"eyebrow",className:\i\(\)\.sessionInfoRow,children:).{70,110}{children:"·"}\),\(0,\i\.\i\)\("span",{children:\i\[\d+\]}\)\]}\)\]/,
                    replace: "$1$self.renderName(arguments[0])"
                },
                {
                    match: /({variant:"text-sm\/medium",className:\i\(\)\.sessionInfoRow,children:.{70,110}{children:"·"}\),\(0,\i\.\i\)\("span",{children:)(\i\[\d+\])}/,
                    replace: "$1$self.renderTimestamp(arguments[0], $2)}"
                },
                // Replace the icon
                {
                    match: /(currentSession:null\),children:\[)\(0,\w+\.\w+\)\("div",{className:\w+\(\)\.sessionIcon,children:\(0,\w+\.\w+\)\(\w+,{width:"32",height:"32"}\)}\),/,
                    replace: "$1$self.renderIcon(arguments[0]),"
                }
            ]
        }
    ],

    renderName({ session }: SessionInfo) {
        const savedName = savedNamesCache.get(session.id_hash);

        const state = React.useState(savedName ? `${savedName}*` : getDefaultName(session.client_info));
        const [name, setName] = state;

        const children = [
            <span>{name}</span>,
            this.renderRenameButton({ session }, state)
        ];

        // Show a "NEW" badge if the session is seen for the first time
        if (savedName == null) {
            children.splice(1, 0,
                <div
                    className="vc-plugins-badge"
                    style={{
                        backgroundColor: "#ED4245",
                        marginLeft: "2px"
                    }}
                >
                    NEW
                </div>
            );
        }

        return children;
    },

    renderTimestamp({ session }: SessionInfo, timeLabel: string) {
        return (
            <Tooltip text={session.approx_last_used_time.toLocaleString()} tooltipClassName={TimestampClasses.timestampTooltip}>
                {props => (
                    <span {...props} className={TimestampClasses.timestamp}>
                        {timeLabel}
                    </span>
                )}
            </Tooltip>
        );
    },

    renderRenameButton({ session }: SessionInfo, state: [string, React.Dispatch<React.SetStateAction<string>>]) {
        return (
            <Button
                look={Button.Looks.LINK}
                color={Button.Colors.LINK}
                size={Button.Sizes.NONE}
                style={{
                    paddingTop: "0px",
                    paddingBottom: "0px",
                    top: "-2px"
                }}
                onClick={() =>
                    openModal(props => (
                        <RenameModal
                            props={props}
                            session={session}
                            state={state}
                        />
                    ))
                }
            >
                Rename
            </Button>
        );
    },

    renderIcon({ session }: SessionInfo) {
        const PlatformIcon = GetPlatformIcon(session.client_info.platform);

        return (
            <div
                className={SessionIconClasses.sessionIcon}
                style={{ backgroundColor: GetOsColor(session.client_info.os) }}
            >
                <PlatformIcon width={32} height={32} />
            </div>
        );
    },

    async start() {
        fetchNamesFromDataStore();

        let lastFetchedHashes: string[] = [];
        // Note: for some reason this is dispatched with a blank array when settings are closed, hence the length check later on
        FluxDispatcher.subscribe("FETCH_AUTH_SESSIONS_SUCCESS", ({ sessions }: { sessions: SessionInfo["session"][]; }) => {
            lastFetchedHashes = sessions.map(session => session.id_hash);
        });

        // Save all known sessions when settings are closed, in order to dismiss the "NEW" badge
        FluxDispatcher.subscribe("USER_SETTINGS_ACCOUNT_RESET_AND_CLOSE_FORM", () => {
            lastFetchedHashes.forEach(idHash => {
                if (!savedNamesCache.has(idHash)) savedNamesCache.set(idHash, "");
            });

            // Remove names of sessions that were removed
            if (lastFetchedHashes.length > 0) {
                savedNamesCache.forEach((_, idHash) => {
                    if (!lastFetchedHashes.includes(idHash)) savedNamesCache.delete(idHash);
                });
                lastFetchedHashes = [];
            }
            saveNamesToDataStore();
        });
    }
});

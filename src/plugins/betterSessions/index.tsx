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

import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { React, TextArea, Tooltip } from "@webpack/common";
import type { KeyboardEvent } from "react";
import { ChromeIcon, DiscordIcon, EdgeIcon, FirefoxIcon, IEIcon, MobileIcon, OperaIcon, SafariIcon, UnknownIcon } from "./elements";

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");
const TextAreaClasses = findLazy(m => typeof m.textarea === "string");
const NoteClasses = findLazy(m => typeof m.note === "string" && Object.keys(m).length === 1);

let savedNotesCache: Record<string, string>;

interface SessionInfo {
    session: {
        id_hash: string;
        approx_last_used_time: Date;
        client_info: {
            os: string;
            platform: string;
            location: string;
        };
    },
    current?: boolean;
}

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
                {
                    match: /({variant:"text-sm\/medium",className:\i\(\)\.sessionInfoRow,children:.{70,110}{children:"·"}\),\(0,\i\.\i\)\("span",{children:)(\i\[\d+\])}\)\]}\)\]}\)/,
                    replace: "$1$self.renderTimestamp(arguments[0], $2)})]})]}),$self.renderNote(arguments[0])"
                },

                // Remove the existing icon child and re-create it
                {
                    match: /(currentSession:null\),children:\[)\(0,\w+\.\w+\)\("div",{className:\w+\(\)\.sessionIcon,children:\(0,\w+\.\w+\)\(\w+,{width:"32",height:"32"}\)}\),/,
                    replace: "$1$self.renderIcon(arguments[0]),"
                }
            ]
        }
    ],

    renderTimestamp({ session }: SessionInfo, timeLabel: string) {
        return <Tooltip text={session.approx_last_used_time.toLocaleString()} tooltipClassName={TimestampClasses.timestampTooltip}>
            {props => (
                <span {...props} className={TimestampClasses.timestamp}>
                    {timeLabel}
                </span>
            )}
        </Tooltip>;
    },

    renderNote({ session }: SessionInfo) {
        const [noteText, setNoteText] = React.useState(savedNotesCache[session.id_hash] ?? "");

        return (
            <div className={NoteClasses.note}>
                <TextArea
                    className={TextAreaClasses.textarea}
                    disabled={false}
                    placeholder="Click to add a note"
                    rows={1}
                    onChange={text => {
                        setNoteText(text);

                        if (text !== "") {
                            savedNotesCache[session.id_hash] = text;
                        } else {
                            delete savedNotesCache[session.id_hash];
                        }
                        DataStore.set("BetterSessions_savedNotesCache", savedNotesCache);
                    }}
                    onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                        }
                    }}
                    value={noteText}
                />
            </div>
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
        savedNotesCache = await DataStore.get<Record<string, string>>("BetterSessions_savedNotesCache") ?? {};
    }
});

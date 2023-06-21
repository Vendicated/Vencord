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
import { findByPropsLazy } from "@webpack";
import { Button, Forms, React, TextInput, Tooltip } from "@webpack/common";
import { ChromeIcon, DiscordIcon, EdgeIcon, FirefoxIcon, IEIcon, MobileIcon, OperaIcon, SafariIcon, UnknownIcon } from "./icons";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, closeModal, openModal } from "@utils/modal";

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");

let savedNamesCache: Record<string, string>;

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

    getDefaultName(clientInfo: SessionInfo["session"]["client_info"]) {
        return `${clientInfo.os} · ${clientInfo.platform}`;
    },

    renderName({ session }: SessionInfo) {
        const state = React.useState(savedNamesCache[session.id_hash] ? `${savedNamesCache[session.id_hash]}*` : this.getDefaultName(session.client_info));
        const [name, setName] = state;

        return [
            <span>{name}</span>,
            this.renderRenameButton({ session }, state)
        ];
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
                onClick={() => {
                    const [name, setName] = state;

                    const key = openModal(props => (
                        <ModalRoot {...props}>
                            <ModalHeader>
                                <Forms.FormTitle tag="h4">Rename</Forms.FormTitle>
                                <ModalCloseButton onClick={() => closeModal(key)} />
                            </ModalHeader>

                            <ModalContent>
                                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>New device name</Forms.FormTitle>
                                <TextInput
                                    style={{ marginBottom: "10px" }}
                                    defaultValue={savedNamesCache[session.id_hash] ?? ""}
                                    onChange={(e: string) => {
                                        savedNamesCache[session.id_hash] = e;
                                    }}
                                ></TextInput>
                            </ModalContent>

                            <ModalFooter>
                                <Button
                                    color={Button.Colors.BRAND}
                                    onClick={() => {
                                        if (savedNamesCache[session.id_hash]) {
                                            setName(`${savedNamesCache[session.id_hash]}*`);
                                        } else {
                                            delete savedNamesCache[session.id_hash];
                                            setName(this.getDefaultName(session.client_info));
                                        }
                                        DataStore.set("BetterSessions_savedNamesCache", savedNamesCache);

                                        props.onClose();
                                    }}
                                >Save</Button>
                                <Button
                                    color={Button.Colors.TRANSPARENT}
                                    look={Button.Looks.LINK}
                                    onClick={() => {
                                        delete savedNamesCache[session.id_hash];
                                        setName(this.getDefaultName(session.client_info));
                                        DataStore.set("BetterSessions_savedNamesCache", savedNamesCache);

                                        props.onClose();
                                    }}
                                >
                                    Reset
                                </Button>
                            </ModalFooter>
                        </ModalRoot>
                    ));
                }}
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
        savedNamesCache = await DataStore.get<Record<string, string>>("BetterSessions_savedNamesCache") ?? {};
    }
});

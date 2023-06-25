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

import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, React, RestAPI, Tooltip } from "@webpack/common";

import { RenameModal } from "./components/RenameModal";
import { SessionInfo } from "./types";
import { fetchNamesFromDataStore, getDefaultName, GetOsColor, GetPlatformIcon, savedSessionsCache, saveSessionsToDataStore } from "./utils";

const UserSettingsAccountActionCreators = findByPropsLazy("saveAccountChanges", "open");
const UserSettingsSections = findByPropsLazy("ACCOUNT_BACKUP_CODES");

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");

let lastFetchedHashes: string[] = [];

const settings = definePluginSettings({
    backgroundCheck: {
        type: OptionType.BOOLEAN,
        description: "Check for new sessions in the background, and display notifications when they are detected",
        default: false,
        restartNeeded: false
    },
    checkInterval: {
        description: "How often to check for new sessions in the background (if enabled), in minutes",
        type: OptionType.NUMBER,
        default: 20,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterSessions",
    description: "Enhances the sessions (devices) menu. Allows you to view exact timestamps, give each session a custom name, and receive notifications about new sessions.",
    authors: [Devs.amia],

    settings: settings,

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
        const savedSession = savedSessionsCache.get(session.id_hash);

        const state = React.useState(savedSession?.name ? `${savedSession.name}*` : getDefaultName(session.client_info));
        const [name, setName] = state;

        const children = [
            <span>{name}</span>,
            this.renderRenameButton({ session }, state)
        ];

        // Show a "NEW" badge if the session is seen for the first time
        if (savedSession == null || savedSession.isNew) {
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

    async checkNewSessions() {
        if (!settings.store.backgroundCheck) return;

        const data = await RestAPI.get({
            url: "/auth/sessions"
        });

        const newSessions = data.body.user_sessions.filter((session: SessionInfo["session"]) => !savedSessionsCache.has(session.id_hash));
        for (const session of newSessions) {
            savedSessionsCache.set(session.id_hash, { name: "", isNew: true });

            showNotification({
                title: "BetterSessions",
                body: `New session:\n${session.client_info.os} · ${session.client_info.platform} · ${session.client_info.location}`,
                permanent: true,
                onClick: () => UserSettingsAccountActionCreators.open(UserSettingsSections.SESSIONS)
            });
        }
    },

    flux: {
        // Note: for some reason this is dispatched with a blank array when settings are closed, hence the length check later on
        FETCH_AUTH_SESSIONS_SUCCESS({ sessions }: { sessions: SessionInfo["session"][]; }) {
            lastFetchedHashes = sessions.map(session => session.id_hash);
        },

        // Save all known sessions when settings are closed and dismiss the "NEW" badge
        USER_SETTINGS_ACCOUNT_RESET_AND_CLOSE_FORM() {
            lastFetchedHashes.forEach(idHash => {
                if (!savedSessionsCache.has(idHash)) savedSessionsCache.set(idHash, { name: "", isNew: false });
            });
            savedSessionsCache.forEach(data => {
                data.isNew = false;
            });

            // Remove names of sessions that were removed
            if (lastFetchedHashes.length > 0) {
                savedSessionsCache.forEach((_, idHash) => {
                    if (!lastFetchedHashes.includes(idHash)) savedSessionsCache.delete(idHash);
                });
                lastFetchedHashes = [];
            }
            saveSessionsToDataStore();
        }
    },

    async start() {
        await fetchNamesFromDataStore();

        this.checkNewSessions();
        this.checkInterval = setInterval(this.checkNewSessions, settings.store.checkInterval * 60 * 1000);
    },

    stop() {
        clearInterval(this.checkInterval);
    }
});

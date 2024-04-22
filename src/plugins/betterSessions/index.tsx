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
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, RestAPI, Tooltip } from "@webpack/common";

import { RenameButton } from "./components/RenameButton";
import { SessionInfo } from "./types";
import { fetchNamesFromDataStore, getDefaultName, GetOsColor, GetPlatformIcon, savedSessionsCache, saveSessionsToDataStore } from "./utils";

const AuthSessionsStore = findByPropsLazy("getSessions");
const UserSettingsModal = findByPropsLazy("saveAccountChanges", "open");

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");

const settings = definePluginSettings({
    backgroundCheck: {
        type: OptionType.BOOLEAN,
        description: "Check for new sessions in the background, and display notifications when they are detected",
        default: false,
        restartNeeded: true
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
                    match: /({variant:"eyebrow",className:\i\.sessionInfoRow,children:).{70,110}{children:"\\xb7"}\),\(0,\i\.\i\)\("span",{children:\i\[\d+\]}\)\]}\)\]/,
                    replace: "$1$self.renderName(arguments[0])"
                },
                {
                    match: /({variant:"text-sm\/medium",className:\i\.sessionInfoRow,children:.{70,110}{children:"\\xb7"}\),\(0,\i\.\i\)\("span",{children:)(\i\[\d+\])}/,
                    replace: "$1$self.renderTimestamp(arguments[0], $2)}"
                },
                // Replace the icon
                {
                    match: /(currentSession:null\),children:\[)\(0,\i\.\i\)\("div",{className:\w+\.sessionIcon,children:\(0,\i\.\i\)\(\i,{width:\i,height:\i}\)}\),/,
                    replace: "$1$self.renderIcon(arguments[0]),"
                }
            ]
        }
    ],

    renderName({ session }: SessionInfo) {
        const savedSession = savedSessionsCache.get(session.id_hash);

        const state = React.useState(savedSession?.name ? `${savedSession.name}*` : getDefaultName(session.client_info));
        const [title, setTitle] = state;

        // Show a "NEW" badge if the session is seen for the first time
        return (
            <>
                <span>{title}</span>
                {(savedSession == null || savedSession.isNew) && (
                    <div
                        className="vc-plugins-badge"
                        style={{
                            backgroundColor: "#ED4245",
                            marginLeft: "2px"
                        }}
                    >
                        NEW
                    </div>
                )}
                <RenameButton session={session} state={state} />
            </>
        );
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
            <RenameButton session={session} state={state} />
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
        const data = await RestAPI.get({
            url: "/auth/sessions"
        });

        for (const session of data.body.user_sessions) {
            if (savedSessionsCache.has(session.id_hash)) continue;

            savedSessionsCache.set(session.id_hash, { name: "", isNew: true });
            showNotification({
                title: "BetterSessions",
                body: `New session:\n${session.client_info.os} · ${session.client_info.platform} · ${session.client_info.location}`,
                permanent: true,
                onClick: () => UserSettingsModal.open("Sessions")
            });
        }

        saveSessionsToDataStore();
    },

    flux: {
        USER_SETTINGS_ACCOUNT_RESET_AND_CLOSE_FORM() {
            const lastFetchedHashes: string[] = AuthSessionsStore.getSessions().map((session: SessionInfo["session"]) => session.id_hash);

            // Add new sessions to cache
            lastFetchedHashes.forEach(idHash => {
                if (!savedSessionsCache.has(idHash)) savedSessionsCache.set(idHash, { name: "", isNew: false });
            });

            // Delete removed sessions from cache
            if (lastFetchedHashes.length > 0) {
                savedSessionsCache.forEach((_, idHash) => {
                    if (!lastFetchedHashes.includes(idHash)) savedSessionsCache.delete(idHash);
                });
            }

            // Dismiss the "NEW" badge of all sessions.
            // Since the only way for a session to be marked as "NEW" is going to the Devices tab,
            // closing the settings means they've been viewed and are no longer considered new.
            savedSessionsCache.forEach(data => {
                data.isNew = false;
            });
            saveSessionsToDataStore();
        }
    },

    async start() {
        await fetchNamesFromDataStore();

        this.checkNewSessions();
        if (settings.store.backgroundCheck) {
            this.checkInterval = setInterval(this.checkNewSessions, settings.store.checkInterval * 60 * 1000);
        }
    },

    stop() {
        clearInterval(this.checkInterval);
    }
});

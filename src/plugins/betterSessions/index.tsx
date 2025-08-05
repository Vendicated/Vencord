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
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { Constants, React, RestAPI, Tooltip } from "@webpack/common";

import { RenameButton } from "./components/RenameButton";
import { Session, SessionInfo } from "./types";
import { fetchNamesFromDataStore, getDefaultName, GetOsColor, GetPlatformIcon, savedSessionsCache, saveSessionsToDataStore } from "./utils";

const AuthSessionsStore = findStoreLazy("AuthSessionsStore");
const UserSettingsModal = findByPropsLazy("saveAccountChanges", "open");

const TimestampClasses = findByPropsLazy("timestampTooltip", "blockquoteContainer");
const SessionIconClasses = findByPropsLazy("sessionIcon");

const BlobMask = findComponentByCodeLazy("!1,lowerBadgeSize:");

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
            find: "#{intl::AUTH_SESSIONS_SESSION_LOG_OUT}",
            replacement: [
                // Replace children with a single label with state
                {
                    match: /({variant:"eyebrow",className:\i\.sessionInfoRow,children:).{70,110}{children:"\\xb7"}\),\(0,\i\.\i\)\("span",{children:\i\[\d+\]}\)\]}\)\]/,
                    replace: "$1$self.renderName(arguments[0])"
                },
                {
                    match: /({variant:"text-sm\/medium",className:\i\.sessionInfoRow,children:.{70,110}{children:"\\xb7"}\),\(0,\i\.\i\)\("span",{children:)(\i\[\d+\])}/,
                    replace: "$1$self.renderTimestamp({ ...arguments[0], timeLabel: $2 })}"
                },
                // Replace the icon
                {
                    match: /\.currentSession:null\),children:\[(?<=,icon:(\i)\}.+?)/,
                    replace: "$& $self.renderIcon({ ...arguments[0], DeviceIcon: $1 }), false &&"
                }
            ]
        }
    ],

    renderName: ErrorBoundary.wrap(({ session }: SessionInfo) => {
        const savedSession = savedSessionsCache.get(session.id_hash);

        const state = React.useState(savedSession?.name ? `${savedSession.name}*` : getDefaultName(session.client_info));
        const [title, setTitle] = state;

        // Show a "NEW" badge if the session is seen for the first time
        return (
            <>
                <span>{title}</span>
                {(savedSession == null || savedSession.isNew) && (
                    <div
                        className="vc-addon-badge"
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
    }, { noop: true }),

    renderTimestamp: ErrorBoundary.wrap(({ session, timeLabel }: { session: Session, timeLabel: string; }) => {
        return (
            <Tooltip text={session.approx_last_used_time.toLocaleString()} tooltipClassName={TimestampClasses.timestampTooltip}>
                {props => (
                    <span {...props} className={TimestampClasses.timestamp}>
                        {timeLabel}
                    </span>
                )}
            </Tooltip>
        );
    }, { noop: true }),

    renderIcon: ErrorBoundary.wrap(({ session, DeviceIcon }: { session: Session, DeviceIcon: React.ComponentType<any>; }) => {
        const PlatformIcon = GetPlatformIcon(session.client_info.platform);

        return (
            <BlobMask
                isFolder
                style={{ cursor: "unset" }}
                selected={false}
                lowerBadge={
                    <div
                        style={{
                            width: "20px",
                            height: "20px",

                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            overflow: "hidden",

                            borderRadius: "50%",
                            backgroundColor: "var(--interactive-normal)",
                            color: "var(--background-base-lower)",
                        }}
                    >
                        <PlatformIcon width={14} height={14} />
                    </div>
                }
                lowerBadgeSize={{
                    width: 20,
                    height: 20
                }}
            >
                <div
                    className={SessionIconClasses.sessionIcon}
                    style={{ backgroundColor: GetOsColor(session.client_info.os) }}
                >
                    <DeviceIcon size="md" color="currentColor" />
                </div>
            </BlobMask>
        );
    }, { noop: true }),

    async checkNewSessions() {
        const data = await RestAPI.get({
            url: Constants.Endpoints.AUTH_SESSIONS
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

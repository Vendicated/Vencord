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

import "./settings.css";

import { definePluginSettings } from "@api/Settings";
import { useForceUpdater } from "@utils/react";
import { OptionType } from "@utils/types";
import { Button, UserStore } from "@webpack/common";
import User from "discord-types/general/User";

import { NotificationAction } from "./types";
import { tracked, writeTrackedToDataStore } from "./utils";


export default definePluginSettings({
    notifications: {
        type: OptionType.BOOLEAN,
        description: "Sends OS/ Vencord notification when someone comes online",
        default: true
    },
    offlineNotifications: {
        type: OptionType.BOOLEAN,
        description: "Notifies you when a friend goes offline",
        default: false
    },
    onlineNotifications: {
        type: OptionType.BOOLEAN,
        description: "Notifies you when a friend comes online",
        default: true
    },
    statusTextNotifications: {
        type: OptionType.BOOLEAN,
        description: "Notifies you when a friend changes their custom status",
        default: false
    },
    notificationAction: {
        type: OptionType.SELECT,
        description: "What should happen when you click a notification?",
        options: [
            {
                label: "Open DM",
                value: "open" as NotificationAction
            },
            {
                label: "Open Profile",
                value: "profile" as NotificationAction
            },
            {
                label: "Dismiss",
                value: "dismiss" as NotificationAction
            }
        ],
        default: "open" as NotificationAction
    },
    // TODO hook into the settings field and fix
    // UB of Save & Close saving this info to
    // the settings.json file. This should be done
    // so that all users can be stored to the cloud
    tracking: {
        type: OptionType.COMPONENT,
        description: "People that should be tracked",
        component: () => {
            const updater = useForceUpdater();
            const ids = Array.from(tracked.keys());
            // If they aren't a friend, you cannot access this data.
            // Therefore, a check has to be done and data has to be cleaned
            const users = ids
                .reduce((acc, curId) => {
                    const user = UserStore.getUser(curId);
                    // If user is ok, then ignore
                    if (typeof user !== "undefined") {
                        return acc.concat(user);
                    }

                    // If user object doesn't exist, remove
                    tracked.delete(curId);
                    return acc;
                }, [] as User[]);

            if (users.length === 0) {
                return <div>
                    <span className="friend-notifications-settings-info">
                        You don't have anyone added to your friend notifications
                    </span>
                </div>;
            }

            return <div>{
                users.map(user => {
                    return <div key={user.id} className="friend-notifications-settings">
                        <span className="friend-notifications-settings-username">
                            {user.username}<span className="friend-notifications-settings-discriminator">
                                #{user.discriminator}
                            </span>
                        </span>
                        <Button className="friend-notifications-settings-delete" onClick={async () => {
                            tracked.delete(user.id);
                            // Persist data
                            await writeTrackedToDataStore();

                            // Force re-render
                            updater();
                        }}>
                            DELETE
                        </Button>
                    </div>;
                })
            }</div>;
        }
    },
});

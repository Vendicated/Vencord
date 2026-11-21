/*
* Vencord, a Discord client mod
* Copyright (c) 2026 Vendicated and contributors*
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { GuildFolder } from "@vencord/discord-types";
import { UserNotificationSetting } from "@vencord/discord-types/enums";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu, showToast, UserGuildSettingsStore } from "@webpack/common";

export const SortedGuildStore = findStoreLazy("SortedGuildStore");
const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");

const contextMenuOptions = (children, props) => {
    if (props.folderId) {
        const folder: GuildFolder = SortedGuildStore.getGuildFolderById(props.folderId);

        children.push(
            <Menu.MenuSeparator />,
        );
        if (folder.guildIds.find(guildId => !UserGuildSettingsStore.isMuted(guildId))) {
            children.push(
                <Menu.MenuItem
                    id="vc-folderNotifications-muteFolder"
                    label="Mute Folder"
                    action={() => {
                        let guildsMuted = 0;
                        folder.guildIds.forEach(guildId => {
                            if (!UserGuildSettingsStore.isMuted(guildId)) {
                                updateGuildNotificationSettings(guildId, { muted: true });
                                guildsMuted += 1;
                            };
                        });
                        showToast({
                            text: `Muted ${guildsMuted} servers in ${folder.folderName ?? "1 folder"}`,
                            variant: guildsMuted > 0 ? "success" : "default"
                        });
                    }}
                />
            );
        };
        if (folder.guildIds.find(guildId => UserGuildSettingsStore.isMuted(guildId))) {
            children.push(
                <Menu.MenuItem
                    id="vc-folderNotifications-unmuteFolder"
                    label="Unmute Folder"
                    action={() => {
                        let guildsUnmuted = 0;
                        folder.guildIds.forEach(guildId => {
                            if (UserGuildSettingsStore.isMuted(guildId)) {
                                updateGuildNotificationSettings(guildId, { muted: false });
                                guildsUnmuted += 1;
                            };
                        });
                        showToast({
                            text: `Unmuted ${guildsUnmuted} servers in ${folder.folderName ?? "1 folder"}`,
                            variant: guildsUnmuted > 0 ? "success" : "default"
                        });
                    }}
                />
            );
        }


        const firstNotifSetting = UserGuildSettingsStore.getMessageNotifications(folder.guildIds[0]);
        const singleNotifSetting = folder.guildIds.every(guildId => {
            return UserGuildSettingsStore.getMessageNotifications(guildId) === firstNotifSetting;
        });
        let notifSetting = singleNotifSetting ? firstNotifSetting : undefined;
        const changeNotifSetting = (target: UserNotificationSetting, folder: GuildFolder) => {
            let guildsChanged = 0;
            folder.guildIds.forEach(guildId => {
                if (UserGuildSettingsStore.getMessageNotifications(guildId) !== target) {
                    updateGuildNotificationSettings(guildId, { message_notifications: target });
                    guildsChanged += 1;
                }
            });
            notifSetting = target;
            showToast({
                text: `Updated notification settings for ${guildsChanged} servers in ${folder.folderName ?? "1 folder"}`,
                variant: guildsChanged > 0 ? "success" : "default"
            });
        };


        const firstSuppressEveryone = UserGuildSettingsStore.isSuppressEveryoneEnabled(folder.guildIds[0]);
        const singleSuppressEveryone = folder.guildIds.every(guildId => {
            return UserGuildSettingsStore.isSuppressEveryoneEnabled(guildId) === firstSuppressEveryone;
        });
        let suppressEveryone = singleSuppressEveryone ? firstSuppressEveryone : false;

        const firstSuppressRoles = UserGuildSettingsStore.isSuppressRolesEnabled(folder.guildIds[0]);
        const singleSuppressRoles = folder.guildIds.every(guildId => {
            return UserGuildSettingsStore.isSuppressRolesEnabled(guildId) === firstSuppressRoles;
        });
        let suppressRoles = singleSuppressRoles ? firstSuppressRoles : false;

        const toggleSuppression = (type: "everyone" | "role", folder: GuildFolder) => {
            let guildsChanged = 0;
            switch (type) {
                case "everyone":
                    folder.guildIds.forEach(guildId => {
                        if (UserGuildSettingsStore.isSuppressEveryoneEnabled(guildId) !== !suppressEveryone) {
                            updateGuildNotificationSettings(guildId, { suppress_everyone: !suppressEveryone });
                            guildsChanged += 1;
                        }
                    });
                    suppressEveryone = !suppressEveryone;
                    break;

                case "role":
                    folder.guildIds.forEach(guildId => {
                        if (UserGuildSettingsStore.isSuppressRolesEnabled(guildId) !== !suppressRoles) {
                            updateGuildNotificationSettings(guildId, { suppress_roles: !suppressRoles });
                            guildsChanged += 1;
                        }
                    });
                    suppressRoles = !suppressRoles;
                    break;
            }

            showToast({
                text: `Updated suppression settings for ${guildsChanged} servers in ${folder.folderName ?? "1 folder"}`,
                variant: guildsChanged > 0 ? "success" : "default"
            });
        };


        children.push(
            <Menu.MenuItem id="vc-folderNotifications-notificationSettings" label="Notification Settings">
                <Menu.MenuRadioItem
                    id="vc-folderNotifications-allMessages"
                    group="notificationType"
                    label="All Messages"
                    checked={notifSetting === 0}
                    action={() => changeNotifSetting(0, folder)} />
                <Menu.MenuRadioItem
                    id="vc-folderNotifications-onlyMentions"
                    group="notificationType"
                    label="Only @mentions"
                    checked={notifSetting === 1}
                    action={() => changeNotifSetting(1, folder)} />
                <Menu.MenuRadioItem
                    id="vc-folderNotifications-nothing"
                    group="notificationType"
                    label="Nothing" checked={notifSetting === 2}
                    action={() => changeNotifSetting(2, folder)} />

                <Menu.MenuSeparator />

                <Menu.MenuCheckboxItem
                    id="vc-folderNotifications-suppressEveryone"
                    label="Suppress @everyone and @here"
                    checked={suppressEveryone}
                    action={() => toggleSuppression("everyone", folder)}
                />
                <Menu.MenuCheckboxItem
                    id="vc-folderNotifications-suppressRoleMentions"
                    label="Suppress @role mentions"
                    checked={suppressRoles}
                    action={() => toggleSuppression("role", folder)}
                />
            </Menu.MenuItem>
        );
    }
};

export default definePlugin({
    name: "FolderNotificationSettings",
    description: "Adds notification settings to folders for bulk changes",
    authors: [Devs.rusk],

    contextMenus: {
        "guild-context": contextMenuOptions,
    }
});

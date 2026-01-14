/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { EyeIcon } from "@components/Icons";
import SettingsPlugin, { settingsSectionMap } from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { Data } from "./components/data";
import DataUI from "./components/ui";

export default definePlugin({
    name: "IRememberYou",
    description: "Locally saves everyone you've been communicating with (including servers), in case of lose",
    authors: [EquicordDevs.zoodogood, EquicordDevs.keyages],
    dependencies: ["MessageEventsAPI"],

    patches: [],

    async start() {
        const { customEntries, customSections } = SettingsPlugin;

        customEntries.push({
            key: "equicord_i_remember_you",
            title: "I Remember You",
            Component: () => <DataUI usersCollection={data.usersCollection} />,
            Icon: EyeIcon
        });

        customSections.push(() => ({
            section: "EquicordIRememberYou",
            label: "IRememberYou",
            element: () => <DataUI plugin={this} usersCollection={data.usersCollection} />,
            id: "IRememberYou"
        }));

        settingsSectionMap.push(["EquicordIRememberYou", "equicord_i_remember_you"]);

        const data = (this.dataManager = await new Data().withStart());

        await data.initializeUsersCollection();
        data.writeGuildsOwnersToCollection();
        data.writeMembersFromUserGuildsToCollection();
        data._onMessagePreSend_preSend = addMessagePreSendListener(
            data.onMessagePreSend.bind(data)
        );
        data.storageAutoSaveProtocol();
    },

    stop() {
        const dataManager = this.dataManager as Data;
        const { customEntries, customSections } = SettingsPlugin;
        const entry = customEntries.findIndex(entry => entry.key === "equicord_i_remember_you");
        const section = customSections.findIndex(section => section({} as any).id === "IRememberYou");
        if (entry !== -1) customEntries.splice(entry, 1);
        if (section !== -1) customSections.splice(section, 1);

        removeMessagePreSendListener(dataManager._onMessagePreSend_preSend);
        clearInterval(dataManager._storageAutoSaveProtocol_interval);
    },
});

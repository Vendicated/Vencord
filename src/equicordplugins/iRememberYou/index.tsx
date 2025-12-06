/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { EyeIcon } from "@components/Icons";
import SettingsPlugin from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

import { Data } from "./components/data";
import DataUI from "./components/ui";

export default definePlugin({
    name: "IRememberYou",
    description: "Locally saves everyone you've been communicating with (including servers), in case of lose",
    authors: [EquicordDevs.zoodogood],
    dependencies: ["MessageEventsAPI"],

    patches: [],

    async start() {
        const customEntriesSections = SettingsPlugin.customEntries;
        customEntriesSections.push({
            key: "i_remember_you",
            title: "I Remember You",
            Component: () => <DataUI usersCollection={data.usersCollection} />,
            Icon: EyeIcon
        });

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
        const customEntriesSections = SettingsPlugin.customEntries;
        const i = customEntriesSections.findIndex(entry => entry.key === "i_remember_you");
        if (i !== -1) customEntriesSections.splice(i, 1);

        removeMessagePreSendListener(dataManager._onMessagePreSend_preSend);
        clearInterval(dataManager._storageAutoSaveProtocol_interval);
    },
});

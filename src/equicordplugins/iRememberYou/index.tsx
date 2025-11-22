/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import settings from "@plugins/_core/settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, } from "@webpack/common";

import { Data } from "./components/data";
import { DataUI } from "./components/ui";

export default definePlugin({
    name: "IRememberYou",
    description: "Locally saves everyone you've been communicating with (including servers), in case of lose",
    authors: [EquicordDevs.zoodogood],
    dependencies: ["MessageEventsAPI"],

    patches: [],

    async start() {
        const data = (this.dataManager = await new Data().withStart());

        await data.initializeUsersCollection();
        data.writeGuildsOwnersToCollection();
        data.writeMembersFromUserGuildsToCollection();
        data._onMessagePreSend_preSend = addMessagePreSendListener(
            data.onMessagePreSend.bind(data)
        );
        data.storageAutoSaveProtocol();

        const customSettingsSections = (
            settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        customSettingsSections.push(_ => ({
            section: "iremeberyou.display-data",
            label: "IRememberYou",
            id: "IRememberYou",
            element: () => <DataUI plugin={this} usersCollection={data.usersCollection} />
        }));
    },

    stop() {
        const dataManager = this.dataManager as Data;
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;
        const i = customSettingsSections.findIndex(s => s({}).id === "IRememberYou");
        if (i !== -1) customSettingsSections.splice(i, 1);

        removeMessagePreSendListener(dataManager._onMessagePreSend_preSend);
        clearInterval(dataManager._storageAutoSaveProtocol_interval);
    },
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";

import SettingsComponent from "./settings";

export type UserEntry = [userId: string, startTime: string, endTime: string];

let data: UserEntry[] = [];

const settings = definePluginSettings({
    users: {
        type: OptionType.COMPONENT,
        description: "Configure users and their bedtimes",
        component: props => <SettingsComponent data={data} setValue={props.setValue} />,
        onChange: async newData => {
            await DataStore.set("vc-bedtimes-data", newData);
            data = newData;
        }
    },
});

export default definePlugin({
    name: "Bedtimes",
    description: "Silence messages in DMs when it's past a user's bedtime.",
    authors: [Devs.Basil],
    settings,

    async start() {
        data = await DataStore.get<UserEntry[]>("vc-bedtimes-data").then(e => e ?? []);

        this.listener = addPreSendListener((cId, msg) => {
            const channel = ChannelStore.getChannel(cId);

            if (!channel.isDM()) return;

            const targetId = channel.recipients[0];
            const user = data.find(([id]) => targetId === id);

            // Only run if this is a user we've configured a bedtime for
            if (!user) return;

            // Validate whether or not the bedtime is active

            // TODO: A future improvement might be to automatically adjust the times when the user changes their timezone,
            // or to store it as UTC
            const startTime = user[1];
            const endTime = user[2];
            const d = new Date();
            const currentTime =
                d.getHours().toString().padStart(2, "0")
                + ":"
                + d.getMinutes().toString().padStart(2, "0");

            // This will be the case if we don't wrap around after midnight
            if (endTime > startTime) {
                if (!(startTime < currentTime && currentTime < endTime)) return;
            }
            // We need different logic for wrapping around midnight
            else if (!(
                startTime < currentTime
                    ? (currentTime <= "23:59")
                    : (currentTime < endTime)
            )) return;

            msg.content = "@silent " + msg.content;
        });
    },

    stop() {
        removePreSendListener(this.listener);
    },
});

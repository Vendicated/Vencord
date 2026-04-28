/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ApplicationCommandInputType, ApplicationCommandOptionType, sendBotMessage } from "@api/Commands";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI } from "@webpack/common";

const HOUSES = {
    0: "None",
    1: "Bravery",
    2: "Brilliance",
    3: "Balance"
} as const;

const settings = definePluginSettings({
    currentHouse: {
        type: OptionType.SELECT,
        description: "Your current HypeSquad house",
        options: [
            { label: "Remove Badge", value: 0, default: true },
            { label: "House Bravery", value: 1 },
            { label: "House Brilliance", value: 2 },
            { label: "House Balance", value: 3 }
        ],
        onChange: async (newValue: number) => {
            await applyHouse(newValue);
        }
    }
});

async function applyHouse(houseId: number) {
    try {
        if (houseId === 0) {
            await RestAPI.del({ url: "/hypesquad/online" });
            sendBotMessage(1, { content: "✅ HypeSquad badge removed" });
            return;
        }

        if (![1, 2, 3].includes(houseId)) {
            sendBotMessage(1, { content: "❌ Invalid house ID. Use 0 (remove), 1 (Bravery), 2 (Brilliance), or 3 (Balance)" });
            return;
        }

        await RestAPI.post({
            url: "/hypesquad/online",
            body: { house_id: houseId }
        });

        sendBotMessage(1, { content: `✅ HypeSquad set to ${HOUSES[houseId as keyof typeof HOUSES]}` });
    } catch (error) {
        sendBotMessage(1, { content: `❌ Request failed: ${error}` });
    }
}

export default definePlugin({
    name: "rzSquad",
    description: "عشان واحد عزيز علي بس ولا كان ما دريت عنه ",

    authors:[Devs.rz30],
    settings,

    commands: [
        {
            name: "hypesquad",
            description: "Apply or remove your HypeSquad badge",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "house",
                    description: "0: Remove | 1: Bravery | 2: Brilliance | 3: Balance",
                    type: ApplicationCommandOptionType.INTEGER,
                    required: true,
                    choices: [
                        { label: "Remove Badge", value: 0, name: "Remove Badge" },
                        { label: "House Bravery", value: 1, name: "House Bravery" },
                        { label: "House Brilliance", value: 2, name: "House Brilliance" },
                        { label: "House Balance", value: 3, name: "House Balance" }
                    ]
                }
            ],
            execute: async (args, ctx) => {
                const houseId = args[0].value as number;
                settings.store.currentHouse = houseId;
                await applyHouse(houseId);
            }
        }
    ]
});

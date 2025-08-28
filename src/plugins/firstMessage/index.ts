/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { NavigationRouter } from "@webpack/common";

export default definePlugin({
    name: "FirstMessage",
    description: "Quickly find the first message in a channel with /firstmessage!",
    authors: [Devs.sumfall],
    commands: [
        {
            name: "firstmessage",
            description: "Jumps to the first message in this channel",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (options, { channel }) => {
                NavigationRouter.transitionTo(`/channels/${channel.guild_id ?? "@me"}/${channel.id}/${channel.id}`);
            },
        },
    ],
});

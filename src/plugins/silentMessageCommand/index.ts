/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption,RequiredMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SilentMessageCommand",
    description: "Add a command to send an silent message. (`/silent`)",
    authors: [Devs.hvlxh],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "silent",
            description: "Sends a silent message.",
            options: [RequiredMessageOption],
            execute: args => ({
                content: "@silent " + findOption(args, "message")
            }),
        }
    ]
});

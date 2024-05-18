/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption, RequiredMessageOption } from "@api/Commands";
import definePlugin from "@utils/types";

function annoil(input) {
    input = (input).split("").map(char => {
        return `||${char}||`;
    }).join("");
    return input;
}

export default definePlugin({
    name: "Annoiler",
    description: "Makes you send messages with spoilers around every single character. Originally made by Kyza for Powercord, Usage: /annoil",
    authors: [{ name: "vbajs", id: 247403343742369794n }, { name: "Kyza", id: 220584715265114113n }, { name: "luckycanucky", id: 995923917594173440n }],
    dependencies: ["CommandsAPI"],
    commands: [
        {
            name: "annoil",
            description: "Makes you send messages with spoilers around every single character.",
            options: [RequiredMessageOption],
            execute: opts => ({
                content: annoil(findOption(opts, "message", ""))
            }),
        },
    ],
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import managedStyle from "./styles.css?managed";

export default definePlugin({
    name: "FastTypingAnimation",
    authors: [Devs.ThaUnknown],
    description: "Reaplces the CPU-intensive typing dots animation with a fast fully GPU-bound one.",
    tags: ["Utility"],
    patches: [
        {
            find: "dotCycle",
            replacement: {
                match: /width:2\*(\i)\*3\+\1\/2\*2,height:2\*\1,className:/,
                replace: "$&'vc-fast-typing-animation '+",
            }
        }
    ],
    enabledByDefault: true,
    managedStyle
});

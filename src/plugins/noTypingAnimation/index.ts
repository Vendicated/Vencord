/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoTypingAnimation",
    authors: [Devs.AutumnVN],
    description: "Disables the CPU-intensive typing dots animation",
    patches: [{
        find: "dotCycle",
        replacement: {
            // (?=\}=) to make sure we always match a destructuring assignment
            match: /focused(:\i)(?=\}=)/,
            replace: "_focused$1=false"
        }
    }]
});

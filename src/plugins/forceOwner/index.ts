/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";


let ownerClass;
let originalIsOwner;

export default definePlugin({
    name: "ForceOwner",
    description: "Makes your client disable permissions checks, may cause bugs.",
    authors: [Devs.ryfterwastaken],


    start() {
        ownerClass = findByPropsLazy("isOwner");
        originalIsOwner = ownerClass.__proto__.isOwner;
        ownerClass.__proto__.isOwner = () => true;
    },
    stop() {
        ownerClass.__proto__.isOwner = originalIsOwner;
    }
});

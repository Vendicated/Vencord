/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import style from "./style.css?managed";

export default definePlugin({
    name: "BetterUserArea",
    description: "Reworks the user area styling to fit more buttons and overall look nicer",
    authors: [Devs.Samwich],
    patches: [{
        find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
        replacement:
            [
                // add a custom class to make things easier
                {
                    match: /className:(\i.container),/,
                    replace: "className: `${$1} vc-userAreaStyles`,"
                },
            ]
    }],
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    }
});

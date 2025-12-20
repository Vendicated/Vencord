/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MessageAccessoriesAPI",
    description: "API to add message accessories.",
    authors: [Devs.Cyn],
    patches: [
        {
            find: "#{intl::REMOVE_ATTACHMENT_BODY}",
            replacement: {
                match: /(?<=.container\)?,children:)(\[.+?\])/,
                replace: "Vencord.Api.MessageAccessories._modifyAccessories($1,this.props)",
            },
        },
    ],
});

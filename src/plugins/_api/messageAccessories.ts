/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
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
            find: ".Messages.REMOVE_ATTACHMENT_BODY",
            replacement: {
                match: /(.container\)?,children:)(\[[^\]]+\])(}\)\};return)/,
                replace: (_, pre, accessories, post) =>
                    `${pre}Vencord.Api.MessageAccessories._modifyAccessories(${accessories},this.props)${post}`,
            },
        },
    ],
});

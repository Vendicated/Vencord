/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "HeaderBarAPI",
    description: "API to add buttons to the header bar and channel toolbar.",
    authors: [EquicordDevs.Prism],

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=\i\.Fragment,\{children:\[.{1,500}className:\i\}\))(?=\])/,
                replace: ",...Vencord.Api.HeaderBar._addHeaderBarButtons()"
            }
        },
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: {
                match: /(?<=renderHeaderToolbar",\(\)=>\{.{1,200}let (\i)=\[\];)/,
                replace: "Vencord.Api.HeaderBar._addChannelToolbarButtons($1);"
            }
        }
    ]
});

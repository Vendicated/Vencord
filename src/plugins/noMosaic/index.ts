/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const settings = definePluginSettings({
    inlineVideo: {
        description: "Play videos without carousel modal",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoMosaic",
    authors: [Devs.AutumnVN],
    description: "Removes Discord image mosaic",
    tags: ["Media", "Appearance", "Chat"],
    searchTerms: ["image", "mosaic", "media"],

    settings,

    patches: [
        {
            find: '"PLAINTEXT_PREVIEW":"OTHER"',
            replacement: {
                match: /"IMAGE"===\i\|\|"VIDEO"===\i\|\|"CLIP"===\i/,
                replace: "(false)"
            }
        },
        {
            find: "return{visualMediaItems:",
            replacement: {
                match: /return{visualMediaItems:.+?props:(\i)(?=.{0,20}?\1\.item\.uniqueId)/,
                replace: '$&,useFullWidth:["IMAGE","VIDEO","CLIP"].includes($1.item?.type)?false:undefined'
            }
        },
        {
            find: "renderAttachments(",
            predicate: () => settings.store.inlineVideo,
            replacement: {
                // Sets some properties on the media item before returning it. We don't want these properties, so
                // we return early if the content type is not an image
                //
                // return item.openInMediaViewer=callbacks[url], item.onClick=callbacks2[url], i
                match: /url:(\i)\.url\}\);(?=return (\i)\.onOpenInMediaViewer.{0,100}?,\2\})/,
                replace: "$&if(!$1.content_type?.startsWith('image/'))return $2;"
            }
        },
    ]
});

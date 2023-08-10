/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoScreensharePreview",
    description: "Disables screenshare previews from being sent.",
    authors: [Devs.Nuckyz],
    patches: [
        {
            find: '("ApplicationStreamPreviewUploadManager")',
            replacement: [
                String.raw`\i\.\i\.makeChunkedRequest\(`,
                String.raw`\i\.\i\.post\({url:`
            ].map(match => ({
                match: new RegExp(String.raw`(?=return\[(\d),${match}\i\.\i\.STREAM_PREVIEW.+?}\)\];)`),
                replace: (_, code) => `return[${code},Promise.resolve({body:"",status:204})];`
            }))
        }
    ]
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { classes } from "@utils/misc";
import definePlugin, { PluginNative } from "@utils/types";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { Clickable } from "@webpack/common";

const Native = VencordNative.pluginHelpers.DirectFileDownload as PluginNative<typeof import("./native")>;

const AttachmentButton = findComponentByCodeLazy("__unsupportedReactNodeAsText", "caretConfig");
const ButtonWrapperClasses = findCssClassesLazy("hoverButton", "hoverButtonGroup");

function saveAttachment(downloadURL: string) {
    Native.saveAttachment(downloadURL).catch(() => VencordNative.native.openExternal(downloadURL));
}

export default definePlugin({
    name: "DirectFileDownload",
    description: "Directly download files from Discord instead of opening them in the browser",
    authors: [Devs.imnotplayinginreallife],

    patches: [
        {
            find: '},"download"));',
            replacement: {
                match: /(\i&&!\i&&\i\.push\()\(0(.*?)},"download"\)\);/,
                replace: "$1$self.renderDownloadButton(arguments[0]));"
            }
        },
        {
            find: '"plaintext-preview-overflow-menu"',
            replacement: {
                match: /(,action:\(\)=>{)\i\.current\?\.click\(\),\i\(\)}/,
                replace: "$1$self.saveAttachment(arguments[0].url)}"
            }
        }
    ],

    saveAttachment,

    renderDownloadButton: ErrorBoundary.wrap(({ downloadURL }) => (
        <AttachmentButton text={getIntlMessage("DOWNLOAD")}>
            <Clickable
                className={classes(ButtonWrapperClasses.hoverButton)}
                onClick={() => saveAttachment(downloadURL)}
            >
                <svg aria-hidden role="img" width="20" height="20" fill="none" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z" />
                </svg>
            </Clickable>
        </AttachmentButton>
    ), { noop: true })
});

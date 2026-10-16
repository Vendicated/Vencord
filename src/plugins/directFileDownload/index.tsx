/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { IconComponent, PluginNative } from "@utils/types";
import { Tooltip } from "@webpack/common";

const Native = VencordNative.pluginHelpers.DirectFileDownload as PluginNative<typeof import("./native")>;

const DownloadIcon: IconComponent = ({ height = 24, width = 24, className }) => {
    return <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z"></path></svg>;
};

function Download({ downloadURL }: { downloadURL: string }) {
    const url = new URL(downloadURL);
    const filename = url.pathname.split("/").pop() ?? "file.png";
    return (
        <Tooltip text={getIntlMessage("DOWNLOAD")}>
            {props =>
                <Button {...props} size={"iconOnly"} variant="none" onClick={async () => {
                    try {
                        await Native.saveAttachment(downloadURL);
                    } catch (e) {
                        new Logger("DirectFileDownload").error("Failed to save attachment", e);
                        return window.open(downloadURL);
                    }
                }} className={"vc-directFileDownload-download-button"}>
                    <DownloadIcon aria-hidden />
                </Button>
            }
        </Tooltip>
    );
}

export default definePlugin({
    name: "DirectFileDownload",
    description: "Directly download files from Discord without needing to open browser",
    authors: [Devs.imnotplayinginreallife],

    patches: [
        {
            find: '},"download"));',
            replacement: {
                match: /(\i&&!\i&&\i\.push\()\(0(.*?)},"download"\)\);/,
                replace: "$1$self.Download(arguments[0].downloadURL));"
            }
        }
    ],
    Download(downloadURL: string) {
        return <Download downloadURL={downloadURL}/>;
    }
});

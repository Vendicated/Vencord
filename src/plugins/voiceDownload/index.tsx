/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin, { PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.VoiceDownload as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "VoiceDownload",
    description: "Adds a download to voice messages.",
    authors: [Devs.puv, Devs.sobek],
    patches: [
        {
            find: "rippleContainer,children",
            replacement: {
                match: /\(0,\i\.jsx\).{0,150},children:.{0,50}\("source",{src:(\i)}\)}\)/,
                replace: "[$&, $self.renderDownload($1)]"
            }
        }
    ],

    renderDownload(src: string) {
        return (
            <a
                className="vc-voice-download"
                href={src}
                onClick={async e => {
                    e.stopPropagation();
                    if (IS_DISCORD_DESKTOP) {
                        const { canceled, filePath } = await Native.showDialog();
                        if (!canceled) {
                            Native.saveFile(filePath!, src);
                        }
                    }
                }}
                aria-label="Download voice message"
                {...!IS_DISCORD_DESKTOP
                && { download: "voice-message.ogg" } // download directly (not supported on discord desktop)
                }
            >
                <this.Icon />
            </a>
        );
    },

    Icon: () => (
        <svg
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
        >
            <path
                d="M12 2a1 1 0 0 1 1 1v10.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V3a1 1 0 0 1 1-1ZM3 20a1 1 0 1 0 0 2h18a1 1 0 1 0 0-2H3Z"
            />
        </svg>
    ),
});

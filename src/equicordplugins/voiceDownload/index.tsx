/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "VoiceDownload",
    description: "Download voice messages.",
    authors: [Devs.puv],
    patches: [
        {
            find: ".rippleContainer",
            replacement: {
                match: /\(0,i.jsx\).{0,150},children:.{0,50}\("source",{src:(.{1,2})}\)}\)/,
                replace: "[$&, $self.renderDownload($1)]"
            }
        }
    ],

    renderDownload: function (src) {
        return (
            <ErrorBoundary>
                <a
                    className="voice-download"
                    href={src}
                    target="_blank"
                    onClick={e => e.stopPropagation()}
                > <this.Icon /> </a>
            </ErrorBoundary>
        );
    },

    Icon: () => (
        <svg
            className="icon"
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

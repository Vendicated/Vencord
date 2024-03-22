import "./style.css";

import { Devs } from "@utils/constants";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "VoiceDownload",
    description: "Download voice messages.",
    authors: [Devs.puv],
    patches: [
        {
            find: "className:C.rippleContainer",
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
                    className="voiceDownload"
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

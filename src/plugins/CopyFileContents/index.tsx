import "./style.css";

import definePlugin from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { Clipboard, showToast, Toasts, Tooltip, useState } from "@webpack/common";
import { CopyIcon, NoEntrySignIcon } from "@components/Icons";
import { Devs } from "@utils/constants";

const CheckMarkIcon = () => {
    return <svg aria-hidden="true" width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path fill="currentColor" d="M21.7 5.3a1 1 0 0 1 0 1.4l-12 12a1 1 0 0 1-1.4 0l-6-6a1 1 0 1 1 1.4-1.4L9 16.58l11.3-11.3a1 1 0 0 1 1.4 0Z"></path>
    </svg>;
};

export default definePlugin({
    name: "CopyFileContents",
    description: "Adds a button to copy text file attachment contents.",
    authors: [Devs.Obsidian, Devs.Nuckyz],
    patches: [
        {
            find: ".Messages.PREVIEW_BYTES_LEFT.format(",
            replacement: {
                match: /\.footerGap.+?url:\i,fileName:\i,fileSize:\i}\),(?<=fileContents:(\i),bytesLeft:(\i).+?)/g,
                replace: "$&$self.AddCopyButton({ fileContents: $1, bytesLeft: $2 }),"
            }
        }
    ],
    AddCopyButton: ErrorBoundary.wrap(({ fileContents, bytesLeft }: { fileContents: string, bytesLeft: number; }) => {
        const [recentlyCopied, setRecentlyCopied] = useState(false);
        return (
            <Tooltip text={recentlyCopied ? "Copied!" : bytesLeft > 0 ? "File too large to copy" : "Copy File Contents"}>
                {(tooltipProps) => (
                    <div
                        {...tooltipProps}
                        className="vc-cfc-button"
                        role="button"
                        onClick={() => {
                            if (bytesLeft <= 0) {
                                Clipboard.copy(fileContents);
                                setRecentlyCopied(true);
                            }
                        }}
                    >
                        {recentlyCopied ? <CheckMarkIcon /> : bytesLeft > 0 ? <NoEntrySignIcon color="var(--channel-icon)" /> : <CopyIcon />}
                    </div>
                )}
            </Tooltip>
        );
    }, { noop: true }),
});

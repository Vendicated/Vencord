/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

const settings = definePluginSettings({
    loop: {
        description: "Whether to make the PiP video loop or not",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    },
    replaceStreams: {
        description: "Whether to replace discord's shitty stream pip with electron's or not",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "PictureInPicture",
    description: "Adds picture in picture to videos (next to the Download button)",
    authors: [Devs.Lumap],
    settings,

    patches: [
        {
            find: ".onRemoveAttachment,",
            replacement: {
                match: /\.nonMediaAttachment,!(\i).{0,7}children:\[(\i),/,
                replace: "$&$1&&$2&&$self.renderPiPButton(),"
            },
        },
        {
            find: ".pictureInPictureVideo,",
            predicate: () => settings.store.replaceStreams,
            replacement: {
                match: /onMouseLeave:\i,/,
                replace: "$&style:{display:\"none\"},"
            }
        },
        {
            find: ".pictureInPictureVideo,",
            predicate: () => settings.store.replaceStreams,
            replacement: {
                match: /"innerClassName"\]\);/,
                replace: "$&setTimeout($self.enableStreamPiP,100);"
            }
        }
    ],

    renderPiPButton: ErrorBoundary.wrap(() => {
        return (
            <Tooltip text="Toggle Picture in Picture">
                {tooltipProps => (
                    <div
                        {...tooltipProps}
                        role="button"
                        style={{
                            cursor: "pointer",
                            paddingTop: "4px",
                            paddingLeft: "4px",
                            paddingRight: "4px",
                        }}
                        onClick={e => {
                            const video = e.currentTarget.parentNode!.parentNode!.querySelector("video")!;
                            const videoClone = document.body.appendChild(video.cloneNode(true)) as HTMLVideoElement;

                            videoClone.loop = settings.store.loop;
                            videoClone.style.display = "none";
                            videoClone.onleavepictureinpicture = () => videoClone.remove();

                            function launchPiP() {
                                videoClone.currentTime = video.currentTime;
                                videoClone.requestPictureInPicture();
                                video.pause();
                                videoClone.play();
                            }

                            if (videoClone.readyState === 4 /* HAVE_ENOUGH_DATA */)
                                launchPiP();
                            else
                                videoClone.onloadedmetadata = launchPiP;
                        }}
                    >
                        <svg width="24px" height="24px" viewBox="0 0 24 24">
                            <path
                                fill="var(--interactive-normal)"
                                d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h8zm-1 2h-6v4h6v-4z"
                            />
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
    }, { noop: true }),
    enableStreamPiP: () => {
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                const removedNode = (Array.from(mutation.removedNodes)[0]) as HTMLElement;
                console.log(removedNode);
                if (removedNode?.classList?.[0]?.startsWith("pictureInPictureWindow-") || removedNode?.classList?.[0]?.startsWith("video-") && removedNode.querySelector(".media-engine-video")) {
                    document.exitPictureInPicture();
                    observer.disconnect();
                }
            });
        });
        observer.observe(document, { childList: true, subtree: true });

        const video = document.querySelector(".media-engine-video")!.querySelector("video")!;
        if (video.readyState === 4)
            video.requestPictureInPicture();
        else
            video.onloadedmetadata = () => video.requestPictureInPicture();
    }
});

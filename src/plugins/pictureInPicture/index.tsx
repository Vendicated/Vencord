/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Tooltip } from "@webpack/common";

const settings = definePluginSettings({
    loop: {
        description: "Whether to make the PiP video loop or not",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: false
    }
});

export default definePlugin({
    name: "PictureInPicture",
    description: "Adds picture in picture to videos (next to the Download button)",
    tags: ["Media", "Utility"],
    authors: [Devs.Lumap],
    settings,
    patches: [
        {
            find: '["VIDEO","CLIP","AUDIO"]',
            replacement: {
                match: /(\[\i>0&&\i\.length>0.{0,150}?children:)(\i.slice\(\i\))(?<=showDownload:(\i).+?isVisualMediaType:(\i).+?)/,
                replace: (_, rest, origChildren, showDownload, isVisualMediaType) => `${rest}[${showDownload}&&${isVisualMediaType}&&$self.PictureInPictureButton(),...${origChildren}]`
            }
        }
    ],

    PictureInPictureButton: ErrorBoundary.wrap(() => {
        return (
            <Tooltip text="Toggle Picture in Picture">
                {tooltipProps => (
                    <div
                        {...tooltipProps}
                        className="vc-pip-button"
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

                            let cleaned = false;
                            function cleanup() {
                                if (cleaned) return;
                                cleaned = true;

                                const { currentTime } = videoClone;

                                videoClone.onloadedmetadata = null;
                                videoClone.onleavepictureinpicture = null;

                                videoClone.pause();
                                videoClone.removeAttribute("src");
                                videoClone.load();
                                videoClone.remove();

                                // resume original if still in the document
                                if (video.isConnected) {
                                    video.currentTime = currentTime;
                                    video.play().catch(() => 0);
                                }
                            }

                            videoClone.onleavepictureinpicture = cleanup;

                            async function launchPiP() {
                                try {
                                    videoClone.currentTime = video.currentTime;
                                    video.pause();
                                    await videoClone.play();
                                    await videoClone.requestPictureInPicture();
                                } catch (err) {
                                    console.error("Failed to enter Picture-in-Picture", err);
                                    cleanup();
                                }
                            }

                            if (videoClone.readyState >= 1)
                                launchPiP();
                            else
                                videoClone.onloadedmetadata = launchPiP;
                        }}
                    >
                        <svg width="24px" height="24px" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h8zm-1 2h-6v4h6v-4z"
                            />
                        </svg>
                    </div>
                )}
            </Tooltip>
        );
    }, { noop: true })
});

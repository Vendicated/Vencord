/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings, Settings } from "@api/Settings";
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
    }
});

export default definePlugin({
    name: "PictureInPicture",
    description: "Adds picture in picture to videos (next to the Download button)",
    authors: [Devs.Lumap],
    settings: settings,
    patches: [
        {
            find: ".onRemoveAttachment,",
            replacement: {
                match: /\.nonMediaAttachment.{0,10}children:\[(\i),/,
                replace: "$&$1&&$self.renderPiPButton(),"
            },
        },
    ],
    renderPiPButton() {
        return <ErrorBoundary noop>
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
                            const oldVid = e.currentTarget.parentNode!.parentNode!.querySelector("video")!; // Get the video corresponding to the download/pip/remove attachment buttons
                            const newVid = document.body.appendChild(oldVid.cloneNode(true)) as HTMLVideoElement;
                            if (Settings.plugins.PictureInPicture.loop) newVid.style.display = "none"; // The two lines above create a video element on the body. This allows videos to still be played in PiP even when you switch channels. A display none is required here for the newly created video element to not be visible outside of PiP (from my tests, they'd stretch and cover the entire document)
                            newVid.loop = settings.store.loop;
                            newVid.onleavepictureinpicture = () => {
                                newVid.remove();
                            };
                            function launchPiP() {
                                newVid.requestPictureInPicture();
                                newVid.currentTime = oldVid.currentTime;
                                oldVid.pause();
                                newVid.play();
                            }
                            if (newVid.readyState === 4) { // If the newly created video is instantly considered as loaded, enable PiP
                                launchPiP();
                                return;
                            }
                            newVid.onloadedmetadata = () => { // If the newly created video isn't instantly loaded, wait until it is to launch PiP
                                launchPiP();
                            };
                        }}
                    >
                        <svg width="24px" height="24px" viewBox="0 0 24 24">
                            <path fill="var(--interactive-normal)" d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h8zm-1 2h-6v4h6v-4z" />
                        </svg>
                    </div>
                )}
            </Tooltip >
        </ErrorBoundary>;
    }
});

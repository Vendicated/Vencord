/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, Tooltip } from "@webpack/common";

export default definePlugin({
    name: "PitureInPicture",
    description: "Adds picture in picture to videos (next to the Download button)",
    authors: [Devs.Lumap],
    patches: [{
        find: ".onRemoveAttachment,",
        replacement: {
            match: /\.nonMediaAttachment.{0,10}children:\[(\i),/gm,
            replace: "$&$1&&$self.renderPiPButton(),"
        }
    }],
    renderPiPButton() {
        return <Tooltip text="Toggle Picture in Picture">
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
                        const PiPVideo = e.currentTarget.parentNode!.parentNode!.querySelector("video")!;
                        let newVid = document.createElement("video"); // blame typescript, i have to make it a video tag that wraps another video tag
                        newVid.appendChild(PiPVideo.cloneNode(true)); // cloning nodes just in case it breaks something, even tho it's probably useless
                        newVid = newVid.firstElementChild as HTMLVideoElement;
                        newVid.onleavepictureinpicture = () => {
                            newVid.remove();
                        };
                        newVid.onloadedmetadata = () => {
                            newVid.requestPictureInPicture();
                            newVid.play();
                        };
                    }}
                >
                    <svg width="24px" height="24px" viewBox="0 0 24 24">
                        <path fill="var(--interactive-normal)" d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h8zm-1 2h-6v4h6v-4z" />
                    </svg>
                </div>
            )}
        </Tooltip >;
    }
});

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
            match: /\.nonMediaAttachment.{0,10}children:\[(.),/gm,
            replace: "$&$1&&$self.renderPiPButton(),"
        }
    }],
    renderPiPButton() {
        return <Tooltip text={"Picture in Picture"}>
            {this.PiPButtonContent}
        </Tooltip>;
    },
    PiPButtonContent() {
        return <div
            onClick={e => { // @ts-ignore it thinks parentNode doesn't exist
                e.target.parentNode.parentNode.querySelector("video").requestPictureInPicture();
            }}
            style={{ paddingTop: "3px", paddingLeft: "3px", paddingRight: "3px" }}
        >
            <svg width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: "none" }}>
                <g>
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path fill-rule="nonzero" d="M21 3a1 1 0 0 1 1 1v7h-2V5H4v14h6v2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h18zm0 10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h8zm-1 2h-6v4h6v-4z" />
                </g>
            </svg>
        </div>;
    }
});

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addPreSendListener, removePreSendListener, SendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, useEffect, useState } from "@webpack/common";

let lastState = false;

let style: HTMLStyleElement;
function setCss() {
    style.textContent = `
        .imageWrapper_d4597d img,
        .imageWrapper_d4597d video {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter 0.2s;
        }

        .imageWrapper_d4597d:hover img,
        .imageWrapper_d4597d:hover video,
        .imageWrapper_d4597d [class^=wrapperPlaying] video,
        .imageWrapper_d4597d [class^=wrapperControlsHidden] video,
        .imageWrapper_d4597d:hover [aria-label="GIF"] {
            filter: unset !important; 
        }


    `;
}




function disableCss(){

    style.textContent = `
    .imageWrapper_d4597d img,
    .imageWrapper_d4597d video {
        filter: blur(0px);
        transition: filter 0.2s;
    }

    .imageWrapper_d4597d:hover img,
    .imageWrapper_d4597d:hover video,
    .imageWrapper_d4597d [class^=wrapperPlaying] video,
    .imageWrapper_d4597d [class^=wrapperControlsHidden] video,
    .imageWrapper_d4597d:hover [aria-label="GIF"] {
        filter: unset !important; 
    }


`;
}


const settings = definePluginSettings({
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Whether to persist the state of the blur medias toggle when changing channels",
        default: true,
        onChange(newValue: boolean) {
            if (newValue === false) lastState = false;
        }
    },
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur Amounts",
        default: 10,
        onChange: setCss
    }
});

const BlurMediasToggle: ChatBarButton = ({ isMainChat }) => {
    const [enabled, setEnabled] = useState(lastState);

    function setEnabledValue(value: boolean) {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
        if (enabled) {

            setCss()
        } else {
            disableCss()
        }
    }

    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip={enabled ? "Disable blur medias" : "Enable blur medias"}
            onClick={() => setEnabledValue(!enabled)}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{ scale: "1.2" }}
            >
                <path fill="currentColor" mask="url(#vc-blurmedias-mask)" d="M21,14H20V4h1a1,1,0,0,0,0-2H3A1,1,0,0,0,3,4H4V14H3a1,1,0,0,0,0,2h8v1.15l-4.55,3A1,1,0,0,0,7,22a.94.94,0,0,0,.55-.17L11,19.55V21a1,1,0,0,0,2,0V19.55l3.45,2.28A.94.94,0,0,0,17,22a1,1,0,0,0,.55-1.83l-4.55-3V16h8a1,1,0,0,0,0-2Zm-3,0H6V4H18ZM21,14H20V4h1a1,1,0,0,0,0-2H3A1,1,0,0,0,3,4H4V14H3a1,1,0,0,0,0,2h8v1.15l-4.55,3A1,1,0,0,0,7,22a.94.94,0,0,0,.55-.17L11,19.55V21a1,1,0,0,0,2,0V19.55l3.45,2.28A.94.94,0,0,0,17,22a1,1,0,0,0,.55-1.83l-4.55-3V16h8a1,1,0,0,0,0-2Zm-3,0H6V4H18Z" />
                {!enabled && <>
                    <mask id="vc-blurmedias-mask">
                        <path fill="#fff" d="M0 0h24v24H0Z" />
                        <path stroke="#000" stroke-width="5.99068" d="M0 24 24 0" />
                    </mask>
                    <path fill="var(--status-danger)" d="m21.178 1.70703 1.414 1.414L4.12103 21.593l-1.414-1.415L21.178 1.70703Z" />
                </>}
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "BlurMediasToggle",
    authors: [Devs.walkoud],
    description: "Adds a button to the chat bar to toggle blur medias.",
    dependencies: ["ChatInputButtonAPI"],
    settings,
    patches: [
        {
            find: ".embedWrapper,embed",
            replacement: [{
                match: /\.embedWrapper(?=.+?channel_id:(\i)\.id)/g,
                replace: "$&+($1.nsfw?' img':'')"
            }]
        }
    ],
    start: () => 
    {
        addChatBarButton("BlurMediasToggle", BlurMediasToggle);
        style = document.createElement("style");
        style.id = "VcBlurMedias";
        document.head.appendChild(style);

        setCss();
    },
    stop: () => {
        style?.remove();
        removeChatBarButton("BlurMediasToggle")}
});

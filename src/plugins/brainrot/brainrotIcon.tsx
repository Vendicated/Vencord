/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";

import { BrainrotWindow, cl } from "./randomWindow";

export function BrainIcon({ height = 20, width = 20, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg"
            height={height}
            viewBox="0 -960 960 960"
            width={width}
            className={classes(cl("icon"), className)}>
            <path fill="currentColor" d="M309-389q29 29 71 29t71-29l160-160q29-29 29-71t-29-71q-29-29-71-29t-71 29q-37-13-73-6t-61 32q-25 25-32 61t6 73q-29 29-29 71t29 71ZM240-80v-172q-57-52-88.5-121.5T120-520q0-150 105-255t255-105q125 0 221.5 73.5T827-615l52 205q5 19-7 34.5T840-360h-80v120q0 33-23.5 56.5T680-160h-80v80h-80v-160h160v-200h108l-38-155q-23-91-98-148t-172-57q-116 0-198 81t-82 197q0 60 24.5 114t69.5 96l26 24v208h-80Zm254-360Z" />
        </svg>

    );
}

export function BrainrotOpenButtonChatBar() {
    return (
        <ChatBarButton
            tooltip="Brainrot"
            onClick={e => {
                openModal(props => (
                    <BrainrotWindow rootProps={props} />
                ));
            }
            }
        >
            <BrainIcon></BrainIcon>
        </ChatBarButton >
    );
}

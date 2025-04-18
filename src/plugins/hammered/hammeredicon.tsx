/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";

import { settings } from "./index";

const cl = classNameFactory("vc-hammer-");

export function UwuIcon({ height = 24, width = 24, className, enabled }: { height?: number; width?: number; className?: string; enabled: boolean; }) {
    return (
        <svg
            viewBox="0 0 36 36"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill={enabled ? "#FFC0CB" : "#808388"} d="M29.879 33.879C31.045 35.045 32.9 35.1 34 34s1.045-2.955-.121-4.121L12.121 8.121C10.955 6.955 9.1 6.9 8 8s-1.045 2.955.121 4.121l21.758 21.758z M22 3s-6-3-11 2l-7 7s-1-1-2 0l-1 1s-1 1 0 2l4 4s1 1 2 0l1-1s1-1 0-2l-.078-.078c.77-.743 1.923-1.5 3.078-.922l4-4s-1-3 1-5s3-2 5-2s1-1 1-1z" />

        </svg>
    );
}

export const UwuChatBarIcon: ChatBarButtonFactory = ({ }) => {
    const { autoHammer } = settings.use(["autoHammer"]);

    const toggle = () => {
        const newState = !autoHammer;
        settings.store.autoHammer = newState;
    };

    return (
        <ChatBarButton
            tooltip="Enable/Disable Hammer"
            onClick={() => {
                toggle();
            }}
            onContextMenu={() => toggle()}
            buttonProps={{}}
        >
            <UwuIcon className={cl({ "auto-hammer": autoHammer, "chat-button": true })} enabled={autoHammer} />
        </ChatBarButton>
    );
};

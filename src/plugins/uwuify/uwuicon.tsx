/*
 * Tallycord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { classNameFactory } from "@api/Styles";
import { classes } from "@utils/misc";

import { settings } from "./index";

const cl = classNameFactory("vc-uwu-");

export function UwuIcon({ height = 24, width = 24, className, enabled }: { height?: number; width?: number; className?: string; enabled: boolean; }) {
    return (
        <svg
            viewBox="0 0 22 22"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill={enabled ? "#FFC0CB" : "#808388"} d="M10.8772 0C4.86989 0 0 4.86989 0 10.8772C0 16.8845 4.86989 21.7544 10.8772 21.7544C16.8845 21.7544 21.7544 16.8845 21.7544 10.8772C21.7544 4.8699 16.8845 0 10.8772 0ZM3.79147 10.411C3.79147 9.50135 4.52892 8.7639 5.4386 8.7639C6.34828 8.7639 7.08571 9.50135 7.08571 10.411C7.08571 11.3207 6.34828 12.0582 5.4386 12.0582C4.52892 12.0582 3.79147 11.3207 3.79147 10.411ZM14.8206 10.4386C14.8206 9.52892 15.558 8.79149 16.4677 8.79149C17.3774 8.79149 18.1148 9.52892 18.1148 10.4386C18.1148 11.3483 17.3774 12.0857 16.4677 12.0857C15.558 12.0857 14.8206 11.3483 14.8206 10.4386ZM6.56998 12.943C7.06395 12.696 7.66463 12.8962 7.91162 13.3902L8.04402 13.655C8.36653 14.3 9.24498 14.402 9.70668 13.848L10.249 13.1972C10.439 12.9692 10.7204 12.8374 11.0172 12.8374C11.314 12.8374 11.5954 12.9692 11.7854 13.1972L12.3277 13.848C12.7894 14.402 13.6679 14.3 13.9904 13.655L14.1228 13.3902C14.3698 12.8962 14.9704 12.696 15.4644 12.943C15.9584 13.19 16.1586 13.7906 15.9116 14.2846L15.7792 14.5494C14.862 16.3838 12.446 16.7541 11.0172 15.3718C9.58838 16.7541 7.17236 16.3838 6.25517 14.5494L6.12276 14.2846C5.87577 13.7906 6.076 13.19 6.56998 12.943Z" />

        </svg>
    );
}

export const UwuChatBarIcon: ChatBarButtonFactory = ({ }) => {
    const { autoUwu } = settings.use(["autoUwu"]);

    const toggle = () => {
        const newState = !autoUwu;
        settings.store.autoUwu = newState;
    };

    return (
        <ChatBarButton
            tooltip="Enable/Disable Uwuifier"
            onClick={() => {
                toggle();
            }}
            onContextMenu={() => toggle()}
            buttonProps={{}}
        >
            <UwuIcon className={cl({ "auto-uwu": autoUwu, "chat-button": true })} enabled={autoUwu} />
        </ChatBarButton>
    );
};

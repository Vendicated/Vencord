/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
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

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { TooltipContainer } from "@components/TooltipContainer";
import { classes } from "@utils/misc";
import { IconComponent } from "@utils/types";
import { useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { openBaseConverterModal } from "./BaseConverterModal";
import { cl } from "./utils";

/**
 * Binary bars → arrow → text lines icon.
 * Three vertical bars on the left represent binary digits (tall=1, short=0),
 * a filled arrow points right, and three horizontal lines suggest decoded text.
 */
export const BaseConverterIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        height={height}
        width={width}
        fill="currentColor"
        className={classes(cl("icon"), className)}
    >
        {/* Binary bars: 1 0 1 */}
        <rect x="1"  y="3"  width="2.5" height="18" rx="1" />
        <rect x="5"  y="8"  width="2.5" height="8"  rx="1" />
        <rect x="9"  y="3"  width="2.5" height="18" rx="1" />

        {/* Arrow shaft */}
        <rect x="13.5" y="10.5" width="5" height="1.5" />
        {/* Arrow head (filled triangle) */}
        <polygon points="18.5,8 22,11.25 18.5,14.5" />

        {/* Text lines (decoded content representation) */}
        <rect x="13.5" y="5"  width="9" height="1.5" rx="0.75" />
        <rect x="13.5" y="17" width="7" height="1.5" rx="0.75" />
    </svg>
);

export let setShouldShowAutoEncodeTooltip: undefined | ((show: boolean) => void);

export const BaseConverterChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    const { autoEncodeOutgoing } = settings.use(["autoEncodeOutgoing"]);

    const [shouldShowTooltip, setter] = useState(false);
    useEffect(() => {
        setShouldShowAutoEncodeTooltip = setter;
        return () => { setShouldShowAutoEncodeTooltip = undefined; };
    }, []);

    if (!isMainChat) return null;

    const toggle = () => {
        settings.store.autoEncodeOutgoing = !autoEncodeOutgoing;
    };

    const button = (
        <ChatBarButton
            tooltip={autoEncodeOutgoing ? "Auto-Encode Enabled — click to open settings" : "Open Base Converter"}
            onClick={e => {
                if (e.shiftKey) return toggle();
                openBaseConverterModal();
            }}
            onContextMenu={toggle}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <BaseConverterIcon className={cl({ "auto-encode": autoEncodeOutgoing, "chat-button": true })} />
        </ChatBarButton>
    );

    if (shouldShowTooltip && autoEncodeOutgoing)
        return (
            <TooltipContainer text="Auto-Encode Enabled" forceOpen>
                {button}
            </TooltipContainer>
        );

    return button;
};

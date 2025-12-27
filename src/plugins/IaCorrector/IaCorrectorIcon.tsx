/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2025 Vendicated and contributors
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
import { classes } from "@utils/misc";
import { IconComponent } from "@utils/types";

import { settings } from "./settings";
import { showSuccess } from "./utils";

export const IaCorrectorIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg
        viewBox="0 0 24 24"
        height={height}
        width={width}
        className={className}
        fill="currentColor"
    >
        <path d="M4 4h9v2H6v4h5v2H6v6H4V4Zm11.5 0H20v2h-1.8l-3.7 12H14L17 6H13.5V4Z" />
    </svg>
);

export const IaCorrectorChatBarButton: ChatBarButtonFactory = ({ isMainChat }) => {
    const { autoCorrect } = settings.use(["autoCorrect"]);

    if (!isMainChat) return null;

    const toggleAutoCorrect = () => {
        const enabled = !autoCorrect;
        settings.store.autoCorrect = enabled;
        showSuccess(
            enabled
                ? "IaCorrector enabled: your messages will be corrected before sending."
                : "IaCorrector disabled: your messages will no longer be corrected."
        );
    };

    return (
        <ChatBarButton
            tooltip={autoCorrect ? "Disable auto-correct" : "Enable auto-correct"}
            onClick={toggleAutoCorrect}
            onContextMenu={toggleAutoCorrect}
            buttonProps={{ "aria-label": "IaCorrector" }}
        >
            <IaCorrectorIcon
                className={classes(
                    "vc-iacorrector-icon",
                    autoCorrect ? "vc-iacorrector-on" : "vc-iacorrector-off"
                )}
            />
        </ChatBarButton>
    );
};

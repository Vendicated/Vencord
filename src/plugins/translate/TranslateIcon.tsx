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

import { ChatBarButton } from "@api/ChatButtons";
import { classes } from "@utils/misc";
import { openModal } from "@utils/modal";

import { settings } from "./settings";
import { TranslateModal } from "./TranslateModal";
import { cl } from "./utils";

export function TranslateIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg
            viewBox="0 96 960 960"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill="currentColor" d="m475 976 181-480h82l186 480h-87l-41-126H604l-47 126h-82Zm151-196h142l-70-194h-2l-70 194Zm-466 76-55-55 204-204q-38-44-67.5-88.5T190 416h87q17 33 37.5 62.5T361 539q45-47 75-97.5T487 336H40v-80h280v-80h80v80h280v80H567q-22 69-58.5 135.5T419 598l98 99-30 81-127-122-200 200Z" />
        </svg>
    );
}

export const TranslateChatBarIcon: ChatBarButton = (props, isMainChat) => {
    const { autoTranslate } = settings.use(["autoTranslate"]);

    if (!isMainChat) return null;

    const toggle = () => settings.store.autoTranslate = !autoTranslate;

    return (
        <ChatBarButton
            tooltip="Open Translate Modal"
            onClick={e => {
                if (e.shiftKey) return toggle();

                openModal(props => (
                    <TranslateModal rootProps={props} />
                ));
            }}
            onContextMenu={() => toggle()}
            buttonProps={{
                "aria-haspopup": "dialog",
                style: { padding: "0 4px" }
            }}
        >
            <TranslateIcon className={cl({ "auto-translate": autoTranslate })} />
        </ChatBarButton>
    );
};

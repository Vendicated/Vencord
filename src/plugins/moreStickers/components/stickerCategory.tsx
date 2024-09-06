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

import { cl } from "../utils";

export interface StickerCategoryProps {
    children: React.ReactNode;
    onClick?: () => void;
    isActive: boolean;
    style?: React.CSSProperties;
}

export function StickerCategory(props: StickerCategoryProps) {
    return (
        <div
            style={props.style}
            className={
                cl("sticker-category") +
                (props.isActive ? ` ${cl('sticker-category-active')}` : "")
            }
            tabIndex={0}
            role="button"
            onClick={props.onClick}
        >
            {props.children}
        </div>
    );
}

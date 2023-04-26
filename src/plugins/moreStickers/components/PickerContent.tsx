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

import { Text } from "@webpack/common";

export interface PickerContent {
    query?: string;
}

export const PickerContent = ({ query }: PickerContent) => {
    return (
        <div className="vc-more-stickers-picker-content">
            <Text className={"temporary-text-will-be-removed"}>Search query (debounced): "{query}"</Text>
        </div>
    );
};

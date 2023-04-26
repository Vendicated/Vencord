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


import { PickerSidebar } from "./PickerCategoriesSidebar";


export const PickerBody = () => {
    return (
        <div>
            <PickerSidebar
                categories={new Array(10).fill({
                    packName: "Vencord",
                    packIcon: "https://cdn.discordapp.com/icons/1015060230222131221/d3f7c37d974d6f4f179324d63b86bb1c.webp?size=40"
                }).map((cat, idx) => ({ id: (idx + 1).toString(), ...cat }))}
                onCategorySelect={category => {
                    console.log("Selected category: ", category);
                }}
            />
        </div>
    );
};

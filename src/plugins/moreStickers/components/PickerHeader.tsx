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

import { classNameFactory } from "@api/Styles";
import { TextInput } from "@webpack/common";

import { Header } from "./header";
import { IconContainer } from "./iconContainer";
import { SearchIcon } from "./SearchIcon";

const cl = classNameFactory("vc-more-stickers-");
export const PickerHeader = () => {
    return (
        <Header>
            <div className={cl("picker-container")}>
                <div>
                    <div className={cl("picker-search-box")}>
                        <TextInput
                            placeholder="Search stickers"
                            onChange={(v, n) => console.log(v, n)}
                            style={{ height: "30px" }}
                            autoFocus={true}
                        />
                    </div>
                    <div className={cl("picker-search-icon")}>
                        <IconContainer>
                            <SearchIcon />
                        </IconContainer>
                    </div>
                </div>
            </div>
        </Header>
    );
};

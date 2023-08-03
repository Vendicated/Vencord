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
import { debounce } from "@utils/debounce";
import { React, TextInput } from "@webpack/common";

import { Header } from "./header";
import { IconContainer } from "./iconContainer";
import { CancelIcon, SearchIcon } from "./icons";

const cl = classNameFactory("vc-more-stickers-");

export interface PickerHeaderProps {
    onQueryChange: (query: string) => void;
}

const debounceQueryChange = debounce((cb: Function, ...args: any) => cb(...args), 150);

export const PickerHeader = ({ onQueryChange }: PickerHeaderProps) => {
    const [query, setQuery] = React.useState<string | undefined>();

    const setQueryDebounced = (value: string, immediate = false) => {
        setQuery(value);
        if (immediate) onQueryChange(value);
        else debounceQueryChange(onQueryChange, value);
    };

    return (
        <Header>
            <div className={cl("picker-container")}>
                <div>
                    <div className={cl("picker-search-box")}>
                        <TextInput
                            style={{ height: "30px" }}

                            placeholder="Search stickers"
                            autoFocus={true}
                            value={query}

                            onChange={(value: string) => setQueryDebounced(value)}
                        />
                    </div>
                    <div className={cl("picker-search-icon")}>
                        <IconContainer>
                            {
                                (query && query.length > 0) ?
                                    <CancelIcon className={cl("clear-icon")} width={20} height={20} onClick={() => setQueryDebounced("", true)} /> :
                                    <SearchIcon width={20} height={20} color="var(--text-muted)" />
                            }
                        </IconContainer>
                    </div>
                </div>
            </div>
        </Header>
    );
};

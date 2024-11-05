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

export function CategoryScroller(props: { children: React.ReactNode, categoryLength: number; }) {
    const children = Array.isArray(props.children) ? props.children : [props.children];

    return (
        <div className={cl("category-scroller")}>
            <div>{
                children.map(child => (
                    <div role="listitem">
                        {child}
                    </div>
                ))
            }</div>
            <div style={{ height: `${Math.round(41.75 * (props.categoryLength + 1))}px` }}></div>
            <div aria-hidden="true"></div>
        </div>
    );
}

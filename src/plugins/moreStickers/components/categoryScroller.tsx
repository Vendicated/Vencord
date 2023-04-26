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

import "./categoryScroller.css";

export function CategoryScroller(props: { children: JSX.Element | JSX.Element[]; }) {
    const children = Array.isArray(props.children) ? props.children : [props.children];
    return (
        <div className="categoryScroller" style={{
            overflow: "hidden scroll",
            paddingRight: "0",
            height: "100%",
            position: "relative",
            boxSizing: "border-box",
            minHeight: "0",
            flex: "1 1 auto",
        }}>
            <div style={{
                inset: "8px",
                contain: "layout",
                position: "absolute"
            }}>
                {
                    children.map(child => (
                        <div role="listitem" aria-setsize={children.length} aria-posinset={0}>
                            {child}
                        </div>
                    ))
                }
            </div>
            <div style={{
                height: "1753px"
            }}></div>
            <div aria-hidden="true" style={{
                position: "absolute",
                pointerEvents: "none",
                minHeight: 0,
                minWidth: "1px",
                flex: "0 0 auto",
                height: 0
            }}></div>
        </div>
    );
}

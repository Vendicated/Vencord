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

import "./categoryImage.css";

export function CategoryImage(props: { src: string; alt?: string; isActive?: boolean; }) {
    return (<div>
        <svg width={32} height={32} style={{
            display: "block",
            contain: "paint",
            overflow: "hidden",
            overflowClipMargin: "content-box",
        }}>
            <foreignObject x={0} y={0} width={32} height={32} overflow="visible"
                mask={
                    props?.isActive ? "url(#svg-mask-squircle)" : "url(#svg-mask-avatar-default)"
                }>
                <img src={props.src} alt={props.alt} width={32} height={32} style={{
                    textIndent: "-9999px",
                    alignItems: "center",
                    backgroundColor: "var(--background-primary)",
                    color: "var(--text-normal)",
                    display: "flex",
                    height: "100%",
                    justifyContent: "center",
                    width: "100%"
                }} />
            </foreignObject>
        </svg>
    </div>);
}

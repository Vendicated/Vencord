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

export interface CategoryImageProps {
    src: string;
    alt?: string;
    isActive?: boolean;
}

export function CategoryImage({ src, alt, isActive }: CategoryImageProps) {
    return (
        <div>
            <svg width={32} height={32} style={{
                display: "block",
                contain: "paint",
                overflow: "hidden",
                overflowClipMargin: "content-box",
            }}>
                <foreignObject
                    className={
                        cl("foreign-object") + (
                            isActive ?
                                ` ${cl('foreign-object-active')}`
                                : ""
                        )
                    }

                    x={0} y={0}
                    width={32}
                    height={32}
                    overflow="visible"
                >
                    <img
                        src={src}
                        alt={alt}
                        width={32}
                        height={32}
                    />
                </foreignObject>
            </svg>
        </div>
    );
}

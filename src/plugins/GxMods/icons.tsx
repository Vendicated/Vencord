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

import { LazyComponent } from "@utils/react";
import { findByCode } from "@webpack";

interface IconProps {
    width: number;
    height: number;
    color?: string;
}

export const MusicNote: React.FC<IconProps> = LazyComponent(() => findByCode("M22 16.53C22 18.3282 20.2485 19.7837"));
export const MusicNoteSlashed: React.FC<IconProps & { slashColor: string; }> = LazyComponent(() => findByCode("rotate(-45 2.80762 18.7783)"));

export const OperaGX = ({ width, height }: IconProps) => {
    return <svg viewBox="0 0 24 24" width={width} height={height}>
        <svg viewBox="0 0 58 58" >
            <path d="m46.336 48.414c-3.0657 2.0229-6.5705 3.095-10.145 3.095-5.8513 0-11.399-2.8626-15.221-7.8536-0.013635-0.017137-0.026587-0.032903-0.040222-0.05004-2.9314-3.4795-4.6821-8.5911-4.8028-13.993l-6.818e-4 -1.2675c0.12135-5.4338 1.872-10.545 4.843-14.074 3.8225-4.991 9.371-7.8536 15.222-7.8536 3.575 0 7.0804 1.0721 10.148 3.0963 5.4736 4.9622 8.613 12.044 8.613 19.45 0 7.4066-3.14 14.489-8.615 19.451m-18.668 6.7026c-13.906-0.65601-24.8-12.144-24.8-26.154 0-14.438 11.682-26.185 26.067-26.185 0.0061355 0 0.065446 6.855e-4 0.072263 6.855e-4 2.2777 0.0082258 4.5233 0.31601 6.6857 0.90209-6.5187 0.15629-12.648 3.3856-16.845 8.8674-3.3275 3.9491-5.3134 9.6845-5.4484 15.765v1.3291c0.13498 6.0364 2.1127 11.761 5.4279 15.711 4.2349 5.5154 10.358 8.7351 16.867 8.8914-2.5878 0.70193-5.3338 1.0008-8.0274 0.87193m20.416-47.717c-5.2479-4.7216-12.019-7.336-19.096-7.3628-0.0088625-6.8548e-4 -0.069536-0.001371-0.077717-0.001371-15.863 0-28.769 12.977-28.769 28.927 0 15.477 12.035 28.169 27.401 28.893 0.45335 0.02125 0.90943 0.032903 1.3682 0.032903 7.0818 0 13.889-2.6124 19.165-7.3573l0.0061354-0.0041132c6.0987-5.4852 9.5967-13.345 9.5967-21.565 0-8.2189-3.4973-16.079-9.5946-21.563" fill="#FA1E4E" />
            <path d="m34.182 10.741c5.1323 3.3139 8.6661 10.243 8.6661 18.259 0 8.0159-3.5338 14.946-8.6661 18.259 6.5512-0.54591 11.75-8.511 11.75-18.259 0-9.7482-5.199-17.713-11.75-18.259" fill="#FA1E4E" />
        </svg>
    </svg>;
};


export const Options = ({ width, height, color }: IconProps) => {
    return <svg viewBox="0 0 24 24" width={width} height={height} color={color ?? "var(--interactive-normal)"}>
        <g>
            <rect style={{ fill: "#fff", opacity: 0 }} width="24" height="24" transform="translate(24 0) rotate(90)" />
            <path fill="currentColor" d="M19,9a3,3,0,0,0-2.82,2H3a1,1,0,0,0,0,2H16.18A3,3,0,1,0,19,9Zm0,4a1,1,0,1,1,1-1A1,1,0,0,1,19,13Z" />
            <path fill="currentColor" d="M3,7H4.18A3,3,0,0,0,9.82,7H21a1,1,0,0,0,0-2H9.82A3,3,0,0,0,4.18,5H3A1,1,0,0,0,3,7ZM7,5A1,1,0,1,1,6,6,1,1,0,0,1,7,5Z" />
            <path fill="currentColor" d="M21,17H13.82a3,3,0,0,0-5.64,0H3a1,1,0,0,0,0,2H8.18a3,3,0,0,0,5.64,0H21a1,1,0,0,0,0-2ZM11,19a1,1,0,1,1,1-1A1,1,0,0,1,11,19Z" />
        </g>
    </svg>;
};

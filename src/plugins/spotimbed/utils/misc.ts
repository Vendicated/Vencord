/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

export const cl = classNameFactory("spotimbed-");

export const sortBy = <T, R extends string | number>(valueFn: (elem: T) => R, reverse = false) => (a: T, b: T) => {
    const aVal = valueFn(a);
    const bVal = valueFn(b);
    if (aVal > bVal) return +!reverse; // 1 if not reverse
    if (aVal < bVal) return ~reverse; // -1 if not reverse
    return 0;
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpList = (a: number[], b: number[], t: number) => a.map((v, i) => lerp(v, b[i], t));

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

export enum Format { NONE = 0, IMAGE = 1, VIDEO = 2 }

export interface Category {
    type: "Trending" | "Category";
    name: string;
    src: string;
    format: Format;
    gifs?: Gif[];
}

export interface Gif {
    id: string,
    src: string;
    url: string;
    height: number,
    width: number;
}

export interface Props {
    favorites: { [src: string]: any; };
    trendingCategories: Category[];
}

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type Collection = WithRequired<Category, "gifs">;

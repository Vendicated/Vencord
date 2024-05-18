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

import { Format } from "../types";
import { getUrlExtension } from "./getUrlExtension";

const videoExtensions = ["mp4", "ogg", "webm", "avi", "wmv", "flv", "mov", "mkv", "m4v"];

export function getFormat(url: string) {
    const extension = getUrlExtension(url);
    return url.startsWith("https://media.tenor") || extension == null || videoExtensions.includes(extension) ? Format.VIDEO : Format.IMAGE;
}

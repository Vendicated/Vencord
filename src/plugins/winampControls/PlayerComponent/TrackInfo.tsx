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
import { React } from "@webpack/common";

import { type Track } from "../WinampStore";

const cl = classNameFactory("vc-winamp-");

export function TrackInfo({ track }: { track: Track; }) {
    const trackName = track.name || "Unknown";
    const artistName = track.artist || "Unknown Artist";

    return (
        <div id={cl("info-wrapper")}>
            <div id={cl("titles")}>
                <div id={cl("song-title")} className={cl("ellipoverflow")}>
                    {trackName}
                </div>
                <div className={cl("ellipoverflow")}>
                    <span className={cl("artist")}>{artistName}</span>
                </div>
            </div>
        </div>
    );
}

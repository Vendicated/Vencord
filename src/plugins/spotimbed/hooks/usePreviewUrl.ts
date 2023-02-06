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

import { React } from "@webpack/common";

import { DisplayResource } from "../types";
import { getSelectedTrack } from "../utils/spotify";


export function usePreviewUrl(resource: DisplayResource | null) {
    const idRef = React.useRef(resource?.id);
    const [trackIndex, setTrackIndex] = React.useState(0);

    if (resource?.id && idRef.current !== resource.id) {
        idRef.current = resource.id;
        setTrackIndex(0);
    }

    const previewUrl = resource && getSelectedTrack(resource, trackIndex)?.preview_url;

    return [previewUrl, trackIndex, setTrackIndex] as const;
}

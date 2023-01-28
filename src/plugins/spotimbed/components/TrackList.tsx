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

import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

import { Resource, ResourceType, Track } from "../types";
import { cl } from "../utils/misc";
import { getTracks } from "../utils/spotify";
import { formatDuration } from "../utils/time";
import { Byline, ResourceLink } from "./common";

const listResourceTypes = [ResourceType.Album, ResourceType.Playlist, ResourceType.Artist];
const scrollerClasses: Record<string, string> = findByPropsLazy("thin");

export interface TrackListProps {
    resource: Resource | null;
    resourceType: ResourceType;
    selectedTrack: number;
    onTrackSelect(track: number): void;
}
export function TrackList({
    resource,
    resourceType,
    selectedTrack,
    onTrackSelect: selectTrack
}: TrackListProps) {
    const Container = (children: React.ReactNode) => (
        <div className={`${cl("content", "tracklist")} ${scrollerClasses.thin}`}>
            {children}
        </div>
    );

    if (!listResourceTypes.includes(resourceType)) return null;
    if (!resource) return Container(null);

    const tracks = getTracks(resource);
    if (!tracks) return Container(null);

    const rows = tracks.map((track, i) => (
        <TrackRow
            key={track.id}
            isSelected={selectedTrack === i}
            track={track}
            position={i + 1}
            onClick={() => selectTrack(i)}
        />
    ));

    return Container(rows);
}

interface TrackRowProps {
    track: Track;
    position: number;
    isSelected: boolean;
    onClick(): void;
}
function TrackRow({ track, position, isSelected, onClick }: TrackRowProps) {
    const isDisabled = !track.preview_url;
    return (
        <div
            className={cl(
                "trackrow",
                isDisabled && "disabled",
                !isDisabled && isSelected && "active",
            )}
            onClick={isDisabled ? void 0 : onClick}
        >
            <div className={cl("trackrow-index", "mono")}>{position}</div>
            <div className={cl("trackrow-info")}>
                {ResourceLink(track, cl("trackrow-title"))}
                <div className={cl("trackrow-infoline")}>{Byline(track.artists)}</div>
            </div>
            <div className={cl("trackrow-length", "mono")}>{formatDuration(track.duration_ms)}</div>
        </div>
    );
}

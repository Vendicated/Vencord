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

import ErrorBoundary from "@components/ErrorBoundary";
import { parseUrl } from "@utils/misc";
import { findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

import { repository } from "../../../../package.json";
import { useCachedAwaiter } from "../hooks/useCachedAwaiter";
import { usePaletteStyle } from "../hooks/usePaletteStyle";
import { usePreviewUrl } from "../hooks/usePreviewUrl";
import { useResource } from "../hooks/useResource";
import { settings } from "../settings";
import { ColorStyle, ResourceType } from "../types";
import { getDataUrlFromUrl, getPaletteFromUrl, getSmallestImage } from "../utils/image";
import { cl } from "../utils/misc";
import { Art } from "./Art";
import { AudioControls } from "./AudioControls";
import { Info } from "./Info";
import { TrackList } from "./TrackList";

const classNames = findByPropsLazy("thin");
const REPO_ISSUES_URL = `${repository.url.slice(4, -4)}/issues/new`;

function UnsupportedEmbed() {
    return <div className={cl("unsupported")}>This Spotify embed is not supported by SpotiMbed, please <a href={REPO_ISSUES_URL} target="_blank">open an issue</a> and include the above link</div>;
}

export interface EmbedProps {
    embed: {
        url: string;
        thumbnail?: {
            url: string;
            width: number;
            height: number;
            proxyURL: string;
        };
    };
}
export interface SpotimbedProps {
    art?: string;
    type: string;
    id: string;
}

export function createSpotimbed({ embed: { url: src, thumbnail } }: EmbedProps) {
    const url = parseUrl(src);
    if (!url) return <></>;

    return <ErrorBoundary>
        <Spotimbed
            art={thumbnail?.proxyURL}
            type={url.pathname.split("/")[1]}
            id={url.pathname.split("/")[2]}
        />
    </ErrorBoundary>;
}

export function Spotimbed({ art: initialArtUrl, type: resourceType, id: resourceId }: SpotimbedProps) {
    const { colorStyle } = settings.use(["colorStyle"]);
    const [artUrl, setArtUrl] = React.useState(initialArtUrl);

    const isDiscordTheme = colorStyle === ColorStyle.Discord;
    const isForeign = !Object.values(ResourceType).includes(resourceType as ResourceType);
    const noPalette = !artUrl || isDiscordTheme || isForeign;
    const hasPlayer = resourceType !== ResourceType.User;

    const [palette, , artPending] = useCachedAwaiter(async () => {
        if (noPalette) return null;
        const artData = await getDataUrlFromUrl(artUrl);
        const palette = await getPaletteFromUrl(artData, 128, 10);
        return palette;
    }, {
        cacheKey: JSON.stringify([artUrl, colorStyle, resourceType]),
        storeKey: "spotmbed:palette",
    });

    const [accent, theme] = usePaletteStyle(palette);

    const resourceData = useResource(resourceId, resourceType);
    const [previewUrl, trackIndex, setTrackIndex] = usePreviewUrl(resourceData);

    if (!artUrl && resourceData) {
        const smallestArt = getSmallestImage(resourceData);
        if (smallestArt) setArtUrl(smallestArt.url);
    }

    // TODO: Context menu additions
    return isForeign ? UnsupportedEmbed() : (
        <div className={[
            cl("embed"),
            theme,
            isDiscordTheme ? null : "default-colors",
        ].join(" ")} style={{
            backgroundColor: accent,
        }}>
            <div className={cl("art-wrap")}>
                <Art src={artUrl ?? null} pending={artPending} />
            </div>
            <Info resource={resourceData} />
            <TrackList
                resource={resourceData}
                resourceType={resourceType as ResourceType}
                selectedTrack={trackIndex}
                onTrackSelect={setTrackIndex}
            />
            {hasPlayer && <AudioControls mediaHref={previewUrl} />}
        </div>
    );
}

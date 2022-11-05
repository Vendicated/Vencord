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

import ErrorBoundary from "../../components/ErrorBoundary";
import { Flex } from "../../components/Flex";
import { classes, lazyWebpack } from "../../utils";
import { Forms, React, Tooltip } from "../../webpack/common";
import { filters } from "../../webpack/webpack";
import { SpotifyStore, Track } from "./SpotifyStore";

const cl = (className: string) => `vc-spotify-${className}`;

const useStateFromStores: <T>(
    stores: typeof SpotifyStore[],
    mapper: () => T,
    idk?: null,
    compare?: (old: T, newer: T) => boolean
) => T
    = lazyWebpack(filters.byCode("useStateFromStores"));

function Svg(path: string, label: string) {
    return () => (
        <svg
            className={classes(cl("button-icon"), cl(label))}
            height="24"
            width="24"
            viewBox="0 0 48 48"
            fill="currentColor"
            aria-hidden={true}
            aria-label={label}
        >
            <path d={path} />
        </svg>
    );
}

// https://fonts.google.com/icons
const PlayButton = Svg("M16 37.85v-28l22 14Zm3-14Zm0 8.55 13.45-8.55L19 15.3Z", "play");
const PauseButton = Svg("M28.25 38V10H36v28ZM12 38V10h7.75v28Z", "pause");
const SkipPrev = Svg("M11 36V12h3v24Zm26 0L19.7 24 37 12Zm-3-12Zm0 6.25v-12.5L24.95 24Z", "previous");
const SkipNext = Svg("M34 36V12h3v24Zm-23 0V12l17.3 12Zm3-12Zm0 6.25L23.05 24 14 17.75Z", "next");

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            className={cl("button")}
            {...props}
        >
            {props.children}
        </button>
    );
}

function TooltipText(props: React.HtmlHTMLAttributes<HTMLParagraphElement>) {
    return (
        <Tooltip text={props.children}>
            {({ onMouseLeave, onMouseEnter }) => (
                <p
                    className={cl("tooltip-text")}
                    {...props}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    {props.children}
                </p >
            )}
        </Tooltip>
    );
}

function Controls() {
    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);

    return (
        <Flex id={cl("buttons")}>
            <Button onClick={() => SpotifyStore.prev()}>
                <SkipPrev />
            </Button>
            <Button onClick={() => SpotifyStore.setPlaying(!isPlaying)}>
                {isPlaying ? <PauseButton /> : <PlayButton />}
            </Button>
            <Button onClick={() => SpotifyStore.next()}>
                <SkipNext />
            </Button>
        </Flex>
    );
}

function Info({ track }: { track: Track; }) {
    const img = track?.album?.image;

    return (
        <div id={cl("info-wrapper")}>
            <img
                id={cl("album-image")}
                src={img?.url}
                onClick={() => SpotifyStore.openExternal(`/album/${track.album.id}`)}
            />
            <div id={cl("titles")}>
                <TooltipText
                    id={cl("song-title")}
                    onClick={() => SpotifyStore.openExternal(`/track/${track.id}`)}
                >
                    {track.name}
                </TooltipText>
                <TooltipText>
                    {track.artists.map((a, i) => (
                        <React.Fragment key={a.id}>
                            <a
                                className={cl("artist")}
                                href={`https://open.spotify.com/artist/${a.id}`}
                                target="_blank"
                            >
                                {a.name}
                            </a>
                            {i !== track.artists.length - 1 && <span className={cl("comma")}>{", "}</span>}
                        </React.Fragment>
                    ))}
                </TooltipText>
            </div>
        </div>
    );
}

export function Player() {
    const track = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.track,
        null,
        (prev, next) => prev?.id === next?.id
    );

    if (!track) return null;

    return (
        <ErrorBoundary fallback={() => (
            <>
                <Forms.FormText>Failed to render Spotify Modal :(</Forms.FormText>
                <Forms.FormText>Check the console for errors</Forms.FormText>
            </>
        )}>
            <div id={cl("player")}>
                <Info track={track} />
                <Controls />
            </div>
        </ErrorBoundary>
    );
}

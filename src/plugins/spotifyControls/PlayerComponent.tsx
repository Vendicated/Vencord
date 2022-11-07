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
import { debounce } from "../../utils/debounce";
import { classes, LazyComponent, lazyWebpack } from "../../utils/misc";
import { ContextMenu, FluxDispatcher, Forms, Menu, React, Tooltip } from "../../webpack/common";
import { filters, find } from "../../webpack/webpack";
import { SpotifyStore, Track } from "./SpotifyStore";

const cl = (className: string) => `vc-spotify-${className}`;

function msToHuman(ms: number) {
    const minutes = ms / 1000 / 60;
    const m = Math.floor(minutes);
    const s = Math.floor((minutes - m) * 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

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
            aria-label={label}
            focusable={false}
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
// const Like = Svg("m24 41.95-2.05-1.85q-5.3-4.85-8.75-8.375-3.45-3.525-5.5-6.3T4.825 20.4Q4 18.15 4 15.85q0-4.5 3.025-7.525Q10.05 5.3 14.5 5.3q2.85 0 5.275 1.35Q22.2 8 24 10.55q2.1-2.7 4.45-3.975T33.5 5.3q4.45 0 7.475 3.025Q44 11.35 44 15.85q0 2.3-.825 4.55T40.3 25.425q-2.05 2.775-5.5 6.3T26.05 40.1ZM24 38q5.05-4.65 8.325-7.975 3.275-3.325 5.2-5.825 1.925-2.5 2.7-4.45.775-1.95.775-3.9 0-3.3-2.1-5.425T33.5 8.3q-2.55 0-4.75 1.575T25.2 14.3h-2.45q-1.3-2.8-3.5-4.4-2.2-1.6-4.75-1.6-3.3 0-5.4 2.125Q7 12.55 7 15.85q0 1.95.775 3.925.775 1.975 2.7 4.5Q12.4 26.8 15.7 30.1 19 33.4 24 38Zm0-14.85Z", "like");
// const LikeOn = Svg("m24 41.95-2.05-1.85q-5.3-4.85-8.75-8.375-3.45-3.525-5.5-6.3T4.825 20.4Q4 18.15 4 15.85q0-4.5 3.025-7.525Q10.05 5.3 14.5 5.3q2.85 0 5.275 1.35Q22.2 8 24 10.55q2.1-2.7 4.45-3.975T33.5 5.3q4.45 0 7.475 3.025Q44 11.35 44 15.85q0 2.3-.825 4.55T40.3 25.425q-2.05 2.775-5.5 6.3T26.05 40.1ZM24 38q5.05-4.65 8.325-7.975 3.275-3.325 5.2-5.825 1.925-2.5 2.7-4.45.775-1.95.775-3.9 0-3.3-2.1-5.425T33.5 8.3q-2.55 0-4.75 1.575T25.2 14.3h-2.45q-1.3-2.8-3.5-4.4-2.2-1.6-4.75-1.6-3.3 0-5.4 2.125Q7 12.55 7 15.85q0 1.95.775 3.925.775 1.975 2.7 4.5Q12.4 26.8 15.7 30.1 19 33.4 24 38Zm0-14.85Z", "liked");
const Repeat = Svg("m14 44-8-8 8-8 2.1 2.2-4.3 4.3H35v-8h3v11H11.8l4.3 4.3Zm-4-22.5v-11h26.2l-4.3-4.3L34 4l8 8-8 8-2.1-2.2 4.3-4.3H13v8Z", "repeat");
const Shuffle = Svg("M29.05 40.5v-3h6.25l-9.2-9.15 2.1-2.15 9.3 9.2v-6.35h3V40.5Zm-19.45 0-2.1-2.15 27.9-27.9h-6.35v-3H40.5V18.9h-3v-6.3Zm10.15-18.7L7.5 9.6l2.15-2.15 12.25 12.2Z", "shuffle");

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
    const [isPlaying, shuffle, repeat] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.isPlaying, SpotifyStore.shuffle, SpotifyStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "off": return ["context", "repeat-off"] as const;
            case "context": return ["track", "repeat-context"] as const;
            case "track": return ["off", "repeat-track"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    return (
        <Flex className={cl("button-row")} style={{ gap: 0 }}>
            <Button
                className={classes(cl("button"), cl(shuffle ? "shuffle-on" : "shuffle-off"))}
                onClick={() => SpotifyStore.setShuffle(!shuffle)}
            >
                <Shuffle />
            </Button>
            <Button onClick={() => SpotifyStore.prev()}>
                <SkipPrev />
            </Button>
            <Button onClick={() => SpotifyStore.setPlaying(!isPlaying)}>
                {isPlaying ? <PauseButton /> : <PlayButton />}
            </Button>
            <Button onClick={() => SpotifyStore.next()}>
                <SkipNext />
            </Button>
            <Button
                className={classes(cl("button"), cl(repeatClassName))}
                onClick={() => SpotifyStore.setRepeat(nextRepeat)}
            >
                {repeat === "track" && <span style={{ fontSize: "70%" }}>1</span>}
                <Repeat />
            </Button>
        </Flex>
    );
}

const seek = debounce((v: number) => {
    SpotifyStore.seek(v);
});

const Slider = LazyComponent(() => {
    const filter = filters.byCode("sliderContainer");
    return find(m => m.render && filter(m.render));
});

function SeekBar() {
    const { duration } = SpotifyStore.track!;

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [SpotifyStore],
        () => [SpotifyStore.mPosition, SpotifyStore.isSettingPosition, SpotifyStore.isPlaying]
    );

    const [position, setPosition] = React.useState(storePosition);

    // eslint-disable-next-line consistent-return
    React.useEffect(() => {
        if (isPlaying && !isSettingPosition) {
            setPosition(SpotifyStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 1000);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [storePosition, isSettingPosition, isPlaying]);

    return (
        <div id={cl("progress-bar")}>
            <span className={cl("progress-time")} aria-label="Progress">{msToHuman(position)}</span>
            <Slider
                minValue={0}
                maxValue={duration}
                value={position}
                onChange={(v: number) => {
                    if (isSettingPosition) return;
                    setPosition(v);
                    seek(v);
                }}
                renderValue={msToHuman}
            />
            <span className={cl("progress-time")} aria-label="Total Duration">{msToHuman(duration)}</span>
        </div>
    );
}


function AlbumContextMenu({ track }: { track: Track; }) {
    const volume = useStateFromStores([SpotifyStore], () => SpotifyStore.volume);

    return (
        <Menu.ContextMenu
            navId="spotify-album-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Spotify Album Menu"
        >
            <Menu.MenuItem
                key="open-album"
                id="open-album"
                label="Open Album"
                action={() => SpotifyStore.openExternal(`/album/${track.album.id}`)}
            />
            <Menu.MenuItem
                key="view-cover"
                id="view-cover"
                label="View Album Cover"
                // trolley
                action={() => (Vencord.Plugins.plugins.ViewIcons as any).openImage(track.album.image.url)}
            />
            <Menu.MenuControlItem
                id="spotify-volume"
                key="spotify-volume"
                label="Volume"
                control={(props, ref) => (
                    <Slider
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => SpotifyStore.setVolume(v))}
                    />
                )}
            />
        </Menu.ContextMenu>
    );
}

function Info({ track }: { track: Track; }) {
    const img = track?.album?.image;

    const [coverExpanded, setCoverExpanded] = React.useState(false);

    const i = (
        <img
            id={cl("album-image")}
            src={img?.url}
            alt="Album Image"
            onClick={() => setCoverExpanded(!coverExpanded)}
            onContextMenu={e => {
                ContextMenu.open(e, () => <AlbumContextMenu track={track} />);
            }}
        />
    );

    if (coverExpanded) return (
        <div id={cl("album-expanded-wrapper")}>
            {i}
        </div>
    );

    return (
        <div id={cl("info-wrapper")}>
            {i}
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

    const device = useStateFromStores(
        [SpotifyStore],
        () => SpotifyStore.device,
        null,
        (prev, next) => prev?.id === next?.id
    );

    const isPlaying = useStateFromStores([SpotifyStore], () => SpotifyStore.isPlaying);
    const [shouldHide, setShouldHide] = React.useState(false);

    // Hide player after 5 minutes of inactivity
    // eslint-disable-next-line consistent-return
    React.useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || !device?.is_active || shouldHide)
        return null;

    return (
        <ErrorBoundary fallback={() => (
            <>
                <Forms.FormText>Failed to render Spotify Modal :(</Forms.FormText>
                <Forms.FormText>Check the console for errors</Forms.FormText>
            </>
        )}>
            <div id={cl("player")}>
                <Info track={track} />
                <SeekBar />
                <Controls />
            </div>
        </ErrorBoundary>
    );
}

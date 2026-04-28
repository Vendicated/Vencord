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

import "./winampStyles.css";

import { Flex } from "@components/Flex";
import { ImageIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import { Span } from "@components/Span";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import { ContextMenuApi, FluxDispatcher, Menu, React, Slider, useEffect, useState, useStateFromStores } from "@webpack/common";

import { settings } from ".";
import { SeekBar } from "./SeekBar";
import { type Track, WinampStore } from "./WinampStore";

const cl = classNameFactory("vc-winamp-");

function msToHuman(ms: number) {
    const minutes = ms / 1000 / 60;
    const m = Math.floor(minutes);
    const s = Math.floor((minutes - m) * 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function Svg(path: string, label: string) {
    return () => (
        <svg
            className={cl("button-icon", label)}
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <path d={path} />
        </svg>
    );
}

// KraXen's icons :yesyes:
// from https://fonts.google.com/icons?icon.style=Rounded&icon.set=Material+Icons
const PlayButton = Svg("M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z", "play");
const PauseButton = Svg("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z", "pause");
const SkipPrev = Svg("M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z", "previous");
const SkipNext = Svg("M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z", "next");
const Repeat = Svg("M7 7h10v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.2.2-.51 0-.71l-2.79-2.79c-.31-.31-.85-.09-.85.36V5H6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V7zm10 10H7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79c.31.31.85.09.85-.36V19h11c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v3z", "repeat");
const Shuffle = Svg("M10.59 9.17L6.12 4.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.46 4.46 1.42-1.4zm4.76-4.32l1.19 1.19L4.7 17.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L17.96 7.46l1.19 1.19c.31.31.85.09.85-.36V4.5c0-.28-.22-.5-.5-.5h-3.79c-.45 0-.67.54-.36.85zm-.52 8.56l-1.41 1.41 3.13 3.13-1.2 1.2c-.31.31-.09.85.36.85h3.79c.28 0 .5-.22.5-.5v-3.79c0-.45-.54-.67-.85-.35l-1.19 1.19-3.13-3.14z", "shuffle");

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; }) {
    const { active, className, ...rest } = props;
    return (
        <button
            className={classes(cl("button"), active && cl("button-active"), className)}
            {...rest}
        >
            {props.children}
        </button>
    );
}

function Controls() {
    const [isPlaying, shuffle, repeat] = useStateFromStores(
        [WinampStore],
        () => [WinampStore.isPlaying, WinampStore.shuffle, WinampStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "off": return ["playlist", "repeat-off"] as const;
            case "playlist": return ["track", "repeat-playlist"] as const;
            case "track": return ["off", "repeat-track"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    // the 1 is using position absolute so it does not make the button jump around
    return (
        <Flex className={cl("button-row")} gap="0">
            <Button
                className={classes(cl("shuffle"), cl(shuffle ? "shuffle-on" : "shuffle-off"))}
                onClick={() => WinampStore.executeMediaAction("setShuffle", !shuffle)}
                aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
            >
                <Shuffle />
            </Button>
            <Button
                onClick={() => {
                    settings.store.previousButtonRestartsTrack && WinampStore.position > 3000
                        ? WinampStore.executeMediaAction("seek", 0)
                        : WinampStore.executeMediaAction("prev", undefined as void);
                }}
                aria-label="Previous track"
            >
                <SkipPrev />
            </Button>
            <Button
                className={cl("play-pause")}
                onClick={() => WinampStore.executeMediaAction("setPlaying", !isPlaying)}
                active={isPlaying}
                aria-label={isPlaying ? "Pause" : "Play"}
            >
                {isPlaying ? <PauseButton /> : <PlayButton />}
            </Button>
            <Button
                onClick={() => WinampStore.executeMediaAction("next", undefined as void)}
                aria-label="Next track"
            >
                <SkipNext />
            </Button>
            <Button
                className={classes(cl("repeat"), cl(repeatClassName))}
                onClick={() => WinampStore.executeMediaAction("setRepeat", nextRepeat)}
                aria-label={`Repeat: ${repeat}`}
            >
                {repeat === "track" && <span className={cl("repeat-1")}>1</span>}
                <Repeat />
            </Button>
        </Flex>
    );
}

const seek = debounce((v: number) => {
    WinampStore.executeMediaAction("seek", v);
});

const setVolume = debounce((v: number) => {
    WinampStore.executeMediaAction("setVolume", v);
});

// Volume icon paths
const VolumeMuted = Svg("M3.63 3.63c-.39.39-.39 1.02 0 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .45.3.87.74 1.01C17.09 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z", "volume-muted");
const VolumeLow = Svg("M7 9v6h4l5 5V4l-5 5H7z", "volume-low");
const VolumeHigh = Svg("M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z", "volume-high");

function VolumeBar() {
    const volume = useStateFromStores([WinampStore], () => WinampStore.volume);

    const VolumeIcon = volume === 0 ? VolumeMuted : volume < 50 ? VolumeLow : VolumeHigh;

    return (
        <div className={cl("volume-bar")}>
            <VolumeIcon />
            <Slider
                minValue={0}
                maxValue={100}
                initialValue={volume}
                onValueChange={setVolume}
                onValueRender={(v: number) => `${Math.round(v)}%`}
            />
        </div>
    );
}

function WinampSeekBar() {
    const duration = WinampStore.track?.duration ?? 0;

    const [storePosition, isPlaying] = useStateFromStores(
        [WinampStore],
        () => [WinampStore.position, WinampStore.isPlaying]
    );

    const [position, setPosition] = useState(storePosition);

    useEffect(() => {
        if (isPlaying) {
            setPosition(WinampStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 1000);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [storePosition, isPlaying]);

    const onChange = (v: number) => {
        setPosition(v);
        seek(v);
    };

    if (!duration) return null;

    return (
        <div id={cl("progress-bar")}>
            <SeekBar
                initialValue={position}
                minValue={0}
                maxValue={duration}
                onValueChange={onChange}
                asValueChanges={onChange}
                onValueRender={msToHuman}
            />
            <Span
                size="xs"
                weight="medium"
                className={classes(cl("progress-time"), cl("time-left"))}
                aria-label="Progress"
            >
                {msToHuman(position)}
            </Span>
            <Span
                size="xs"
                weight="medium"
                className={classes(cl("progress-time"), cl("time-right"))}
                aria-label="Total Duration"
            >
                {msToHuman(duration)}
            </Span>
        </div>
    );
}


// Default placeholder for when album art is not available
const DEFAULT_ALBUM_ART = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' fill='%23666'%3E%3Crect width='48' height='48' fill='%232f3136'/%3E%3Ccircle cx='24' cy='24' r='16' fill='none' stroke='%23444' stroke-width='2'/%3E%3Ccircle cx='24' cy='24' r='6' fill='%23444'/%3E%3C/svg%3E";

function PlayerContextMenu({ track }: { track: Track; }) {
    const volume = useStateFromStores([WinampStore], () => WinampStore.volume);
    const [position, duration] = useStateFromStores(
        [WinampStore],
        () => [WinampStore.position, WinampStore.track?.duration ?? 0]
    );
    const albumArtUrl = track.albumArt || DEFAULT_ALBUM_ART;
    const hasAlbumArt = albumArtUrl !== DEFAULT_ALBUM_ART;

    return (
        <Menu.Menu
            navId="winamp-player-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Winamp Player Menu"
        >
            {hasAlbumArt && (
                <Menu.MenuItem
                    key="view-cover"
                    id="view-cover"
                    label="View Album Cover"
                    action={() => openImageModal({ url: albumArtUrl })}
                    icon={ImageIcon}
                />
            )}
            {track.album && (
                <Menu.MenuItem
                    key="album-info"
                    id="album-info"
                    label={`Album: ${track.album}`}
                    disabled={true}
                />
            )}
            {(!!track.album || hasAlbumArt) && <Menu.MenuSeparator />}
            <Menu.MenuControlItem
                id="winamp-volume"
                key="winamp-volume"
                label="Volume"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => WinampStore.executeMediaAction("setVolume", v))}
                    />
                )}
            />
            {duration > 0 && (
                <Menu.MenuControlItem
                    id="winamp-seek"
                    key="winamp-seek"
                    label={`${msToHuman(position)} / ${msToHuman(duration)}`}
                    control={(props, ref) => (
                        <Menu.MenuSliderControl
                            {...props}
                            ref={ref}
                            value={position}
                            minValue={0}
                            maxValue={duration}
                            onChange={debounce((v: number) => WinampStore.executeMediaAction("seek", v))}
                            renderValue={() => null}
                        />
                    )}
                />
            )}
        </Menu.Menu>
    );
}

function Info({ track }: { track: Track; }) {
    const albumArtUrl = track.albumArt || DEFAULT_ALBUM_ART;
    const hasAlbumArt = albumArtUrl !== DEFAULT_ALBUM_ART;

    const [coverExpanded, setCoverExpanded] = useState(false);

    const albumImage = (
        <img
            id={cl("album-image")}
            src={albumArtUrl}
            alt="Album cover"
            onClick={() => hasAlbumArt && setCoverExpanded(!coverExpanded)}
            className={classes(hasAlbumArt && cl("album-image-clickable"))}
        />
    );

    if (coverExpanded && hasAlbumArt)
        return (
            <div id={cl("album-expanded-wrapper")}>
                {albumImage}
            </div>
        );

    // Combine artist and album into a single secondary line for cleaner hierarchy
    const secondaryInfo = [track.artist, track.album].filter(Boolean).join(" - ");

    return (
        <div id={cl("info-wrapper")}>
            {albumImage}
            <div id={cl("titles")}>
                <Paragraph
                    weight="semibold"
                    id={cl("song-title")}
                    className={cl("ellipoverflow")}
                    title={track.name}
                >
                    {track.name || "Unknown"}
                </Paragraph>
                {secondaryInfo && (
                    <Paragraph
                        className={cl("ellipoverflow", "secondary-song-info")}
                        title={secondaryInfo}
                    >
                        {secondaryInfo}
                    </Paragraph>
                )}
            </div>
        </div>
    );
}

export function Player() {
    const track = useStateFromStores(
        [WinampStore],
        () => WinampStore.track,
        null,
        // Compare by id AND albumArt to re-render when album art is fetched
        (prev, next) => {
            if (prev?.id !== next?.id) return false;
            if (prev?.albumArt !== next?.albumArt) return false;
            return prev?.name === next?.name;
        }
    );

    const isPlaying = useStateFromStores([WinampStore], () => WinampStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);
    const { showSeekBar, showVolumeBar } = settings.use(["showSeekBar", "showVolumeBar"]);

    // Hide player after 5 minutes of inactivity
    React.useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || shouldHide)
        return null;

    const exportTrackImageStyle = {
        "--vc-winamp-track-image": `url(${track?.albumArt || ""})`,
    } as React.CSSProperties;

    return (
        <div
            id={cl("player")}
            style={exportTrackImageStyle}
            onContextMenu={e => {
                ContextMenuApi.openContextMenu(e, () => <PlayerContextMenu track={track} />);
            }}
        >
            <Info track={track} />
            <div className={cl("playback-section")}>
                {showSeekBar && <WinampSeekBar />}
                <Controls />
                {showVolumeBar && <VolumeBar />}
            </div>
        </div>
    );
}

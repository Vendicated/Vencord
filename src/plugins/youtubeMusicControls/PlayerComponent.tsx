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

import "./ytmStyles.css";

import { ImageIcon, LinkIcon, OpenExternalIcon } from "@components/Icons";
import { debounce } from "@shared/debounce";
import { openImageModal } from "@utils/discord";
import { classes, copyWithToast } from "@utils/misc";
import { ContextMenuApi, Flex, FluxDispatcher, Forms, Menu, React, useEffect, useState, useStateFromStores } from "@webpack/common";

import { type PlayerState, type Repeat, YoutubeMusicStore } from "./YtmStore";

const cl = (className: string) => `vc-ytm-${className}`;

function msToHuman(ms: number) {
    const minutes = ms / 1000 / 60;
    const m = Math.floor(minutes);
    const s = Math.floor((minutes - m) * 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function Svg(path: string, label: string) {
    return () => (
        <svg
            className={classes(cl("button-icon"), cl(label))}
            aria-labelledby="title"
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <title id="title">{label}</title>
            <path d={path} />
        </svg>
    );
}

// KraXen's icons :yesyes:
// from https://fonts.google.com/icons?icon.style=Rounded&icon.set=Material+Icons
// older material icon style, but still really good
const PlayButton = Svg("M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18c.62-.39.62-1.29 0-1.69L9.54 5.98C8.87 5.55 8 6.03 8 6.82z", "play");
const PauseButton = Svg("M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm6-12v10c0 1.1.9 2 2 2s2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2z", "pause");
const SkipPrev = Svg("M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07c-.57.4-.57 1.24 0 1.64z", "previous");
const SkipNext = Svg("M7.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L7.58 7.11C6.91 6.65 6 7.12 6 7.93v8.14c0 .81.91 1.28 1.58.82zM16 7v10c0 .55.45 1 1 1s1-.45 1-1V7c0-.55-.45-1-1-1s-1 .45-1 1z", "next");
const Repeat = Svg("M7 7h10v1.79c0 .45.54.67.85.35l2.79-2.79c.2-.2.2-.51 0-.71l-2.79-2.79c-.31-.31-.85-.09-.85.36V5H6c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1s1-.45 1-1V7zm10 10H7v-1.79c0-.45-.54-.67-.85-.35l-2.79 2.79c-.2.2-.2.51 0 .71l2.79 2.79c.31.31.85.09.85-.36V19h11c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1s-1 .45-1 1v3z", "repeat");
const Shuffle = Svg("M10.59 9.17L6.12 4.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.46 4.46 1.42-1.4zm4.76-4.32l1.19 1.19L4.7 17.88c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L17.96 7.46l1.19 1.19c.31.31.85.09.85-.36V4.5c0-.28-.22-.5-.5-.5h-3.79c-.45 0-.67.54-.36.85zm-.52 8.56l-1.41 1.41 3.13 3.13-1.2 1.2c-.31.31-.09.85.36.85h3.79c.28 0 .5-.22.5-.5v-3.79c0-.45-.54-.67-.85-.35l-1.19 1.19-3.13-3.14z", "shuffle");

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

function CopyContextMenu({ name, path }: { name: string; path: string; }) {
    const copyId = `ytm-copy-${name}`;
    const openId = `ytm-open-${name}`;

    return (
        <Menu.Menu
            navId={`ytm-${name}-menu`}
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label={`YouTube Music ${name} Menu`}
        >
            <Menu.MenuItem
                key={copyId}
                id={copyId}
                label={`Copy ${name} Link`}
                action={() => copyWithToast(`https://music.youtube.com${path}`)}
                icon={LinkIcon}
            />
            <Menu.MenuItem
                key={openId}
                id={openId}
                label={`Open ${name} in YouTube Music`}
                action={() => YoutubeMusicStore.openExternal(path)}
                icon={OpenExternalIcon}
            />
        </Menu.Menu>
    );
}

function makeContextMenu(name: string, path: string) {
    return (e: React.MouseEvent<HTMLElement, MouseEvent>) =>
        ContextMenuApi.openContextMenu(e, () => <CopyContextMenu name={name} path={path} />);
}

function Controls() {
    const [isPlaying, repeat] = useStateFromStores<[boolean, Repeat]>(
        [YoutubeMusicStore],
        () => [YoutubeMusicStore.isPlaying, YoutubeMusicStore.repeat]
    );

    const [nextRepeat, repeatClassName] = (() => {
        switch (repeat) {
            case "NONE": return ["context", "repeat-off"] as const;
            case "ALL": return ["track", "repeat-context"] as const;
            case "ONE": return ["off", "repeat-track"] as const;
            default: throw new Error(`Invalid repeat state ${repeat}`);
        }
    })();

    // the 1 is using position absolute so it does not make the button jump around
    return (
        <Flex className={cl("button-row")} style={{ gap: 0 }}>
            <Button
                className={classes(cl("button"), cl("shuffle-off"))}
                onClick={() => YoutubeMusicStore.shuffle()}
            >
                <Shuffle />
            </Button>
            <Button onClick={() => YoutubeMusicStore.prev()}>
                <SkipPrev />
            </Button>
            <Button onClick={() => YoutubeMusicStore.setPlaying(!isPlaying)}>
                {isPlaying ? <PauseButton /> : <PlayButton />}
            </Button>
            <Button onClick={() => YoutubeMusicStore.next()}>
                <SkipNext />
            </Button>
            <Button
                className={classes(cl("button"), cl(repeatClassName))}
                onClick={() => YoutubeMusicStore.switchRepeat()}
                style={{ position: "relative" }}
            >
                {repeat === "ONE" && <span className={cl("repeat-1")}>1</span>}
                <Repeat />
            </Button>
        </Flex>
    );
}

const seek = debounce((v: number) => {
    YoutubeMusicStore.seek(v);
});

function SeekBar() {
    const { songDuration } = YoutubeMusicStore.song!;

    const [storePosition, isSettingPosition, isPlaying] = useStateFromStores(
        [YoutubeMusicStore],
        () => [YoutubeMusicStore.mPosition, YoutubeMusicStore.isSettingPosition, YoutubeMusicStore.isPlaying]
    );

    const [position, setPosition] = useState<number>(storePosition);

    // eslint-disable-next-line consistent-return
    useEffect(() => {
        if (isPlaying && !isSettingPosition) {
            setPosition(YoutubeMusicStore.position);
            const interval = setInterval(() => {
                setPosition(p => p + 1000);
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [storePosition, isSettingPosition, isPlaying]);

    return (
        <div id={cl("progress-bar")}>
            <Forms.FormText
                variant="text-xs/medium"
                className={`${cl("progress-time")} ${cl("time-left")}`}
                aria-label="Progress"
            >
                {msToHuman(position)}
            </Forms.FormText>
            <Menu.MenuSliderControl
                minValue={0}
                maxValue={songDuration * 1000}
                value={position}
                onChange={(v: number) => {
                    if (isSettingPosition) return;
                    setPosition(v);
                    seek(v - storePosition);
                    console.log("seeking to", v - storePosition);
                }}
                renderValue={msToHuman}
            />
            <Forms.FormText
                variant="text-xs/medium"
                className={`${cl("progress-time")} ${cl("time-right")}`}
                aria-label="Total Duration"
            >
                {msToHuman(songDuration * 1000)}
            </Forms.FormText>
        </div>
    );
}

function AlbumContextMenu({ track }: { track: PlayerState["song"]; }) {
    const volume = useStateFromStores([YoutubeMusicStore], () => YoutubeMusicStore.volume);

    return (
        <Menu.Menu
            navId="ytm-album-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="YouTube Music Album Menu"
        >
            {/* <Menu.MenuItem
                key="open-album"
                id="open-album"
                label="Open Album"
                action={() => YoutubeMusicStore.openExternal(`/album/${track?.album}`)}
                icon={OpenExternalIcon}
            /> */}
            <Menu.MenuItem
                key="view-cover"
                id="view-cover"
                label="View Album Cover"
                // trolley
                action={() => track?.imageSrc && openImageModal(track?.imageSrc)}
                icon={ImageIcon}
            />
            <Menu.MenuControlItem
                id="ytm-volume"
                key="ytm-volume"
                label="Volume"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        {...props}
                        ref={ref}
                        value={volume}
                        minValue={0}
                        maxValue={100}
                        onChange={debounce((v: number) => YoutubeMusicStore.setVolume(v))}
                    />
                )}
            />
        </Menu.Menu>
    );
}

function makeLinkProps(name: string, condition: unknown, path: string) {
    if (!condition) return {};

    return {
        role: "link",
        onClick: () => YoutubeMusicStore.openExternal(path),
        onContextMenu: makeContextMenu(name, path)
    } satisfies React.HTMLAttributes<HTMLElement>;
}

function Info({ track }: { track: NonNullable<PlayerState["song"]>; }) {
    const img = track?.imageSrc;

    const [coverExpanded, setCoverExpanded] = useState(false);

    const i = (
        <>
            {img && (
                <img
                    id={cl("album-image")}
                    src={img}
                    alt="Album Image"
                    onClick={() => setCoverExpanded(!coverExpanded)}
                    onContextMenu={e => {
                        ContextMenuApi.openContextMenu(e, () => <AlbumContextMenu track={track} />);
                    }}
                />
            )}
        </>
    );

    if (coverExpanded && img) return (
        <div id={cl("album-expanded-wrapper")}>
            {i}
        </div>
    );

    return (
        <div id={cl("info-wrapper")}>
            {i}
            <div id={cl("titles")}>
                <Forms.FormText
                    variant="text-sm/semibold"
                    id={cl("song-title")}
                    className={cl("ellipoverflow")}
                    title={track?.title}
                    {...makeLinkProps("Song", track?.videoId, `/watch?v=${track?.videoId}`)}
                >
                    {track?.title}
                </Forms.FormText>
                {track.artist && (
                    <Forms.FormText variant="text-sm/normal" className={cl("ellipoverflow")}>
                        by&nbsp;
                        <span className={cl("artist")} style={{ fontSize: "inherit" }} title={track.artist}>
                            {track.artist}
                        </span>
                    </Forms.FormText>
                )}
                {track.album && (
                    <Forms.FormText variant="text-sm/normal" className={cl("ellipoverflow")}>
                        on&nbsp;
                        <span
                            id={cl("album-title")}
                            className={cl("album")}
                            style={{ fontSize: "inherit" }}
                            title={track.album}
                        >
                            {track.album}
                        </span>
                    </Forms.FormText>
                )}
            </div>
        </div>
    );
}

export function Player() {
    const track = useStateFromStores(
        [YoutubeMusicStore],
        () => YoutubeMusicStore.song,
        null,
        (prev, next) => prev?.videoId ? (prev.videoId === next?.videoId) : prev?.title === next?.title
    );

    const isPlaying = useStateFromStores([YoutubeMusicStore], () => YoutubeMusicStore.isPlaying);
    const [shouldHide, setShouldHide] = useState(false);


    React.useEffect(() => {
        setShouldHide(false);
        if (!isPlaying) {
            const timeout = setTimeout(() => setShouldHide(true), 1000 * 60 * 5);
            return () => clearTimeout(timeout);
        }
    }, [isPlaying]);

    if (!track || shouldHide) return;

    const exportTrackImageStyle = {
        "--vc-ytm-track-image": `url(${track?.imageSrc || ""})`,
    } as React.CSSProperties;

    return (
        <div id={cl("player")} style={exportTrackImageStyle}>
            <Info track={track} />
            <SeekBar />
            <Controls />
        </div>
    );
}


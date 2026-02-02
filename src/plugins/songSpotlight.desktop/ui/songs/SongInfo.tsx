/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { apiConstants } from "@plugins/songSpotlight.desktop/lib/api";
import { useSongStore } from "@plugins/songSpotlight.desktop/lib/store/SongStore";
import {
    cl,
    formatCoverTooltip,
    formatDurationMs,
    isProbablyListRender,
    sid,
} from "@plugins/songSpotlight.desktop/lib/utils";
import { parseLink, useLink, useRender } from "@plugins/songSpotlight.desktop/service";
import {
    CardClasses,
    ImageBrokenIcon,
    OverlayClasses,
    PuzzlePieceIcon,
    TrashIcon,
} from "@plugins/songSpotlight.desktop/ui/common";
import { AudioPlayer } from "@plugins/songSpotlight.desktop/ui/components/AudioPlayer";
import { ExplicitTag } from "@plugins/songSpotlight.desktop/ui/components/ExplicitTag";
import { PlayButton } from "@plugins/songSpotlight.desktop/ui/components/PlayButton";
import { ServiceIcon } from "@plugins/songSpotlight.desktop/ui/components/ServiceIcon";
import { openManageSongs } from "@plugins/songSpotlight.desktop/ui/settings/ManageSongs";
import { RenderInfoEntryBased, RenderSongInfo } from "@song-spotlight/api/handlers";
import { Song } from "@song-spotlight/api/structs";
import { copyWithToast } from "@utils/discord";
import { LazyComponent } from "@utils/lazyReact";
import { classes } from "@utils/misc";
import {
    Clickable,
    ContextMenuApi,
    FluxDispatcher,
    Menu,
    React,
    ScrollerThin,
    showToast,
    Toasts,
    Tooltip,
    useCallback,
    useMemo,
    useState,
} from "@webpack/common";

interface SongEntryProps {
    entry: RenderInfoEntryBased;
    number: string;
    isLoaded: boolean;
    isPlaying: boolean;
    big?: boolean;
    onClick(): void;
}

function SongEntry({ entry, number, isLoaded, isPlaying, big, onClick }: SongEntryProps) {
    const baseSize = big ? "md" : "sm";
    const subSize = big ? "sm" : "xs";

    return (
        <Clickable
            onContextMenu={e =>
                ContextMenuApi.openContextMenu(e, () => (
                    <Menu.Menu
                        navId="vc-songspotlight-song-entry"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                        aria-label={entry.label}
                    >
                        <Menu.MenuItem
                            id="copy-link"
                            label="Copy link"
                            icon={LinkIcon}
                            action={() => copyWithToast(entry.link)}
                        />
                        <Menu.MenuItem
                            id="steal-song"
                            label="Steal song"
                            icon={PuzzlePieceIcon}
                            action={async () => {
                                const self = useSongStore.getState().self?.data ?? [];
                                if (self.length >= apiConstants.songLimit) {
                                    return showToast("You don't have enough space!");
                                }

                                const song = await parseLink(entry.link);
                                if (!song) {
                                    return showToast("Uh oh, this song doesn't exist!", Toasts.Type.FAILURE);
                                }

                                if (self.find(x => sid(x) === sid(song))) {
                                    return showToast("You already have this song added!");
                                }

                                openManageSongs([...self, song]);
                            }}
                        />
                    </Menu.Menu>
                ))}
            onClick={onClick}
        >
            <Flex
                alignItems="center"
                gap="4px"
                className={cl("song-entry")}
                aria-disabled={!isLoaded}
                data-playing={isPlaying}
            >
                <Flex alignItems="center" justifyContent="center" gap={0} className={cl("song-entry-number")}>
                    <BaseText size={baseSize} weight={isPlaying ? "semibold" : "medium"}>{number}</BaseText>
                </Flex>
                <Flex flexDirection="column" justifyContent="center" gap={0}>
                    <Flex alignItems="center" gap="6px">
                        <BaseText size={subSize} weight="semibold" className={cl("clamped")} title={entry.label}>
                            {entry.label}
                        </BaseText>
                        {entry.explicit && <ExplicitTag size={subSize} />}
                    </Flex>
                    <BaseText size={subSize} weight="medium" className={cl("clamped", "sub")} title={entry.sublabel}>
                        {entry.sublabel}
                    </BaseText>
                </Flex>
            </Flex>
        </Clickable>
    );
}

interface SongInfoProps {
    owned: boolean;
    song: Song;
    render: RenderSongInfo;
    link: string | null;
    big?: boolean;
}

function SongInfo({ owned, song, render, link, big }: SongInfoProps) {
    const [playing, setPlaying] = useState<number | false>(false);
    const [loaded, setLoaded] = useState(new Set<number>());
    const audios = useMemo(() => render.form === "single" ? [render.single] : render.list, [render]);

    const setLoadedAudio = useCallback((index: number, state: boolean) =>
        setLoaded(ld => {
            if (state) ld.add(index);
            else ld.delete(index);
            return new Set(ld);
        }), []);

    const baseSize = big ? "md" : "sm";
    const subSize = big ? "sm" : "xs";

    return (
        <Flex flexDirection="column" gap={0} className={cl("song")}>
            <AudioPlayer
                list={audios}
                playing={playing}
                setPlaying={setPlaying}
                setLoaded={setLoadedAudio}
            />
            <div className={cl("song-grid")}>
                <Flex gap="8px" alignItems="center" className={cl("song-core")}>
                    <Tooltip text={formatCoverTooltip(song, render)}>
                        {props => (
                            <Flex
                                {...props}
                                onContextMenu={e =>
                                    ContextMenuApi.openContextMenu(e, () => (
                                        <Menu.Menu
                                            navId="vc-songspotlight-song"
                                            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                                            aria-label={render.label}
                                        >
                                            <Menu.MenuItem
                                                id="copy-link"
                                                label="Copy link"
                                                icon={LinkIcon}
                                                action={() => link && copyWithToast(link)}
                                                disabled={!link}
                                            />
                                            {owned
                                                ? (
                                                    <Menu.MenuItem
                                                        id="steal-song"
                                                        label="Steal song"
                                                        icon={PuzzlePieceIcon}
                                                        action={() => {
                                                            const self = useSongStore.getState().self?.data ?? [];
                                                            if (self.length >= apiConstants.songLimit) {
                                                                return showToast("You don't have enough space!");
                                                            }
                                                            if (self.find(x => sid(x) === sid(song))) {
                                                                return showToast("You already have this song added!");
                                                            }

                                                            openManageSongs([...self, song]);
                                                        }}
                                                    />
                                                )
                                                : (
                                                    <Menu.MenuItem
                                                        id="remove-song"
                                                        color="danger"
                                                        label="Remove song"
                                                        icon={TrashIcon}
                                                        action={() => {
                                                            const self = useSongStore.getState().self?.data ?? [];

                                                            const i = self.indexOf(song);
                                                            if (i === -1) {
                                                                return showToast("You... don't have this song added?");
                                                            }

                                                            openManageSongs(self.toSpliced(i, 1));
                                                        }}
                                                    />
                                                )}
                                        </Menu.Menu>
                                    ))}
                                justifyContent="center"
                                alignItems="center"
                                gap={0}
                                className={cl("song-cover")}
                            >
                                <Link href={link || undefined} style={{ display: "contents" }}>
                                    {render.thumbnailUrl
                                        ? <img src={render.thumbnailUrl} alt={render.label} />
                                        : (
                                            <ImageBrokenIcon
                                                className={cl("icon")}
                                            />
                                        )}
                                </Link>
                            </Flex>
                        )}
                    </Tooltip>
                    <Flex
                        flexDirection="column"
                        justifyContent="center"
                        gap={0}
                        className={cl("clamped")}
                    >
                        <Flex alignItems="center" gap="6px">
                            <BaseText size={baseSize} weight="semibold" className={cl("clamped")} title={render.label}>
                                {render.label}
                            </BaseText>
                            {render.explicit && <ExplicitTag size={subSize} />}
                        </Flex>
                        <BaseText
                            size={baseSize}
                            weight="medium"
                            className={cl("clamped", "sub")}
                            title={render.sublabel}
                        >
                            {render.sublabel}
                        </BaseText>
                    </Flex>
                </Flex>
                <Flex justifyContent="flex-end" className={cl("song-service")}>
                    <ServiceIcon service={song.service} />
                </Flex>
                <Flex
                    justifyContent="flex-end"
                    alignItems="center"
                    gap="6px"
                    className={cl("song-player")}
                    data-idle={playing === false && !big}
                >
                    {render.form === "single" && render.single.audio?.duration && (
                        <BaseText size={subSize} weight="medium" className={cl("mono", "sub")}>
                            {formatDurationMs(render.single.audio.duration)}
                        </BaseText>
                    )}
                    <PlayButton
                        size={subSize}
                        state={playing !== false}
                        disabled={loaded.size < 1}
                        onClick={() => {
                            const loadedI = loaded.values().toArray().sort()[0];
                            if (loadedI === undefined) return;

                            if (playing !== false) setPlaying(false);
                            else setPlaying(loadedI);
                        }}
                    />
                </Flex>
            </div>
            {render.form === "list" && (
                <>
                    <div className={cl("song-divider")} />
                    <ScrollerThin fade className={cl("song-list")}>
                        <Flex flexDirection="column" gap="3px">
                            {render.list.map((entry, i) => (
                                <SongEntry
                                    entry={entry}
                                    number={(i + 1).toString()}
                                    isLoaded={loaded.has(i)}
                                    isPlaying={playing === i}
                                    onClick={() => {
                                        if (!loaded.has(i)) return;

                                        if (playing !== i) setPlaying(i);
                                        else setPlaying(false);
                                    }}
                                    big={big}
                                    key={entry.link}
                                />
                            ))}
                        </Flex>
                    </ScrollerThin>
                </>
            )}
        </Flex>
    );
}

interface SongInfoContainerProps {
    owned: boolean;
    song: Song;
    index: number;
    big?: boolean;
}

export const SongInfoContainer = LazyComponent(() =>
    React.memo(function SongInfoContainer({ owned, song, index, big }: SongInfoContainerProps) {
        const { failed, render } = useRender(song);
        const { link } = useLink(song);

        if (failed) return null;

        return (
            <article
                className={classes(
                    OverlayClasses.overlay,
                    CardClasses.card,
                    cl("song-container", {
                        "tall-song": render?.form === "list" || isProbablyListRender(song),
                    }),
                )}
                style={{
                    ["--index" as any]: index.toString(),
                }}
            >
                {render && <SongInfo owned={owned} song={song} render={render} link={link} big={big} />}
            </article>
        );
    })
);

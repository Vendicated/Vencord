/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { apiConstants } from "@equicordplugins/songSpotlight.desktop/lib/api";
import { useSongStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/SongStore";
import { cl, formatCoverTooltip, formatDurationMs } from "@equicordplugins/songSpotlight.desktop/lib/utils";
import { Native, useRender } from "@equicordplugins/songSpotlight.desktop/service";
import {
    CardClasses,
    ExplicitTag,
    ImageBrokenIcon,
    OverlayClasses,
    PlayButton,
    PuzzlePieceIcon,
    TrashIcon,
} from "@equicordplugins/songSpotlight.desktop/ui/common";
import AudioPlayer from "@equicordplugins/songSpotlight.desktop/ui/components/AudioPlayer";
import ProgressCircle from "@equicordplugins/songSpotlight.desktop/ui/components/ProgressCircle";
import ServiceIcon from "@equicordplugins/songSpotlight.desktop/ui/components/ServiceIcon";
import { openSettingsModal } from "@equicordplugins/songSpotlight.desktop/ui/settings";
import { RenderInfoEntryBased, RenderSongInfo } from "@song-spotlight/api/handlers";
import { Song as SongType } from "@song-spotlight/api/structs";
import { isListLayout, sid } from "@song-spotlight/api/util";
import { copyWithToast } from "@utils/discord";
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
    useRef,
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

                                const song = await Native.parseLink(entry.link);
                                if (!song) {
                                    return showToast("Uh oh, this song doesn't exist!", Toasts.Type.FAILURE);
                                }

                                if (self.find(x => sid(x) === sid(song))) {
                                    return showToast("You already have this song added!");
                                }

                                openSettingsModal([...self, song]);
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
                    <BaseText size={baseSize} weight="medium">{number}</BaseText>
                </Flex>
                <Flex flexDirection="column" justifyContent="center" gap={0}>
                    <Flex alignItems="center" gap="6px">
                        <BaseText size={subSize} weight="semibold" className={cl("clamped")} title={entry.label}>
                            {entry.label}
                        </BaseText>
                        {entry.explicit && <ExplicitTag />}
                    </Flex>
                    <BaseText size={subSize} weight="normal" className={cl("clamped", "sub")} title={entry.sublabel}>
                        {entry.sublabel}
                    </BaseText>
                </Flex>
            </Flex>
        </Clickable>
    );
}

interface SongInfoProps {
    owned: boolean;
    song: SongType;
    render: RenderSongInfo;
    big?: boolean;
}

function SongInfo({ owned, song, render, big }: SongInfoProps) {
    const [playing, setPlaying] = useState<number | false>(false);
    const [loaded, setLoaded] = useState(new Set<number>());
    const audios = useMemo(() => render.form === "single" ? [render.single] : render.list, [render]);
    const audioRef = useRef<HTMLAudioElement>(undefined);
    const duration = useMemo(
        () => {
            if (playing !== false) {
                return audios[playing].audio?.duration;
            } else {
                return render.form === "single" ? render.single.audio?.duration : undefined;
            }
        },
        [playing, render],
    );

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
                audioRef={audioRef}
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
                                                action={() => copyWithToast(render.link)}
                                            />
                                            {!owned
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

                                                            openSettingsModal([...self, song]);
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

                                                            const i = self.findIndex(x => sid(x) === sid(song));
                                                            if (i === -1) {
                                                                return showToast("You... don't have this song added?");
                                                            }

                                                            openSettingsModal(self.toSpliced(i, 1));
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
                                <Link href={render.link} style={{ display: "contents" }}>
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
                            {render.explicit && <ExplicitTag />}
                        </Flex>
                        <BaseText
                            size={baseSize}
                            weight="normal"
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
                    alignItems="flex-end"
                    gap="6px"
                    className={cl("song-player")}
                    data-idle={playing === false && !big}
                >
                    {duration && (
                        <BaseText size={subSize} weight="medium" className={cl("mono", "sub")}>
                            {formatDurationMs(duration)}
                        </BaseText>
                    )}
                    <div className={cl("song-progress-container")}>
                        <ProgressCircle
                            border={2}
                            audioRef={audioRef}
                            className={cl("song-progress")}
                        />
                        <PlayButton
                            state={playing !== false}
                            disabled={loaded.size < 1}
                            onClick={() => {
                                const loadedI = loaded.values().toArray().sort()[0];
                                if (loadedI === undefined) return;

                                if (playing !== false) setPlaying(false);
                                else setPlaying(loadedI);
                            }}
                        />
                    </div>
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
    song: SongType;
    index: number;
    big?: boolean;
}

export default function Song({ owned, song, index, big }: SongInfoContainerProps) {
    const { failed, render } = useRender(song);

    if (failed) return null;

    return (
        <div
            className={classes(
                OverlayClasses.overlay,
                CardClasses.card,
                cl("song-container", {
                    "list-song-container": isListLayout(song, render || undefined),
                }),
            )}
            style={{
                ["--index" as any]: index.toString(),
            }}
        >
            {render && <SongInfo owned={owned} song={song} render={render} big={big} />}
        </div>
    );
}

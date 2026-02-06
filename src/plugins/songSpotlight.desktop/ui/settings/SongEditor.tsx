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
import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { useRender } from "@plugins/songSpotlight.desktop/service";
import { TrashIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { ServiceIcon } from "@plugins/songSpotlight.desktop/ui/components/ServiceIcon";
import { Song, UserData } from "@song-spotlight/api/structs";
import { sid } from "@song-spotlight/api/util";
import { copyWithToast } from "@utils/discord";
import { LazyComponent } from "@utils/lazyReact";
import {
    ContextMenuApi,
    FluxDispatcher,
    Menu,
    React,
    showToast,
    useCallback,
    useMemo,
    useRef,
    useState,
} from "@webpack/common";
import { DragEvent } from "react";

import { AddSong } from "./AddSong";

interface EditableSongProps {
    song: Song;
    insert?: "top" | "bottom";
    setSongRef(div: HTMLAnchorElement | null): void;
    onDrag(event: DragEvent<HTMLAnchorElement>): void;
    onDrop(song: Song): void;
    onRemove(song: Song): void;
}

const EditableSong = LazyComponent(
    () =>
        React.memo(function EditableSong({ song, insert, setSongRef, onDrag, onDrop, onRemove }: EditableSongProps) {
            const { render, failed } = useRender(song);
            const [dragging, setDragging] = useState(false);

            return (
                <Link
                    href={render?.link}
                    onContextMenu={e =>
                        ContextMenuApi.openContextMenu(e, () => (
                            <Menu.Menu
                                navId="vc-songspotlight-editable-song"
                                onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                                aria-label={render?.label}
                            >
                                <Menu.MenuItem
                                    id="copy-link"
                                    label="Copy link"
                                    icon={LinkIcon}
                                    action={() => render && copyWithToast(render.link)}
                                    disabled={!render}
                                />
                                <Menu.MenuItem
                                    id="remove-song"
                                    color="danger"
                                    label="Remove song"
                                    icon={TrashIcon}
                                    action={() => onRemove(song)}
                                />
                            </Menu.Menu>
                        ))}
                    draggable="true"
                    data-dragging={dragging}
                    data-insert={insert}
                    onDragStart={event => {
                        setDragging(true);
                        onDrag(event);
                    }}
                    onDrag={onDrag}
                    onDragEnd={() => {
                        setDragging(false);
                        onDrop(song);
                    }}
                    ref={div => setSongRef(div)}
                    className={cl("editable-song-container")}
                >
                    <Flex alignItems="center" gap="12px" className={cl("editable-song")}>
                        <ServiceIcon width={28} height={28} service={song.service} />
                        {failed
                            ? <BaseText size="md" weight="normal" className={cl("errored")}>Failed to load!</BaseText>
                            : (
                                <Flex flexDirection="column" justifyContent="center" gap={0}>
                                    <BaseText size="md" weight="medium" className={cl("clamped")}>
                                        {render ? render.label : "..."}
                                    </BaseText>
                                    <BaseText size="sm" weight="normal" className={cl("clamped", "sub")}>
                                        {render ? render.sublabel : "..."}
                                    </BaseText>
                                </Flex>
                            )}
                    </Flex>
                </Link>
            );
        }),
);

type Editable = {
    slot: "song";
    song: Song;
    last: boolean;
} | {
    slot: "add" | "empty";
    song: undefined;
    last: undefined;
};

interface SongEditorProps {
    localData: UserData;
    setLocalData(localData: UserData): void;
}

export function SongEditor({ localData, setLocalData }: SongEditorProps) {
    const editable = useMemo<Editable[]>(
        () => {
            if (!localData) return [];

            return new Array(apiConstants.songLimit).fill(null).map((_, i) => {
                if (localData[i]) {
                    return {
                        slot: "song",
                        song: localData[i],
                        last: !localData[i + 1],
                    };
                } else if (localData[i - 1] || i === 0) return { slot: "add" };
                else return { slot: "empty" };
            });
        },
        [localData],
    );

    const songs = useRef(new Map<number, HTMLAnchorElement>());
    const [insert, setInsert] = useState<number>();

    const handleRef = useCallback((index: number, element: HTMLAnchorElement | null) => {
        if (element) songs.current.set(index, element);
        else songs.current.delete(index);
    }, []);

    const handleDrag = useCallback((index: number, event: DragEvent<HTMLAnchorElement>) => {
        const mapped = songs.current.entries().map(([index, element]) => {
            const rect = element.getBoundingClientRect();
            return {
                index,
                top: rect.top,
                bottom: rect.bottom,
                size: rect.height,
            };
        }).toArray().sort((a, b) => a.index - b.index);

        const last = mapped[mapped.length - 1];
        const spots = [
            ...mapped.map(({ index, top, size }) => ({ spot: index, position: top, size })),
            { spot: last.index + 1, position: last.bottom, size: last.size },
        ].filter(({ spot }) => spot !== index && spot !== index + 1);

        let closest: number | undefined, closestDist = Infinity;
        for (const { spot, position, size } of spots) {
            const dist = Math.abs(event.clientY - position);
            if (dist < closestDist && dist < size) {
                closestDist = dist;
                closest = spot;
            }
        }

        setInsert(closest);
    }, []);

    const handleDrop = useCallback((song: Song) => {
        if (insert === undefined) return;
        setInsert(undefined);

        const i = localData.indexOf(song);
        if (i === -1) return;

        const adjusted = insert > i ? insert - 1 : insert;
        setLocalData(localData.toSpliced(i, 1).toSpliced(adjusted, 0, song));
    }, [localData, insert]);

    const handleAdd = useCallback((song: Song) => {
        if (localData.length >= apiConstants.songLimit) return "Not enough space";
        if (localData.some(x => sid(x) === sid(song))) return "You've already added this song";

        showToast("Added song!");
        setLocalData([
            ...localData,
            song,
        ]);
    }, [localData]);

    const handleRemove = useCallback((song: Song) => {
        const i = localData.indexOf(song);
        if (i === -1) return;

        showToast("Removed song!");
        setLocalData(localData.toSpliced(i, 1));
    }, [localData]);

    return (
        <Flex flexDirection="column" gap="6px">
            {editable.map(({ slot, song, last }, i) => {
                if (slot === "song") {
                    return (
                        <EditableSong
                            song={song}
                            insert={last && insert === i + 1 ? "bottom" : insert === i ? "top" : undefined}
                            setSongRef={element => handleRef(i, element)}
                            onDrag={event => handleDrag(i, event)}
                            onDrop={handleDrop}
                            onRemove={handleRemove}
                            key={sid(song)}
                        />
                    );
                } else if (slot === "add") {
                    return <AddSong onAdd={handleAdd} key={slot} />;
                } else return <div className={cl("empty-song")} key={`${slot}-${i}`} />;
            })}
        </Flex>
    );
}

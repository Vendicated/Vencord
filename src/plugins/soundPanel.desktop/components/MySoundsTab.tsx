/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 cegged
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isLibraryJoinSound } from "@plugins/soundPanel.desktop/audio/joinSound";
import { clipStore, playLibrarySound, stopClip } from "@plugins/soundPanel.desktop/audio/player";
import { LibraryItem, updateItem, useLibrary } from "@plugins/soundPanel.desktop/data/library";
import { settings } from "@plugins/soundPanel.desktop/settings";
import { showError } from "@plugins/soundPanel.desktop/utils/logger";
import { useStore } from "@plugins/soundPanel.desktop/utils/store";
import { useState } from "@webpack/common";

import {
    cl,
    EmptyState,
    FileDropZone,
    formatTime,
    GroupHeader,
    matchesQuery,
    RenameInput,
    SearchBox,
    UploadButton,
    useCollapsedGroups
} from "./common";
import { JoinSoundIcon, StarIcon, StopIcon, WaveformIcon } from "./icons";
import { openLibraryItemMenu } from "./LibraryItemMenu";

const clipLength = (seconds: number) => seconds < 60 ? `${seconds.toFixed(1)}s` : formatTime(seconds);

function SoundTile({ item, playing, joinSound, editing, setEditing }: {
    item: LibraryItem;
    playing: boolean;
    joinSound: boolean;
    editing: boolean;
    setEditing(editing: boolean): void;
}) {
    const onClick = () => {
        if (editing) return;

        if (playing && !settings.store.allowOverlap) {
            stopClip(item.id);
            return;
        }

        playLibrarySound(item).catch(err => showError(`Couldn't play "${item.name}"`, err));
    };

    return (
        <div
            role="button"
            tabIndex={0}
            title={joinSound ? `${item.name} · Join sound` : item.name}
            className={cl("tile", { "tile-playing": playing })}
            onClick={onClick}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && onClick()}
            onContextMenu={e => openLibraryItemMenu(e, item, () => setEditing(true))}
        >
            {editing ? (
                <RenameInput
                    initialValue={item.name}
                    onDone={name => {
                        setEditing(false);
                        if (name && name !== item.name) void updateItem(item.id, { name });
                    }}
                />
            ) : (
                <>
                    {item.favorite && <StarIcon className={cl("tile-star")} size={14} />}
                    <span className={cl("tile-name")}>{item.name}</span>
                    {joinSound && <JoinSoundIcon className={cl("tile-badge", "tile-badge-join")} size={14} />}
                    {item.duration > 0 && <span className={cl("tile-meta")}>{clipLength(item.duration)}</span>}
                </>
            )}
        </div>
    );
}

export function MySoundsTab() {
    const { loaded, items } = useLibrary("sound");
    const playing = useStore(clipStore, s => s.playing);
    const { joinSound } = settings.use(["joinSound"]);
    const [query, setQuery] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [collapsed, toggleGroup] = useCollapsedGroups();

    const visible = items.filter(item => matchesQuery(item.name, query));
    const anyPlaying = items.some(item => playing.includes(item.id));

    const favorites = visible.filter(item => item.favorite);
    const groups = favorites.length === 0 ? null : [
        { id: "favorites", name: "Favorites", items: favorites },
        { id: "others", name: "Other Sounds", items: visible.filter(item => !item.favorite) }
    ].filter(group => group.items.length);

    const tiles = (list: LibraryItem[]) => (
        <div className={cl("grid")}>
            {list.map(item => (
                <SoundTile
                    key={item.id}
                    item={item}
                    playing={playing.includes(item.id)}
                    joinSound={isLibraryJoinSound(joinSound, item.id)}
                    editing={editingId === item.id}
                    setEditing={editing => setEditingId(editing ? item.id : null)}
                />
            ))}
        </div>
    );

    return (
        <FileDropZone kind="sound">
            <div className={cl("tab")}>
                <div className={cl("toolbar")}>
                    <SearchBox value={query} onChange={setQuery} placeholder="Search your sounds" />
                    {anyPlaying && (
                        <button
                            type="button"
                            className={cl("icon-button")}
                            aria-label="Stop your sounds"
                            title="Stop your sounds"
                            onClick={() => items.forEach(item => stopClip(item.id))}
                        >
                            <StopIcon size={16} />
                        </button>
                    )}
                    <UploadButton kind="sound" label="Add" />
                </div>
                <div className={cl("scroller")}>
                    {!loaded ? (
                        <EmptyState icon={<WaveformIcon size={28} />} title="Loading your sounds..." />
                    ) : items.length === 0 ? (
                        <EmptyState icon={<WaveformIcon size={28} />} title="No sounds yet">
                            Click <b>Add</b> or drop audio files here. Right-click a sound to add it to your favorites, make it your join sound, rename it or change its volume.
                        </EmptyState>
                    ) : visible.length === 0 ? (
                        <EmptyState icon={<WaveformIcon size={28} />} title="No sounds match your search" />
                    ) : groups ? groups.map(group => {
                        const isCollapsed = collapsed.has(group.id) && !query;

                        return (
                            <section key={group.id} className={cl("group")}>
                                <GroupHeader
                                    icon={group.id === "favorites"
                                        ? <span className={cl("group-icon", "group-icon-favorites")}><StarIcon size={14} /></span>
                                        : <span className={cl("group-icon", "group-icon-fallback")}><WaveformIcon size={10} /></span>}
                                    name={group.name}
                                    count={group.items.length}
                                    collapsed={isCollapsed}
                                    onToggle={() => toggleGroup(group.id)}
                                />
                                {!isCollapsed && tiles(group.items)}
                            </section>
                        );
                    }) : tiles(visible)}
                </div>
            </div>
        </FileDropZone>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 notjacobwashere and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./gallery.css";

import * as DataStore from "@api/DataStore";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, useEffect, useMemo, UserStore, useState } from "@webpack/common";

import { Native } from "./bridge";
import type { ArchivedAvatar } from "./native";

const PAGE_SIZE = 24;
const SORT_OPTIONS = {
    newest: "Newest collected first",
    oldest: "Oldest collected first",
    animated: "Animated first",
    static: "Static first",
    filename: "Filename A–Z"
};
type SortOrder = keyof typeof SORT_OPTIONS;

export function sortAvatars(avatars: ArchivedAvatar[], order: SortOrder) {
    return [...avatars].sort((a, b) => {
        const newest = b.collectedAt - a.collectedAt || a.filename.localeCompare(b.filename);
        switch (order) {
            case "oldest": return a.collectedAt - b.collectedAt || a.filename.localeCompare(b.filename);
            case "animated": return Number(b.animated) - Number(a.animated) || newest;
            case "static": return Number(a.animated) - Number(b.animated) || newest;
            case "filename": return a.filename.localeCompare(b.filename);
            default: return newest;
        }
    });
}

const AvatarCard = ErrorBoundary.wrap(({ avatar, folder, username }: { avatar: ArchivedAvatar; folder: string; username: string; }) => {
    const [image, setImage] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        void Native.readAvatar(folder, avatar.filename).then(data => {
            if (active) setImage(data);
        }).catch(error => { if (active) setError(String(error)); });
        return () => { active = false; };
    }, [folder, avatar.filename]);
    const date = new Date(avatar.collectedAt);
    return <article className="vc-pfp-card">
        <div className="vc-pfp-image">
            {image ? <img src={image} alt={`${username}'s collected avatar`} loading="lazy" onError={() => setError("This saved image could not be displayed.")} /> : <span>Loading image…</span>}
        </div>
        <strong>{username}</strong>
        <span>{avatar.animated ? "Animated GIF" : "PNG"}</span>
        <span>{avatar.estimatedTime ? "Collected (estimated from file):" : "Collected:"}</span>
        <time dateTime={date.toISOString()}>{date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" })}</time>
        <code className="vc-pfp-filename" title={avatar.filename}>{avatar.filename}</code>
        <Button variant="secondary" onClick={() => {
            void Native.showAvatarInFolder(folder, avatar.filename).catch(error => setError(String(error)));
        }}>Show in folder</Button>
        {error && <p className="vc-pfp-error" role="alert">{error}</p>}
    </article>;
}, { noop: false });

const Gallery = ErrorBoundary.wrap(({ modalProps, folder, initialUserId = "" }: { modalProps: RenderModalProps; folder: string; initialUserId?: string; }) => {
    const [avatars, setAvatars] = useState<ArchivedAvatar[]>([]);
    const [aliases, setAliases] = useState<Record<string, string>>({});
    const [selected, setSelected] = useState(initialUserId);
    const [sort, setSort] = useState<SortOrder>("newest");
    const [page, setPage] = useState(0);
    const [revision, setRevision] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [folderBytes, setFolderBytes] = useState<number | null>(null);
    const [sizeError, setSizeError] = useState("");
    useEffect(() => {
        let active = true;
        setFolderBytes(null);
        setSizeError("");
        void Native.getFolderSize(folder, revision > 0).then(bytes => {
            if (active) setFolderBytes(bytes);
        }).catch(error => { if (active) setSizeError(String(error)); });
        return () => { active = false; };
    }, [folder, revision]);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        void Promise.all([
            Native.listAvatars(folder),
            DataStore.get<Record<string, string>>("PfpWatcher.users")
        ]).then(([records, remembered]) => {
            if (!active) return;
            const names: Record<string, string> = {};
            for (const [entry, id] of Object.entries(remembered ?? {})) {
                if (!/^\d{17,20}$/.test(entry)) names[id] = entry;
            }
            setAliases(names);
            setAvatars(records);
            setSelected(current => current === initialUserId || records.some(a => a.userId === current) ? current : "");
            setPage(0);
        }).catch(error => { if (active) setError(String(error)); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [folder, revision]);

    const users = useMemo(() => {
        const map = new Map<string, { id: string; username: string; count: number; }>();
        for (const avatar of sortAvatars(avatars, "newest")) {
            const user = map.get(avatar.userId);
            if (user) { user.count++; continue; }
            map.set(avatar.userId, {
                id: avatar.userId,
                username: UserStore.getUser(avatar.userId)?.username || avatar.username || aliases[avatar.userId] || avatar.userId,
                count: 1
            });
        }
        return [...map.values()].sort((a, b) => b.count - a.count || a.username.localeCompare(b.username) || a.id.localeCompare(b.id));
    }, [avatars, aliases]);
    const names = new Map(users.map(user => [user.id, user.username]));
    const filtered = useMemo(() => sortAvatars(avatars.filter(a => !selected || a.userId === selected), sort), [avatars, selected, sort]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    return <Modal {...modalProps} size="lg" title="Collected profile pictures" subtitle="Browse the avatars saved in your pfp folder.">
        <div className="vc-pfp-gallery">
            <div className="vc-pfp-summary" role="status" title={sizeError || "Cached total size of files in the PFP folder, including metadata and copies. Refresh reconciles external changes. Symbolic links and temporary downloads are excluded. One MB is 1,000,000 bytes."}>
                Folder size: {sizeError ? "Unavailable" : folderBytes === null ? "Calculating…" : `${(folderBytes / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`}
            </div>
            <div className="vc-pfp-toolbar">
                <label>User
                    <select value={selected} disabled={loading} onChange={event => { setSelected(event.target.value); setPage(0); }}>
                        <option value="">All users ({avatars.length})</option>
                        {selected && !users.some(user => user.id === selected) && <option value={selected}>{UserStore.getUser(selected)?.username || selected} · {selected} (0)</option>}
                        {users.map(user => <option key={user.id} value={user.id}>{user.username} · {user.id} ({user.count})</option>)}
                    </select>
                </label>
                <label>Sort by
                    <select value={sort} onChange={event => { setSort(event.target.value as SortOrder); setPage(0); }}>
                        {Object.entries(SORT_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </label>
                <Button disabled={loading} variant="secondary" onClick={() => setRevision(value => value + 1)}>Refresh</Button>
            </div>
            <p className="vc-pfp-note">Times use your local timezone. Older files without collection records show an estimated file timestamp. Refresh after collecting new pictures.</p>
            {error && <p className="vc-pfp-error" role="alert">{error}</p>}
            {loading ? <p role="status">Loading collection…</p> : <>
                {!filtered.length && <p>{selected ? "No collected avatars for this user yet. Use Save PFP or watch this user to start collecting." : "No collected avatars here yet. Add users in the plugin settings and run Check now."}</p>}
                <div className="vc-pfp-grid">
                    {visible.map(avatar => <AvatarCard key={`${folder}/${avatar.filename}/${revision}`} avatar={avatar} folder={folder} username={names.get(avatar.userId) ?? avatar.userId} />)}
                </div>
                {!!filtered.length && <nav className="vc-pfp-pagination" aria-label="Gallery pages">
                    <Button variant="secondary" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</Button>
                    <span role="status">Page {page + 1} of {pages} · {filtered.length} pictures</span>
                    <Button variant="secondary" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Next</Button>
                </nav>}
            </>}
        </div>
    </Modal>;
}, { noop: false });

export function openGallery(folder: string, initialUserId?: string) {
    openModal(modalProps => <Gallery modalProps={modalProps} folder={folder} initialUserId={initialUserId} />);
}

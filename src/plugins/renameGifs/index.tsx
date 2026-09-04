/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, Menu, React, TextInput } from "@webpack/common";

import * as native from "./native";

const Native = VencordNative.pluginHelpers.RenameGifs as PluginNative<typeof native>;
const ReactDOMModule = findByPropsLazy("createRoot") as any;
const ModalRootAny = ModalRoot as any;
const ModalHeaderAny = ModalHeader as any;
const ModalContentAny = ModalContent as any;
const ModalCloseButtonAny = ModalCloseButton as any;

const backupAvailable = IS_DISCORD_DESKTOP || IS_VESKTOP;

type NameMap = Record<string, string>;
type SortCache = { arrRef: any[] | null; version: number; sorted: any[]; };
type HoverState = { name: string; x: number; y: number; centered: boolean; visible: boolean; };

const dataStoreKey = "RenameGifs_names";
const hoverLabelGapPx = 2;
const emptySortCache: SortCache = { arrRef: null, version: -1, sorted: [] };

// cdn.discordapp.com and media.discordapp.net serve the same attachments, so
// a name saved through one host still matches when the gif renders via the other
const discordCdnHosts = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

let nameCache: NameMap = {};
let filenameIndex: NameMap = {};
let nameCacheVersion = 0;
let sortCache: SortCache = emptySortCache;
let lastFavorites: any[] = [];
let pickerObserver: MutationObserver | null = null;
let hoverContainer: HTMLDivElement | null = null;
let hoverRoot: any = null;
let setHoverState: ((s: HoverState) => void) | null = null;

const settings = definePluginSettings({
    backupFolderPath: {
        type: OptionType.STRING,
        description:
            "Folder to keep a backup copy of your renamed gifs in (as renamedGifsBackup.json). " +
            "Leave this empty to disable backups. Must point to a folder that already exists, " +
            "ideally an empty one you made yourself somewhere safe, like a subfolder inside your " +
            "Downloads or Documents. Desktop only, unavailable on the web build.",
        default: "",
    },
    saveBackupNow: {
        type: OptionType.COMPONENT,
        description: "Write your current renamed gif names to the backup file right now",
        component: () => backupAvailable
            ? <Button onClick={() => void manualSaveBackup()}>Save backup now</Button>
            : <Forms.FormText>Backup is unavailable on the web build</Forms.FormText>,
    },
    loadBackupNow: {
        type: OptionType.COMPONENT,
        description: "Load names from the backup file, replacing what is currently saved",
        component: () => backupAvailable
            ? <Button color={Button.Colors.RED} onClick={() => void manualLoadBackup()}>Load backup now</Button>
            : <Forms.FormText>Backup is unavailable on the web build</Forms.FormText>,
    },
    resetAll: {
        type: OptionType.COMPONENT,
        description: "Clear all renamed GIF names from Vencord and overwrite the backup file with an empty map",
        component: () => (
            <Button color={Button.Colors.RED} onClick={() => void resetAll()}>Reset all names</Button>
        ),
    },
});

function notify(body: string) {
    showNotification({ title: "RenameGifs", body });
}

// naming

function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);

        // discord proxies external images through /external/<hash>/https/<real-url>
        const externalMatch = u.pathname.match(/^\/external\/[^/]+\/https?\/(.+)$/);
        if (externalMatch) return normalizeUrl(`https://${externalMatch[1]}`);

        if (discordCdnHosts.has(u.hostname)) return "discord-cdn" + u.pathname;
        return u.hostname + u.pathname;
    } catch {
        return url;
    }
}

// keys saved before host unification were plain host/path strings so reparse
// them so old names keep matching
function migrateKey(oldKey: string): string {
    try {
        return normalizeUrl(`https://${oldKey}`);
    } catch {
        return oldKey;
    }
}

function filenameFor(url: string): string {
    try {
        const parts = new URL(url).pathname.split("/");
        const filename = parts[parts.length - 1];
        return decodeURIComponent(filename.replace(/\.[^.]+$/, "")).toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

// bare filenames collide across unrelated attachments (e.g. gif conversion
// bots that always name output togif.gif), so the fallback identity match
// uses the last two path segments instead, usually attachment id and filename,
// which is unique per gif even when the filename alone is not
function matchKeyFromNormalized(normalized: string): string {
    const segments = normalized.split("/").filter(Boolean);
    const tail = segments.slice(-2).join("/");
    return decodeURIComponent(tail.replace(/\.[^./]+$/, "")).toLowerCase();
}

function matchKeyFor(url: string): string {
    return matchKeyFromNormalized(normalizeUrl(url));
}

function displayNameFor(url: string): string {
    return nameCache[normalizeUrl(url)] ?? filenameIndex[matchKeyFor(url)] ?? "";
}

function sortKeyFor(url: string): string {
    return displayNameFor(url) || filenameFor(url);
}

async function getNameMap(): Promise<NameMap> {
    return (await DataStore.get(dataStoreKey)) ?? {};
}

function applyNameMap(map: NameMap) {
    nameCache = map;
    filenameIndex = {};
    for (const key of Object.keys(map)) {
        filenameIndex[matchKeyFromNormalized(key)] = map[key];
    }
    nameCacheVersion++;
    sortCache = emptySortCache;
}

// some providers (e.g. klipy) expose a page or share link as the favorite
// url while the actual rendered media lives at a different address, when
// both are known, save the name under each so rename (which resolves the
// rendered src) and search (which reads the favorite url) agree
async function setName(url: string, name: string, aliasUrl?: string) {
    const key = normalizeUrl(url);
    const map = await getNameMap();
    const trimmed = name.trim();

    if (trimmed === "") delete map[key];
    else map[key] = trimmed;

    if (aliasUrl) {
        const aliasKey = normalizeUrl(aliasUrl);
        if (trimmed === "") delete map[aliasKey];
        else map[aliasKey] = trimmed;
    }

    await DataStore.set(dataStoreKey, map);
    applyNameMap(map);
    await persistBackupToDisk(map);
}

async function clearName(url: string, aliasUrl?: string) {
    await setName(url, "", aliasUrl);
}

// backup file

function getBackupFolderPath(): string {
    return settings.store.backupFolderPath?.trim() ?? "";
}

function requireBackupFolder(): string | null {
    if (!backupAvailable) {
        notify("Backup is unavailable on the web build.");
        return null;
    }

    const folderPath = getBackupFolderPath();
    if (!folderPath) notify("Set a backup folder path in the plugin settings first.");
    return folderPath || null;
}

// writes the map to disk, logs on failure always, and optionally surfaces a
// toast either way, shared by the silent auto backup and the manual button
async function writeBackup(folderPath: string, map: NameMap, opts: { notifyOnResult?: boolean; } = {}): Promise<boolean> {
    const result = await Native.saveBackup(folderPath, JSON.stringify(map, null, 2));

    if (!result.success) {
        console.error("RenameGifs failed to write backup file", result.error);
        if (opts.notifyOnResult) notify(`Backup failed: ${result.error}`);
    } else if (opts.notifyOnResult) {
        notify("Backup saved.");
    }

    return result.success;
}

async function persistBackupToDisk(map: NameMap) {
    if (!backupAvailable) return;

    const folderPath = getBackupFolderPath();
    if (folderPath) await writeBackup(folderPath, map);
}

async function manualSaveBackup() {
    const folderPath = requireBackupFolder();
    if (folderPath) await writeBackup(folderPath, await getNameMap(), { notifyOnResult: true });
}

async function manualLoadBackup() {
    const folderPath = requireBackupFolder();
    if (!folderPath) return;

    const result = await Native.loadBackup(folderPath);
    if (!result.success) {
        console.error("RenameGifs failed to read backup file", result.error);
        notify(`Load failed: ${result.error}`);
        return;
    }

    try {
        const map: NameMap = JSON.parse(result.data!);
        await DataStore.set(dataStoreKey, map);
        applyNameMap(map);
        notify("Backup loaded.");
    } catch (err) {
        console.error("RenameGifs backup file was not valid json", err);
        notify("Backup file was not valid json.");
    }
}

async function resetAll() {
    await DataStore.del(dataStoreKey);
    applyNameMap({});

    if (backupAvailable) {
        const folderPath = getBackupFolderPath();
        if (folderPath) await writeBackup(folderPath, {});
    }

    notify("All renamed GIFs cleared.");
}

// search / sort patch

function getSorted(favorites: any[]): any[] {
    if (sortCache.arrRef === favorites && sortCache.version === nameCacheVersion) {
        return sortCache.sorted;
    }
    const sorted = [...favorites].sort((a, b) =>
        sortKeyFor(a.url).localeCompare(sortKeyFor(b.url), undefined, { sensitivity: "base", numeric: true })
    );
    sortCache = { arrRef: favorites, version: nameCacheVersion, sorted };
    return sorted;
}

// react attaches the live fiber node straight onto the dom element under a
// key like __reactFiber$xxxx, this is the backdoor into the component tree
function getFiber(el: HTMLElement): any | null {
    const fiberKey = Object.keys(el).find(k => k.startsWith("__reactFiber$"));
    return fiberKey ? (el as any)[fiberKey] : null;
}

// walks a fiber tree up through parents (node.return) until visit returns
// something other than undefined, shared by the two lookups below
function walkFiberUp<T>(fiber: any, visit: (node: any) => T | undefined, maxDepth = Infinity): T | null {
    for (let depth = 0; fiber && depth < maxDepth; depth++, fiber = fiber.return) {
        const result = visit(fiber);
        if (result !== undefined) return result;
    }
    return null;
}

// this module loads and executes normally (confirmed, it is not a load
// order issue), but vencord module search (find/findByCode/waitFor) is
// unable to locate it through any tested strategy, grab a live instance
// off its fiber and monkeypatch the prototype directly instead,
// since standard patching is not viable here
function tryPatchRenderContent(): boolean {
    if ((window as any).__RenameGifsPatched) return true;

    for (const input of Array.from(document.querySelectorAll("input, textarea"))) {
        const proto = walkFiberUp(getFiber(input as HTMLElement), node =>
            typeof node.type === "function" && node.type.prototype?.renderContent ? node.type.prototype : undefined
        );
        if (proto) {
            patchRenderContentProto(proto);
            return true;
        }
    }
    return false;
}

let patchedRenderContentProto: any = null;

function patchRenderContentProto(proto: any) {
    if (proto.__RenameGifsOriginal) {
        (window as any).__RenameGifsPatched = true;
        patchedRenderContentProto = proto;
        return;
    }

    proto.__RenameGifsOriginal = proto.renderContent;
    proto.renderContent = function (...args: any[]) {
        return patchPickerResult(this, proto.__RenameGifsOriginal.apply(this, args));
    };

    (window as any).__RenameGifsPatched = true;
    patchedRenderContentProto = proto;
}

function unpatchRenderContentProto() {
    const proto = patchedRenderContentProto;
    if (proto?.__RenameGifsOriginal) {
        proto.renderContent = proto.__RenameGifsOriginal;
        delete proto.__RenameGifsOriginal;
    }
    patchedRenderContentProto = null;
}

// re sorts and filters the pickers favorites by custom name instead of
// discord default most recent first order, once the user starts typing
function patchPickerResult(component: any, result: any) {
    try {
        if (!result?.props || !Array.isArray(result.props.data)) return result;

        const favorites = component.props.favorites ?? [];
        lastFavorites = favorites;

        const query: string = (component.props.query ?? "").trim();
        if (!query) return result;

        const q = query.toLowerCase().replace(/[-_ ]/g, "");
        const filtered = getSorted(favorites).filter((g: any) =>
            sortKeyFor(g.url).toLowerCase().replace(/[-_ ]/g, "").includes(q)
        );

        return React.cloneElement(result, { data: filtered, key: `gfp-${query}-${filtered.length}` });
    } catch (err) {
        console.error("RenameGifs renderContent patch error", err);
        return result;
    }
}

function startWatchingForPicker() {
    if (tryPatchRenderContent()) return;
    pickerObserver = new MutationObserver(() => {
        if (tryPatchRenderContent()) {
            pickerObserver?.disconnect();
            pickerObserver = null;
        }
    });
    pickerObserver.observe(document.body, { childList: true, subtree: true });
}

// rename context menu

// the various picker and favorite components each stash the gif url under a
// slightly different prop name depending on where in the tree they sit
function extractUrlFromProps(props: any): string | undefined {
    return props?.favoriteGif?.url ?? props?.gif?.url ?? props?.item?.url ??
        props?.data?.url ?? props?.favorite?.url ??
        (typeof props?.url === "string" ? props.url : undefined);
}

// walks up a fiber tree looking for a gif or favorite url on any ancestor
// props, for when the clicked element itself carries no src
function findFavoriteUrlFromElement(el: HTMLElement): string | null {
    return walkFiberUp(
        getFiber(el),
        node => {
            const url = extractUrlFromProps(node.memoizedProps ?? node.pendingProps);
            return url || undefined;
        },
        25
    );
}

// walks target and its ancestors looking for an img or video src or a css
// background image on that element itself; the nested img/video fallback is
// only tried on the original target (i === 0), trying it on ancestors too
// would match the first media anywhere inside them, grabbing the wrong gif.
// when clientX/clientY are given, the nested match is also required to sit
// under the cursor, since the original target can still be a large wrapper
// (e.g. a gap between grid cells) that happens to contain an unrelated gif
function findMediaSrcFromTarget(target: HTMLElement, clientX: number | null, clientY: number | null): string | null {
    let el: HTMLElement | null = target;
    for (let i = 0; i < 5 && el; i++, el = el.parentElement) {
        if (el instanceof HTMLImageElement && el.src) return el.src;
        if (el instanceof HTMLVideoElement && el.src) return el.src;

        if (i === 0) {
            const nested = el.querySelector?.("img, video") as HTMLImageElement | HTMLVideoElement | null;
            if (nested?.src) {
                if (clientX === null || clientY === null) return nested.src;

                const rect = nested.getBoundingClientRect();
                if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                    return nested.src;
                }
            }
        }

        const match = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        if (match) return match[1];
    }
    return null;
}

const gifContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    // prefer the rendered src over the picker props, some providers (e.g.
    // klipy) store a page or share link there instead of the actual asset url
    let gifUrl: string | undefined;

    if (props?.target instanceof HTMLElement) gifUrl = findMediaSrcFromTarget(props.target, null, null) ?? undefined;

    let aliasUrl = extractUrlFromProps(props) ?? extractUrlFromProps(props?.config);
    if (!aliasUrl && props?.target instanceof HTMLElement) aliasUrl = findFavoriteUrlFromElement(props.target) ?? undefined;

    gifUrl ??= aliasUrl;
    gifUrl ??= "UNKNOWN_URL";
    if (aliasUrl === gifUrl) aliasUrl = undefined;

    tryPatchRenderContent();

    children.push(
        <Menu.MenuItem
            id="rename-favorite-gif"
            label="Rename Favorite"
            action={() => openModal(modalProps => <RenameModal modalProps={modalProps} gifUrl={gifUrl!} aliasUrl={aliasUrl} />)}
        />
    );
};

function RenameModal({ modalProps, gifUrl, aliasUrl }: { modalProps: any; gifUrl: string; aliasUrl?: string; }) {
    const currentName = displayNameFor(gifUrl);
    const [name, setName_] = React.useState(currentName);

    return (
        <ModalRootAny {...modalProps} size={ModalSize.SMALL}>
            <ModalHeaderAny>
                <Forms.FormTitle tag="h2">Rename Favorite GIF</Forms.FormTitle>
                <ModalCloseButtonAny onClick={modalProps.onClose} />
            </ModalHeaderAny>

            <ModalContentAny>
                <div style={{ margin: "16px 0" }}>
                    <Forms.FormText style={{ marginBottom: 8, wordBreak: "break-all", opacity: 0.6, fontSize: 11 }}>
                        {gifUrl}
                    </Forms.FormText>
                    <Forms.FormText style={{ marginBottom: 8, opacity: 0.7, fontSize: 12 }}>
                        Filename: {filenameFor(gifUrl)}
                    </Forms.FormText>
                    <TextInput
                        value={name}
                        onChange={setName_}
                        placeholder={`Custom name (default: ${filenameFor(gifUrl)})`}
                        autoFocus={true}
                    />
                </div>

                <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
                    <Button onClick={async () => { await setName(gifUrl, name, aliasUrl); modalProps.onClose(); }}>
                        Apply
                    </Button>
                    {currentName !== "" && (
                        <Button color={Button.Colors.RED} onClick={async () => { await clearName(gifUrl, aliasUrl); modalProps.onClose(); }}>
                            Clear name
                        </Button>
                    )}
                </div>
            </ModalContentAny>
        </ModalRootAny>
    );
}

// hover label

function HoverLabel() {
    const [state, setState] = React.useState<HoverState>({ name: "", x: 0, y: 0, centered: false, visible: false });
    setHoverState = setState;

    if (!state.visible) return null;

    return (
        <div
            style={{
                position: "fixed",
                left: state.x,
                top: state.y,
                transform: state.centered ? "translate(-50%, -100%)" : undefined,
                zIndex: 9999,
                color: "white",
                fontSize: 12,
                fontWeight: 600,
                textShadow: "0 1px 3px rgba(0,0,0,0.85)",
                pointerEvents: "none",
                whiteSpace: "nowrap",
            }}
        >
            {state.name}
        </div>
    );
}

function mountHoverLabel() {
    hoverContainer = document.createElement("div");
    document.body.appendChild(hoverContainer);
    hoverRoot = ReactDOMModule.createRoot(hoverContainer);
    hoverRoot.render(<HoverLabel />);
}

function unmountHoverLabel() {
    hoverRoot?.unmount();
    hoverContainer?.remove();
    hoverContainer = null;
    hoverRoot = null;
    setHoverState = null;
}

// discord keeps the favorite star button in the DOM at all times and just
// toggles css visibility, so any hover can locate it. class hash suffixes
// change between builds, so this matches a stable substring instead
function findFavButtonNear(target: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = target;
    for (let i = 0; i < 6 && el; i++, el = el.parentElement) {
        const btn = el.querySelector?.('[class*="favButton"]') as HTMLElement | null;
        if (btn) return btn;
    }
    return null;
}

function onGifMouseOver(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const src = findMediaSrcFromTarget(target, e.clientX, e.clientY);
    const name = src ? displayNameFor(src) : "";

    if (!name) {
        setHoverState?.({ name: "", x: 0, y: 0, centered: false, visible: false });
        return;
    }

    const favButton = findFavButtonNear(target);
    if (favButton) {
        const rect = favButton.getBoundingClientRect();
        setHoverState?.({ name, x: rect.left + rect.width / 2, y: rect.top - hoverLabelGapPx, centered: true, visible: true });
    } else {
        setHoverState?.({ name, x: e.clientX + 14, y: e.clientY + 14, centered: false, visible: true });
    }
}

function onGifMouseOut() {
    setHoverState?.({ name: "", x: 0, y: 0, centered: false, visible: false });
}

function startHoverLabels() {
    mountHoverLabel();
    document.addEventListener("mouseover", onGifMouseOver, true);
    document.addEventListener("mouseout", onGifMouseOut, true);
}

function stopHoverLabels() {
    document.removeEventListener("mouseover", onGifMouseOver, true);
    document.removeEventListener("mouseout", onGifMouseOut, true);
    unmountHoverLabel();
}

// plugin

async function loadAndMigrateNames() {
    const map = await getNameMap();
    const migrated = Object.fromEntries(Object.entries(map).map(([key, value]) => [migrateKey(key), value]));
    const changed = Object.keys(map).some(key => migrateKey(key) !== key);

    applyNameMap(migrated);
    if (changed) await DataStore.set(dataStoreKey, migrated);
}

export default definePlugin({
    name: "renameGifs",
    description: "Rename favorited GIFs, search by name, and see names on hover",
    authors: [Devs.tntrent],
    settings,

    start() {
        loadAndMigrateNames();
        addContextMenuPatch("gif-picker", gifContextMenuPatch);
        startWatchingForPicker();
        startHoverLabels();
    },

    stop() {
        removeContextMenuPatch("gif-picker", gifContextMenuPatch);
        pickerObserver?.disconnect();
        pickerObserver = null;
        unpatchRenderContentProto();
        delete (window as any).__RenameGifsPatched;
        stopHoverLabels();
    }
});

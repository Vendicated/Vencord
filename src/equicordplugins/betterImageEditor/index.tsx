/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { classes, pluralise } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { Alerts, Button, React, showToast, useCallback, useEffect, useRef, useState } from "@webpack/common";

import { cl, croppedLabel, Shelf } from "./components/Shelf";
import { add, clear, CropState, currentApplied, Entry, exportAll, forget, forgetCrops, getFile, getThumbs, Group, importAll, Kind, previousApplied, readIndex, recordApplied, saveCrop, toDataUrl, togglePin, touch } from "./library";

interface PickResult {
    imageUri: string;
    file: File;
}

interface CropResult extends PickResult {
    staticImageUri?: string;
    transform: CropState;
}

interface PickerProps {
    allowRecentAvatarsSelection?: boolean;
    maxFileSizeBytes?: number;
}

interface PendingChanges {
    guildId?: string;
    pendingAvatar?: { imageUri: string; } | null;
    pendingBanner?: { imageUri: string; } | null;
}

interface EditorProps {
    file?: File;
    imageUri?: string;
    originalAsset?: unknown;
    uploadType?: string;
    initialTransform?: CropState | null;
    onCrop?(result: CropResult): unknown;
    bieShelf?: React.ReactNode;
}

interface Picked {
    id: string;
    uri: string;
    file: File;
    group: Group;
}

const logger = new Logger("BetterImageEditor");

const settings = definePluginSettings({
    librarySize: {
        type: OptionType.SLIDER,
        description: "How many pictures to keep on each shelf.",
        markers: [6, 12, 24, 48, 100],
        default: 24,
        stickToMarkers: true
    },
    rememberCrop: {
        type: OptionType.BOOLEAN,
        description: "Restore the zoom and position you last used for a picture.",
        default: true
    },
    forgetFraming: {
        type: OptionType.COMPONENT,
        description: "Drop every remembered crop and open each picture the way Discord would.",
        component: () => (
            <Button
                color={Button.Colors.PRIMARY}
                onClick={() => Alerts.show({
                    title: "Forget every remembered crop?",
                    body: "Your pictures stay. Each one opens unframed from now on, until you crop it again.",
                    confirmColor: Button.Colors.RED,
                    confirmText: "Forget",
                    cancelText: "Cancel",
                    onConfirm: () => forgetCrops()
                        .then(count => showToast({
                            text: count ? `Forgot the framing on ${pluralise(count, "picture")}` : "Nothing was framed",
                            variant: "success"
                        }))
                        .catch(err => logger.error("could not forget the remembered crops", err))
                })}
            >
                Forget remembered framing
            </Button>
        )
    },
    saveCropped: {
        type: OptionType.BOOLEAN,
        description: "Keep a copy of each picture after you crop it.",
        default: true
    },
    askBeforeSavingCropped: {
        type: OptionType.BOOLEAN,
        description: "Ask first, instead of keeping the cropped copy automatically.",
        default: false
    },
    transfer: {
        type: OptionType.COMPONENT,
        description: "Carry your pictures, and how each one is framed, to another device.",
        component: () => (
            <div className={cl("buttons")}>
                <Button color={Button.Colors.PRIMARY} onClick={exportLibrary}>Export to a file</Button>
                <Button color={Button.Colors.PRIMARY} onClick={importLibrary}>Import from a file</Button>
            </div>
        )
    },
    clearLibrary: {
        type: OptionType.COMPONENT,
        description: "Throw away every picture you have saved.",
        component: () => (
            <Button
                color={Button.Colors.PRIMARY}
                onClick={() => Alerts.show({
                    title: "Clear saved pictures?",
                    body: "Every picture you have saved here goes, along with the crop remembered for each one. Discord's own archive and your current avatar and banner are not touched.",
                    confirmColor: Button.Colors.RED,
                    confirmText: "Clear",
                    cancelText: "Cancel",
                    onConfirm: () => clear().catch(err => logger.error("could not clear the library", err))
                })}
            >
                Clear saved pictures
            </Button>
        )
    }
});

let handoff: { id: string; transform: CropState | null; file: File; } | null = null;
let offered: { kind: Kind; id: string; uris: (string | undefined)[]; } | null = null;
const handedOver = new Map<string, string | null>();

const PENDING = [["AVATAR", "pendingAvatar"], ["BANNER", "pendingBanner"]] as const;

function offer(kind: Kind, id: string, uris: (string | undefined)[]) {
    offered = { kind, id, uris };
}

const kindOf = (uploadType?: string): Kind => uploadType || "AVATAR";

const EXTENSIONS: Record<string, string> = {
    "image/gif": "gif",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp"
};

const FILENAME = "better-image-editor.json";

async function exportLibrary() {
    try {
        const data = new TextEncoder().encode(await exportAll());

        if (IS_DISCORD_DESKTOP) DiscordNative.fileManager.saveWithDialog(data, FILENAME);
        else saveFile(new File([data], FILENAME, { type: "application/json" }));
    } catch (err) {
        logger.error("could not export the library", err);
        showToast({ text: "Could not export your pictures", variant: "critical" });
    }
}

async function readChosenFile() {
    if (!IS_DISCORD_DESKTOP) return (await chooseFile("application/json"))?.text() ?? null;

    const [file] = await DiscordNative.fileManager.openFiles({
        filters: [{ name: "Picture library", extensions: ["json"] }]
    });
    return file ? new TextDecoder().decode(file.data) : null;
}

async function importLibrary() {
    try {
        const json = await readChosenFile();
        if (!json) return;

        const added = await importAll(json, settings.store.librarySize);
        showToast({
            text: added ? `Added ${pluralise(added, "picture")}` : "Nothing new in that file",
            variant: "success"
        });
    } catch (err) {
        logger.error("could not import the library", err);
        showToast({ text: "Could not read that file", variant: "critical" });
    }
}

function useLibrary(kind: Kind) {
    const [group, setGroup] = useState<Group>("original");
    const [version, setVersion] = useState(0);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [thumbs, setThumbs] = useState<Record<string, string>>({});
    const [worn, setWorn] = useState<string | null>(null);

    const bump = useCallback(() => setVersion(v => v + 1), []);

    useEffect(() => () => Object.values(thumbs).forEach(URL.revokeObjectURL), [thumbs]);

    useEffect(() => {
        let live = true;

        (async () => {
            const mine = (await readIndex())
                .filter(entry => entry.kind === kind && entry.group === group)
                .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.used ?? b.added) - (a.used ?? a.added));
            const blobs = await getThumbs(mine.map(entry => entry.id));
            if (!live) return;

            const next: Record<string, string> = {};
            mine.forEach((entry, index) => {
                const blob = blobs[index];
                if (blob) next[entry.id] = URL.createObjectURL(blob);
            });

            setThumbs(next);
            setEntries(mine);
        })();

        return () => { live = false; };
    }, [kind, group, version]);

    useEffect(() => {
        currentApplied(kind)
            .then(setWorn)
            .catch(err => logger.error("could not read what you are wearing", err));
    }, [kind, version]);

    return { group, setGroup, entries, thumbs, worn, version, bump };
}

function useForget(bump: () => void) {
    return useCallback((entry: Entry, immediate: boolean) => {
        const run = () => forget(entry.id)
            .then(bump)
            .catch(err => logger.error("could not remove that picture", err));

        if (immediate) return void run();

        Alerts.show({
            title: "Remove this picture?",
            body: `${entry.name} goes from your saved pictures, along with the crop remembered for it.`,
            confirmColor: Button.Colors.RED,
            confirmText: "Remove",
            cancelText: "Cancel",
            onConfirm: run
        });
    }, [bump]);
}

let editorsOpen = 0;
let gatedPickers = 0;

function usePasteAndDrop(accept: (file: File) => void, active: () => boolean) {
    useEffect(() => {
        const imageIn = (list: FileList | undefined) =>
            [...(list ?? [])].find(file => file.type.startsWith("image/"));

        const take = (file: File | undefined, event: Event) => {
            if (!file || !active()) return;
            event.preventDefault();
            event.stopPropagation();
            accept(file);
        };

        const onPaste = (event: ClipboardEvent) => take(imageIn(event.clipboardData?.files), event);
        const onDrop = (event: DragEvent) => take(imageIn(event.dataTransfer?.files), event);
        const onDragOver = (event: DragEvent) => {
            if (!active() || !event.dataTransfer?.types.includes("Files")) return;
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener("paste", onPaste, true);
        document.addEventListener("drop", onDrop, true);
        document.addEventListener("dragover", onDragOver, true);

        return () => {
            document.removeEventListener("paste", onPaste, true);
            document.removeEventListener("drop", onDrop, true);
            document.removeEventListener("dragover", onDragOver, true);
        };
    }, [accept, active]);
}

function EditorGate() {
    useEffect(() => {
        gatedPickers++;
        return () => { gatedPickers--; };
    }, []);

    return null;
}

function PickerShelf({ kind, open, complete, maxSize }: {
    kind: Kind;
    open(imageUri: string, file: File): void;
    complete(result: PickResult): void;
    maxSize?: number;
}) {
    const { group, setGroup, entries, thumbs, worn, version, bump } = useLibrary(kind);
    const onForget = useForget(bump);

    const hand = useCallback(async (id: string, file: File, crop: CropState | null) => {
        handoff = { id, transform: crop, file };
        open(await toDataUrl(file), file);
    }, [open]);

    const [putBack, setPutBack] = useState<Entry | null>(null);

    useEffect(() => {
        previousApplied(kind)
            .then(setPutBack)
            .catch(err => logger.error("could not read what you wore before", err));
    }, [kind, version]);

    const onPick = useCallback(async (entry: Entry) => {
        const blob = await getFile(entry.id);
        if (!blob) return showToast({ text: "That picture is missing", variant: "critical" });

        const file = new File([blob], entry.name, { type: blob.type });
        await touch(entry.id);
        bump();

        if (entry.group === "cropped") {
            const uri = await toDataUrl(blob);
            offer(kind, entry.id, [uri]);
            return complete({ imageUri: uri, file });
        }

        await hand(entry.id, file, settings.store.rememberCrop ? entry.crop ?? null : null);
    }, [hand, complete, kind, bump]);

    const onPin = useCallback((entry: Entry) => {
        togglePin(entry.id).then(bump).catch(err => logger.error("could not pin that picture", err));
    }, [bump]);

    const accept = useCallback(async (file: File) => {
        if (maxSize && file.size > maxSize) return showToast({ text: "That picture is too big for Discord", variant: "critical" });

        try {
            const entry = await add(file, kind, "original", settings.store.librarySize);
            bump();
            await hand(entry.id, file, settings.store.rememberCrop ? entry.crop ?? null : null);
        } catch (err) {
            logger.error("could not take that picture", err);
            showToast({ text: "Could not use that picture", variant: "critical" });
        }
    }, [kind, hand, bump, maxSize]);

    usePasteAndDrop(accept, useCallback(() => editorsOpen === 0, []));

    return (
        <Shelf
            kind={kind}
            group={group}
            entries={entries}
            thumbs={thumbs}
            activeId={null}
            wornId={worn}
            onGroup={setGroup}
            onPick={onPick}
            onPin={onPin}
            onForget={onForget}
            onPutBack={putBack ? () => onPick(putBack) : undefined}
        />
    );
}

function EditorShelf({ Original, ownProps }: { Original: React.ComponentType<EditorProps>; ownProps: EditorProps; }) {
    const kind = kindOf(ownProps.uploadType);

    const { group, setGroup, entries, thumbs, worn, bump } = useLibrary(kind);
    const onForget = useForget(bump);

    const [picked, setPicked] = useState<Picked | null>(null);
    const [transform, setTransform] = useState<CropState | null>(() => handoff && handoff.file === ownProps.file ? handoff.transform : null);

    const incomingId = useRef<string | null>(null);
    const pickedId = useRef<string | null>(null);
    const pickedName = useRef<string | null>(null);
    const pickedGroup = useRef<Group>("original");

    pickedId.current = picked?.id ?? null;
    pickedGroup.current = picked?.group ?? "original";
    pickedName.current = picked?.file.name ?? ownProps.file?.name ?? null;

    const show = useCallback(async (id: string, file: File, crop: CropState | null, group: Group = "original") => {
        setTransform(crop);
        setPicked({ id, uri: await toDataUrl(file), file, group });
    }, []);

    useEffect(() => {
        const incoming = handoff;
        handoff = null;

        if (incoming && incoming.file === ownProps.file) {
            incomingId.current = incoming.id;
            return;
        }

        const { file } = ownProps;
        if (!(file instanceof File) || !file.type.startsWith("image/")) return;

        add(file, kind, "original", settings.store.librarySize)
            .then(entry => {
                incomingId.current = entry.id;
                bump();
                if (entry.crop && settings.store.rememberCrop) return show(entry.id, file, entry.crop);
            })
            .catch(err => logger.error("could not save that picture", err));
    }, []);

    useEffect(() => {
        editorsOpen++;
        return () => { editorsOpen--; };
    }, []);

    const accept = useCallback(async (file: File) => {
        try {
            const entry = await add(file, kind, "original", settings.store.librarySize);
            setGroup("original");
            bump();
            await show(entry.id, file, settings.store.rememberCrop ? entry.crop ?? null : null);
        } catch (err) {
            logger.error("could not take that picture", err);
            showToast({ text: "Could not use that picture", variant: "critical" });
        }
    }, [kind, show, bump, setGroup]);

    usePasteAndDrop(accept, useCallback(() => true, []));

    const onPick = useCallback(async (entry: Entry) => {
        const blob = await getFile(entry.id);
        if (!blob) return showToast({ text: "That picture is missing", variant: "critical" });

        await touch(entry.id);
        bump();
        await show(entry.id, new File([blob], entry.name, { type: blob.type }), settings.store.rememberCrop ? entry.crop ?? null : null, entry.group);
    }, [show, bump]);

    const onPin = useCallback((entry: Entry) => {
        togglePin(entry.id).then(bump).catch(err => logger.error("could not pin that picture", err));
    }, [bump]);

    const keepCropped = useCallback((result: CropResult) => {
        const uri = result.imageUri;
        const source = pickedId.current ?? incomingId.current ?? undefined;
        const save = async () => {
            const stem = (pickedName.current ?? "picture").replace(/\.[^.]+$/, "");
            const blob = await fetch(uri).then(r => r.blob());
            const name = `${stem} (cropped).${EXTENSIONS[blob.type] ?? "png"}`;

            await add(new File([blob], name, { type: blob.type }), kind, "cropped", settings.store.librarySize, source);
            bump();
        };
        const run = () => save().catch(err => {
            logger.error("could not keep the cropped copy", err);
            showToast({ text: "Could not keep the cropped copy", variant: "critical" });
        });

        if (!settings.store.askBeforeSavingCropped) return void run();

        Alerts.show({
            title: "Keep the cropped copy?",
            body: `It goes on the ${croppedLabel(kind).toLowerCase()} shelf, next to your originals.`,
            confirmText: "Keep",
            cancelText: "No thanks",
            onConfirm: run
        });
    }, [kind, bump]);

    const onCrop = useCallback((result: CropResult) => {
        const id = pickedId.current ?? incomingId.current;

        if (id) offer(kind, id, [result.imageUri, result.staticImageUri]);
        if (id && result.transform && settings.store.rememberCrop) {
            saveCrop(id, result.transform).catch(err => logger.error("could not remember that crop", err));
        }

        if (settings.store.saveCropped && pickedGroup.current !== "cropped") keepCropped(result);

        return ownProps.onCrop?.(result);
    }, [ownProps.onCrop, keepCropped, kind]);

    const props = picked
        ? { ...ownProps, imageUri: picked.uri, file: picked.file, originalAsset: null, onCrop, initialTransform: transform }
        : { ...ownProps, onCrop, initialTransform: transform ?? ownProps.initialTransform };

    return (
        <Original
            key={picked?.id ?? "incoming"}
            {...props}
            bieShelf={
                <ErrorBoundary noop>
                    <div className={cl("drawer")} onMouseDown={event => {
                        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
                    }}>
                        <Shelf
                            kind={kind}
                            group={group}
                            entries={entries}
                            thumbs={thumbs}
                            activeId={picked?.id ?? null}
                            wornId={worn}
                            onGroup={setGroup}
                            onPick={onPick}
                            onPin={onPin}
                            onForget={onForget}
                        />
                    </div>
                </ErrorBoundary>
            }
        />
    );
}

function onPendingChanged({ guildId, ...changes }: PendingChanges) {
    for (const [kind, field] of PENDING) {
        if (!(field in changes)) continue;

        const key = `${kind}:${guildId ?? ""}`;
        const pending = changes[field];
        if (pending === undefined) handedOver.delete(key);
        else if (pending && offered?.kind === kind && offered.uris.includes(pending.imageUri)) handedOver.set(key, offered.id);
        else handedOver.set(key, null);
    }
}

function onProfileSaved({ guildId }: { guildId?: string; }) {
    for (const [key, id] of handedOver) {
        const [kind, guild] = key.split(":");
        if (guild !== (guildId ?? "")) continue;

        handedOver.delete(key);
        if (!guildId) recordApplied(kind, id).catch(err => logger.error("could not note what you put on", err));
    }
}

function onProfileDiscarded() {
    handedOver.clear();
    offered = null;
}

let wrapped: React.ComponentType<EditorProps> | null = null;

interface Size {
    width: number;
    height: number;
}

let area: Size | null = null;

export default definePlugin({
    name: "BetterImageEditor",
    description: "Keeps a shelf of your pictures in the avatar and banner editor, and remembers how you cropped each one.",
    authors: [EquicordDevs.heart_menace],
    settings,

    flux: {
        USER_PROFILE_SETTINGS_SET_PENDING_CHANGES: onPendingChanged,
        USER_PROFILE_SETTINGS_SUBMIT_SUCCESS: onProfileSaved,
        USER_PROFILE_SETTINGS_RESET_PENDING_CHANGES: onProfileDiscarded,
        USER_PROFILE_SETTINGS_RESET_PENDING_PROFILE_CHANGES: onProfileDiscarded,
        USER_PROFILE_SETTINGS_RESET_AND_CLOSE_FORM: onProfileDiscarded
    },

    patches: [
        {
            find: '"SET_IMAGE_ZOOM_RATIO"',
            replacement: [
                {
                    match: /\{default:\(\)=>(\i)\}/,
                    replace: "{default:()=>$self.wrapEditor($1)}"
                },
                {
                    match: /(?<=#{intl::AVATAR_UPLOAD_EDIT_MEDIA}\),)size:"md",actionBarInput:/,
                    replace: 'size:"lg",actionBarInput:'
                }
            ]
        },
        {
            find: '"SET_IMAGE_ZOOM_RATIO"',
            group: true,
            replacement: [
                {
                    match: /\{file:(\i),imageUri:/,
                    replace: "{bieShelf,file:$1,imageUri:"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i\.\i,\{id:\i,children:.{0,50}#{intl::IMAGE_CROP_KEYBOARD_CANNOT_REPOSITION}/,
                    replace: "bieShelf,$&"
                },
                {
                    match: /\("div",\{role:"group",(?="aria-label":)/,
                    replace: '$&className:"vc-bie-split",'
                }
            ]
        },
        {
            find: '"SET_IMAGE_ZOOM_RATIO"',
            replacement: {
                match: /(?<=(?:(\i)\.current\.getBoundingClientRect\(\).{0,40})?=)(\(0,(\i)\.\i\)\([^)]+\))(?=,\i=(\(0,\3\.\i\))\((\i),[^,()]+,[^,()]+,([^()]+)\))/g,
                replace: (_, image, size, _mod, crop, type, rest) =>
                    `$self.fill(${size},(bieW,bieH)=>${crop}(${type},bieW,bieH,${rest})${image ? `,${image}.current` : ""})`
            }
        },
        {
            find: 'displayName="RecentAvatarsStore"',
            replacement: {
                match: /(uploadType:(\i),guild:\i,handleOpenImageEditingModal:(\i),.{0,250}null\]\}\),).{0,20}\{onComplete:(\i),returnRef:\i\}\)/,
                replace: "$1$self.pickerRow($2,$3,$4,arguments[0])"
            }
        },
        {
            find: 'displayName="RecentAvatarsStore"',
            replacement: {
                match: /size:"md"(,title:\i,.{0,50}className:)(\i\.\i)/,
                replace: 'size:"lg"$1$self.pickerClass($2)'
            }
        }
    ],

    pickerClass(base: string) {
        return classes(base, cl("picker"));
    },

    fill(size: Size, cropOf: (width: number, height: number) => Size, image?: HTMLImageElement) {
        const box = image?.parentElement;
        if (box) area = { width: box.clientWidth, height: box.clientHeight };
        if (!area) return size;

        const crop = cropOf(size.width, size.height);
        const scale = Math.min(area.width / crop.width, area.height / crop.height);
        return { width: size.width * scale, height: size.height * scale };
    },

    wrapEditor(Original: React.ComponentType<EditorProps>) {
        if (!wrapped) {
            const Safe = ErrorBoundary.wrap(EditorShelf, {
                fallback: ({ wrappedProps }) => <Original {...wrappedProps.ownProps} />
            });
            wrapped = (props: EditorProps) => gatedPickers === 0
                ? <Safe Original={Original} ownProps={props} />
                : <Original {...props} />;
        }

        return wrapped;
    },

    pickerRow(uploadType: string, open: (imageUri: string, file: File) => void, complete: (result: PickResult) => void, picker: PickerProps) {
        if (picker.allowRecentAvatarsSelection === false) return <EditorGate key="bie-picker" />;

        return (
            <ErrorBoundary noop key="bie-picker">
                <div className={cl("drawer")}>
                    <PickerShelf kind={kindOf(uploadType)} open={open} complete={complete} maxSize={picker.maxFileSizeBytes} />
                </div>
            </ErrorBoundary>
        );
    }
});

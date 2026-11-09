import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { waitFor } from "@webpack";
import { Alerts, ChannelStore, GuildStore, SelectedChannelStore, UploadHandler, UserStore } from "@webpack/common";

import { buildChunks, formatBytes, headerLine, manifestFile, pickChunkSize, sleep } from "./chunker";
import { sendMessageWithFiles } from "./sender";

const logger = new Logger("SplitLargeUpload");

const settings = definePluginSettings({
    limitMB: {
        type: OptionType.NUMBER,
        description: "Per-file limit (MB) to split at. 0 = auto-detect from Nitro tier / server boost. Set 20 for a free account.",
        default: 0
    },
    chunkSizeMiB: {
        type: OptionType.NUMBER,
        description: "Chunk size in MiB. 0 = auto (limit minus headroom). Never exceeds the limit.",
        default: 0
    },
    chunksPerMessage: {
        type: OptionType.NUMBER,
        description: "Chunks attached per message. Keep at 1 unless you know the per-message total allowed.",
        default: 1
    },
    sendDelayMs: {
        type: OptionType.NUMBER,
        description: "Delay between chunk messages in ms (rate limits).",
        default: 1500
    },
    confirmBeforeSplit: {
        type: OptionType.BOOLEAN,
        description: "Ask before splitting and sending an oversized file.",
        default: true
    }
});

const MB = 1_000_000;
const USER_LIMIT_MB: Record<number, number> = { 0: 20, 1: 1000, 2: 1000, 3: 50 };
const BOOST_LIMIT_MB: Record<number, number> = { 0: 20, 1: 20, 2: 50, 3: 100 };

const DRAFT_TYPE = 0;

function getLimit(channelId: string): number {
    if (settings.store.limitMB > 0) return settings.store.limitMB * MB;
    const user = UserStore.getCurrentUser() as any;
    const channel = ChannelStore.getChannel(channelId) as any;
    const guild = channel?.guild_id ? (GuildStore.getGuild(channel.guild_id) as any) : null;
    const userMB = USER_LIMIT_MB[user?.premiumType ?? 0] ?? 20;
    const boostMB = BOOST_LIMIT_MB[guild?.premiumTier ?? 0] ?? 20;
    return Math.max(userMB, boostMB) * MB;
}


let active = false;
const runs = new Set<AbortController>();
const handling = new WeakSet<File>();
const synthetic = new WeakSet<Event>();
let fallbackTarget: any = null;
let fallbackOriginal: any = null;
const WRAPPED = Symbol.for("SplitLargeUpload.wrapped");


const toast = (message: string, type = Toasts.Type.MESSAGE) =>
    Toasts.show({ message, type, id: Toasts.genId() });

function confirmSplit(file: File, count: number, limit: number) {
    return new Promise<boolean>(resolve => Alerts.show({
        title: "Split and send in parts?",
        body: `${file.name} is ${formatBytes(file.size)}, over the ${formatBytes(limit)} limit here. It will be sent as ${count} parts plus a manifest.`,
        confirmText: "Split and send",
        cancelText: "Cancel",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
    }));
}

async function splitAndSend(file: File, channelId: string, limit: number) {
    if (handling.has(file)) return;
    handling.add(file);

    const chunkSize = pickChunkSize(limit, settings.store.chunkSizeMiB);
    const count = Math.ceil(file.size / chunkSize);

    if (settings.store.confirmBeforeSplit && !(await confirmSplit(file, count, limit))) return;

    const ctl = new AbortController();
    runs.add(ctl);

    try {
        toast(`Hashing ${file.name}...`);
        const { manifest, chunks } = await buildChunks(file, chunkSize);
        const per = Math.max(1, Math.floor(settings.store.chunksPerMessage));

        await sendMessageWithFiles(channelId, headerLine(manifest, "manifest"), [manifestFile(manifest)], ctl.signal);

        for (let i = 0; i < chunks.length; i += per) {
            if (ctl.signal.aborted) throw new Error("Cancelled");
            const group = chunks.slice(i, i + per);
            await sleep(settings.store.sendDelayMs);
            await sendMessageWithFiles(
                channelId,
                headerLine(manifest, group.map(g => g.info.i)),
                group.map(g => g.file),
                ctl.signal
            );
            toast(`${file.name}: sent ${Math.min(i + per, chunks.length)} of ${chunks.length} parts`);
        }

        toast(`${file.name}: all parts sent`, Toasts.Type.SUCCESS);
    } catch (e: any) {
        logger.error("split upload failed", e);
        toast(`Split upload failed: ${e?.message ?? e}`, Toasts.Type.FAILURE);
    } finally {
        runs.delete(ctl);
    }
}

function divert(fileList?: FileList | null): File[] | null {
    if (!fileList?.length) return null;
    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return null;

    const limit = getLimit(channelId);
    const list = Array.from(fileList);
    const big = list.filter(f => f.size > limit);
    if (!big.length) return null;

    for (const f of big) void splitAndSend(f, channelId, limit);
    return list.filter(f => f.size <= limit);
}

const currentChannel = () => ChannelStore.getChannel(SelectedChannelStore.getChannelId());


function onDrop(e: DragEvent) {
    if (!active || synthetic.has(e)) return;
    const keep = divert(e.dataTransfer?.files);
    if (!keep) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const dt = new DataTransfer();
    keep.forEach(f => dt.items.add(f));
    const evt = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
    synthetic.add(evt);
    (e.target as Element | null)?.dispatchEvent(evt);
}

function onPaste(e: ClipboardEvent) {
    if (!active) return;
    const keep = divert(e.clipboardData?.files);
    if (!keep) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    if (keep.length) UploadHandler.promptToUpload(keep, currentChannel(), DRAFT_TYPE);
}

function onChange(e: Event) {
    const t = e.target;
    if (!active || !(t instanceof HTMLInputElement) || t.type !== "file") return;
    const keep = divert(t.files);
    if (!keep) return;

    e.stopImmediatePropagation();
    t.value = "";
    if (keep.length) UploadHandler.promptToUpload(keep, currentChannel(), DRAFT_TYPE);
}


function wrapPrompt(orig: any) {
    if (typeof orig !== "function" || orig[WRAPPED]) return orig;

    const wrapper = function (this: any, files: ArrayLike<File>, channel: any, ...rest: any[]) {
        if (!active) return orig.call(this, files, channel, ...rest);
        try {
            const list = Array.from(files ?? []);
            const channelId: string = channel?.id ?? SelectedChannelStore.getChannelId();
            const limit = getLimit(channelId);

            const oversized = list.filter(f => f.size > limit);
            if (!oversized.length) return orig.call(this, files, channel, ...rest);

            for (const f of oversized) void splitAndSend(f, channelId, limit);

            const keep = list.filter(f => f.size <= limit);
            if (!keep.length) return;
            return orig.call(this, keep, channel, ...rest);
        } catch (e) {
            logger.error("wrapper failed, passing through", e);
            return orig.call(this, files, channel, ...rest);
        }
    };

    (wrapper as any)[WRAPPED] = true;
    return wrapper;
}


export default definePlugin({
    name: "SplitLargeUpload",
    description: "Splits files over the upload limit into parts, sends them with a manifest, and pairs with the standalone reassembler page.",
    authors: [{ name: "you", id: 0n }],
    settings,

    wrapPrompt,

    patches: [
        {
            find: "promptToUpload:",
            replacement: {
                match: /promptToUpload:(\i)(?=[,}])/,
                replace: "promptToUpload:$self.wrapPrompt($1)"
            }
        }
    ],

    start() {
        active = true;

        window.addEventListener("drop", onDrop, true);
        window.addEventListener("paste", onPaste, true);
        window.addEventListener("change", onChange, true);

        waitFor(["showUploadFileSizeExceededError", "promptToUpload"], (mod: any) => {
            if (!active) return;
            const current = mod.promptToUpload;
            if (!current || current[WRAPPED]) return;

            const wrapped = wrapPrompt(current);
            try {
                mod.promptToUpload = wrapped;
                fallbackTarget = mod;
                fallbackOriginal = current;
                logger.info("patch did not apply; installed runtime monkeypatch");
            } catch (e) {
                logger.warn("could not monkeypatch promptToUpload; relying on DOM layer", e);
            }
        });

        logger.info("started");
    },

    stop() {
        active = false;
        window.removeEventListener("drop", onDrop, true);
        window.removeEventListener("paste", onPaste, true);
        window.removeEventListener("change", onChange, true);

        for (const c of runs) c.abort();
        runs.clear();

        if (fallbackTarget && fallbackOriginal) {
            try { fallbackTarget.promptToUpload = fallbackOriginal; } catch {  }
        }
        fallbackTarget = fallbackOriginal = null;
    }
});
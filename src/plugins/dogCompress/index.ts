import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import {
    DraftType,
    SelectedChannelStore,
    showToast,
    Toasts,
    UploadManager,
} from "@webpack/common";

type ProcessResult =
    | { success: true; file: File; size: number; }
    | { success: false; fileName: string; error: string; };

// Attempt to get Native, assuming it might not exist
const Native = (VencordNative?.pluginHelpers?.dogCompress ||
                VencordNative?.pluginHelpers?.AutoCompress) as any;

const FORMATS = new Set([
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/flac",
]);

const settings = definePluginSettings({
    ffmpegTimeout: {
        type: OptionType.NUMBER,
        description: "Maximum time per file before compression is aborted [seconds]",
        default: 10
    },
    ffmpegPath: {
        type: OptionType.STRING,
        description: "Path to ffmpeg binary (leave empty to attempt auto-detection)"
    },
    ffprobePath: {
        type: OptionType.STRING,
        description: "Path to ffprobe binary (leave empty to attempt auto-detection)"
    },
    compressionTarget: {
        type: OptionType.NUMBER,
        description: "Target file size after compression [MB]",
        default: 9,
    },
    compressionThreshold: {
        type: OptionType.NUMBER,
        description: "Maximum file size before compression is applied [MB]",
        default: 10,
    },
    compressionPreset: {
        type: OptionType.SELECT,
        description: "Encoding speed (slower = better quality at the same size)",
        options: [
            { label: "Ultrafast", value: "ultrafast" },
            { label: "Fast", value: "fast" },
            { label: "Medium (Balanced)", value: "medium", default: true },
            { label: "Slow", value: "slow" },
            { label: "Very Slow", value: "veryslow" },
        ],
    },
    maxResolution: {
        type: OptionType.SELECT,
        description: "Maximum resolution (downscaling may improve quality at low bitrates)",
        options: [
            { label: "Keep Original", value: "original", default: true },
            { label: "1080p", value: "1080" },
            { label: "720p", value: "720" },
            { label: "480p", value: "480" },
        ],
    },
});

function isValid(files: FileList | undefined): files is FileList {
    return files !== undefined && files.length > 0;
}

async function validateBinaries() {
    // Check if Native exists and has the required functions
    if (!Native || typeof Native.testBinaries !== "function") {
        showNotification({
            title: "dogCompress",
            body: "Native module (FFmpeg bridge) not found or not loaded. Sending files without compression.",
            color: "#faa61a",
            noPersist: false,
        });
        return false;
    }

    try {
        const validated = await Native.testBinaries(settings.store.ffmpegPath, settings.store.ffprobePath);
        if (!validated.success) {
            showNotification({
                title: "dogCompress",
                body: `FFmpeg validation failed: ${validated.error || "unknown error"}`,
                color: "#f04747",
                noPersist: false,
            });
            return false;
        }
        return true;
    } catch (err) {
        showNotification({
            title: "dogCompress",
            body: `Error validating FFmpeg: ${err.message || "unknown"}`,
            color: "#f04747",
            noPersist: false,
        });
        return false;
    }
}

async function hookPaste(event: ClipboardEvent) {
    const files = event.clipboardData?.files;
    if (!isValid(files) || !(await validateBinaries())) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    await handleFiles(files);
}

async function hookDrop(event: DragEvent) {
    const files = event.dataTransfer?.files;
    if (!isValid(files) || !(await validateBinaries())) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    await handleFiles(files);
}

async function handleFiles(files: FileList) {
    const allFiles = Array.from(files);
    const compressibleFiles: File[] = [];
    const otherFiles: File[] = [];

    for (const file of allFiles) {
        const sizeMB = file.size / (1024 * 1024);
        if (FORMATS.has(file.type) && sizeMB > settings.store.compressionThreshold) {
            compressibleFiles.push(file);
            continue;
        }
        otherFiles.push(file);
    }

    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;

    UploadManager.clearAll(channelId, DraftType.ChannelMessage);

    if (compressibleFiles.length === 0) {
        if (otherFiles.length > 0) {
            UploadManager.addFiles({
                channelId,
                draftType: DraftType.ChannelMessage,
                files: otherFiles.map(file => ({ file, platform: 1 })),
                showLargeMessageDialog: false,
            });
        }
        return;
    }

    showToast(
        `Preparing to compress ${compressibleFiles.length} file(s)...`,
        Toasts.Type.MESSAGE,
    );

    const results = await Promise.all(
        compressibleFiles.map(file => processFile(file)),
    );

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const toUpload = [...successful.map(r => r.file), ...otherFiles];

    const message = `Compressed ${successful.length}/${results.length} file(s)` +
        (failed.length > 0 ? `\nFailures: ${failed.map(f => `${f.fileName} (${f.error})`).join(", ")}` : "");

    if (toUpload.length > 0) {
        UploadManager.addFiles({
            channelId,
            draftType: DraftType.ChannelMessage,
            files: toUpload.map(file => ({ file, platform: 1 })),
            showLargeMessageDialog: false,
        });
    }

    const color = failed.length === 0
        ? "#43b581"
        : successful.length === 0
            ? "#f04747"
            : "#faa61a";

    showNotification({
        title: "dogCompress",
        body: message,
        color: color,
        noPersist: false,
    });
}

async function hookDrag(e: DragEvent) {
    const types = e.dataTransfer?.types;
    if (types?.includes("Files")) {
        e.preventDefault();
        e.stopPropagation();
    }
}

async function processFile(file: File): Promise<ProcessResult> {
    try {
        const buffer = await file.arrayBuffer();
        const res = await Native.handleFile(
            new Uint8Array(buffer),
            file.name,
            settings.store.compressionTarget,
            settings.store.compressionPreset,
            settings.store.maxResolution,
            settings.store.ffmpegTimeout * 1000
        );

        if (!res.success) {
            return {
                success: false,
                fileName: file.name,
                error: res.error,
            };
        }

        const resArray = res.data;
        const compressedSizeMB = resArray.byteLength / (1024 * 1024);
        const wrapped = new Uint8Array(resArray);
        const compressedFile = new File([wrapped], file.name, { type: file.type });

        return {
            success: true,
            file: compressedFile,
            size: compressedSizeMB,
        };
    } catch (err) {
        return {
            success: false,
            fileName: file.name,
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

export default definePlugin({
    name: "dogCompress",
    description: "Automatically compress videos/audio to reach a target size",
    authors: [{ name: "Dogaix", id: 668445750044262400n }],
    settings,
    start() {
        document.addEventListener("drop", hookDrop, { capture: true });
        document.addEventListener("dragover", hookDrag, { capture: true });
        document.addEventListener("paste", hookPaste, { capture: true });
    },
    stop() {
        document.removeEventListener("drop", hookDrop, { capture: true });
        document.removeEventListener("dragover", hookDrag, { capture: true });
        document.removeEventListener("paste", hookPaste, { capture: true });
    },
});
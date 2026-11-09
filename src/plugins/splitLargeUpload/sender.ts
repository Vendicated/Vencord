import { findLazy } from "@webpack";
import { Constants, RestAPI, SnowflakeUtils } from "@webpack/common";

import { sleep } from "./chunker";

interface CloudUploadInstance {
    filename: string;
    uploadedFilename: string;
    on(event: "complete" | "error" | "progress", cb: (...args: any[]) => void): void;
    upload(): void;
    cancel?(): void;
}

type CloudUploadCtor = new (
    data: { file: File; isThumbnail: boolean; platform: number; },
    channelId: string,
    showLargeMessageDialog: boolean,
    reactionPickerType: number
) => CloudUploadInstance;

const CloudUpload: CloudUploadCtor = findLazy(m => m?.prototype?.trackUploadFinished);

interface Uploaded { filename: string; uploaded_filename: string; }

const UPLOAD_TIMEOUT_MS = 180_000;

function uploadOne(channelId: string, file: File, signal: AbortSignal): Promise<Uploaded> {
    return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new Error("Cancelled"));

        const up = new CloudUpload({ file, isThumbnail: false, platform: 1 }, channelId, false, 0);

        const finish = (fn: () => void) => {
            clearTimeout(timer);
            signal.removeEventListener("abort", onAbort);
            fn();
        };
        const onAbort = () => finish(() => { up.cancel?.(); reject(new Error("Cancelled")); });
        const timer = setTimeout(
            () => finish(() => { up.cancel?.(); reject(new Error(`Upload timed out: ${file.name}`)); }),
            UPLOAD_TIMEOUT_MS
        );

        signal.addEventListener("abort", onAbort, { once: true });
        up.on("complete", () => finish(() => resolve({ filename: up.filename, uploaded_filename: up.uploadedFilename })));
        up.on("error", (e: unknown) => finish(() => reject(e instanceof Error ? e : new Error(`Upload failed: ${file.name}`))));
        up.upload();
    });
}

async function postWithRetry(channelId: string, body: Record<string, unknown>, signal: AbortSignal, tries = 6) {
    for (let attempt = 0; ; attempt++) {
        if (signal.aborted) throw new Error("Cancelled");
        try {
            return await RestAPI.post({ url: Constants.Endpoints.MESSAGES(channelId), body });
        } catch (e: any) {
            const retryAfter = e?.status === 429 ? Number(e?.body?.retry_after ?? 2) * 1000 : 0;
            if (!retryAfter || attempt >= tries) throw e;
            await sleep(retryAfter + 250);
        }
    }
}

export async function sendMessageWithFiles(channelId: string, content: string, files: File[], signal: AbortSignal) {
    const uploaded: Uploaded[] = [];
    for (const f of files) uploaded.push(await uploadOne(channelId, f, signal));

    return postWithRetry(channelId, {
        content,
        channel_id: channelId,
        nonce: SnowflakeUtils.fromTimestamp(Date.now()),
        sticker_ids: [],
        type: 0,
        attachments: uploaded.map((u, i) => ({
            id: String(i),
            filename: u.filename,
            uploaded_filename: u.uploaded_filename
        }))
    }, signal);
}

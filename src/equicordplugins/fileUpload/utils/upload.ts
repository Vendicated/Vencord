/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { settings } from "@equicordplugins/fileUpload/settings";
import { serviceLabels, ServiceType, ShareXUploaderConfig, UploadResponse } from "@equicordplugins/fileUpload/types";
import { copyToClipboard } from "@utils/clipboard";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { chooseFile } from "@utils/web";
import { showToast, Toasts } from "@webpack/common";

import { convertApngToGif } from "./apngToGif";
import { getExtensionFromBytes, getExtensionFromMime, getMimeFromExtension, getUrlExtension } from "./getMediaUrl";
import { isS3Configured, uploadToS3 } from "./s3";
import { parseShareXConfig, resolveShareXTemplate } from "./sharex";

const Native = IS_DISCORD_DESKTOP
    ? VencordNative.pluginHelpers.FileUpload as PluginNative<typeof import("../native")>
    : null;

const logger = new Logger("FileUpload", "#7cb7ff");

const CORS_PROXY = "https://cors.keiran0.workers.dev"; // im hosting this on cloudflare workers so uptime and latency should be reliable

let isUploading = false;

type UploadPhase = "idle" | "preparing" | "uploading" | "retrying" | "success" | "failed" | "cancelled";

export interface UploadProgressState {
    phase: UploadPhase;
    fileName: string;
    currentService: ServiceType | null;
    currentServiceLabel: string;
    attempt: number;
    totalAttempts: number;
    percent: number;
    status: string;
    canCancel: boolean;
}

const defaultUploadState: UploadProgressState = {
    phase: "idle",
    fileName: "",
    currentService: null,
    currentServiceLabel: "",
    attempt: 0,
    totalAttempts: 0,
    percent: 0,
    status: "",
    canCancel: false
};

let uploadState: UploadProgressState = { ...defaultUploadState };
const uploadStateListeners = new Set<() => void>();
let activeAbortController: AbortController | null = null;
let cancelRequested = false;

function emitUploadState() {
    for (const listener of uploadStateListeners) {
        listener();
    }
}

function setUploadState(patch: Partial<UploadProgressState>) {
    uploadState = { ...uploadState, ...patch };
    emitUploadState();
}

function resetUploadState() {
    uploadState = { ...defaultUploadState };
    emitUploadState();
}

export function subscribeUploadState(listener: () => void): () => void {
    uploadStateListeners.add(listener);
    return () => uploadStateListeners.delete(listener);
}

export function getUploadState(): UploadProgressState {
    return uploadState;
}

export function cancelCurrentUpload() {
    if (!isUploading) {
        return;
    }

    cancelRequested = true;
    activeAbortController?.abort();
    setUploadState({
        phase: "cancelled",
        status: "Upload cancelled.",
        canCancel: false,
        percent: 0
    });
}

function getUploadTimeoutMs(): number {
    const value = (settings.store as { uploadTimeoutMs?: number; }).uploadTimeoutMs;
    if (!Number.isFinite(value) || !value) {
        return 300000;
    }

    return Math.max(5000, value);
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    activeAbortController = controller;
    const timeout = setTimeout(() => controller.abort(), getUploadTimeoutMs());

    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } catch (error) {
        if (cancelRequested || controller.signal.aborted) {
            throw new Error(cancelRequested ? "Upload cancelled by user" : "Upload timed out");
        }

        throw error;
    } finally {
        clearTimeout(timeout);
        if (activeAbortController === controller) {
            activeAbortController = null;
        }
    }
}

function resolveShareXRequestValue(value: string | number | boolean, filename: string): string {
    return String(value)
        .replace(/\$filename\$/g, filename)
        .replace(/\{filename\}/g, filename);
}

function parseShareXConfigFromSettings(): ShareXUploaderConfig {
    const configText = settings.store.sharexConfig || "";
    if (!configText.trim()) {
        throw new Error("ShareX config is required");
    }

    return parseShareXConfig(configText);
}

async function uploadToShareX(fileBlob: Blob, filename: string): Promise<string> {
    const config = parseShareXConfigFromSettings();
    const method = (config.RequestMethod || "POST").toUpperCase();
    const requestUrl = config.RequestURL!.trim();
    const bodyType = (config.Body || "MultipartFormData").toLowerCase();

    const headers = new Headers();
    for (const [key, value] of Object.entries(config.Headers || {})) {
        headers.set(key, resolveShareXRequestValue(value, filename));
    }

    const buildArguments = () => {
        const args: Record<string, string> = {};
        for (const [key, value] of Object.entries(config.Arguments || {})) {
            args[key] = resolveShareXRequestValue(value, filename);
        }
        return args;
    };

    let body: BodyInit;

    if (bodyType === "multipartformdata" || bodyType === "formdata") {
        headers.delete("content-type");

        const formData = new FormData();
        const fileField = config.FileFormName || "file";
        formData.append(fileField, fileBlob, filename);

        const args = buildArguments();
        for (const [key, value] of Object.entries(args)) {
            formData.append(key, value);
        }

        body = formData;
    } else if (bodyType === "binary") {
        body = fileBlob;
    } else if (bodyType === "json") {
        if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
        }

        const payload = buildArguments();
        body = JSON.stringify(payload);
    } else {
        throw new Error(`Unsupported ShareX Body type: ${config.Body || "unknown"}`);
    }

    let response: Response;
    try {
        response = await fetchWithTimeout(requestUrl, { method, headers, body });
    } catch (error) {
        if (Native) {
            throw error;
        }

        const proxiedUrl = `${CORS_PROXY}?url=${encodeURIComponent(requestUrl)}`;
        response = await fetchWithTimeout(proxiedUrl, { method, headers, body });
    }

    const responseText = await response.text();
    let responseJson: unknown = null;
    try {
        responseJson = responseText ? JSON.parse(responseText) : null;
    } catch {
        responseJson = null;
    }

    if (!response.ok) {
        const configuredError = resolveShareXTemplate(config.ErrorMessage, responseText, responseJson);
        throw new Error(configuredError || `Upload failed: ${response.status} ${response.statusText}`);
    }

    const configuredUrl = resolveShareXTemplate(config.URL, responseText, responseJson)?.trim();
    const fallbackUrl = typeof responseJson === "object" && responseJson && "url" in responseJson
        ? String((responseJson as Record<string, unknown>).url || "")
        : responseText.trim();

    const resultUrl = configuredUrl || fallbackUrl;
    if (!resultUrl) {
        throw new Error("No URL returned from ShareX uploader");
    }

    return resultUrl;
}

async function uploadToZipline(fileBlob: Blob, filename: string): Promise<string> {
    const { serviceUrl, ziplineToken, folderId } = settings.store;

    if (!serviceUrl || !ziplineToken) {
        throw new Error("Service URL and auth token are required");
    }

    const baseUrl = serviceUrl.replace(/\/+$/, "");
    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const headers: Record<string, string> = {
        "Authorization": ziplineToken
    };

    if (folderId) {
        headers["x-zipline-folder"] = folderId;
    }

    const response = await fetchWithTimeout(`${baseUrl}/api/upload`, {
        method: "POST",
        headers,
        body: formData
    });

    const responseContentType = response.headers.get("content-type") || "";

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    if (!responseContentType.includes("application/json")) {
        throw new Error("Server returned invalid response (not JSON)");
    }

    const data: UploadResponse = await response.json();

    if (data.files && data.files.length > 0 && data.files[0].url) {
        return data.files[0].url;
    }

    throw new Error("No URL returned from upload");
}

async function uploadToNest(fileBlob: Blob, filename: string): Promise<string> {
    const { nestToken } = settings.store;

    if (!nestToken) {
        throw new Error("Auth token is required");
    }

    if (Native) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const result = await Native.uploadToNest(arrayBuffer, filename, nestToken);

        if (!result.success) {
            throw new Error(result.error || "Upload failed");
        }

        if (!result.url) {
            throw new Error("No URL returned from upload");
        }

        return result.url;
    }

    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const proxiedUrl = `${CORS_PROXY}?url=${encodeURIComponent("https://nest.rip/api/files/upload")}`;

    const response = await fetchWithTimeout(proxiedUrl, {
        method: "POST",
        headers: {
            "Authorization": nestToken
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { fileURL?: string; };

    if (data.fileURL) {
        return data.fileURL;
    }

    throw new Error("No URL returned from upload");
}

export function isConfigured(): boolean {
    const {
        serviceType,
        serviceUrl,
        ziplineToken,
        nestToken
    } = settings.store as {
        serviceType: ServiceType;
        serviceUrl?: string;
        ziplineToken?: string;
        nestToken?: string;
    };
    switch (serviceType) {
        case ServiceType.NEST:
            return Boolean(nestToken);
        case ServiceType.EZHOST:
            return Boolean((settings.store as { ezHostKey?: string; }).ezHostKey);
        case ServiceType.S3:
            return isS3Configured();
        case ServiceType.CATBOX:
            return true;
        case ServiceType.ZEROX0:
            return Boolean(Native);
        case ServiceType.LITTERBOX:
        case ServiceType.GOFILE:
        case ServiceType.TMPFILES:
        case ServiceType.BUZZHEAVIER:
        case ServiceType.TEMPSH:
        case ServiceType.FILEBIN:
            return true;
        case ServiceType.SHAREX:
            try {
                parseShareXConfigFromSettings();
                return true;
            } catch {
                return false;
            }
        case ServiceType.ZIPLINE:
        default:
            return Boolean(serviceUrl && ziplineToken);
    }
}

async function uploadToEzHost(fileBlob: Blob, filename: string): Promise<string> {
    const { ezHostKey } = (settings.store as { ezHostKey?: string; });

    if (!ezHostKey) throw new Error("E-Z Host API key is required");

    if (Native) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const result = await Native.uploadToEzHost(arrayBuffer, filename, ezHostKey);

        if (!result.success) {
            throw new Error(result.error || "Upload failed");
        }

        if (!result.url) {
            throw new Error("No URL returned from upload");
        }

        return result.url;
    }

    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const headers: Record<string, string> = { key: ezHostKey };

    const proxiedUrl = `${CORS_PROXY}?url=${encodeURIComponent("https://api.e-z.host/files")}`;
    const response = await fetchWithTimeout(proxiedUrl, {
        method: "POST",
        headers,
        body: formData
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    const data = await response.json();
    if (!data || !data.success) {
        throw new Error(data?.error || "Upload failed");
    }

    return data.imageUrl || data.rawUrl;
}

async function uploadToCatbox(fileBlob: Blob, filename: string): Promise<string> {
    const { catboxUserhash } = settings.store;

    if (Native) {
        const result = await Native.uploadToCatbox(await fileBlob.arrayBuffer(), filename, catboxUserhash || undefined);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    if (catboxUserhash) formData.append("userhash", catboxUserhash);
    formData.append("fileToUpload", fileBlob, filename);

    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent("https://catbox.moe/user/api.php")}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    const text = (await response.text()).trim();
    if (!text) throw new Error("No URL returned from upload");
    return text;
}

async function uploadTo0x0(fileBlob: Blob, filename: string): Promise<string> {
    if (!Native) {
        throw new Error("0x0.st uploads are only supported on the desktop client");
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const result = await Native.uploadTo0x0(arrayBuffer, filename);

    if (!result.success) {
        throw new Error(result.error || "Upload failed");
    }

    if (!result.url) {
        throw new Error("No URL returned from upload");
    }

    return result.url;
}

async function uploadToLitterbox(fileBlob: Blob, filename: string): Promise<string> {
    const expiry = settings.store.litterboxExpiry || "24h";

    if (Native) {
        const result = await Native.uploadToLitterbox(await fileBlob.arrayBuffer(), filename, expiry);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("time", expiry);
    formData.append("fileToUpload", fileBlob, filename);

    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent("https://litterbox.catbox.moe/resources/internals/api.php")}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    const text = (await response.text()).trim();
    if (!text) throw new Error("No URL returned from upload");
    return text;
}

async function uploadToGofile(fileBlob: Blob, filename: string): Promise<string> {
    const { gofileToken } = settings.store as { gofileToken?: string; };

    if (Native) {
        const result = await Native.uploadToGofile(await fileBlob.arrayBuffer(), filename, gofileToken || undefined);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const formData = new FormData();
    if (gofileToken?.trim()) {
        formData.append("token", gofileToken.trim());
    }
    formData.append("file", fileBlob, filename);

    const uploadUrl = "https://upload.gofile.io/uploadfile";
    const requestUrl = Native ? uploadUrl : `${CORS_PROXY}?url=${encodeURIComponent(uploadUrl)}`;
    const response = await fetchWithTimeout(requestUrl, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as {
        status?: string;
        error?: string;
        data?: { downloadPage?: string; code?: string; };
    };

    if (data.status !== "ok") {
        throw new Error(data.error || "Upload failed");
    }

    const url = data.data?.downloadPage || (data.data?.code ? `https://gofile.io/d/${data.data.code}` : "");
    if (!url) throw new Error("No URL returned from upload");
    return url;
}

async function uploadToTmpfiles(fileBlob: Blob, filename: string): Promise<string> {
    if (Native) {
        const result = await Native.uploadToTmpfiles(await fileBlob.arrayBuffer(), filename);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const uploadUrl = "https://tmpfiles.org/api/v1/upload";
    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent(uploadUrl)}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as { status?: string; data?: { url?: string; }; };
    const url = data.data?.url;
    if (!url || data.status !== "success") {
        throw new Error("No URL returned from upload");
    }

    return url.includes("tmpfiles.org/") && !url.includes("/dl/")
        ? url.replace(/tmpfiles\.org\/(\d+)/, "tmpfiles.org/dl/$1")
        : url;
}

async function uploadToBuzzheavier(fileBlob: Blob, filename: string): Promise<string> {
    if (Native) {
        const result = await Native.uploadToBuzzheavier(await fileBlob.arrayBuffer(), filename);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const uploadUrl = `https://w.buzzheavier.com/${encodeURIComponent(filename)}`;
    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent(uploadUrl)}`, {
        method: "PUT",
        body: fileBlob
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    try {
        const data = JSON.parse(text) as { code?: number; data?: { id?: string; }; };
        const id = data.data?.id;
        if (data.code === 201 && id) {
            return `https://buzzheavier.com/${id}`;
        }
    } catch {
    }

    const fallback = text.trim();
    if (!fallback) throw new Error("No URL returned from upload");
    return fallback;
}

async function uploadToTempSh(fileBlob: Blob, filename: string): Promise<string> {
    if (Native) {
        const result = await Native.uploadToTempSh(await fileBlob.arrayBuffer(), filename);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const uploadUrl = "https://temp.sh/upload";
    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent(uploadUrl)}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    const text = (await response.text()).trim();
    if (!text) throw new Error("No URL returned from upload");
    return text;
}

function makeRandomHex(length = 12): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function uploadToFilebin(fileBlob: Blob, filename: string): Promise<string> {
    if (Native) {
        const result = await Native.uploadToFilebin(await fileBlob.arrayBuffer(), filename);
        if (!result.success || !result.url) throw new Error(result.error || "No URL returned from upload");
        return result.url;
    }

    const binId = makeRandomHex(6);
    const uploadUrl = `https://filebin.net/${binId}/${encodeURIComponent(filename)}`;
    const formData = new FormData();
    formData.append("file", fileBlob, filename);

    const response = await fetchWithTimeout(`${CORS_PROXY}?url=${encodeURIComponent(uploadUrl)}`, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
    }

    return `https://filebin.net/${binId}/${encodeURIComponent(filename)}`;
}

async function uploadToService(serviceType: ServiceType, fileBlob: Blob, filename: string): Promise<string> {
    switch (serviceType) {
        case ServiceType.ZIPLINE:
            return uploadToZipline(fileBlob, filename);
        case ServiceType.NEST:
            return uploadToNest(fileBlob, filename);
        case ServiceType.EZHOST:
            return uploadToEzHost(fileBlob, filename);
        case ServiceType.S3:
            return uploadToS3(fileBlob, filename, Native);
        case ServiceType.CATBOX:
            return uploadToCatbox(fileBlob, filename);
        case ServiceType.ZEROX0:
            return uploadTo0x0(fileBlob, filename);
        case ServiceType.LITTERBOX:
            return uploadToLitterbox(fileBlob, filename);
        case ServiceType.SHAREX:
            return uploadToShareX(fileBlob, filename);
        case ServiceType.GOFILE:
            return uploadToGofile(fileBlob, filename);
        case ServiceType.TMPFILES:
            return uploadToTmpfiles(fileBlob, filename);
        case ServiceType.BUZZHEAVIER:
            return uploadToBuzzheavier(fileBlob, filename);
        case ServiceType.TEMPSH:
            return uploadToTempSh(fileBlob, filename);
        case ServiceType.FILEBIN:
            return uploadToFilebin(fileBlob, filename);
        default:
            throw new Error("Unknown service type");
    }
}

const FALLBACK_SERVICES: ServiceType[] = [
    ServiceType.CATBOX,
    ServiceType.LITTERBOX,
    ServiceType.ZEROX0,
    ServiceType.TMPFILES,
    ServiceType.GOFILE,
    ServiceType.BUZZHEAVIER,
    ServiceType.TEMPSH,
    ServiceType.FILEBIN
];

const EXE_BLOCKED_SERVICES = new Set<ServiceType>([
    ServiceType.CATBOX,
    ServiceType.LITTERBOX,
    ServiceType.ZEROX0
]);

function isExeFileName(fileName: string): boolean {
    return fileName.toLowerCase().endsWith(".exe");
}

function canServiceHandleFile(service: ServiceType, fileName: string): boolean {
    if (service === ServiceType.ZEROX0 && !Native) {
        return false;
    }

    if (isExeFileName(fileName) && EXE_BLOCKED_SERVICES.has(service)) {
        return false;
    }

    return true;
}

function normalizePrimaryService(primary: ServiceType, fileName: string): ServiceType {
    if (canServiceHandleFile(primary, fileName)) {
        return primary;
    }

    if (isExeFileName(fileName)) {
        return ServiceType.GOFILE;
    }

    if (!Native && primary === ServiceType.ZEROX0) {
        return ServiceType.CATBOX;
    }

    return primary;
}

function buildUploadOrder(primary: ServiceType, fileName: string): ServiceType[] {
    const disableFallbacks = Boolean((settings.store as { disableFallbacks?: boolean; }).disableFallbacks);
    const effectivePrimary = normalizePrimaryService(primary, fileName);

    if (disableFallbacks || effectivePrimary === ServiceType.SHAREX || effectivePrimary === ServiceType.S3 || effectivePrimary === ServiceType.ZIPLINE || effectivePrimary === ServiceType.NEST || effectivePrimary === ServiceType.EZHOST) {
        return [effectivePrimary];
    }

    const order: ServiceType[] = [effectivePrimary];
    for (const fallback of FALLBACK_SERVICES) {
        if (fallback !== effectivePrimary && canServiceHandleFile(fallback, fileName)) {
            order.push(fallback);
        }
    }

    return order;
}

function finalizeUploadedUrl(url: string): string {
    if (!settings.store.stripQueryParams) {
        return url;
    }

    try {
        const parsed = new URL(url);
        parsed.search = "";
        return parsed.href;
    } catch {
        return url;
    }
}

function notifyUploadSuccess(finalUrl: string): void {
    if (settings.store.autoCopy) {
        copyToClipboard(finalUrl);
        showToast("Upload successful, URL copied to clipboard", Toasts.Type.SUCCESS);
    } else {
        showToast("Upload successful", Toasts.Type.SUCCESS);
    }

    const autoSend = Boolean((settings.store as { autoSend?: boolean; }).autoSend);
    const autoFormat = Boolean((settings.store as { autoFormat?: boolean; }).autoFormat);
    if (autoSend) {
        insertTextIntoChatInputBox(autoFormat ? `<${finalUrl}>` : finalUrl);
    }
}

async function uploadWithFallbacks(fileBlob: Blob, filename: string, primary: ServiceType): Promise<string> {
    const uploadOrder = buildUploadOrder(primary, filename);
    const attempted: string[] = [];
    let lastError = "Unknown error";

    setUploadState({
        phase: "uploading",
        fileName: filename,
        totalAttempts: uploadOrder.length,
        attempt: 1,
        percent: 5,
        status: `Starting upload via ${serviceLabels[uploadOrder[0]]}...`,
        currentService: uploadOrder[0],
        currentServiceLabel: serviceLabels[uploadOrder[0]],
        canCancel: true
    });

    for (const service of uploadOrder) {
        const attempt = attempted.length + 1;
        setUploadState({
            phase: attempt === 1 ? "uploading" : "retrying",
            attempt,
            currentService: service,
            currentServiceLabel: serviceLabels[service],
            percent: Math.min(90, 10 + Math.round((attempt / uploadOrder.length) * 70)),
            status: attempt === 1
                ? `Uploading via ${serviceLabels[service]}...`
                : `Retrying with ${serviceLabels[service]} (${attempt}/${uploadOrder.length})...`
        });

        try {
            const uploadedUrl = await uploadToService(service, fileBlob, filename);
            if (attempted.length) {
                showToast(`Upload succeeded with ${serviceLabels[service]} after fallback`, Toasts.Type.SUCCESS);
            }

            setUploadState({
                phase: "success",
                percent: 100,
                attempt,
                currentService: service,
                currentServiceLabel: serviceLabels[service],
                status: `Uploaded successfully via ${serviceLabels[service]}.`,
                canCancel: false
            });

            return uploadedUrl;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            if (message === "Upload cancelled by user") {
                throw error;
            }

            attempted.push(serviceLabels[service]);
            lastError = message;
            logger.warn(`Upload failed for ${serviceLabels[service]}: ${message}`);
            setUploadState({
                phase: "retrying",
                attempt,
                currentService: service,
                currentServiceLabel: serviceLabels[service],
                status: `${serviceLabels[service]} failed: ${message}`,
                percent: Math.min(95, 10 + Math.round((attempt / uploadOrder.length) * 80))
            });
        }
    }

    setUploadState({
        phase: "failed",
        status: `All upload services failed. Last error: ${lastError}`,
        canCancel: false,
        percent: 0
    });

    throw new Error(`All upload services failed. Last error: ${lastError}. Tried: ${attempted.join(", ")}`);
}

async function normalizeUploadBlob(blob: Blob, sourceUrl?: string): Promise<{ blob: Blob; filename: string; }> {
    const extGuessFromSource = sourceUrl ? getUrlExtension(sourceUrl) : undefined;
    let ext = await getExtensionFromBytes(blob) || getExtensionFromMime(blob.type) || extGuessFromSource || "png";

    if (ext === "apng" && settings.store.apngToGif) {
        const gifBlob = await convertApngToGif(blob);
        if (gifBlob) {
            blob = gifBlob;
            ext = "gif";
        } else {
            showToast("APNG to GIF conversion failed, uploading as APNG", Toasts.Type.FAILURE);
        }
    }

    const mimeType = getMimeFromExtension(ext);
    return {
        blob: new Blob([blob], { type: mimeType }),
        filename: `upload.${ext}`
    };
}

async function uploadPreparedBlob(blob: Blob, sourceUrl?: string): Promise<void> {
    const primary = settings.store.serviceType as ServiceType;
    const { blob: normalizedBlob, filename } = await normalizeUploadBlob(blob, sourceUrl);
    setUploadState({ fileName: filename, status: "File ready, starting upload...", percent: 4 });
    const uploadedUrl = await uploadWithFallbacks(normalizedBlob, filename, primary);
    const finalUrl = finalizeUploadedUrl(uploadedUrl);
    notifyUploadSuccess(finalUrl);
}

export async function uploadFile(url: string): Promise<void> {
    if (isUploading) {
        showToast("Upload already in progress", Toasts.Type.MESSAGE);
        return;
    }

    if (!isConfigured()) {
        showToast("Please configure FileUpload settings first", Toasts.Type.FAILURE);
        return;
    }

    isUploading = true;
    cancelRequested = false;
    setUploadState({
        phase: "preparing",
        fileName: "",
        currentService: null,
        currentServiceLabel: "",
        attempt: 0,
        totalAttempts: 0,
        percent: 1,
        status: "Preparing upload...",
        canCancel: true
    });

    try {
        let fetchUrl = url;
        if (url.includes("/stickers/") && url.includes("passthrough=false")) {
            fetchUrl = url.replace("passthrough=false", "passthrough=true");
        }

        let blob: Blob;
        let contentType = "";

        if (Native) {
            const res = await Native.fetchFile(fetchUrl);
            if (res.success && res.data) {
                contentType = res.contentType || "";
                blob = new Blob([res.data], { type: contentType });
            } else {
                const response = await fetch(fetchUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch file: ${response.status}`);
                }
                contentType = response.headers.get("content-type") || "";
                blob = await response.blob();
            }
        } else {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.status}`);
            }
            contentType = response.headers.get("content-type") || "";
            blob = await response.blob();
        }

        if (contentType && !blob.type) {
            blob = new Blob([blob], { type: contentType });
        }

        await uploadPreparedBlob(blob, url);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message === "Upload cancelled by user") {
            showToast("Upload cancelled", Toasts.Type.MESSAGE);
            setUploadState({ phase: "cancelled", status: "Upload cancelled.", canCancel: false, percent: 0 });
        } else {
            showToast(`Upload failed: ${message}`, Toasts.Type.FAILURE);
            logger.error("Upload error", error);
            setUploadState({ phase: "failed", status: `Upload failed: ${message}`, canCancel: false, percent: 0 });
        }
    } finally {
        isUploading = false;
        activeAbortController = null;
        setTimeout(() => resetUploadState(), 1800);
    }
}

export async function uploadPickedFile(): Promise<void> {
    if (isUploading) {
        showToast("Upload already in progress", Toasts.Type.MESSAGE);
        return;
    }

    if (!isConfigured()) {
        showToast("Please configure FileUpload settings first", Toasts.Type.FAILURE);
        return;
    }

    const file = await chooseFile("*/*");
    if (!file) {
        return;
    }

    isUploading = true;
    cancelRequested = false;
    setUploadState({
        phase: "preparing",
        fileName: file.name,
        currentService: null,
        currentServiceLabel: "",
        attempt: 0,
        totalAttempts: 0,
        percent: 2,
        status: `Preparing ${file.name}...`,
        canCancel: true
    });

    try {
        await uploadPreparedBlob(file);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message === "Upload cancelled by user") {
            showToast("Upload cancelled", Toasts.Type.MESSAGE);
            setUploadState({ phase: "cancelled", status: "Upload cancelled.", canCancel: false, percent: 0 });
        } else {
            showToast(`Upload failed: ${message}`, Toasts.Type.FAILURE);
            logger.error("Manual upload error", error);
            setUploadState({ phase: "failed", status: `Upload failed: ${message}`, canCancel: false, percent: 0 });
        }
    } finally {
        isUploading = false;
        activeAbortController = null;
        setTimeout(() => resetUploadState(), 1800);
    }
}

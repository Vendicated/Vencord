/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { toProxiedUrl } from "@equicordplugins/fileUpload/constants";
import { settings } from "@equicordplugins/fileUpload/settings";
import { PluginNative } from "@utils/types";

type S3Store = {
    s3Endpoint?: string;
    s3Bucket?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3SessionToken?: string;
    s3PublicUrl?: string;
    s3Prefix?: string;
    s3ForcePathStyle?: boolean;
    corsProxyUrl?: string;
};

const textEncoder = new TextEncoder();

function toArrayBuffer(data: ArrayBuffer | Uint8Array | string): ArrayBuffer {
    if (typeof data === "string") {
        return textEncoder.encode(data).buffer as ArrayBuffer;
    }

    if (data instanceof Uint8Array) {
        return new Uint8Array(data).buffer;
    }

    return data;
}

function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, "0")).join("");
}

function encodeRfc3986(value: string): string {
    return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildS3Path(...parts: string[]): string {
    const normalized = parts
        .filter(Boolean)
        .flatMap(part => part.split("/"))
        .filter(Boolean)
        .map(encodeRfc3986)
        .join("/");
    return normalized ? `/${normalized}` : "/";
}

function getTimestampParts(date: Date): { amzDate: string; dateStamp: string; } {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");
    const second = String(date.getUTCSeconds()).padStart(2, "0");

    return {
        amzDate: `${year}${month}${day}T${hour}${minute}${second}Z`,
        dateStamp: `${year}${month}${day}`
    };
}

async function sha256Hex(data: ArrayBuffer | Uint8Array | string): Promise<string> {
    return toHex(await crypto.subtle.digest("SHA-256", toArrayBuffer(data)));
}

async function hmacSha256(key: ArrayBuffer | Uint8Array | string, value: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey("raw", toArrayBuffer(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return await crypto.subtle.sign("HMAC", cryptoKey, toArrayBuffer(value));
}

function makeRandomHex(length = 16): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

export function isS3Configured(): boolean {
    const { s3Endpoint, s3Bucket, s3Region, s3AccessKeyId, s3SecretAccessKey } = settings.store as S3Store;
    return Boolean(s3Endpoint && s3Bucket && s3Region && s3AccessKeyId && s3SecretAccessKey);
}

export async function uploadToS3(
    fileBlob: Blob,
    filename: string,
    native: PluginNative<typeof import("../native")> | null
): Promise<string> {
    const {
        s3Endpoint,
        s3Bucket,
        s3Region = "auto",
        s3AccessKeyId,
        s3SecretAccessKey,
        s3SessionToken,
        s3PublicUrl,
        s3Prefix,
        s3ForcePathStyle = true
    } = settings.store as S3Store;

    if (!s3Endpoint || !s3Bucket || !s3Region || !s3AccessKeyId || !s3SecretAccessKey) {
        throw new Error("S3 endpoint, bucket, region, access key ID, and secret key are required");
    }

    const endpoint = new URL(s3Endpoint);
    if (!/^https?:$/.test(endpoint.protocol)) {
        throw new Error("S3 endpoint must be a valid HTTP(S) URL");
    }

    const extension = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
    const prefixSegments = (s3Prefix || "").split("/").filter(Boolean);
    const objectName = `${Date.now()}-${makeRandomHex(8)}${extension}`;
    const objectKeyRaw = [...prefixSegments, objectName].join("/");
    const objectKeyPath = objectKeyRaw.split("/").filter(Boolean).map(encodeRfc3986).join("/");

    const host = s3ForcePathStyle ? endpoint.host : `${s3Bucket}.${endpoint.host}`;
    const canonicalUri = s3ForcePathStyle
        ? buildS3Path(endpoint.pathname, s3Bucket, objectKeyRaw)
        : buildS3Path(endpoint.pathname, objectKeyRaw);

    const uploadUrl = new URL(endpoint.toString());
    uploadUrl.host = host;
    uploadUrl.pathname = canonicalUri;
    uploadUrl.search = "";

    const now = new Date();
    const { amzDate, dateStamp } = getTimestampParts(now);
    const payloadHash = await sha256Hex(await fileBlob.arrayBuffer());

    const canonicalHeadersMap: Record<string, string> = {
        "content-type": fileBlob.type || "application/octet-stream",
        "host": host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate
    };

    if (s3SessionToken) {
        canonicalHeadersMap["x-amz-security-token"] = s3SessionToken;
    }

    const signedHeaderEntries = Object.entries(canonicalHeadersMap).sort(([a], [b]) => a.localeCompare(b));
    const signedHeaders = signedHeaderEntries.map(([key]) => key).join(";");
    const canonicalHeaders = signedHeaderEntries.map(([key, value]) => `${key}:${value.trim()}\n`).join("");

    const canonicalRequest = [
        "PUT",
        canonicalUri,
        "",
        canonicalHeaders,
        signedHeaders,
        payloadHash
    ].join("\n");

    const scope = `${dateStamp}/${s3Region}/s3/aws4_request`;
    const stringToSign = [
        "AWS4-HMAC-SHA256",
        amzDate,
        scope,
        await sha256Hex(canonicalRequest)
    ].join("\n");

    const kDate = await hmacSha256(`AWS4${s3SecretAccessKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, s3Region);
    const kService = await hmacSha256(kRegion, "s3");
    const kSigning = await hmacSha256(kService, "aws4_request");
    const signature = toHex(await hmacSha256(kSigning, stringToSign));

    const requestHeaders: Record<string, string> = {
        "Authorization": `AWS4-HMAC-SHA256 Credential=${s3AccessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        "Content-Type": canonicalHeadersMap["content-type"],
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate
    };

    if (s3SessionToken) {
        requestHeaders["x-amz-security-token"] = s3SessionToken;
    }

    if (native) {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const result = await native.uploadToS3(arrayBuffer, uploadUrl.toString(), requestHeaders);
        if (!result.success) {
            throw new Error(result.error || "Upload failed");
        }
    } else {
        const response = await fetch(toProxiedUrl(uploadUrl.toString(), settings.store.corsProxyUrl), {
            method: "PUT",
            headers: requestHeaders,
            body: fileBlob
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upload failed: ${response.status} ${text}`);
        }
    }

    if (s3PublicUrl) {
        const base = s3PublicUrl.replace(/\/+$/, "");
        return `${base}/${objectKeyPath}`;
    }

    const publicBase = s3ForcePathStyle
        ? `${endpoint.origin}${buildS3Path(endpoint.pathname, s3Bucket)}`
        : `${endpoint.protocol}//${host}${buildS3Path(endpoint.pathname)}`;

    return `${publicBase.replace(/\/+$/, "")}/${objectKeyPath}`;
}

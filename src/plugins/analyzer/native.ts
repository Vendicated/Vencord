/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Buffer } from "buffer";
import { IpcMainInvokeEvent } from "electron";

export async function makeHybridAnalysisRequest(_: IpcMainInvokeEvent, apiKey: string, fileUrl: string) {
    const url = "https://www.hybrid-analysis.com/api/v2/quick-scan/file";
    let attempts = 0;

    try {
        const fileResponse = await fetch(fileUrl);
        const fileBlob = await fileResponse.blob();
        const file = new File([fileBlob], "uploaded-file", { type: fileBlob.type });
        const formData = new FormData();
        formData.append("scan_type", "all");
        formData.append("file", file);
        while (attempts < 3) {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "User-Agent": "Sandbox",
                    "api-key": apiKey
                },
                body: formData
            });
            const data = await res.text();
            if (!data.includes("queue")) {
                return { status: res.status, data };
            }
            attempts++;
            if (attempts < 3) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        return { status: -1, data: "Max retries reached" };
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}
export async function makeVirusTotalRequest(_: IpcMainInvokeEvent, apiKey: string, fileUrl: string) {
    const url = "https://www.virustotal.com/api/v3/files";

    try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) throw new Error(`Failed to fetch file from URL: ${fileUrl}`);

        const fileBlob = await fileResponse.blob();

        const file = new File([fileBlob], "uploaded-file", { type: fileBlob.type });

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "x-apikey": apiKey
            },
            body: formData
        });

        const data = await res.json();
        const analysisId = data.data.id;

        console.log("Analysis ID:", analysisId);
        return { status: res.status, data, analysisId };
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}

export async function getVirusTotalFileReport(_: IpcMainInvokeEvent, apiKey: string, fileId: string) {
    const decodedString = Buffer.from(fileId, "base64").toString("utf-8");
    const md5 = decodedString.split(":")[0];
    const url = `https://www.virustotal.com/api/v3/files/${md5}`;
    try {
        const res = await fetch(url, {
            method: "GET",
            headers: {
                "x-apikey": apiKey
            }
        });

        if (!res.ok) throw new Error(`Failed to fetch file report: ${res.statusText}`);

        const data = await res.json();
        return { status: res.status, data };
    } catch (e) {
        return { status: -1, data: String(e) };
    }
}

export async function uploadToTriage(_: IpcMainInvokeEvent, apiKey: string, fileUrl: string) {
    const url = "https://tria.ge/api/v0/samples";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey,
            },

            body: JSON.stringify({
                kind: "fetch",
                url: fileUrl
            })
        });

        const data = await res.json();

        if (res.status !== 200) {
            return { status: -1, data: data.error };
        }

        console.log("Triage response: ", data);

        const reportID = data.id;
        return { status: res.status, data, reportID };

    } catch (e) {
        console.log("Triage error:", e);
    }
}

export async function getTriageResults(_: IpcMainInvokeEvent, apiKey: string, reportID: string) {
    const url = "https://tria.ge/api/v0/samples/" + reportID + "/overview.json";

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (res.status !== 200) {
            console.log(data);
            return { status: -1, data: data.error };
        }

        console.log("Triage response: ", data);
    } catch (e) {
        console.log("Triage error:", e);
    }
}


/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export async function RequestRandomUser() {
    const data = await fetch("https://randomuser.me/api").then(e => e.json());

    return JSON.stringify(data.results[0]);
}

export async function ToBase64ImageUrl(_, data) {
    const { imgUrl } = data;

    try {
        const fetchImageUrl = await fetch(imgUrl);
        const responseArrBuffer = await fetchImageUrl.arrayBuffer();

        const toBase64 =
            `data:${fetchImageUrl.headers.get("Content-Type") || "image/png"};base64,${Buffer.from(responseArrBuffer).toString("base64")}`;

        return JSON.stringify({ data: toBase64 });

    } catch (error) {
        console.error("Error converting image to Base64:", error);
        return JSON.stringify({ error: "Failed to convert image to Base64" });
    }
}

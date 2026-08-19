import { CspPolicies, ImageSrc } from "@main/csp";
import { IpcMainInvokeEvent } from "electron";

const API_URL = "https://haunt.gg/api/lookup/user";

CspPolicies["assets.haunt.gg"] = ImageSrc;
CspPolicies["r2.haunt.gg"] = ImageSrc;

export async function lookupUser(_: IpcMainInvokeEvent, apiKey: string, discordId: string) {
    if (
        typeof apiKey !== "string" || apiKey.length === 0 || apiKey.length > 256 ||
        typeof discordId !== "string" || !/^\d{1,32}$/.test(discordId)
    ) {
        return { status: 400, retryAfter: null, data: JSON.stringify({ error: "Invalid lookup parameters" }) };
    }

    const url = `${API_URL}?type=discord&value=${encodeURIComponent(discordId)}&badges=true&views=true&feedback=true`;

    try {
        const res = await fetch(url, {
            headers: {
                "X-API-Key": apiKey,
                Accept: "application/json"
            }
        });

        return {
            status: res.status,
            retryAfter: res.headers.get("retry-after"),
            data: await res.text()
        };
    } catch {
        return { status: -1, retryAfter: null, data: "" };
    }
}

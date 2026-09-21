/**
 * native.ts — runs in Electron's "main" process.
 */

const CLIENT_IDENTIFIER = "vencord-plex-rich-presence";

export async function requestPin(_: any) {
    try {
        const res = await fetch("https://plex.tv/api/v2/pins", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Plex-Client-Identifier": CLIENT_IDENTIFIER,
                "X-Plex-Product": "Vencord Plex Rich Presence"
            },
            body: "strong=true"
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return { id: data.id, code: data.code };
    } catch (e) {
        console.error("[PlexRichPresence:native] Failed to request a login code:", e);
        return null;
    }
}

export async function checkPin(_: any, id: number) {
    try {
        const res = await fetch(`https://plex.tv/api/v2/pins/${id}`, {
            headers: {
                Accept: "application/json",
                "X-Plex-Client-Identifier": CLIENT_IDENTIFIER
            }
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data.authToken ?? null;
    } catch (e) {
        console.error("[PlexRichPresence:native] Failed to check the login code:", e);
        return null;
    }
}

export async function fetchUsername(_: any, token: string) {
    try {
        const res = await fetch("https://plex.tv/api/v2/user", {
            headers: {
                Accept: "application/json",
                "X-Plex-Client-Identifier": CLIENT_IDENTIFIER,
                "X-Plex-Token": token
            }
        });
        if (!res.ok) return null;
        const data: any = await res.json();
        return data?.username ?? data?.title ?? null;
    } catch {
        return null;
    }
}

export async function fetchSessions(_: any, serverUrl: string, token: string) {
    try {
        const url = `${serverUrl.replace(/\/$/, "")}/status/sessions?X-Plex-Token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.status === 401) return { unauthorized: true, sessions: null, error: null };
        if (!res.ok) {
            return { unauthorized: false, sessions: null, error: `Server responded with status ${res.status}` };
        }
        const data: any = await res.json();
        return { unauthorized: false, sessions: data?.MediaContainer?.Metadata ?? [], error: null };
    } catch (e: any) {
        const message = e?.cause?.message || e?.message || String(e);
        console.error("[PlexRichPresence:native] Error contacting the Plex Media Server:", e);
        return { unauthorized: false, sessions: null, error: message };
    }
}

/**
 * Primary: MusicBrainz API -> Cover Art Archive
 * Secondary: iTunes Search API
 * Tertiary: Local Plex Upload via temporary host
 */
export async function fetchOnlineCover(_: any, artist: string, album: string, title: string, localPlexUrl: string | null) {
    // 1. MusicBrainz API lookup
    if (artist && album) {
        try {
            const query = `release:"${album.replace(/"/g, "")}" AND artist:"${artist.replace(/"/g, "")}"`;
            const mbRes = await fetch(`https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json`, {
                headers: {
                    "User-Agent": "VencordPlexRichPresence/1.0.0 (https://github.com/Vendicated/Vencord)"
                }
            });

            if (mbRes.ok) {
                const data: any = await mbRes.json();
                const releases = data?.releases;
                if (releases && releases.length > 0) {
                    for (const rel of releases.slice(0, 3)) {
                        const mbid = rel.id;
                        const caaUrl = `https://coverartarchive.org/release/${mbid}/front-500`;
                        const headRes = await fetch(caaUrl, { method: "HEAD" }).catch(() => null);
                        if (headRes && headRes.ok) {
                            return caaUrl;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("[PlexRichPresence:native] MusicBrainz API lookup failed:", e);
        }
    }

    // 2. iTunes Search API Fallback
    if (artist && (album || title)) {
        try {
            const searchQuery = `${artist} ${album || title}`;
            const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=album&limit=1`);
            if (itunesRes.ok) {
                const data: any = await itunesRes.json();
                const artwork = data?.results?.[0]?.artworkUrl100;
                if (artwork) {
                    return artwork.replace("100x100bb", "600x600bb");
                }
            }
        } catch (e) {
            console.warn("[PlexRichPresence:native] iTunes API lookup failed:", e);
        }
    }

    // 3. Local Plex fallback
    if (localPlexUrl) {
        return await uploadArt(null, localPlexUrl);
    }

    return null;
}

export async function uploadArt(_: any, imageUrl: string) {
    try {
        const imgRes = await fetch(imageUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
        });
        if (!imgRes.ok) return null;

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        if (buffer.byteLength === 0) return null;

        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";

        const form = new FormData();
        form.append("file", new Blob([buffer], { type: contentType }), `cover.${ext}`);

        const res = await fetch("https://tmpfiles.org/api/v1/upload", {
            method: "POST",
            body: form
        });

        if (res.ok) {
            const data: any = await res.json();
            if (data?.status === "success" && data?.data?.url) {
                return data.data.url.replace("https://tmpfiles.org/", "https://tmpfiles.org/dl/");
            }
        }
        return null;
    } catch {
        return null;
    }
}

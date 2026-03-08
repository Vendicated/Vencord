/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { LinkButton } from "@components/Button";
import { Devs } from "@utils/constants.js";
import definePlugin, { PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findComponentLazy } from "@webpack";
import { ChannelStore, React, useEffect, useState } from "@webpack/common";

// Regex for https://www.xivmodarchive.com/modid/<number>
const XMA_REGEX = /https?:\/\/www\.xivmodarchive\.com\/modid\/(\d+)/i;

const Embed = findComponentLazy(m => m.prototype?.renderSuppressButton);
const Native = VencordNative.pluginHelpers.EmbedXivModArchive as PluginNative<typeof import("./native")>;
const modCache = new Map<string, Promise<{ data: any; error: string | undefined; }>>();
const imageCache = new Map<string, Promise<string>>();
const fetchQueue: (() => void)[] = [];
let fetchInProgress = false;

export default definePlugin({
    name: "EmbedXivModArchive",
    description: "Embeds XIV Mod Archive mod links",
    authors: [Devs.infiniti],
    dependencies: ["MessageAccessoriesAPI", "UserSettingsAPI"],

    start() {
        addMessageAccessory("EmbedXivModArchive", props => {
            const { content } = props.message;
            if (!content) return null;

            const m = content.match(XMA_REGEX);
            if (!m) return null;

            const modId = m[1];
            const channel = ChannelStore.getChannel(props.message.channel_id);

            return <XmaEmbed key={`xma-${modId}`} modId={modId} message={props.message as Message} channel={channel} />;
        });
    },

    stop() {
        removeMessageAccessory("EmbedXivModArchive");
    }

});

function enqueueFetch(fetchFn: () => void) {
    fetchQueue.push(fetchFn);
    if (!fetchInProgress) {
        processNextFetch();
    }
}

function processNextFetch() {
    if (fetchQueue.length === 0) {
        fetchInProgress = false;
        return;
    }

    fetchInProgress = true;
    const fetchFn = fetchQueue.shift()!;
    fetchFn();
    setTimeout(processNextFetch, 1000);
}

function XmaEmbed({ modId, message, channel }: { modId: string; message: Message; channel?: any; }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [thumbSrc, setThumbSrc] = useState<string | undefined>(undefined);
    // const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);
    const [imageRevealed, setImageRevealed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);

        let fetchPromise = modCache.get(modId);
        if (!fetchPromise) {
            fetchPromise = new Promise<{ data: any; error: string | undefined; }>(resolve => {
                enqueueFetch(async () => {
                    try {
                        const response = await Native.fetchXmaJson(modId);
                        resolve({ data: response.mod, error: undefined });
                    } catch (e) {
                        resolve({ data: null, error: String(e) });
                    }
                });
            });
            modCache.set(modId, fetchPromise);
        }

        fetchPromise.then(({ data, error }) => {
            if (!cancelled) {
                setData(data);
                setError(error);
                setLoading(false);
            }
        });

        return () => { cancelled = true; };
    }, [modId]);

    useEffect(() => {
        if (!data?.thumbnail) return;
        let cancelled = false;

        let imagePromise = imageCache.get(data.thumbnail);
        if (!imagePromise) {
            imagePromise = (async () => {
                try {
                    const dataUrl = Native.fetchImageAsDataUrl
                        ? await Native.fetchImageAsDataUrl(data.thumbnail)
                        : data.thumbnail;
                    return dataUrl ?? data.thumbnail;
                } catch {
                    return data.thumbnail;
                }
            })();
            imageCache.set(data.thumbnail, imagePromise);
        }

        imagePromise.then(src => {
            if (!cancelled) setThumbSrc(src);
        });

        return () => { cancelled = true; };
    }, [data?.thumbnail]);

    /*
        Currently, avatars don't support data urls and they can't be fetched directly from XMA
        They will only show up if the user's avatar is hosted somewhere other than XMA
    */

    // useEffect(() => {
    //     if (!data?.author?.avatar) return;
    //     let cancelled = false;

    //     let imagePromise = imageCache.get(data.author.avatar);
    //     if (!imagePromise) {
    //         imagePromise = new Promise<string>(resolve => {
    //             enqueueFetch(async () => {
    //                 try {
    //                     const dataUrl = Native.fetchImageAsDataUrl
    //                         ? await Native.fetchImageAsDataUrl(data.author.avatar)
    //                         : data.author.avatar;
    //                     resolve(dataUrl ?? data.author.avatar);
    //                 } catch {
    //                     resolve(data.author.avatar);
    //                 }
    //             });
    //         });
    //         imageCache.set(data.author.avatar, imagePromise);
    //     }

    //     imagePromise.then(src => {
    //         if (!cancelled) setAvatarSrc(src);
    //     });

    //     return () => { cancelled = true; };
    // }, [data?.author?.avatar]);

    const embedColor = data
        ? data.dt_compat === 0 ? "#d4edda"
            : data.dt_compat === 1 ? "#d1ecf1"
                : data.dt_compat === 2 ? "#fff3cd"
                    : "#f8d7da"
        : "var(--background-base-lower)";

    return (
        <Embed
            embed={{
                rawDescription: "",
                color: embedColor,
                author: data ? {
                    name: `[${data?.author?.display_name}] ${data?.name}`,
                    iconProxyURL: data?.author?.avatar ?? undefined
                } : undefined
            }}
            renderDescription={() => (
                <div style={{ padding: 8, minWidth: 384 }}>
                    {loading && <div>Loading mod info…</div>}
                    {error && (
                        <div style={{ color: "var(--danger)" }}>
                            {error}
                        </div>
                    )}
                    {data && (() => {
                        const link = data.primary_download?.link;
                        const downloadHref = link ? (link.startsWith("http") ? link : `https://www.xivmodarchive.com${link}`) : undefined;
                        return (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                                {(thumbSrc || data.thumbnail) && (
                                    <div style={{ position: "relative", display: "inline-block" }}>
                                        <img
                                            src={thumbSrc ?? data.thumbnail}
                                            alt={data.name ?? ""}
                                            style={{ width: 384, height: 192, objectFit: "contain", borderRadius: 6, cursor: "pointer" }}
                                            onClick={() => window.open(`https://www.xivmodarchive.com/modid/${modId}`, "_blank")}
                                        />
                                        {(data.nsfw || data.nsfl) && (
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    background: "rgba(0,0,0,0.8)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    color: "white",
                                                    fontSize: "24px",
                                                    fontWeight: "bold",
                                                    cursor: "pointer",
                                                    borderRadius: 6,
                                                    opacity: imageRevealed ? 0 : 1,
                                                    backdropFilter: imageRevealed ? "blur(0px)" : "blur(10px)",
                                                    transition: "opacity 400ms ease, backdrop-filter 400ms ease",
                                                    pointerEvents: imageRevealed ? "none" : "auto"
                                                }}
                                                onClick={() => setImageRevealed(true)}
                                            >
                                                {data.nsfl ? "WARNING: NSFL ☠️" : "NSFW"}
                                            </div>
                                        )}
                                    </div>
                                )}
                                <div style={{ flex: 1, display: "flex", width: "100%" }}>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Views</div>
                                        <div style={{ fontSize: 12 }}>{parseInt(data?.views)?.toLocaleString() ?? "Unknown"}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Downloads</div>
                                        <div style={{ fontSize: 12 }}>{data?.downloads?.toLocaleString() ?? "Unknown"}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Followers</div>
                                        <div style={{ fontSize: 12 }}>{data?.followers?.toLocaleString() ?? "Unknown"}</div>
                                    </div>
                                </div>
                                <div style={{ flex: 1, display: "flex", width: "100%" }}>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Last Updated</div>
                                        <div style={{ fontSize: 12 }}>{new Date(parseInt(data?.time_published))?.toLocaleDateString() ?? "Unknown"}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>Release Date</div>
                                        <div style={{ fontSize: 12 }}>{new Date(parseInt(data?.time_version_updated))?.toLocaleDateString() ?? "Unknown"}</div>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                        <div style={{ fontSize: 12, fontWeight: 600 }}>DT Compatible</div>
                                        <div style={{ fontSize: 12 }}>{data.dt_compat === 0 ? "✅ Yes!" : data.dt_compat === 1 ? "Needs TexTools" : data.dt_compat === 2 ? "Partially Functional" : "❌ Non-functional"}</div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <LinkButton size="small" href={`https://www.xivmodarchive.com/modid/${modId}`}>View on XMA</LinkButton>
                                    <LinkButton size="small" href={downloadHref}>Download</LinkButton>
                                    {(data.nsfw || data.nsfl) && (
                                        <div
                                            style={{
                                                padding: "4px 12px",
                                                borderRadius: 9999,
                                                backgroundColor: data.nsfl ? "var(--status-danger)" : "var(--status-warning)",
                                                color: "white",
                                                fontSize: "16px",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                userSelect: "none",
                                                marginLeft: "10px"
                                            }}
                                        >
                                            {data.nsfl ? "☠️ NSFL" : "NSFW"}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        />
    );
}

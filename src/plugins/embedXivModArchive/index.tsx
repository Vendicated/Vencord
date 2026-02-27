/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessageAccessory, removeMessageAccessory } from "@api/MessageAccessories";
import { Devs } from "@utils/constants.js";
import definePlugin, { PluginNative } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import { ChannelStore, React, useEffect, useState } from "@webpack/common";
import { Logger } from "@utils/Logger";
import { Button, LinkButton } from "@components/Button";

// Regex for https://www.xivmodarchive.com/modid/<number>
const XMA_REGEX = /https?:\/\/www\.xivmodarchive\.com\/modid\/(\d+)/i;

const Embed = findComponentByCodeLazy(".inlineMediaEmbed");

const log = new Logger("EmbedXivModArchive");

const Native = VencordNative.pluginHelpers.EmbedXivModArchive as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "EmbedXivModArchive",
    description: "Embeds XIV Mod Archive mod links",
    authors: [Devs.infiniti],
    dependencies: ["MessageAccessoriesAPI", "MessageUpdaterAPI", "UserSettingsAPI"],

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

function XmaEmbed({ modId, message, channel }: { modId: string; message: Message; channel?: any; }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | undefined>(undefined);
    const [thumbSrc, setThumbSrc] = useState<string | undefined>(undefined);
    const [avatarSrc, setAvatarSrc] = useState<string | undefined>(undefined);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(undefined);

        const fetchJson = async () => {
            try {
                const json = Native.fetchXmaJson
                    ? await Native.fetchXmaJson(modId)
                    : await fetch(`https://www.xivmodarchive.com/modid/${modId}?json=true`).then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`));
                if (!cancelled) setData(json?.mod ?? json);
            } catch (e) {
                if (!cancelled) setError(String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchJson();
        return () => { cancelled = true; };
    }, [modId]);

    useEffect(() => {
        if (!data?.thumbnail) return;
        let cancelled = false;

        (async () => {
            try {
                log.info("data.thumbnail", data.thumbnail);
                const dataUrl = Native.fetchImageAsDataUrl
                    ? await Native.fetchImageAsDataUrl(data.thumbnail)
                    : data.thumbnail;
                if (!cancelled) setThumbSrc(dataUrl ?? data.thumbnail);
            } catch {
                if (!cancelled) setThumbSrc(data.thumbnail);
            }
        })();

        return () => { cancelled = true; };
    }, [data?.thumbnail]);

    useEffect(() => {
        if (!data?.author?.avatar) return;
        let cancelled = false;

        (async () => {
            try {
                log.info("data.author.avatar", data.author.avatar);
                const dataUrl = Native.fetchImageAsDataUrl
                    ? await Native.fetchImageAsDataUrl(data.author.avatar)
                    : data.author.avatar;
                log.info("dataUrl", dataUrl);
                if (!cancelled) setAvatarSrc(dataUrl ?? data.author.avatar);
            } catch {
                if (!cancelled) setAvatarSrc(data.author.avatar);
            }
        })();

        return () => { cancelled = true; };
    }, [data?.author?.avatar]);

    return (
        <Embed
            embed={{
                rawDescription: "",
                color: "var(--background-base-lower)",
                author: data ? {
                    name: `[${data?.author?.display_name}] ${data?.name}`,
                    iconURL: avatarSrc ?? data?.author?.avatar ?? undefined
                } : undefined
            }}
            renderDescription={() => (
                <div style={{ padding: 8, minWidth: 384 }}>
                    {loading && <div>Loading mod info…</div>}
                    {error && <div style={{ color: "var(--danger)" }}>Error: {error}</div>}
                    {data && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            {(thumbSrc || data.thumbnail) && (
                                <img src={thumbSrc ?? data.thumbnail} alt={data.name ?? ""} style={{ width: 384, height: 192, objectFit: "contain", borderRadius: 6 }} />
                            )}
                            <div style={{ flex: 1, display: "flex", width: "100%" }}>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Views</div>
                                    <div style={{ fontSize: 12 }}>{parseInt(data.views).toLocaleString() ?? "Unknown"}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Downloads</div>
                                    <div style={{ fontSize: 12 }}>{data.downloads.toLocaleString() ?? "Unknown"}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Followers</div>
                                    <div style={{ fontSize: 12 }}>{data.followers.toLocaleString() ?? "Unknown"}</div>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: "flex", width: "100%" }}>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Last Updated</div>
                                    <div style={{ fontSize: 12 }}>{new Date(parseInt(data.time_published)).toLocaleDateString() ?? "Unknown"}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>Release Date</div>
                                    <div style={{ fontSize: 12 }}>{new Date(parseInt(data.time_version_updated)).toLocaleDateString() ?? "Unknown"}</div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", width: "33%" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>DT Compatibile</div>
                                    <div style={{ fontSize: 12 }}>{data.dt_compat === 0 ? "Yes!" : data.dt_compat === 1 ? "Maybe?" : "No."}</div>
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                                <LinkButton size="small" href={`https://www.xivmodarchive.com/modid/${modId}`}>View on XMA</LinkButton>
                                <LinkButton size="small" href={`https://www.xivmodarchive.com${data.primary_download.link}`}>Download</LinkButton>
                            </div>
                        </div>
                    )}
                </div>
            )}
        />
    );
}

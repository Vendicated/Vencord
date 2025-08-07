/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { parseUrl } from "@utils/misc";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import {
    ChannelStore,
    Constants,
    Menu,
    React,
    RestAPI,
    showToast,
    Toasts
} from "@webpack/common";

import { settings } from "./settings";

const RefreshIcon = findByCodeLazy("M21 2a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-6a1 1 0 1 1 0-2h3.93A8");
const convertEmbed = findByCodeLazy(".uniqueId(\"embed_\")");
const logger = new Logger("EmbedReplace");

function isEmbedInMessage(message: Message, url: string): boolean {
    return message?.embeds?.some((embed: any) => {
        return embed?.url === url;
    }) || message?.attachments?.some((attachment: any) => {
        return attachment?.url === url;
    });
}

function addShowEmbedButton(children, props) {
    if (props.itemSrc || !props.itemHref || !props.message) return; // itemSrc means the right clicked item is an image/attachment
    const group = findGroupChildrenByChildId("copy-native-link", children);
    if (!group) return;

    const { message } = props;

    const origUrl = normaliseUrl(props.itemHref);

    if (!isEmbedInMessage(message, origUrl)) return; // if the original url isn't embedded, don't show the replace embed button

    const repUrl = normaliseUrl(replaceUrl(props.itemHref));

    if (origUrl === repUrl) return; // no need to show the replace embed button if there is no url replacement to apply

    if (!isEmbedInMessage(message, repUrl)) {
        group.splice(0, 0,
            <Menu.MenuItem
                id="replace-embed"
                label="Replace Embed"
                action={_ => unfurlEmbed(repUrl, origUrl, message)}
                icon={RefreshIcon}
                key="replace-embed"/>);
    }
}

function unfurlEmbed(url: string, oldUrl: string, message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);

    if (!parseUrl(url)) {
        return;
    }


    RestAPI.post({
        url: Constants.Endpoints.UNFURL_EMBED_URLS,
        body: {
            urls: [url]
        }
    }).catch(e => {
        showFailureToast("Failed to get embed");
        logger.error("Failed to get embed", e);
    }).then(resp => {
        if (!resp?.body || !resp?.body?.embeds || resp.body.embeds.length === 0) {
            showFailureToast("No embeds found");
            return;
        }

        const { embeds } = resp.body;
        const convertedEmbeds: any = [];
        const existingEmbeds = message.embeds;

        for (const embed of embeds) {
            try {
                const convertedEmbed = convertEmbed(channel.id, message.id, embed);
                if (!convertedEmbed) {
                    showFailureToast("Failed to get embed");
                    logger.error("embed object couldn't be converted", embed);
                    continue;
                }
                // if we can, try to match the non-replaced url embed and replace it with the new embed
                if (existingEmbeds.some((existingEmbed: any) => existingEmbed.url === oldUrl)) {
                    existingEmbeds[existingEmbeds.findIndex((existingEmbed: any) => existingEmbed.url === oldUrl)] = convertedEmbed;
                } else {
                    convertedEmbeds.push(convertedEmbed);
                }
            } catch (e) {
                showFailureToast("Failed to get embed");
                logger.error("Failed to convert embed", e);
            }
        }

        const newEmbeds = [...existingEmbeds, ...convertedEmbeds];

        newEmbeds.sort((a: any, b: any) => {
            return message.content.indexOf(a.url) - message.content.indexOf(b.url);
        });

        updateMessage(message.channel_id, message.id, { embeds: newEmbeds });
    });
}

function showFailureToast(message: string) {
    showToast(message, Toasts.Type.FAILURE, { position: Toasts.Position.BOTTOM });
}


// special cases where the unfurl api endpoint returns an embed with a different url than the one we requested
// e.g. you request an embed for a youtu.be link and the returned object has { ... url: youtube.com }
// this is not an exhaustive list, may need to add more cases in the future
function normaliseUrl(url: string): string {
    // normalise youtube urls to the /watch?v= format (t param is replaced with start, v always comes first)
    const youtubeRegex = /(https?:\/\/)?(?:m\.|www\.)?(youtu\.be|youtube\.com)\/(embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/)?((\w|-){11})(?:\S+)?/;

    if (youtubeRegex.test(url)) {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        let start = 0;

        if (params.has("t") || params.has("start")) {
            const startParam = params.get("start") || params.get("t");
            if (startParam && startParam.match(/^(?:(\d+h)?(\d+m)?(\d+s)?(\d+)?)?$/)) {
                const hours = startParam.match(/(\d+)h/);
                const minutes = startParam.match(/(\d+)m/);
                const seconds = startParam.match(/(\d+)s/);
                const unqualifiedSeconds = startParam.match(/(\d+)$/);
                if (hours) start += parseInt(hours[1]) * 3600;
                if (minutes) start += parseInt(minutes[1]) * 60;
                if (seconds) start += parseInt(seconds[1]);
                if (unqualifiedSeconds) start += parseInt(unqualifiedSeconds[1]);
            }
        }
        url = url.replace(youtubeRegex, `https://www.youtube.com/watch?v=$4${start ? "&start=" + start : ""}`);
    }

    // x.com links still return an embed with url twitter.com at the moment
    const xDotComRegex = /(https?:\/\/(?:www\.)?)x\.com(\/.*)?/;

    if (xDotComRegex.test(url)) {
        url = url.replace(xDotComRegex, (match, p1, p2) => p1 + "twitter.com" + (p2 || ""));
    }

    // tiktok adds ?enable_tiktok_webview=true
    const tiktokRegex = /(https?:\/\/(?:www\.)?)tiktok\.com(\/.*)?/;
    const searchParams = url.includes("?") ? new URLSearchParams(url.split("?")[1]) : new URLSearchParams();
    if (tiktokRegex.test(url) && !searchParams.has("enable_tiktok_webview")) {
        searchParams.append("enable_tiktok_webview", "true");
        const newSearch = searchParams.toString();
        url = url.split("?")[0] + (newSearch ? "?" + newSearch : "");
    }

    return url;
}

export function replaceUrl(url) {
    if (!settings.store.replacements || settings.store.replacements.length < 1) return;
    for (const replacement of settings.store.replacements) {
        const { match, replace, isValid } = replacement;
        if (!isValid) continue;
        const repUrl = url.replace(replacement.isRegex ? new RegExp(match, "g") : match, replace);
        if (repUrl !== url) {
            return repUrl;
        }
    }
    return url;
}

export default definePlugin({
    name: "EmbedReplace",
    description: "Replace URLs used to fetch embed contents",
    authors: [Devs.Suffocate],

    settings,

    contextMenus: {
        "message": addShowEmbedButton
    },
});

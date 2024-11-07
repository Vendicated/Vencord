/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { parseUrl } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { ChannelStore, Constants, Menu, React, RestAPI, showToast, Toasts } from "@webpack/common";
import { Message } from "discord-types/general";

const logger = new Logger("ShowMessageEmbeds");

export default definePlugin({
    name: "ShowMessageEmbeds",
    description: "Adds a context menu option to show embeds for links that don't have one",
    authors: [Devs.Suffocate],

    contextMenus: {
        "message": addShowEmbedButton
    }
});

function addShowEmbedButton(children, props) {
    if (props.itemSrc || !props.itemHref || !props.message) return; // itemSrc means the right clicked item is an image/attachment
    const group = findGroupChildrenByChildId("copy-native-link", children);
    if (!group) return;

    const { message } = props;

    const url = normaliseUrl(props.itemHref);

    if (!isEmbedInMessage(message, url)) {
        group.splice(0, 0,
            <Menu.MenuItem
                id="unfurl-url"
                label="Show Embed"
                action={_ => unfurlEmbed(url, message)}
                icon={ImageVisible}
                key="unfurl-url"/>);
    }
}

function isEmbedInMessage(message: Message, url: string): boolean {
    return message?.embeds?.some((embed: any) => {
        return embed?.url === url;
    }) || message?.attachments?.some((attachment: any) => {
        return attachment?.url === url;
    });
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
        url = url.replace(xDotComRegex, "$1twitter.com$2");
    }

    return url;
}

const convertEmbed = findByCodeLazy(".uniqueId(\"embed_\")");

function unfurlEmbed(url: string, message: Message) {
    const channel = ChannelStore.getChannel(message.channel_id);

    if (!parseUrl(url) || !channel) {
        return;
    }


    RestAPI.post({
        url: Constants.Endpoints.UNFURL_EMBED_URLS,
        body: {
            urls: [url] // The endpoint accepts up to 5 urls at a time but if we send 5 and one fails, it will just return 4 embeds with no indication of which embed corresponds to which url
        }
    }).catch(e => {
        showFailureToast("Failed to get embed");
        logger.error("Failed to get embed", e);
    }).then(resp => {
        if (!resp?.body?.embeds || resp.body.embeds?.length === 0) {
            showFailureToast("No embeds found");
            return;
        }

        const { embeds } = resp.body;
        const convertedEmbeds: any = [];

        for (const embed of embeds) {
            try {
                const convertedEmbed = convertEmbed(channel.id, message.id, embed);
                if (!convertedEmbed) {
                    showFailureToast("Failed to get embed");
                    logger.error("Embed object couldn't be converted", embed);
                    continue;
                }
                convertedEmbeds.push(convertedEmbed);
            } catch (e) {
                showFailureToast("Failed to get embed");
                logger.error("Failed to convert embed", e);
            }
        }

        const newEmbeds = [...message.embeds, ...convertedEmbeds];

        newEmbeds.sort((a: any, b: any) => {
            return message.content.indexOf(a.url) - message.content.indexOf(b.url);
        });

        updateMessage(message.channel_id, message.id, { embeds: newEmbeds });
    });
}

function showFailureToast(message: string) {
    showToast(message, Toasts.Type.FAILURE, { position: Toasts.Position.BOTTOM });
}

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2026 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addMessagePreEditListener, addMessagePreSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { debounce } from "@shared/debounce";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, type PluginNative } from "@utils/types";
import { DraftStore, DraftType, SelectedChannelStore } from "@webpack/common";

import { prefetchExistence, transformWikiLinks, type WikiOptions } from "./linking";
import { getSiteInfo } from "./siteinfo";

const settings = definePluginSettings({
    wikiUrl: {
        type: OptionType.STRING,
        description: "Wiki link format. $1 is replaced with the page title.",
        default: "https://en.wikipedia.org/wiki/$1",
        onChange: value => getSiteInfo(value),
    },
    templateNamespace: {
        type: OptionType.STRING,
        description: "Name of the Template namespace on your wiki (e.g. Template, Шаблон, Vorlage).",
        default: "Template",
    },
    capitalizeFirstLetter: {
        type: OptionType.BOOLEAN,
        description: "Capitalize the first letter of page titles (MediaWiki default for most wikis).",
        default: true,
    },
    useDiscordLinkEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Let Discord show link embeds instead of suppressing them with <>.",
        default: false,
    },
    onlyLinkExisting: {
        type: OptionType.BOOLEAN,
        description: "Only link to pages that exist. Queries the wiki API, disable on slow connections.",
        default: false,
    },
});

function currentOptions(): WikiOptions {
    const s = settings.store;
    return {
        format: s.wikiUrl,
        templateNamespace: s.templateNamespace,
        capitalizeFirst: s.capitalizeFirstLetter,
        useDiscordLinkEmbeds: s.useDiscordLinkEmbeds,
        onlyLinkExisting: s.onlyLinkExisting,
    };
}

const Native = VencordNative.pluginHelpers.WikiLinks as PluginNative<typeof import("./native")>;

// Warm the existence cache as the user types so the send doesn't wait for it
const warmExistenceCache = debounce(() => {
    if (!settings.store.onlyLinkExisting) return;
    const channelId = SelectedChannelStore.getChannelId();
    if (!channelId) return;
    const draft = DraftStore.getDraft(channelId, DraftType.ChannelMessage);
    if (draft) prefetchExistence(draft, currentOptions());
}, 100);

let preSend: ReturnType<typeof addMessagePreSendListener>;
let preEdit: ReturnType<typeof addMessagePreEditListener>;

export default definePlugin({
    name: "WikiLinks",
    description: "Turns [[wiki]] and {{template}} links in your messages into real MediaWiki links.",
    authors: [Devs.pattersonuwu],
    dependencies: ["MessageEventsAPI"],
    settings,

    start() {
        if (!IS_WEB) Native.allowWikimediaHosts();

        getSiteInfo(settings.store.wikiUrl);
        DraftStore.addChangeListener(warmExistenceCache);

        preSend = addMessagePreSendListener(async (_channelId, msg) => {
            msg.content = await transformWikiLinks(msg.content, currentOptions());
        });
        preEdit = addMessagePreEditListener(async (_channelId, _messageId, msg) => {
            msg.content = await transformWikiLinks(msg.content, currentOptions());
        });
    },

    stop() {
        DraftStore.removeChangeListener(warmExistenceCache);
        removeMessagePreSendListener(preSend);
        removeMessagePreEditListener(preEdit);
    },
});

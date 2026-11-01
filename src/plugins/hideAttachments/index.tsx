/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import "./styles.css";

import { get, set } from "@api/DataStore";
import { updateMessage } from "@api/MessageUpdater";
import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { BasicMessage, Message } from "@vencord/discord-types";

const HIDDEN_KEY = "HideAttachments_HiddenIds";
const REVEALED_KEY = "HideAttachments_RevealedIds";

let hiddenMessages = new Set<string>();
let revealedMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await get(HIDDEN_KEY) ?? new Set();
    return hiddenMessages;
}

async function getRevealedMessages() {
    revealedMessages = await get(REVEALED_KEY) ?? new Set();
    return revealedMessages;
}

const saveHiddenMessages = (ids: Set<string>) => set(HIDDEN_KEY, ids);
const saveRevealedMessages = (ids: Set<string>) => set(REVEALED_KEY, ids);

migratePluginSettings("HideMedia", "HideAttachments");

const hasMedia = (msg: BasicMessage) =>
    msg.attachments.length > 0 ||
    msg.embeds.length > 0 ||
    msg.stickerItems.length > 0 ||
    msg.components.length > 0;

const settings = definePluginSettings({
    blacklist: {
        description: "List of user IDs or media links/domains to automatically hide by default (separated by commas or newlines)",
        type: OptionType.STRING,
        default: "",
        multiline: true
    }
});

function matchesBlacklistEntry(msg: BasicMessage, entry: string): boolean {
    if (!entry) return false;

    // Check user ID (raw or formatted as mention <@id>)
    const cleanId = entry.replace(/[<@!>]/g, "");
    if (/^\d{17,20}$/.test(cleanId) && "author" in msg && (msg as Message).author?.id === cleanId) {
        return true;
    }

    if ("author" in msg && (msg as Message).author?.id === entry) {
        return true;
    }

    // Check message content
    if (msg.content?.toLowerCase().includes(entry)) {
        return true;
    }

    // Check attachments
    if (msg.attachments?.some(att =>
        att.url?.toLowerCase().includes(entry) ||
        att.proxy_url?.toLowerCase().includes(entry)
    )) {
        return true;
    }

    // Check embeds
    if (msg.embeds?.some(embed =>
        embed.url?.toLowerCase().includes(entry) ||
        embed.image?.url?.toLowerCase().includes(entry) ||
        embed.image?.proxyURL?.toLowerCase().includes(entry) ||
        embed.thumbnail?.url?.toLowerCase().includes(entry) ||
        embed.thumbnail?.proxyURL?.toLowerCase().includes(entry) ||
        embed.video?.url?.toLowerCase().includes(entry)
    )) {
        return true;
    }

    // Check forwarded messages
    if ("messageSnapshots" in msg && Array.isArray((msg as Message).messageSnapshots)) {
        if ((msg as Message).messageSnapshots.some(s => s.message && matchesBlacklistEntry(s.message, entry))) {
            return true;
        }
    }

    return false;
}

function isBlacklisted(msg: BasicMessage | Message): boolean {
    if (!settings.store.blacklist) return false;
    if (!hasMedia(msg) && !("messageSnapshots" in msg && (msg as Message).messageSnapshots?.some(s => hasMedia(s.message)))) {
        return false;
    }

    const entries = settings.store.blacklist
        .split(/[,\n]/)
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

    if (entries.length === 0) return false;

    return entries.some(entry => matchesBlacklistEntry(msg, entry));
}

function getMessageId(msg: BasicMessage | Message | string | undefined | null): string | undefined {
    if (!msg) return undefined;
    if (typeof msg === "string") return msg;
    if ("id" in msg && typeof (msg as Message).id === "string") return (msg as Message).id;
    return undefined;
}

function isMediaHidden(msg: BasicMessage | Message | string): boolean {
    const id = getMessageId(msg);
    if (id) {
        if (hiddenMessages.has(id)) return true;
        if (revealedMessages.has(id)) return false;
    }
    if (typeof msg !== "string") {
        return isBlacklisted(msg);
    }
    return false;
}

async function toggleHide(channelId: string, msg: BasicMessage | Message | string) {
    const isHidden = isMediaHidden(msg);
    const id = getMessageId(msg);
    if (!id) return;

    if (isHidden) {
        hiddenMessages.delete(id);
        if (typeof msg !== "string" && isBlacklisted(msg)) {
            revealedMessages.add(id);
            await saveRevealedMessages(revealedMessages);
        }
        await saveHiddenMessages(hiddenMessages);
    } else {
        revealedMessages.delete(id);
        if (typeof msg !== "string" && !isBlacklisted(msg)) {
            hiddenMessages.add(id);
            await saveHiddenMessages(hiddenMessages);
        }
        await saveRevealedMessages(revealedMessages);
    }
    updateMessage(channelId, id);
}

export default definePlugin({
    name: "HideMedia",
    description: "Hide attachments and embeds for individual messages via hover button or blacklist",
    tags: ["Chat", "Appearance"],
    authors: [Devs.Ven, Devs.GhaZy],
    dependencies: ["MessageUpdaterAPI"],
    settings,

    patches: [{
        find: "this.renderAttachments(",
        replacement: {
            match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories|ComponentAccessories)\((\i)\)/g,
            replace: "$self.shouldHide($1)?null:$&"
        }
    }],

    messagePopoverButton: {
        icon: ImageInvisible,
        render(msg) {
            if (!hasMedia(msg) && !msg.messageSnapshots?.some(s => s.message && hasMedia(s.message))) return null;

            const isHidden = isMediaHidden(msg);

            return {
                label: isHidden ? "Show Media" : "Hide Media",
                icon: isHidden ? ImageVisible : ImageInvisible,
                onClick: () => toggleHide(msg.channel_id, msg)
            };
        },
    },

    renderMessageAccessory({ message }) {
        if (!this.shouldHide(message)) return null;

        return (
            <span className={classes("vc-hideAttachments-accessory", !message.content && "vc-hideAttachments-no-content")}>
                Media Hidden
            </span>
        );
    },

    async start() {
        await Promise.all([
            getHiddenMessages(),
            getRevealedMessages()
        ]);
    },

    stop() {
        hiddenMessages.clear();
        revealedMessages.clear();
    },

    shouldHide(msg: BasicMessage | Message | string | undefined | null) {
        if (!msg) return false;
        return isMediaHidden(msg);
    },
});

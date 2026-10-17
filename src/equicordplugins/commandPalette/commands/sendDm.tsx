/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openPrivateChannel, sendMessage } from "@utils/discord";
import { sleep } from "@utils/misc";
import { CloudUploadPlatform } from "@vencord/discord-types/enums";
import { ChannelStore, CloudUploader, IconUtils, RelationshipStore, showToast, UserStore } from "@webpack/common";

import type { FormFieldOption, FormSubmitExtras, PaletteCommand } from "../api/types";
import { fuzzyScore } from "../search/ranker";
import { SendIcon } from "../ui/icons";

function friendOptions(query: string): FormFieldOption[] {
    const options = RelationshipStore.getFriendIDs()
        .map(id => UserStore.getUser(id))
        .filter(user => user != null)
        .map(user => ({
            value: user.id,
            label: user.globalName || user.username,
            icon: IconUtils.getUserAvatarURL(user, false, 64)
        }));

    const trimmed = query.trim();
    if (!trimmed) return options;

    return options
        .map(option => ({ option, score: fuzzyScore(trimmed, option.label) }))
        .filter(entry => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(entry => entry.option);
}

async function resolveDmChannel(userId: string): Promise<string | null> {
    const result = await Promise.resolve(openPrivateChannel(userId, true));
    if (typeof result === "string") return result;

    const existing = ChannelStore.getDMFromUserId(userId);
    if (existing) return existing;

    for (let attempt = 0; attempt < 20; attempt++) {
        const channelId = ChannelStore.getDMFromUserId(userId);
        if (channelId) return channelId;
        await sleep(150);
    }
    return null;
}

export const sendDmCommand: PaletteCommand = {
    id: "messaging.sendDm",
    title: "Send DM",
    section: "Messaging",
    keywords: ["dm", "message", "send", "direct message"],
    icon: SendIcon,
    page: () => ({
        title: "Send DM",
        icon: SendIcon,
        spec: {
            type: "form",
            submitLabel: "Send DM",
            fields: [
                { key: "recipient", label: "Recipient", type: "picker", placeholder: "Search friends...", suggestions: friendOptions },
                { key: "message", label: "Message", type: "textarea", placeholder: "Message content", markdown: true, attachments: true },
            ],
            validate(values, extras?: FormSubmitExtras) {
                if (!UserStore.getUser(values.recipient)) return "Pick a recipient from the suggestions.";
                const files = extras?.files?.message ?? [];
                if (!values.message.trim() && files.length === 0) return "Add a message or a file.";
                return null;
            },
            async submit(values, ctx, extras) {
                const channelId = await resolveDmChannel(values.recipient);
                if (!channelId) throw new Error("Unable to open a DM with that user.");

                const files = extras?.files?.message ?? [];
                const uploads = files.map(file => new CloudUploader({ file, platform: CloudUploadPlatform.WEB }, channelId));

                await sendMessage(channelId, { content: values.message.trim() }, true, {
                    attachmentsToUpload: uploads,
                });

                const user = UserStore.getUser(values.recipient);
                showToast({ text: `Message sent to ${user.globalName || user.username}.`, variant: "success" });
                ctx.close();
            }
        }
    })
};

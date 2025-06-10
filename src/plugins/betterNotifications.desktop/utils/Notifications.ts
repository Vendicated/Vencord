/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { findByProps } from "@webpack";
import { UserUtils } from "@webpack/common";

import { notificationShouldBeShown, settings } from "..";
import { AdvancedNotification } from "../types/advancedNotification";
import { BasicNotification } from "../types/basicNotification";
import { cropImageToCircle } from "./Round";
import { replaceVariables } from "./Variables";

const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("../native")>;
const logger = new Logger("BetterNotifications");

export function safeStringForXML(input: string): string {
    return input
        .replace(/&/g, "&amp;") // Must be first to avoid double-escaping
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}




export function SendNativeNotification(avatarUrl: string,
    notificationTitle: string, notificationBody: string,
    basicNotification: BasicNotification, advancedNotification: AdvancedNotification
) {
    const SimpleMarkdown = findByProps("htmlFor");

    if (!SimpleMarkdown) {
        logger.error("Failed to find SimpleMarkdown");
    }

    logger.debug("Recieved hooked notification with the following args");
    logger.debug([avatarUrl, notificationTitle, notificationBody, basicNotification, advancedNotification]);

    let attachmentUrl: string | undefined;

    if (!notificationShouldBeShown(advancedNotification)) {
        logger.info("Notification blocked");
        return;
    }

    if (basicNotification.notif_type === "reactions_push_notification") {
        console.warn("Ignoring reaction notification");
        return;
    } else if (basicNotification.notif_type !== "MESSAGE_CREATE") {
        console.warn(`Notification type "${basicNotification.notif_type}" is not supported`);
    }

    const { attachments } = advancedNotification.messageRecord;
    let contentType: string;
    let imageType: "png" | "jpeg";

    for (const attachment of attachments) {
        contentType = attachment.content_type;

        if (contentType !== "image/jpeg" && contentType !== "image/png") {
            logger.info(`Invalid content type ${contentType}. Skipping...`);
            continue;
        }
        if (attachment.spoiler && !settings.store.showSpoilerImages) {
            logger.info("Attachment marked as a spoiler. Skipping...");
            continue;
        }
        if (attachment.size > 3_000_000) {
            logger.info("Attachment size exceeds 3mb. Skipping...");
            continue;
        }

        attachmentUrl = attachment.proxy_url;

        // @ts-ignore
        imageType = contentType.split("/")[1];

        logger.info("Found suitable attachment");
        logger.debug(attachment.url);

        break;
    }

    logger.debug(`Notification type ${basicNotification.channel_type}`);

    let title = settings.store.notificationTitleFormat;
    let body = settings.store.notificationBodyFormat;
    let attributeText = settings.store.notificationAttributeText;
    let headerText: string;

    [title, body, attributeText, headerText] = replaceVariables(advancedNotification, basicNotification, notificationTitle, notificationBody, [title, body, attributeText]);

    function notify(avatar) {
        Native.notify(
            (advancedNotification.messageRecord.call && settings.store.specialCallNotification) ? "call" : "notification",
            title,
            body,
            advancedNotification.messageRecord.author.avatar || advancedNotification.messageRecord.author.id,
            avatar,
            {
                channelId: `${advancedNotification.messageRecord.channel_id}`,
                messageId: `${basicNotification.message_id}`,
                guildId: basicNotification.guild_id
            },
            {
                wMessageOptions: {
                    attachmentType: settings.store.notificationImagePosition,
                },
                attachmentUrl: settings.store.disableImageLoading ? undefined : attachmentUrl,
                attachmentType: imageType,
                wAvatarCrop: settings.store.notificationPfpCircle,
                wHeaderOptions: settings.store.notificationHeaderEnabled ? {
                    channelId: advancedNotification.messageRecord.channel_id,
                    channelName: headerText
                } : undefined,
                wAttributeText: settings.store.notificationAttribute ? attributeText : undefined,

                linuxFormattedText: settings.store.notificationMarkupSupported
                    ? SimpleMarkdown.defaultHtmlOutput(SimpleMarkdown.defaultInlineParse(notificationBody))
                    : undefined
            }
        );
    }

    UserUtils.getUser(advancedNotification.messageRecord.author.id).then(user => {
        const avatar = user.getAvatarURL(basicNotification.guild_id, 256, false).replace(".webp", ".png");

        Native.checkPlatform("linux").then(isLinux => {
            if (settings.store.notificationPfpCircle && isLinux) cropImageToCircle(avatar, 256).then(data => { notify(data); });
            else notify(avatar);
        });
    });
}

export function InterceptNotification(avatarUrl: string,
    notificationTitle: string, notificationBody: string,
    basicNotification: BasicNotification, advancedNotification: AdvancedNotification
) {
    logger.debug("Intercepting notification with the following args");
    logger.debug([avatarUrl, notificationTitle, notificationBody, basicNotification, advancedNotification]);

    if (!notificationShouldBeShown(advancedNotification)) {
        logger.info("Notification blocked");
        return;
    }

    let title = settings.store.notificationTitleFormat;
    let body = settings.store.notificationBodyFormat;

    [title, body] = replaceVariables(advancedNotification, basicNotification, notificationTitle, notificationBody, [title, body]);
    logger.info("Succesfully patched notification");

    return [avatarUrl, title, body, basicNotification, advancedNotification];
}

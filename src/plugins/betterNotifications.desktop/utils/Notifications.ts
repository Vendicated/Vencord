/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { findByProps } from "@webpack";

import { notificationShouldBeShown, settings } from "..";
import { AdvancedNotification } from "../types/advancedNotification";
import { BasicNotification } from "../types/basicNotification";
import { AttachmentManipulation, blurImage, cropImageToCircle, fitAttachmentIntoCorrectAspectRatio } from "./ImageManipulation";
import { isLinux, replaceVariables } from "./Variables";

const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("../native")>;
const logger = new Logger("BetterNotifications");

export interface SuitableAttachment {
    isSpoiler: boolean,
    url: string;
}

export async function SendNativeNotification(avatarUrl: string,
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
    const isAttachmentSpoiler: boolean = false;
    const suitableAttachments: SuitableAttachment[] = [];

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
        suitableAttachments.push({ url: attachmentUrl, isSpoiler: attachment.spoiler });

        if (suitableAttachments.length >= 3) {
            break;
        }
    }

    logger.debug(`Notification type ${basicNotification.channel_type}`);

    let title = settings.store.notificationTitleFormat;
    let body = settings.store.notificationBodyFormat;
    let attributeText = settings.store.notificationAttributeText;
    let headerText = settings.store.notificationHeaderText;

    [title, body, attributeText, headerText] = replaceVariables(advancedNotification, basicNotification, notificationTitle, notificationBody, [title, body, attributeText, headerText]);

    function notify(avatar, attachment = attachmentUrl) {
        Native.notify(
            (advancedNotification.messageRecord.call && settings.store.specialCallNotification) ? "call" : "notification",
            title,
            body,
            advancedNotification.messageRecord.author.avatar || advancedNotification.messageRecord.author.id,
            avatar,
            {
                channelId: `${advancedNotification.messageRecord.channel_id}`, // big numbers seem to get rounded when passing them to windows' notification XML. Use strings instead
                messageId: `${basicNotification.message_id}`,
                guildId: `${basicNotification.guild_id ?? "@me"}`
            },
            {
                messageOptions: {
                    attachmentFormat: isLinux ? settings.store.notificationImagePositionLinux : settings.store.notificationImagePositionWin,
                },
                attachmentUrl: settings.store.disableImageLoading ? undefined : attachment,
                attachmentType: imageType,
                wAvatarCrop: settings.store.notificationPfpCircle,
                wHeaderOptions: settings.store.notificationHeaderEnabled ? {
                    channelId: advancedNotification.messageRecord.channel_id,
                    channelName: headerText
                } : undefined,
                wAttributeText: settings.store.notificationAttribute ? attributeText : undefined,

                linuxFormattedText: settings.store.notificationMarkupSupported
                    ? SimpleMarkdown.defaultHtmlOutput(SimpleMarkdown.defaultInlineParse(notificationBody))
                    : undefined,
                quickReactions: JSON.stringify(settings.store.notificationQuickReactEnabled ? settings.store.notificationQuickReact : []),
                inlineReply: settings.store.inlineReplyLinux
            }
        );
    }

    const url = new URL(avatarUrl);
    url.searchParams.set("size", "256");
    url.pathname = url.pathname.replace(".webp", ".png");

    const bigAvatar = url.toString();

    let finalAvatarData;
    if (settings.store.notificationPfpCircle && isLinux) {
        console.log("Cropping profile picture to circle...");
        finalAvatarData = await cropImageToCircle(bigAvatar, 256);
    } else {
        finalAvatarData = avatarUrl;
    }

    for (const attachment of suitableAttachments) {
        if (attachment.isSpoiler) {
            attachment.url = await blurImage(attachment.url);
        }
    }

    let finalAttachment: string | undefined = suitableAttachments.at(0)?.url;
    if (suitableAttachments.length > 0 && settings.store.notificationAttachmentFit !== AttachmentManipulation.none) {
        console.log("Fitting attachment");
        finalAttachment = await fitAttachmentIntoCorrectAspectRatio(suitableAttachments.map(img => img.url), settings.store.notificationAttachmentFit);
    }
    if (finalAttachment) {
        notify(finalAvatarData, finalAttachment);
    } else {
        notify(finalAvatarData);
    }
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AdvancedNotification } from "@plugins/betterNotifications.desktop/types/advancedNotification";
import { type BasicNotification } from "@plugins/betterNotifications.desktop/types/basicNotification";
import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { findByProps } from "@webpack";

import { notificationShouldBeShown, settings } from "..";
import { AttachmentManipulation, blurImage, cropImageToCircle, fitAttachmentIntoCorrectAspectRatio } from "./ImageManipulation";
import { isLinux, parseVariables, replaceVariables } from "./Variables";

const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("../native")>;
const logger = new Logger("BetterNotifications");
const latestMessages: Map<string, Date[]> = new Map();

export interface SuitableAttachment {
    isSpoiler: boolean,
    url: string;
}

export async function SendNativeNotification(avatarUrl: string | undefined,
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

    const titleVars = parseVariables(settings.store.notificationTitleFormat, advancedNotification);
    const bodyVars = parseVariables(settings.store.notificationBodyFormat, advancedNotification);
    const attributeTextVars = parseVariables(settings.store.notificationAttributeText, advancedNotification);
    const headerTextVars = parseVariables(settings.store.notificationHeaderText, advancedNotification);


    const [title, body, attributeText, headerText] = replaceVariables(advancedNotification, basicNotification, notificationTitle, notificationBody, [titleVars, bodyVars, attributeTextVars, headerTextVars]);

    const notifierMessages = latestMessages.get(basicNotification.notif_user_id);
    const now = new Date();

    if (notifierMessages === undefined) {
        logger.debug("User has not sent previous messages");
        latestMessages.set(basicNotification.notif_user_id, [now]);
    } else {
        let lastDate = new Date(0);
        let spamMessages = 0;

        notifierMessages.forEach(date => {
            if (now.getTime() - date.getTime() < 48000 && lastDate.getTime() - date.getTime() < 12000) {
                spamMessages++;
            }
            lastDate = date;
        });
        logger.info(`User spam messages: ${spamMessages}`);
        if (spamMessages > 5 && settings.store.autoMuteSpammers) {
            logger.info("User has sent too many messages in a short timeframe. Not sending a notification");
            return;
        }

        notifierMessages.push(now);
        latestMessages.set(basicNotification.notif_user_id, notifierMessages);
    }

    function notify(avatar: string | undefined, attachment = attachmentUrl) {
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
                inlineReply: settings.store.inlineReplyLinux,
                silent: true
            }
        );
    }

    let bigAvatar: string | undefined = undefined;

    if (avatarUrl) {
        try {
            const url = new URL(avatarUrl);
            url.searchParams.set("size", "256");
            url.pathname = url.pathname.replace(".webp", ".png");

            bigAvatar = url.toString();
        } catch (error) {
            logger.warn(`Failed to get profile picture from ${avatarUrl}`);
        }
    } else {
        logger.warn("avatarUrl is undefined!");
    }



    let finalAvatarData: string | undefined;
    if (settings.store.notificationPfpCircle && isLinux) {
        console.log("Cropping profile picture to circle...");
        finalAvatarData = bigAvatar ? await cropImageToCircle(bigAvatar, 256) : undefined;
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

    const titleVars = parseVariables(settings.store.notificationTitleFormat, advancedNotification);
    const bodyVars = parseVariables(settings.store.notificationBodyFormat, advancedNotification);

    const [title, body] = replaceVariables(advancedNotification, basicNotification, notificationTitle, notificationBody, [titleVars, bodyVars]);
    logger.info("Succesfully patched notification");

    return [avatarUrl, title, body, basicNotification, advancedNotification];
}

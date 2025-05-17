import definePlugin, { PluginNative, OptionType } from "@utils/types";
import { Button, ChannelRouter, FluxDispatcher, Select, showToast, Toasts } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { definePluginSettings, SettingsStore } from "@api/Settings";
import { sendMessage } from "@utils/discord";
import { AdvancedNotification } from "./types/advancedNotification";
import { BasicNotification } from "./types/basicNotification";
import { MessageStore } from "@webpack/common";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";

const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("./native")>;
const Kangaroo = findByPropsLazy("jumpToMessage"); // snippet from quickReply plugin
const logger = new Logger("BetterNotifications");

const Replacements = [
    "username",
    "nickname",
    "body",
    "channelId",
    "channelName",
    "groupName",
];

const settings = definePluginSettings({
    notificationPatchType: {
        type: OptionType.SELECT,
        description: "How notifications are going to be patched. Custom enables features such as attachment previews, but does not work with macOS",
        options: [
            { label: "Custom", value: "custom", default: true },
            { label: "Variable replacement (macOS)", value: "variable" }
        ]
    },
    notificationTitleFormat: {
        type: OptionType.STRING,
        description: "Format of the notification title.",
        default: "@{username} #{channelName}",
    },
    notificationBodyFormat: {
        type: OptionType.STRING,
        description: "Format the notification body.",
        default: "{body}"
    },
    allowBotNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow desktop notifications from bots",
        default: true
    },
    notificationAttribute: {
        type: OptionType.BOOLEAN,
        description: "Enables attribute text (Windows only, Anniversary Update required)"
    },
    notificationAttributeText: {
        type: OptionType.STRING,
        description: "Format of the attribution text (Windows only, Anniversary Update required).",
        default: "{channelName}"
    },

    notificationPfpCircle: {
        type: OptionType.BOOLEAN,
        description: "Crop the sender's profile picture to a circle (Windows only)",
        default: true
    },
    notificationHeaderEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable support for notification headers. (Windows only, build 15063 or higher)",
        default: false
    },
    disableImageLoading: {
        type: OptionType.BOOLEAN,
        description: "Disables attachments. Use if you have a limited data plan. (Windows only)",
        default: false
    },
    notificationImagePosition: {
        type: OptionType.SELECT,
        description: "How notification attachments are placed. (Windows only) ",
        options: [
            { label: "Hero (Anniversary update required)", value: "hero", default: true },
            { label: "Inline (Legacy)", value: "inline" }
        ]
    },
});

function getChannelInfoFromTitle(title: string) {
    try {
        let parts = title.split(" (#");
        if (parts === undefined) {
            return {
                channel: "unknown",
                groupName: "unknown"
            };
        }
        let innerInfo = parts[1];
        let data = innerInfo.slice(0, -1).split(", ");
        return {
            channel: data[0],
            groupName: data[1]
        };
    } catch (error) {
        console.error(error);
        return {
            channel: "unknown",
            groupName: "unknown"
        };
    }

}

function notificationShouldBeShown(advancedData: AdvancedNotification): boolean {
    if (advancedData.messageRecord.author.discriminator !== "0" && !settings.store.allowBotNotifications) {
        return false;
    }

    return true;
}

function replaceVariables(advancedNotification: AdvancedNotification, body, channelInfo, texts: string[]): string[] {
    let replacementMap: Map<string, string> = new Map();

    replacementMap.set("username", advancedNotification.messageRecord.author.username);
    replacementMap.set("body", body);
    replacementMap.set("channelName", channelInfo.channel);
    replacementMap.set("channelId", advancedNotification.messageRecord.channel_id);
    replacementMap.set("groupName", channelInfo.groupName);
    replacementMap.set("nickname", advancedNotification.messageRecord.author.globalName ?? advancedNotification.messageRecord.author.username);

    replacementMap.forEach((value, key) => {
        logger.debug(`Replacing ${key} - ${value}`);
        texts = texts.map((text) => text.replaceAll(`{${key}}`, value));
    });
    return texts;
}

Native.checkIsMac().then(isMac => {
    if (isMac && settings.store.notificationPatchType === "custom") {
        logger.warn("User is on macOS but has notificationPatchType as custom");
        setTimeout(() => {
            showToast("Looks like you are using BetterNotifications on macOS. Switching over to Variable replacement patch strategy", Toasts.Type.MESSAGE, { duration: 8000 });
            settings.store.notificationPatchType = "variable";
        }, 4000);
    }
});

export default definePlugin({
    name: "BetterNotifications",
    description: `Improves discord's desktop notifications. \n List of available notification variables: ${Replacements}`,
    authors: [Devs.ctih],
    tags: ["native", "notifications", "better"],
    settings: settings,

    patches: [
        {
            find: 'Notification body contains null character, setting to empty string',
            replacement: {
                match: /async function (\i)\((\i),(\i),(\i),(\i),(\i)\){/,
                replace: `
                async function $1($2,$3,$4,$5,$6) {
                    if(Vencord.Plugins.plugins.BetterNotifications.ShouldUseCustomFunc()) {
                        Vencord.Plugins.plugins.BetterNotifications.NotificationHandlerHook($2, $3, $4, $5, $6); 
                        console.log("Replaced notification function \`$1\` with own notification handler");
                        return;
                    } else {
                        [$2, $3, $4, $5] = Vencord.Plugins.plugins.BetterNotifications.VariableReplacement($2, $3, $4, $5, $6); 
                        console.log("Patched using variable replacement");
                    }

                `
            }
        }
    ],

    NotificationHandlerHook(...args) {
        logger.info(`Recieved hooked notification with args the following args`);
        logger.info(args);

        let replacementMap: Map<string, string> = new Map();

        let basicNotification: BasicNotification = args[3];
        let advancedNotification: AdvancedNotification = args[4];
        let attachmentUrl: string | undefined;

        if (!notificationShouldBeShown(advancedNotification)) {
            logger.info("Notification blocked");
            return;
        }

        let attachments = advancedNotification.messageRecord.attachments;
        let contentType;
        let imageType;


        if (attachments.length > 0) {
            contentType = attachments[0].content_type;
            // Windows has a 3mb limit on Notification attachments
            if (!attachments[0].spoiler && attachments[0].size < 3_000_000 && (contentType === "image/jpeg" || contentType === "image/png")) {
                attachmentUrl = attachments[0].proxy_url;
                imageType = contentType.split("/")[1];
            } else {
                logger.info(`Unsupported image type (${contentType}), size, or image is a spoiler`);
            }
        }
        let channelInfo;

        switch (basicNotification.channel_type) {
            case 0: // servers 
                channelInfo = getChannelInfoFromTitle(args[1]);
                break;

            case 1: // Direct messages
                channelInfo = {
                    channel: "DM",
                    groupName: advancedNotification.messageRecord.author.globalName ?? "@" + advancedNotification.messageRecord.author.username
                };
                break;
        }

        console.log(replacementMap);

        let title = settings.store.notificationTitleFormat;
        let body = settings.store.notificationBodyFormat;
        let attributeText = settings.store.notificationAttributeText;

        [title, body, attributeText] = replaceVariables(advancedNotification, args[2], channelInfo, [title, body, attributeText]);

        Native.notify(
            title,
            body,
            advancedNotification.messageRecord.author.avatar,
            advancedNotification.messageRecord.author.id,
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
                    channelName: channelInfo.channel
                } : undefined,
                wAttributeText: settings.store.notificationAttribute ? attributeText : undefined
            }
        );
    },

    NotificationClickEvent(channelId: string, messageId: string) {
        logger.debug(`Recieved click to channel ${channelId}`);
        ChannelRouter.transitionToChannel(channelId);
        Kangaroo.jumpToMessage({
            channelId,
            messageId,
            flash: true,
            jumpType: "INSTANT"
        });
    },

    NotificationReplyEvent(text: string, channelId: string, messageId: string) {
        logger.info(`Recieved reply event to channel ${channelId}`);
        sendMessage(
            channelId,
            { content: text },
            true,
            {
                "messageReference": {
                    "channel_id": channelId,
                    "message_id": messageId
                }
            }
        );
    },

    ShouldUseCustomFunc() {
        return settings.store.notificationPatchType === "custom";
    },

    VariableReplacement(avatarUrl: string, notificationTitle: string, notificationBody: string, notificationData: BasicNotification, advancedData: AdvancedNotification) {
        if (!notificationShouldBeShown(advancedData)) {
            logger.info("Notification blocked");
            return;
        }
        logger.info(notificationData);
        logger.info(advancedData);

        let channelInfo;

        switch (notificationData.channel_type) {
            case 0: // servers 
                channelInfo = getChannelInfoFromTitle(notificationTitle);
                break;

            case 1: // Direct messages
                channelInfo = {
                    channel: "DM",
                    groupName: advancedData.messageRecord.author.globalName ?? "@" + advancedData.messageRecord.author.username
                };
                break;
        }

        let title = settings.store.notificationTitleFormat;
        let body = settings.store.notificationBodyFormat;

        [title, body] = replaceVariables(advancedData, notificationBody, channelInfo, [title, body]);
        logger.info("Succesfully patched notification");

        return [avatarUrl, title, body, notificationData, advancedData];
    }
});

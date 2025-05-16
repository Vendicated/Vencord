import definePlugin, { PluginNative, OptionType } from "@utils/types";
import { Button, ChannelRouter, FluxDispatcher, Select } from "@webpack/common";
import { findByPropsLazy } from "@webpack";
import { definePluginSettings, SettingsStore } from "@api/Settings";
import { sendMessage } from "@utils/discord";
import { AdvancedNotification } from "./types/advancedNotification";
import { BasicNotification } from "./types/basicNotification";
import { MessageStore } from "@webpack/common";
import { Devs } from "@utils/constants";

const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("./native")>;
const Kangaroo = findByPropsLazy("jumpToMessage"); // snippet from quickReply plugin

const Replacements = [
    "username",
    "body",
    "channelId",
    "channelName",
    "groupName",
];

const settings = definePluginSettings({
    notificationTitleFormat: {
        type: OptionType.STRING,
        description: "Format of the notification title.",
        default: "{username}",
    },
    notificationBodyFormat: {
        type: OptionType.STRING,
        description: "Format the notification body.",
        default: "{body}"
    },
    notificationAttribute: {
        type: OptionType.BOOLEAN,
        description: "Enables attribute text (Windows only, Anniversary Update required)"
    },
    notificationAttributeText: {
        type: OptionType.STRING,
        description: "Format of the attribution text.",
        default: "{channelName}"
    },
    notificationShowPfp: {
        type: OptionType.BOOLEAN,
        description: "Includes sender's profile picture in notification. View available variables above.",
        default: true
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
        let innerInfo = title.split(" (#")[1];
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
                    Vencord.Plugins.plugins.BetterNotifications.NotificationHandlerHook($2, $3, $4, $5, $6); 
                    console.log("Replaced function \`$1\` with own notification handler");
                    return;
                `
            }
        },
    ],

    NotificationHandlerHook(...args) {
        console.log("Recieved hooked notification");
        console.log(args);
        let replacementMap: Map<string, string> = new Map();

        let basicNotification: BasicNotification = args[3];
        let advancedNotification: AdvancedNotification = args[4];
        let attachmentUrl: string | undefined;

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
                console.log(`[BN] Unsupported image type ${contentType}, or size (or image is a spoiler)`);
            }
        }

        let channelInfo = getChannelInfoFromTitle(args[1]);

        Replacements.forEach((value) => {
            replacementMap.set(value, "");
        });

        replacementMap.set("username", advancedNotification.messageRecord.author.username);
        replacementMap.set("body", args[2]);
        replacementMap.set("channelName", channelInfo.channel);
        replacementMap.set("channelId", advancedNotification.messageRecord.channel_id);
        replacementMap.set("groupName", channelInfo.groupName);

        console.log(replacementMap);

        let title = settings.store.notificationTitleFormat;
        let body = settings.store.notificationBodyFormat;
        let attributeText = settings.store.notificationAttributeText;

        replacementMap.forEach((value, key) => {
            console.log(`[BN] replacing key ${key} -> ${value}`);
            title = title.replace(`{${key}}`, value);
            body = body.replace(`{${key}}`, value);
            attributeText = attributeText.replace(`{${key}}`, value);
        });

        Native.notify(
            title,
            body,
            advancedNotification.messageRecord.author.avatar,
            advancedNotification.messageRecord.author.id,
            {
                channelId: `${advancedNotification.messageRecord.channel_id}`,
                messageId: `${basicNotification.message_id}`,
                guildId: `${basicNotification.guild_id}`
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
        console.log(`Recieved click! ${channelId}`);
        ChannelRouter.transitionToChannel(channelId);
        Kangaroo.jumpToMessage({
            channelId,
            messageId,
            flash: true,
            jumpType: "INSTANT"
        });
    },

    NotificationReplyEvent(text: string, channelId: string, messageId: string) {
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
    }
});;

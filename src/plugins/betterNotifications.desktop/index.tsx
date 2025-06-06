/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, ChannelRouter, Forms, GuildStore, React, showToast, Switch, Toasts, UserUtils } from "@webpack/common";

import ExampleString from "./components/ExampleStrings";
import VariableString from "./components/VariableString";
import { AdvancedNotification } from "./types/advancedNotification";
import { BasicNotification } from "./types/basicNotification";


const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("./native")>;
const jumpToMessage = findByPropsLazy("jumpToMessage"); // snippet from quickReply plugin
const logger = new Logger("BetterNotifications");


interface ChannelInfo {
    channel: string; // Channel name
    groupName: string;
}

interface GuildInfo {
    name: string;
    description: string;
}

export const Replacements = [
    "username",
    "nickname",
    "body",
    "channelId",
    "channelName",
    "groupName",
    "guildName",
    "guildDescription"
] as const;

type ReplacementMap = {
    [k in typeof Replacements[number]]: string
};

export const settings = definePluginSettings({
    notificationPatchType: {
        type: OptionType.SELECT,
        description: "How notifications are going to be patched. Custom enables features such as attachment previews, but does not work with macOS",
        options: [
            { label: "Custom", value: "custom", default: true },
            { label: "Variable replacement (macOS)", value: "variable" }
        ]
    },
    notificationTitleFormat: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    <Forms.FormDivider />
                    < Forms.FormSection title="Notification format settings" >
                        <Forms.FormText>Available variables:</Forms.FormText>
                        <ul>
                            {Replacements.map((variable, index) => {
                                // &#123; = { and &#125; = }
                                return <li key={index}><Forms.FormText>&#123;{variable}&#125;</Forms.FormText></li>;
                            })}
                        </ul>
                        <Forms.FormDivider />

                        <Forms.FormText>Notification title format</Forms.FormText>
                        <VariableString setValue={props.setValue} defaultValue={settings.store.notificationTitleFormat} />
                    </Forms.FormSection >
                </>
            );
        },
        default: "{username} {channelName}",
    },

    notificationBodyFormat: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                < Forms.FormSection>
                    <Forms.FormText>Notification body format</Forms.FormText>
                    <VariableString setValue={props.setValue} defaultValue={settings.store.notificationBodyFormat} />
                </Forms.FormSection >
            );
        },
        default: "{body}",
    },

    channelPrefix: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                < Forms.FormSection>
                    <Forms.FormText>Channel prefix</Forms.FormText>
                    <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>Prefix to use for server channel (not DMs) names in notifications (e.g. '#' -&gt; #general)</Forms.FormText>
                    <ExampleString setValue={props.setValue} defaultValue={settings.store.channelPrefix} staticValue="general"></ExampleString>
                </Forms.FormSection >
            );
        },
        default: "#"
    },
    userPrefix: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    < Forms.FormSection>
                        <Forms.FormText>Username prefix</Forms.FormText>
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>Prefix to use for user names in notifications</Forms.FormText>

                        <ExampleString setValue={props.setValue} defaultValue={settings.store.userPrefix} staticValue="username567"></ExampleString>
                    </Forms.FormSection >
                    <Forms.FormDivider />
                </>
            );
        },
        default: "@"
    },
    notificationAttribute: {
        type: OptionType.COMPONENT,
        component: _ => {
            return <></>;
        }
    },
    notificationAttributeText: {
        type: OptionType.COMPONENT,
        component: props => {
            const [switchValue, setSwitchValue] = React.useState<boolean>(settings.store.notificationAttribute);

            React.useEffect(() => {
                settings.store.notificationAttribute = switchValue;
            }, [switchValue]);

            return (
                <>
                    <Forms.FormSection>
                        <div style={{ display: "flex", justifyContent: "space-between", height: "fit-content" }}>
                            <Forms.FormTitle style={{ marginBottom: "0px" }}>Enable notification attribute text</Forms.FormTitle>
                            <Switch style={{ width: "fit-content", marginBottom: "0px" }} hideBorder={true} value={switchValue} onChange={setSwitchValue}></Switch>
                        </div>
                        <Forms.FormText type={Forms.FormText.Types.DESCRIPTION}>Enables attribute text (Windows only)</Forms.FormText>


                        {switchValue &&
                            <div style={{ marginTop: "12px" }}>
                                <Forms.FormSection>
                                    <Forms.FormText>Attribute text format</Forms.FormText>
                                    <VariableString setValue={props.setValue} defaultValue={settings.store.notificationAttributeText} />
                                </Forms.FormSection>
                            </div>
                        }
                    </Forms.FormSection >

                </>
            );
        },
        default: "{guildName}"
    },



    allowBotNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow desktop notifications from bots",
        default: true
    },
    specialCallNotification: {
        type: OptionType.BOOLEAN,
        description: "Use a special notification type for incoming calls",
        default: true
    },
    notificationPfpCircle: {
        type: OptionType.BOOLEAN,
        description: "Crop the sender's profile picture to a circle (Windows only)",
        default: true
    },
    notificationHeaderEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable support for notification headers (aka grouping). (Windows only, build 15063 or higher)",
        default: false
    },
    disableImageLoading: {
        type: OptionType.BOOLEAN,
        description: "Disables attachments in notifications. Turn on if you have a limited data plan.",
        default: false
    },
    showSpoilerImages: {
        type: OptionType.BOOLEAN,
        description: "Whether to include attachments marked as spoilers in notifications",
        default: false
    },

    notificationImagePosition: {
        type: OptionType.SELECT,
        description: "How notification attachments are placed. (Windows only) ",
        options: [
            { label: "Hero", value: "hero", default: true },
            { label: "Inline (Legacy)", value: "inline" }
        ]
    },
    notificationDmChannelname: {
        type: OptionType.STRING,
        description: "What channel name to use when notification is from direct messages",
        default: "DM"
    },
    notificationDmGuildname: {
        type: OptionType.STRING,
        description: "What guild name to use when notification is from direct messages",
        default: "@me"
    },
    notificationMediaCache: {
        type: OptionType.COMPONENT,
        component: () => (
            <>
                <Forms.FormTitle>Cache options</Forms.FormTitle>
                <Button look={Button.Looks.OUTLINED} onClick={_ => { Native.openTempFolder(); }}> Open cache folder</Button>
                <Button style={{ backgroundColor: "var(--status-danger)" }} look={Button.Looks.FILLED} onClick={_ => {
                    Native.deleteTempFolder().then(_ => {
                        showToast("Deleted cache folder", Toasts.Type.SUCCESS);
                    });
                }}>Clear cache</Button>
            </>
        )
    },
});

function getChannelInfoFromTitle(title: string, basicNotification: BasicNotification, advancedNotification: AdvancedNotification): ChannelInfo {
    let channelInfo: ChannelInfo;
    try {
        const parts = title.split(" (#");
        if (parts === undefined) {
            channelInfo = {
                channel: "unknown",
                groupName: "unknown"
            };
        }
        const innerInfo = parts[1];
        const data = innerInfo.slice(0, -1).split(", ");
        channelInfo = {
            channel: data[0],
            groupName: data[1]
        };
    } catch (error) {
        console.error(error);
        channelInfo = {
            channel: "unknown",
            groupName: "unknown"
        };
    }

    return channelInfo;
}


function notificationShouldBeShown(advancedData: AdvancedNotification): boolean {
    // messageRecord.author may be undefined under specific notification types
    if ((advancedData.messageRecord.author?.discriminator || "0") !== "0" && !settings.store.allowBotNotifications) {
        logger.debug(`User discriminator: ${advancedData.messageRecord.author?.discriminator}`);
        return false;
    }
    return true;
}

function replaceVariables(advancedNotification: AdvancedNotification, basicNotification: BasicNotification, title: string, body: string, texts: string[]): string[] {
    let guildInfo: GuildInfo;
    let channelInfo: ChannelInfo;

    if (basicNotification.channel_type === 1) { // DM
        channelInfo = {
            channel: settings.store.notificationDmChannelname,
            groupName: advancedNotification.messageRecord.author.globalName ?? settings.store.userPrefix + advancedNotification.messageRecord.author.username
        };
        guildInfo = {
            name: settings.store.notificationDmGuildname,
            description: ""
        };
    } else {
        const channelData = getChannelInfoFromTitle(title, basicNotification, advancedNotification);
        const guildData = GuildStore.getGuild(basicNotification.guild_id);

        channelInfo = {
            channel: settings.store.channelPrefix + channelData.channel,
            groupName: channelData.groupName
        };
        guildInfo = {
            name: guildData.name,
            description: guildData.description ?? ""
        };
    }

    const replacementMap: ReplacementMap = {
        username: settings.store.userPrefix + advancedNotification.messageRecord.author.username,
        body,
        channelName: channelInfo.channel,
        channelId: advancedNotification.messageRecord.channel_id,
        groupName: channelInfo.groupName,
        nickname: advancedNotification.messageRecord.author.globalName ?? advancedNotification.messageRecord.author.username,
        guildName: guildInfo.name,
        guildDescription: guildInfo.description
    };

    new Map(Object.entries(replacementMap)).forEach((value, key) => {
        logger.debug(`Replacing ${key} - ${value}`);
        texts = texts.map(text => text.replaceAll(`{${key}}`, value));
    });

    texts.push(channelInfo.channel);
    return texts;
}

export default definePlugin({
    name: "BetterNotifications",
    description: "Improves discord's desktop notifications.",
    authors: [Devs.ctih],
    tags: ["native", "notifications", "better"],
    settings: settings,

    patches: [
        {
            find: "Notification body contains null character, setting to empty string",
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

    start() {
        Native.checkIsMac().then(isMac => {
            if (isMac && settings.store.notificationPatchType === "custom") {
                logger.warn("User is on macOS but has notificationPatchType as custom");
                setTimeout(() => {
                    showToast("Looks like you are using BetterNotifications on macOS. Switching over to Variable replacement patch strategy", Toasts.Type.MESSAGE, { duration: 8000 });
                    settings.store.notificationPatchType = "variable";
                }, 4000);
            }
        });
    },

    NotificationHandlerHook(...args) {
        logger.debug("Recieved hooked notification with the following args");
        logger.debug(args);

        const basicNotification: BasicNotification = args[3];
        const advancedNotification: AdvancedNotification = args[4];
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

        [title, body, attributeText, headerText] = replaceVariables(advancedNotification, basicNotification, args[1], args[2], [title, body, attributeText]);

        UserUtils.getUser(advancedNotification.messageRecord.author.id).then(user => {
            Native.notify(
                (advancedNotification.messageRecord.call && settings.store.specialCallNotification) ? "call" : "notification",
                title,
                body,
                advancedNotification.messageRecord.author.avatar || advancedNotification.messageRecord.author.id,
                user.getAvatarURL(basicNotification.guild_id, 256, false),
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
                    wAttributeText: settings.store.notificationAttribute ? attributeText : undefined
                }
            );
        });
    },
    VariableReplacement(avatarUrl: string, notificationTitle: string, notificationBody: string, notificationData: BasicNotification, advancedData: AdvancedNotification) {
        if (!notificationShouldBeShown(advancedData)) {
            logger.info("Notification blocked");
            return;
        }
        logger.info(notificationData);
        logger.info(advancedData);

        let title = settings.store.notificationTitleFormat;
        let body = settings.store.notificationBodyFormat;

        [title, body] = replaceVariables(advancedData, notificationData, notificationTitle, notificationBody, [title, body]);
        logger.info("Succesfully patched notification");

        return [avatarUrl, title, body, notificationData, advancedData];
    },

    NotificationClickEvent(channelId: string, messageId: string) {
        logger.debug(`Recieved click to channel ${channelId}`);
        ChannelRouter.transitionToChannel(channelId);
        jumpToMessage.jumpToMessage({
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
});

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
import { Button, ChannelRouter, Forms, React, showToast, Switch, Text, Toasts } from "@webpack/common";

import ExampleString from "./components/ExampleStrings";
import VariableString from "./components/VariableString";
import { AdvancedNotification } from "./types/advancedNotification";
import { InterceptNotification, SendNativeNotification } from "./utils/Notifications";
import { Replacements } from "./utils/Variables";


const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("./native")>;
const jumpToMessage = findByPropsLazy("jumpToMessage"); // snippet from quickReply plugin
const logger = new Logger("BetterNotifications");


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
        },
        default: false
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
        description: "Use a special notification type for incoming calls (Windows only)",
        default: true
    },
    notificationPfpCircle: {
        type: OptionType.BOOLEAN,
        description: "Crop the sender's profile picture to a circle",
        default: true
    },
    notificationHeaderEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable support for notification headers (aka grouping). (Windows only, build 15063 or higher)",
        default: false
    },
    notificationMarkupSupported: {
        type: OptionType.COMPONENT,
        component: props => {
            const [value, setValue] = React.useState<boolean>(settings.store.notificationMarkupSupported);

            React.useEffect(() => {
                props.setValue(value);
            }, [value]);

            return <div style={{ marginBottom: "0.5em", height: "100%" }}>
                <Forms.FormSection>
                    <div style={{ display: "flex", justifyContent: "space-between", height: "fit-content" }}>
                        <Forms.FormTitle style={{ marginBottom: "0px" }}>Enable notification markup support for Linux</Forms.FormTitle>
                        <Switch style={{ width: "fit-content", marginBottom: "0px" }} hideBorder={true} value={value} onChange={setValue}></Switch>
                    </div>
                </Forms.FormSection>
                <Forms.FormText style={{ marginBottom: "8px" }} type={Forms.FormText.Types.DESCRIPTION}><span style={{ color: "var(--status-danger)" }}>WARNING:</span> This feature may not support your system. If you see HTML tags (such as &lt;b&gt;) in notifications, turn this feature off.</Forms.FormText>
                {value ?
                    <Text><b>Here's some bold text</b> and <i>heres's some italic text</i></Text>
                    :
                    <Text>Here's some bold text and here's some italic text</Text>
                }
            </div>;
        },
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


export function notificationShouldBeShown(advancedData: AdvancedNotification): boolean {
    // messageRecord.author may be undefined under specific notification types
    if ((advancedData.messageRecord.author?.discriminator || "0") !== "0" && !settings.store.allowBotNotifications) {
        logger.debug(`User discriminator: ${advancedData.messageRecord.author?.discriminator}`);
        return false;
    }
    return true;
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
                        Vencord.Plugins.plugins.BetterNotifications.SendNativeNotification($2, $3, $4, $5, $6);
                        console.log("Replaced notification function \`$1\` with own notification handler");
                        return;
                    } else {
                        [$2, $3, $4, $5] = Vencord.Plugins.plugins.BetterNotifications.InterceptNotification($2, $3, $4, $5, $6);
                        console.log("Patched using variable replacement");
                    }

                `
            }
        }
    ],

    start() {
        Native.checkPlatform("darwin").then(isMac => {
            if (isMac && settings.store.notificationPatchType === "custom") {
                logger.warn("User is on macOS but has notificationPatchType as custom");
                setTimeout(() => {
                    showToast("Looks like you are using BetterNotifications on macOS. Switching over to Variable replacement patch strategy", Toasts.Type.MESSAGE, { duration: 8000 });
                    settings.store.notificationPatchType = "variable";
                }, 4000);
            }
        });
    },

    SendNativeNotification,
    InterceptNotification,

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

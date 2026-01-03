/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { ChannelRouter, React, showToast, Text, TextInput, Toasts } from "@webpack/common";

import ExampleString from "./components/ExampleStrings";
import VariableString from "./components/VariableString";
import { AdvancedNotification } from "./types/advancedNotification";
import { AttachmentManipulation } from "./utils/ImageManipulation";
import { InterceptNotification, SendNativeNotification } from "./utils/Notifications";
import { isLinux, isMac, isWin, Replacements } from "./utils/Variables";


const Native = VencordNative.pluginHelpers.BetterNotifications as PluginNative<typeof import("./native")>;
const jumpToMessage = findByPropsLazy("jumpToMessage"); // snippet from quickReply plugin
const addReaction = findByCodeLazy("MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE", "Message Shortcut");

const logger = new Logger("BetterNotifications");

export const settings = definePluginSettings({
    notificationPatchType: {
        type: OptionType.SELECT,
        description: "How notifications are going to be patched. Custom enables features such as attachment previews",
        options: [
            { label: "Custom", value: "custom", default: true },
            { label: "Variable replacement", value: "variable" }
        ],
        hidden: isMac
    },
    notificationTitleFormat: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    <Heading>Notification format settings</Heading>
                    <Paragraph>Available variables:</Paragraph>
                    <ul>
                        {Replacements.map((variable, index) => {
                            // &#123; = { and &#125; = }
                            return <li key={index}><Paragraph>&#123;{variable}&#125;</Paragraph></li>;
                        })}
                    </ul>
                    <Divider />

                    <Paragraph>Notification title format</Paragraph>
                    <VariableString setValue={props.setValue} defaultValue={settings.store.notificationTitleFormat} />
                </>
            );
        },
        default: "{username} {channelName}",
    },

    notificationBodyFormat: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    <Paragraph>Notification body format</Paragraph>
                    <VariableString setValue={props.setValue} defaultValue={settings.store.notificationBodyFormat} />
                </>
            );
        },
        default: "{body}",
    },

    channelPrefix: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    <Paragraph>Channel prefix</Paragraph>
                    <Paragraph>Prefix to use for server channel (not DMs) names in notifications (e.g. '#' -&gt; #general)</Paragraph>
                    <ExampleString setValue={props.setValue} defaultValue={settings.store.channelPrefix} staticValue="general"></ExampleString>
                </>
            );
        },
        default: "#"
    },
    userPrefix: {
        type: OptionType.COMPONENT,
        component: props => {
            return (
                <>
                    <Paragraph>Username prefix</Paragraph>
                    <Paragraph>Prefix to use for user names in notifications</Paragraph>

                    <ExampleString setValue={props.setValue} defaultValue={settings.store.userPrefix} staticValue="username567"></ExampleString>
                    <Divider />
                </>
            );
        },
        default: "@"
    },
    notificationAttribute: {
        type: OptionType.COMPONENT,
        component: _ => <></>,
        default: false,
        hidden: !isWin
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
                    <FormSwitch title="Enable notification attribute text (Windows only)" className="mb-0 w-fit" hideBorder={true} value={switchValue} onChange={setSwitchValue}></FormSwitch>

                    {switchValue &&
                        <div style={{ marginTop: "12px" }}>

                            <Paragraph>Attribute text format</Paragraph>
                            <VariableString setValue={props.setValue} defaultValue={settings.store.notificationAttributeText} />

                        </div>
                    }
                </>
            );
        },
        default: "{guildName}",
        hidden: !isWin
    },

    notificationHeaderEnabled: {
        type: OptionType.COMPONENT,
        default: false,
        component: _ => <></>,
        hidden: !isWin
    },

    notificationHeaderText: {
        type: OptionType.COMPONENT,
        component: props => {
            const [switchValue, setSwitchValue] = React.useState<boolean>(settings.store.notificationAttribute);

            React.useEffect(() => {
                settings.store.notificationHeaderEnabled = switchValue;
            }, [switchValue]);

            return (
                <>
                    <FormSwitch title="Enable notification grouping (Windows only)" hideBorder={true} value={switchValue} onChange={setSwitchValue}></FormSwitch>

                    {switchValue &&
                        <div style={{ marginTop: "12px" }}>
                            <Paragraph>Grouping text format. This changes how notifications are grouped. This text is also visible in notifications below the application name.</Paragraph>
                            <VariableString setValue={props.setValue} defaultValue={settings.store.notificationHeaderText} />
                        </div>
                    }
                </>
            );
        },
        default: "{channelName}",
        hidden: !isWin
    },

    notificationQuickReactEnabled: {
        type: OptionType.COMPONENT,
        component: () => <></>,
        default: false
    },
    notificationQuickReact: {
        type: OptionType.COMPONENT,
        component: props => {
            const [switchValue, setSwitchValue] = React.useState<boolean>(settings.store.notificationQuickReactEnabled);
            const [reactions, setReactions] = React.useState<string[]>(settings.store.notificationQuickReact || []);

            React.useEffect(() => {
                settings.store.notificationQuickReactEnabled = switchValue;
            }, [switchValue]);

            React.useEffect(() => {
                props.setValue(reactions);
                if (settings.store.inlineReplyLinux) settings.store.inlineReplyLinux = false;
            }, [reactions]);

            const updateReaction = (index: number, value: string) => {
                const newReactions = [...reactions];
                newReactions[index] = value;
                setReactions(newReactions);
            };

            const addReaction = () => {
                if (reactions.length >= 5) { return; }
                setReactions([...reactions, ""]);
            };

            const removeReaction = (index: number) => {
                const newReactions = reactions.filter((_, i) => i !== index);
                setReactions(newReactions);
            };

            return (
                <>
                    <FormSwitch
                        title="Enable quick reactions"
                        hideBorder={true}
                        value={switchValue}
                        onChange={setSwitchValue}
                    />

                    <Paragraph>
                        Add reaction buttons to notifications
                    </Paragraph>

                    {switchValue && (
                        <div style={{ marginTop: "12px" }}>
                            <Paragraph>Quick Reactions</Paragraph>
                            {reactions.map((emoji, index) => (
                                <div key={index} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                                    <TextInput
                                        value={emoji}
                                        onChange={val => updateReaction(index, val)}
                                        placeholder="e.g. "
                                    />
                                    <Button style={{ width: "3ch", marginLeft: "4px" }} onClick={() => removeReaction(index)}>
                                        X
                                    </Button>
                                </div>
                            ))}
                            <Button disabled={reactions.length >= 5} onClick={addReaction}>
                                Add Reaction
                            </Button>
                        </div>
                    )}
                </>
            );
        },
        default: ["👍", "❤️"],
        hidden: !isWin
    },

    allowBotNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow desktop notifications from bots",
        default: true
    },
    specialCallNotification: {
        type: OptionType.BOOLEAN,
        description: "Use a special notification type for incoming calls",
        default: true,
        hidden: isMac
    },
    notificationPfpCircle: {
        type: OptionType.BOOLEAN,
        description: "Crop the sender's profile picture to a circle",
        default: true,
        hidden: isMac
    },
    notificationMarkupSupported: {
        type: OptionType.COMPONENT,
        component: props => {
            const [value, setValue] = React.useState<boolean>(settings.store.notificationMarkupSupported);

            React.useEffect(() => {
                props.setValue(value);
            }, [value]);

            return <div style={{ marginBottom: "0.5em", height: "100%" }}>

                <FormSwitch title="Enable notification markup support for Linux" hideBorder={true} value={value} onChange={setValue}></FormSwitch>

                <Paragraph style={{ marginBottom: "8px" }}><span style={{ color: "var(--status-danger)" }}>WARNING:</span> This feature may not support your system. If you see HTML tags (such as &lt;b&gt;) in notifications, turn this feature off.</Paragraph>
                {value ?
                    <Text><b>Here's some bold text</b> and <i>heres's some italic text</i></Text>
                    :
                    <Text>Here's some bold text and here's some italic text</Text>
                }
            </div>;
        },
        default: false,
        hidden: !isLinux
    },
    disableImageLoading: {
        type: OptionType.BOOLEAN,
        description: "Disables attachments in notifications. Turn on if you have a limited data plan.",
        default: false
    },
    showSpoilerImages: {
        type: OptionType.BOOLEAN,
        description: "Include blurred spoiler attachments",
        default: false
    },
    autoMuteSpammers: {
        type: OptionType.BOOLEAN,
        description: "Automatically stops notifications for a few seconds in the event that someone is spam mentioning you",
        default: true,
    },

    notificationImagePositionWin: {
        type: OptionType.SELECT,
        description: "How notification attachments are placed.",
        options: [
            { label: "Hero", value: "hero", default: true },
            { label: "Inline (Legacy)", value: "inline" }
        ],
        hidden: !isWin
    },
    notificationImagePositionLinux: {
        type: OptionType.SELECT,
        description: "How notification attachments are placed.",
        options: [
            { label: "Body", value: "x-kde-urls" },
            { label: "Inline", value: "image-path", default: true }
        ],
        hidden: !isLinux || !Native.checkLinuxDE("KDE")
    },
    inlineReplyLinux: {
        type: OptionType.COMPONENT,
        description: "Enable inline replies from notifications.",
        component: props => {
            const [value, setValue] = React.useState<boolean>(settings.store.inlineReplyLinux);

            React.useEffect(() => {
                props.setValue(value);
                if (settings.store.notificationQuickReactEnabled) settings.store.notificationQuickReactEnabled = false;
            }, [value]);

            return <FormSwitch title="Enable support for inline replies from notifications" hideBorder={true} value={value} onChange={setValue}></FormSwitch>;
        },
        default: false,
        hidden: !isLinux || !Native.checkLinuxDE("KDE")
    },
    notificationAttachmentFit: {
        type: OptionType.SELECT,
        description: "How to process attachments for notifications",
        options: [
            { label: "Let operating system decide", value: AttachmentManipulation.none },
            { label: "Fill in blanks (blur background). Supports displaying multiple attachments at once", value: AttachmentManipulation.fillBlank, default: true },
            { label: "Crop to top", value: AttachmentManipulation.cropTop },
            { label: "Crop to center", value: AttachmentManipulation.cropCenter },
            { label: "Crop to bottom", value: AttachmentManipulation.cropBottom },
        ],
        hidden: isMac
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
                <Heading>Cache options</Heading>
                <Button variant={"secondary"} onClick={_ => { Native.openTempFolder(); }}>Open cache folder</Button>
                <Button variant="dangerPrimary" onClick={_ => {
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
                    } else {
                        [$2, $3, $4, $5] = Vencord.Plugins.plugins.BetterNotifications.InterceptNotification($2, $3, $4, $5, $6);
                        console.log("Patched using variable replacement");
                    }
                `
            }
        },
        {
            find: "NOTIFICATIONS_SEND_NOTIFICATION",
            replacement: {
                match: /await ([a-zA-Z]).([a-zA-Z]{2}).invoke\("NOTIFICATIONS_SEND_NOTIFICATION",([a-zA-Z])\);/,
                replace: "(Vencord.Plugins.plugins.BetterNotifications.ShouldUseCustomFunc() ? console.log('Replaced by BetterNotifications') : await $1.$2.invoke(\"NOTIFICATIONS_SEND_NOTIFICATION\",$3));",
            }
        }
    ],

    start() {
        if (isMac && settings.store.notificationPatchType === "custom") {
            logger.warn("User is on macOS but has notificationPatchType as custom");
            setTimeout(() => {
                showToast("Looks like you are using BetterNotifications on macOS. Switching over to Variable replacement patch strategy", Toasts.Type.MESSAGE, { duration: 8000 });
                settings.store.notificationPatchType = "variable";
            }, 6000);
        }
    },

    SendNativeNotification,
    InterceptNotification,

    NotificationClickEvent(channelId: string, messageId: string) {
        logger.debug(`Recieved click to channel ${channelId}`);
        window.focus();
        ChannelRouter.transitionToChannel(channelId);
        jumpToMessage.jumpToMessage({
            channelId,
            messageId,
            flash: true,
            jumpType: "INSTANT"
        });
    },

    NotificationReplyEvent(text: string, channelId: string, messageId: string) {
        logger.info(`Recieved reply event with text ${text} to channel ${channelId} replying to ${messageId}`);
        sendMessage(
            channelId,
            { content: text },
            true,
            {
                "messageReference": {
                    "channel_id": channelId.toString(),
                    "message_id": messageId.toString()
                }
            }
        );

        ChannelRouter.transitionToChannel(channelId);
        jumpToMessage.jumpToMessage({
            channelId,
            messageId,
            flash: true,
            jumpType: "INSTANT"
        });
    },

    NotificationReactEvent(channelId: string, messageId: string, emoji: string) {
        addReaction(channelId.toString(), messageId.toString(), {
            animated: false,
            id: null,
            name: emoji
        });
    },

    ShouldUseCustomFunc() {
        return settings.store.notificationPatchType === "custom";
    },
});

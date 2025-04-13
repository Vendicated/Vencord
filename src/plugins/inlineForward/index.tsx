/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { ErrorBoundary } from "@components/index";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { lodash, MessageActions, Text } from "@webpack/common";

const DiscordMessage = findComponentByCodeLazy("hideSimpleEmbedContent", "previewGuildId");

type ForwardedMessageStore = {
    message: any;
    guild_id: string;
    isForwarding: boolean;
};

const settings = definePluginSettings({
    state: {
        type: OptionType.CUSTOM,
        default: {} as ForwardedMessageStore,
        hidden: true,
    },

    keepForwading: {
        type: OptionType.BOOLEAN,
        description: "Disable keeping the forward after sending it",
        default: true
    },
});

// stolen from the vencord notification log! thanks guys!
function CloseIcon({ onClick }: { onClick: React.MouseEventHandler<SVGSVGElement>; }) {
    return <svg
        className="vc-inlineforward-close"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        role="img"
        onClick={onClick}
    >
        <path fill="currentColor" d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
    </svg>;
}

export default definePlugin({
    name: "InlineForward",
    description: "Swaps out the foward model to display the to be forwarded message in the message bar",
    authors: [Devs.surgedevs],
    settings,

    patches: [
        // patches the forward button action
        {
            find: "\"forward-modal\"",
            replacement: {
                match: /"forward-modal";function \i\((\i)\){/,
                replace: "$&$self.onForwardPressed($1);return null;"
            }
        },

        // patches the upload area to include the message preview
        {
            find: "(\"ChannelAttachmentArea\");",
            replacement: [
                // shows the upload area
                {
                    match: /(\("ChannelAttachmentArea"\);return)(.*?)\?null/,
                    replace: "$1 (!$self.isForwarding())&&($2)?null"
                },
                // add preview component
                {
                    match: /(\(0,\i\.jsx\)\("ul")(.*?)\}\)\)/,
                    replace: "[$self.previewComponent(),$1$2}))]"
                },
                // insert a useState so we can update the compnent
                {
                    match: /(\i)\.useState.*"ChannelAttachmentArea"\);/,
                    replace: "$&let[vcIf,setVcIf]=$1.useState(null);$self.updateAttachmentState=setVcIf;"
                }
            ]
        },

        // patches handleSendMessage so we can send the forwarded message before the real message (the client does it in roughly the same way)
        {
            find: "this,\"handleSendMessage\",async",
            replacement: {
                match: /"handleSendMessage",async \i=>{/,
                replace: "$&if($self.isForwarding()) await $self.handleSendMessage();"
            }
        },

        {
            find: "handleAutocompleteVisibilityChange",
            replacement: [
                // allow forwarding when input has no content
                {
                    match: /,\i=0===\i\.trim\(\)\.length/,
                    replace: "$&&&!$self.isForwarding()"
                },
                // to update the component above
                {
                    match: /(\i)(\.useRef\(null\);)(null==\i||\i\(\i\.current\);)/,
                    replace: "$1$2let[vcIf,setVcIf]=$1.useState(null);$self.updateSendButtonState=setVcIf;$3"
                }
            ]
        }
    ],

    onForwardPressed(forwardInfo: any) {
        const { state } = settings.store;
        const currentChannel = getCurrentChannel();

        state.message = lodash.cloneDeep(forwardInfo.message);

        if (
            state.message.attachments.length !== 0
            || state.message.embeds.length !== 0
            || state.message.stickerItems.length !== 0
        ) {
            state.message.content = state.message.content.length === 0 ?
                "(attachment)"
                : state.message.content + "\n\n(attachment)";
        }

        if (currentChannel?.guild_id)
            state.guild_id = currentChannel.guild_id;

        state.isForwarding = true;
        this.updateStates(true);
    },

    stopForwarding() {
        settings.store.state.isForwarding = false;
        this.updateStates(false);
    },

    previewComponent() {
        const hook = settings.use();

        const Inner = () => {
            return <div className="vc-inlineforward-container">
                {hook.state.isForwarding ? <>
                    <div className="vc-inlineforward-header">
                        <CloseIcon onClick={this.stopForwarding.bind(this)} />

                        <Text
                            tag="h2"
                            variant="eyebrow"
                            style={{
                                color: "var(--header-primary)",
                                display: "inline"
                            }}
                        >Forwarding:</Text>
                    </div>

                    <DiscordMessage
                        message={settings.plain.state.message}
                        author={{
                            nick: hook.state.message.author.globalName || hook.state.message.author.username,
                            colorStrings: undefined
                        }}
                    />
                </> : null}
            </div>;
        };

        return ErrorBoundary.wrap(Inner, { noop: true })({});
    },

    isForwarding: () => settings.store.state.isForwarding,

    updateAttachmentState: null as any,
    updateSendButtonState: null as any,

    updateStates(val: any) {
        this.updateAttachmentState(val);
        this.updateSendButtonState(val);
    },

    async handleSendMessage() {
        const currentChannel = getCurrentChannel();
        if (!currentChannel) return;

        if (settings.store.keepForwading) {
            this.settings.store.state.isForwarding = false;
            this.updateStates(false);
        }

        const messageReference = {
            channel_id: settings.store.state.message.channel_id,
            message_id: settings.store.state.message.id,
            forward_only: undefined,
            type: 1,
        } as any;

        if (settings.store.state.guild_id)
            messageReference.guild_id = settings.store.state.guild_id;

        settings.store.state.guild_id = "";

        await MessageActions.sendMessage(
            currentChannel.id,
            {
                content: "",
                invalidEmojis: [],
                tts: false,
                validNonShortcutEmojis: []
            },
            false,
            {
                messageReference,
                eagerDispatch: false
            }
        );
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { addButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { ChatIcon } from "@components/Icons";
import { ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, ChannelStore, FluxDispatcher, Forms, MessageStore, TextInput, UserStore } from "@webpack/common";
import { Channel, Embed, Message, User } from "discord-types/general";
import { ReactNode } from "react";

// interfaces
interface Comment {
    user: User;
    comment: string;
    channel?: Channel; // Assuming channel is a string, you can adjust the type accordingly
    avatarUrl: string;
    originalMessage: Message;
}
// end interfaces



const commentedMessages: Record<string, Embed[]> = {};
const comments: Record<string, Comment[]> = {};

const settings = definePluginSettings({});

function addComment(message: Message, user: User, comment: string, channel: Channel, msgid: string, private: boolean) {

    if (!commentedMessages[message.id]) {
        commentedMessages[message.id] = [];
    }
    /*
    commentedMessages[message.id].push({
        title: `${user.username}`,

        description: comment,
        color: "0x7289da",
        footer: {
            icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
            text: `${user.username} / ${user.id}`,
        }

    });
    */
    const ob_comment = {
        user: user,
        comment: comment,
        avatarUrl: user.getAvatarURL(),
        originalMessage: message,
        channel: channel
    } as Comment;
    if (comments[msgid]) {
        comments[msgid].push(ob_comment);
    }
    else {
        comments[msgid] = [ob_comment];
    }
    sendBotMessage(channel.id, {
        content: "Comment added to message",
        message_reference: {
            channel_id: message.channel_id,
            message_id: message.id,

        },
        referenced_message: {
            "id": message.id,
            "type": 0,
            "content": message.content,
            "channel_id": message.channel_id,
            "author": {
                "id": message.author.id,
                "username": message.author.username,
                "avatar": message.author.avatar,
                "discriminator": message.author.discriminator,
                "public_flags": 131136,
                "premium_type": 2,
                "flags": 131136,
                "banner": null,
                "accent_color": null,
                "global_name": null,
                "avatar_decoration_data": null,
                "banner_color": null
            },
            "attachments": [],
            "embeds": [],
            "mentions": [],
            "mention_roles": [],
            "pinned": false,
            "mention_everyone": false,
            "tts": false,
            "timestamp": "2023-12-16T14:14:11.906000+00:00",
            "edited_timestamp": null,
            "flags": 0,
            "components": []
        },
        type: 19,
        embeds: [{
            title: `${user.username}`,

            description: comment,
            color: "0x7289da",
            footer: {
                icon_url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
                text: `${user.username} / ${user.id}`,
            }

        }]
    });
    FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message: message });

}
function comment2reactcode(comment: Comment) {
    var { avatarUrl } = comment;
    var { username } = comment.user;
    var userid = comment.user.id;
    var commentstr = comment.comment;
    /*
        <div className="embed-footer">
            <img
                alt=""
                className="embed-footer-icon"
                src="https://cdn.discordapp.com/avatars/983853053948080138/a_7782dd7df8b46ec328bb9cd14abe09c1.png"
            />
                <span className="embed-footer-text">{userid}</span>
        </div> */
    return (<div className="discord-message">
        <div className="avatar-container">
            <img
                src={avatarUrl}
                alt=""
                className="avatar"
            />
        </div>
        <div className="message-content">
            <div className="username">{username}<div className="embed-footer">
            </div> </div>
            <div className="message-text">{commentstr}</div>
        </div>
        <div className="embed-footer">

            <br />
            <span className="embed-footer-text">{userid}</span>
        </div>
    </div>);
}
function listComments(message: Message) {
    if (commentedMessages[message.id]) {
        sendBotMessage(message.channel_id, {
            content: "",
            embeds: commentedMessages[message.id],
            message_reference: {
                channel_id: message.channel_id,
                message_id: message.id,

            },
            referenced_message: {
                "id": message.id,
                "type": 0,
                "content": message.content,
                "channel_id": message.channel_id,
                "author": {
                    "id": message.author.id,
                    "username": message.author.username,
                    "avatar": message.author.avatar,
                    "discriminator": message.author.discriminator,
                    "public_flags": 131136,
                    "premium_type": 2,
                    "flags": 131136,
                    "banner": null,
                    "accent_color": null,
                    "global_name": null,
                    "avatar_decoration_data": null,
                    "banner_color": null
                },
                "attachments": [],
                "embeds": [],
                "mentions": [],
                "mention_roles": [],
                "pinned": false,
                "mention_everyone": false,
                "tts": false,
                "timestamp": "2023-12-16T14:14:11.906000+00:00",
                "edited_timestamp": null,
                "flags": 0,
                "components": []
            },
            type: 19
        });
    }
    else {
        const msg = sendBotMessage(message.channel_id, {
            content: "No comments for message this message",
            embeds: [],
            message_reference: {
                channel_id: message.channel_id,
                message_id: message.id,

            },
            referenced_message: {
                "id": message.id,
                "type": 0,
                "content": message.content,
                "channel_id": message.channel_id,
                "author": {
                    "id": message.author.id,
                    "username": message.author.username,
                    "avatar": message.author.avatar,
                    "discriminator": message.author.discriminator,
                    "public_flags": 131136,
                    "premium_type": 2,
                    "flags": 131136,
                    "banner": null,
                    "accent_color": null,
                    "global_name": null,
                    "avatar_decoration_data": null,
                    "banner_color": null
                },
                "attachments": [],
                "embeds": [],
                "mentions": [],
                "mention_roles": [],
                "pinned": false,
                "mention_everyone": false,
                "tts": false,
                "timestamp": "2023-12-16T14:14:11.906000+00:00",
                "edited_timestamp": null,
                "flags": 0,
                "components": []
            },
            type: 19
        });
        console.log(msg);

    }
}

export default definePlugin({
    name: "Commentator",
    description: "Add comments to messages.",
    authors: [
        {
            id: 983853053948080138n,
            name: "angelfencer",
        },
        {
            id: 1126597615027486801n,
            name: "cranberryfaith",
        }

    ],
    patches: [


    ],
    settings,
    // Delete these two below if you are only using code patches
    start() {
        const avatarUrl = UserStore.getCurrentUser().getAvatarURL();
        addButton("comment", message => ({
            label: "Comment",
            icon: ChatIcon,
            message,
            channel: ChannelStore.getChannel(message.channel_id),
            onClick: () => {
                // listComments(message);
                let comment = "";
                const commentsreact = [] as ReactNode[];
                if (comments[message.id]) {
                    comments[message.id].forEach(comment => {
                        commentsreact.push(comment2reactcode(comment));
                    });
                }
                function updatewritingcomment(c: string) {
                    comment = c;

                }
                const modal = openModal(props => (
                    <ModalRoot {...props} >
                        <ModalHeader>
                            <Forms.FormTitle>Comments</Forms.FormTitle>
                        </ModalHeader>
                        <ModalContent>
                            <div className="scroll-box">
                                <div className="content">
                                    {commentsreact}
                                </div>
                            </div>
                            <div className="comment-box">
                                <Forms.FormText>Add Comment</Forms.FormText>
                                <div className="avatar-container">
                                    <img
                                        src={avatarUrl} // Use the provided avatarUrl variable
                                        alt=""
                                        className="avatar"
                                    />
                                </div>
                                <div className="comment-content">
                                    <div className="username">{UserStore.getCurrentUser().username}</div>
                                    <div className="comment-input">
                                        <TextInput classID="comment" onChange={e => updatewritingcomment(e)} />
                                        <Button classID="submit" onClick={e => {
                                            addComment(message, UserStore.getCurrentUser(), comment, ChannelStore.getChannel(message.channel_id), message.id, true);
                                            console.log(comment);
                                            props.onClose();
                                        }} >Submit</Button>
                                    </div>
                                </div>
                            </div>
                        </ModalContent>
                    </ModalRoot>
                ));
            }
        })
        );
    },
    dependencies: ["CommandsAPI", "MessageAccessoriesAPI", "MessagePopoverAPI", "MessageEventsAPI"],

    stop() { },

    commands: [{
        name: "comment",
        description: "Add a comment to a message.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "comment",
                description: "what to comment about this message",
                required: true,
                type: ApplicationCommandOptionType.STRING,
            },
            {
                name: "private",
                description: "Can this only be seen by you?",
                required: true,
                type: ApplicationCommandOptionType.BOOLEAN,
            },
            {
                name: "msgid",
                description: "msgid",
                required: true,
                type: ApplicationCommandOptionType.STRING,
            },

        ],
        execute: async (args, ctx) => {
            const user = UserStore.getCurrentUser();
            const comment = findOption(args, "comment") || "";
            const private = findOption(args, "private") || false;
            const msgid = findOption(args, "msgid") || "";
            const message = MessageStore.getMessage(ctx.channel.id, msgid);

            if (!message) return;
            if (!private) {
                sendBotMessage(ctx.channel.id, {
                    content: "Only private comments are supported at this time."
                }
                );
                return;
            }
            if (!user) return;
            if (!comment) return;
            if (!msgid) return;
            if (!ctx.channel) return;

            addComment(message, user, comment as string, ctx.channel, msgid as string, private);
        },
    },

    ],

    async startTyping(channelId: string) {
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    },

    // chatBarIcon: ErrorBoundary.wrap(SilentTypingToggle, { noop: true }),
});

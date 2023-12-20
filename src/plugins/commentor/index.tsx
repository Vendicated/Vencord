/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { sendBotMessage } from "@api/Commands";
import { DataStore } from "@api/index";
import { addButton } from "@api/MessagePopover";
import { definePluginSettings } from "@api/Settings";
import { ChatIcon, DeleteIcon } from "@components/Icons";
import { closeAllModals, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, ChannelStore, FluxDispatcher, Forms, TextInput, UserStore } from "@webpack/common";
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
let comments: Record<string, Comment[]> = {};

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
    SaveComments();
}
function Comment2ReactCode(comment: Comment, deletable?: boolean) {
    var { avatarUrl } = comment;
    var { username } = comment.user;
    var userid = comment.user.id;
    var commentstr = comment.comment;
    if (deletable) {
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
                <Button classID="deletecomment" onClick={e => {
                    DeleteComment(comment);

                    closeAllModals();

                }} > <DeleteIcon />
                </Button>

            </div>

        </div>);
    }
    else {
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
function SaveComments() {

    var task = (async () => {
        await DataStore.update("msg_comments", () => JSON.stringify(comments) as string);
        // eslint-disable-next-line dot-notation
        const res = await JSON.parse(await DataStore.get("msg_comments") as string) as Record<string, Comment[]>;
        console.log("Saved comments \n", res);

    });
    task().catch(err => console.log(err)).finally(() => console.log("Saved comments finnished \n"));
}
async function LoadComments() {


    comments = await JSON.parse(await DataStore.get("msg_comments") as string) as Record<string, Comment[]>;
    console.log("Loaded comments \n", comments);



}
export default definePlugin({
    name: "Commentator",
    description: "Add comments to messages.",
    authors: [
        {
            id: 983853053948080138n,
            name: "angelfencer",
        }
    ],
    patches: [


    ],
    settings,
    // Delete these two below if you are only using code patches
    start() {
        LoadComments();
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
                        commentsreact.push(<div className="comment">{Comment2ReactCode(comment, true)}</div>);
                    });
                }
                function updatewritingcomment(c: string) {
                    comment = c;

                }
                var messageascomment = {
                    user: message.author,
                    comment: message.content,
                    avatarUrl: message.author.getAvatarURL(),
                    originalMessage: message,
                    channel: ChannelStore.getChannel(message.channel_id)
                } as Comment;
                const modal = openModal(props => (
                    <ModalRoot {...props}>
                        <ModalHeader>
                            <Forms.FormDivider />
                            <Forms.FormTitle><ChatIcon /></Forms.FormTitle>
                            <Forms.FormDivider />

                        </ModalHeader>
                        <ModalContent>

                            <div className="origenal-comment ">
                                {Comment2ReactCode(messageascomment)}
                            </div>
                            <Forms.FormDivider />
                            <div className="scroll-box">
                                <div className="content">
                                    {commentsreact}
                                </div>
                            </div>
                            <Forms.FormDivider />
                            <Button classID="deletecomments" onClick={e => {
                                WipeCommentsFromMessage(message.id as string);

                                props.onClose();

                            }} > <DeleteIcon />
                            </Button>
                            <Forms.FormDivider />
                            <div className="comment-box">

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
                                            addComment(message, UserStore.getCurrentUser(), comment, ChannelStore.getChannel(message.channel_id), message.id);
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

    commands: []
    // removed debug commands
    /*
    [{
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
    {
        name: "wipecomments",
        description: "Wipe all comments.",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "msg",
                type: ApplicationCommandOptionType.STRING,
                description: "message to wipe comments from(optional)",
                required: false,
            }
        ],
        execute: async (args, ctx) => {
            if (findOption(args, "msg")) {
                WipeCommentsFromMessage(findOption(args, "msg") as string);
                return;
            }
            else {
                comments = {};
                SaveComments();
            }
        },
    }]
    */
    ,

    async startTyping(channelId: string) {
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    },

    // chatBarIcon: ErrorBoundary.wrap(SilentTypingToggle, { noop: true }),
});
function WipeCommentsFromMessage(arg0: string) {
    const msgid = arg0;
    if (!msgid) return;
    if (!comments[msgid as string]) return;
    comments[msgid as string] = [];
    SaveComments();
}
function DeleteComment(comment: Comment) {
    const msgid = comment.originalMessage.id;
    if (!msgid) return;
    if (!comments[msgid as string]) return;
    comments[msgid as string].splice(comments[msgid as string].indexOf(comment), 1);
    SaveComments();
}


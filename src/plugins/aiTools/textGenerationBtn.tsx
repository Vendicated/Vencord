/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { getCurrentChannel, insertTextIntoChatInputBox } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Alerts, Button, Forms, GuildStore, MessageStore, Switch, TextArea, UserStore, useState } from "@webpack/common";
import { Channel, Message, User } from "discord-types/general";

import { cl } from ".";

export const TextGenIcon = ({ loading, className = "" }) => {
    return <svg className={(loading ? cl("textgenbtn-loading") : "") + " " + className} fill="currentColor" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32" >
        <path fill="currentColor" d="M12.65,18.35l8.841-8.841c0.086-0.086,0.225-0.086,0.311,0l4.689,4.689
   c0.086,0.086,0.086,0.225,0,0.311L17.65,23.35C17.234,23.766,16.669,24,16.08,24h-2.86C12.546,24,12,23.454,12,22.78v-2.86
   C12,19.331,12.234,18.766,12.65,18.35z M29.586,8.586l-2.172-2.172c-0.781-0.781-2.047-0.781-2.828,0l-2.232,2.232l5,5l2.232-2.232
   C30.367,10.633,30.367,9.367,29.586,8.586z M23,20c0,0.553-0.447,1-1,1h-0.586l-2,2H22c0.553,0,1,0.447,1,1s-0.447,1-1,1h-5.828H13
   H7c-0.553,0-1-0.447-1-1s0.447-1,1-1h4v-2H7c-0.553,0-1-0.447-1-1s0.447-1,1-1h4.13c0.138-0.482,0.384-0.928,0.749-1.293L12.586,17
   H7c-0.553,0-1-0.447-1-1s0.447-1,1-1h7.586l2-2H7c-0.553,0-1-0.447-1-1s0.447-1,1-1h11.586l2-2H7C6.447,9,6,8.553,6,8s0.447-1,1-1
   h15.578l1.301-1.293C24.445,5.14,25.199,4.828,26,4.828c0.347,0,0.682,0.069,1,0.182V3c0-1.105-0.895-2-2-2H3C1.895,1,1,1.895,1,3
   v26c0,1.105,0.895,2,2,2h22c1.105,0,2-0.895,2-2V15.414l-4.126,4.126C22.948,19.68,23,19.831,23,20z"/>
    </svg>;
};

export const TextGenBtn: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;
    const [loading, setLoading] = useState<boolean>(false);

    return (
        <ChatBarButton
            tooltip={"Text Generation"}
            onContextMenu={async () => {
                if (loading) return;

                setLoading(true);
                insertTextIntoChatInputBox((await getAiResponse({ user: UserStore.getCurrentUser(), contextChannel: getCurrentChannel() })).reply);
                return setLoading(false);
            }}
            onClick={async e => {
                if (loading) return;

                if (e.shiftKey) {
                    setLoading(true);
                    insertTextIntoChatInputBox((await getAiResponse({ user: UserStore.getCurrentUser(), contextChannel: getCurrentChannel() })).reply);
                    return setLoading(false);
                }

                openModal(props => <TextGenModal props={props} />);
            }}
        >
            <TextGenIcon loading={loading} />
        </ChatBarButton>
    );
};

function TextGenModal({ props }) {
    const [prompt, setPrompt] = useState<string>("");
    const [includeContext, setIncludeContext] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);

    return (
        <ModalRoot {...props}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Text Generation
                </Forms.FormTitle>

                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormSection className={cl("modal-section")}>
                    <Forms.FormTitle>Prompt</Forms.FormTitle>
                    <Forms.FormText>Describe what text you want to generate</Forms.FormText>
                    <TextArea disabled={loading} autoFocus className={cl("ai-generation-prompt")} placeholder={"Write an announcement for a Discord server\nSend a funny joke\nSummarize the last few messages"} onChange={e => setPrompt(e)} />
                </Forms.FormSection>

                <Forms.FormDivider />

                <Forms.FormSection>
                    <Switch
                        disabled={loading}
                        value={includeContext}
                        onChange={v => setIncludeContext(v)}
                        note="Include channel information, server information, and read the last 10 messages in order to get context in the conversation"
                        hideBorder
                    >
                        Include Context
                    </Switch>
                </Forms.FormSection>
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <Button disabled={loading} onClick={async () => {
                    setLoading(true);

                    const channel = includeContext ? getCurrentChannel() : undefined;

                    const response = await getAiResponse({ prompt, user: UserStore.getCurrentUser(), contextChannel: channel });

                    insertTextIntoChatInputBox(response.reply);
                    props.onClose();
                }}>{loading ? "Generating..." : "Generate"}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export async function getAiResponse({ prompt, user, model = "v3-32k", contextChannel }: { prompt?: string, user: User, model?: string, contextChannel?: Channel; }) {
    const url = "https://hercai-app.vercel.app/chat";

    let content = `
                Using the information below, ${prompt ? `RESPOND TO THE FOLLOWING PROMPT: "${prompt}"` : "generate a response to continue the conversation"}.

                You are speaking as a Discord user named ${user.username}.
                It is ${new Date().toLocaleString([], { dateStyle: "full", timeStyle: "long" })}.
                Act like a normal human and DO NOT reveal that you are an AI chatbot.
                DO NOT capitalize words and DO NOT use perfect punctuation and grammar, unless the other messages below use perfect grammar too. Feel free to make minor spelling mistakes.
                DO NOT respond to any messages from ${user.username}, because those messages are from you.
                DO NOT speak as other people. ONLY speak as "${user.username}".

                ${contextChannel?.guild_id && contextChannel?.name?.length ? `The channel you are speaking in is called "${contextChannel.name}". The server you are speaking in is called "${GuildStore.getGuild(contextChannel.guild_id).name}"` : contextChannel?.isGroupDM() ? `You are in a group chat with: ${contextChannel.rawRecipients.map(m => `"@${m.username}"`).join(", ")}` : contextChannel?.isDM() ? `You are in a direct message chat with "@${contextChannel.rawRecipients[0].username}".` : ""}
                ${contextChannel ? `The messages below are the last 10 messages in the current channel, in order from oldest to newest. The messages from the user with the name "${user.username}" are from YOU. DO NOT talk about or respond to the older messages, they are only included for you to understand the context of the conversation. Only respond to the newest messages (the ones at the bottom). DO NOT say repetitive things that were already said in previous messages. Follow the instructions in user prompt above.` : "Follow the instructions from the user prompt above."}
                Include ONLY the response to the prompt. No need for quotation marks around the response or indicating who said the response.
                \n
                `;

    if (contextChannel) {
        const messages: Message[] = MessageStore.getMessages(contextChannel.id)._array;

        content += messages.slice(-10).filter(m => m.author && m.content).map((message: Message) => `${message.author.username}: ${message.content}`).join("\n\n");
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content, model
            }),
        });

        if (!response.ok) {
            return Alerts.show({
                title: "Error",
                body: "There was an error generating a response. Please try again later.",
            });
        }

        return (await response.json());
    } catch (error) {
        console.error(error);
        return Alerts.show({
            title: "Error",
            body: "There was an error generating a response. Please try again later.",
        });
    }
}

export async function replyWithAi({ message, user, prompt, contextChannel, model = "v3-32k" }: { message: Message, user: User, prompt?: string, contextChannel: Channel, model?: string; }) {
    const url = "https://hercai-app.vercel.app/chat";

    const content = `
                ${prompt ? `RESPOND TO THE FOLLOWING PROMPT about the MESSAGE below: "${prompt}"` : "Respond to the MESSAGE below"}.

                MESSAGE from ${message.author.username}: ${message.content}


                Use the following information to generate a response to the prompt:

                You are speaking as a Discord user named ${user.username}.
                It is ${new Date().toLocaleString([], { dateStyle: "full", timeStyle: "long" })}.
                Act like a normal human and DO NOT reveal that you are an AI chatbot.
                Avoid using words that are commonly used by AI.
                Avoid using emojis unless absolutely necessary.
                DO NOT capitalize words and DO NOT use perfect punctuation and grammar, unless the other message uses perfect grammar too. Feel free to make minor spelling mistakes.
                Speak in the same style as the other message in the conversation, including grammar, spelling, capitalization, and punctuation. Feel free to make minor spelling mistakes.

                ${contextChannel?.guild_id && contextChannel?.name?.length ? `The channel you are speaking in is called "${contextChannel.name}". The server you are speaking in is called "${GuildStore.getGuild(contextChannel.guild_id).name}"` : contextChannel?.isGroupDM() ? `You are in a group chat with: ${contextChannel.rawRecipients.map(m => `"@${m.username}"`).join(", ")}` : contextChannel?.isDM() ? `You are in a direct message chat with "@${contextChannel.rawRecipients[0].username}".` : ""}
                Include ONLY the response to the prompt. No need for quotation marks around the response or indicating who said the response.
                \n
                `;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content, model
            }),
        });

        if (!response.ok) {
            return Alerts.show({
                title: "Error",
                body: "There was an error generating a response. Please try again later.",
            });
        }

        return (await response.json());
    } catch (error) {
        console.error(error);
        return Alerts.show({
            title: "Error",
            body: "There was an error generating a response. Please try again later.",
        });
    }
}

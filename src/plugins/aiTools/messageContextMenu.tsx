/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { getCurrentChannel, insertTextIntoChatInputBox } from "@utils/discord";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { Button, Forms, Menu, TextArea, UserStore, useState } from "@webpack/common";

import { cl } from ".";
import { replyWithAi, TextGenIcon } from "./textGenerationBtn";

export const messageContextMenu: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message.author || !message.content) return;

    const group = findGroupChildrenByChildId("reply", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "reply"), 0, (
        <Menu.MenuItem id="vc-at-reply" label="AI Tools" icon={() => TextGenIcon({ loading: false, className: cl("context-menu") })} action={() => {
            openModal(props => <ContextModal props={props} message={message} />);
        }} />
    ));
};

export function ContextModal({ props, message }) {
    const [prompt, setPrompt] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    return (
        <ModalRoot {...props}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">AI Message Tools</Forms.FormTitle>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <Forms.FormSection className={cl("modal-section")}>
                    <Forms.FormTitle>Prompt</Forms.FormTitle>
                    <Forms.FormText>Describe what to do with this message</Forms.FormText>
                    <TextArea disabled={loading} autoFocus className={cl("ai-generation-prompt")} placeholder={"Summarize this message\nRespond in a funny way\nRewrite this message in a different tone"} onChange={e => setPrompt(e)} />
                </Forms.FormSection>
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <Button disabled={loading} onClick={async () => {
                    setLoading(true);

                    const response = await replyWithAi({ contextChannel: getCurrentChannel(), message, user: UserStore.getCurrentUser(), prompt });

                    insertTextIntoChatInputBox(response.reply);

                    props.onClose();
                }}>{loading ? "Generating..." : "Generate"}</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

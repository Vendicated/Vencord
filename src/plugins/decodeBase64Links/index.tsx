/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton, removeButton } from "@api/MessagePopover";
import { CodeBlock } from "@components/CodeBlock";
import ErrorBoundary from "@components/ErrorBoundary";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, ChannelStore, Text } from "@webpack/common";
import React from "react";

const ChatIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 100 100" fill="none">
        <path d="M42.6,18c-8.4,0-15.3,6.9-15.3,15.3v27.2l-4.4-4.4l-4.3,4.4l11.8,11.8l11.8-11.8l-4.3-4.3l-4.4,4.4V33.3
        c0-5.1,4.1-9.2,9.2-9.2h16.9V18H42.6z" fill="#FFFFFF" />
        <path d="M70.2,28.1L58.3,39.9l4.4,4.3l4.4-4.4V67c0,5.1-4.1,9.2-9.2,9.2H41v6.1h16.9c8.4,0,15.3-6.9,15.3-15.3V39.8
        l4.4,4.4l4.3-4.4L70.2,28.1z" fill="#FFFFFF" />
        <path d="M72.6,91.3H27.9c-10.4,0-18.7-8.4-18.7-18.7V27.8C9.1,17.4,17.5,9,27.9,9h44.8C83,9,91.4,17.4,91.4,27.8v44.8
        C91.4,82.9,83,91.3,72.6,91.3z" fill="none" stroke="#FFFFFF" strokeWidth="4.1667" strokeMiterlimit="16.6667" />
    </svg>
);

const isValidString = str => {
    try {
        new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array([...str].map(char => char.charCodeAt(0))));
        return true;
    } catch (e) {
        return false;
    }
};

const findStrings = content => {
    const base64Regex = /\b[A-Za-z0-9+/]{4,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?\b/g;
    const matches = content.match(base64Regex);
    return matches || [];
};

const decodeStrings = base64Strings => {
    return base64Strings.map(base64 => {
        try {
            const decoded = atob(base64);
            return isValidString(decoded) ? decoded : null;
        } catch (e) {
            console.error("Failed to decode base64 content:", e);
            return null;
        }
    }).filter(decoded => decoded !== null);
};

const openDecodedStrings = decodedContent => {
    const key = openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.LARGE}>
                <ModalHeader>
                    <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Decoded Base64 Content</Text>
                    <ModalCloseButton onClick={() => closeModal(key)} />
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "20px", maxHeight: "400px", overflowY: "auto", backgroundColor: "#1e1e1e", borderRadius: "8px" }}>
                        {decodedContent.length > 0 ? (
                            decodedContent.map((content, index) => (
                                <div key={index} style={{ marginBottom: "16px", background: "#2e2e2e", padding: "16px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)" }}>
                                    <CodeBlock content={content} lang="" style={{ whiteSpace: "pre-wrap", color: "#e0e0e0" }} />
                                </div>
                            ))
                        ) : (
                            <Text variant="body-3/regular" style={{ color: "#e0e0e0" }}>No valid Base64 content found.</Text>
                        )}
                    </div>
                </ModalContent>
                <ModalFooter>
                    <Button onClick={() => closeModal(key)}>Close</Button>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    ));
};

export default definePlugin({
    name: "DecodeBase64Links",
    description: "Decode base64 content of any selected text in a message.",
    authors: [{ name: "Nawelasg", id: 0n }],
    dependencies: ["MessagePopoverAPI"],

    start() {
        const selectedText = "";

        const handleClick = () => {
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection.rangeCount === 0) {
                    console.log("No text selected.");
                    return;
                }

                const selectedText = selection.toString();
                const base64Strings = findStrings(selectedText);
                const decodedContent = decodeStrings(base64Strings);

                openDecodedStrings(decodedContent);
                selection.removeAllRanges();
            }, 0); // Ensuring selection remains intact
        };

        addButton("DecodeBase64", msg => ({
            label: "Decode Base64",
            icon: ChatIcon,
            message: msg,
            channel: ChannelStore.getChannel(msg.channel_id),
            onClick: handleClick
        }));
    },

    stop() {
        removeButton("DecodeBase64");
    }
});

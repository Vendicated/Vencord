/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getCurrentChannel, insertTextIntoChatInputBox, sendMessage } from "@utils/discord";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, useEffect, useRef, useState } from "@webpack/common";

import { getMyUsername, getSnippets, saveSnippets, Snippet } from "./localStorageUtils";

const settings = definePluginSettings({
    autoSendSnippet: {
        description: "Instantly send a snippet when you click its name.",
        type: OptionType.BOOLEAN,
        default: false,
    },
});

interface SnippetSettingsModalProps {
    rootProps: ModalProps;
    close: () => void;
    onSave?: () => void;
    onModalCancel?: () => void;
}

function SnippetSettingsModal({ rootProps, close, onSave, onModalCancel }: SnippetSettingsModalProps) {
    const [snippets, setSnippets] = useState<Snippet[]>(() => getSnippets());
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const addSnippet = () => {
        setSnippets(prevSnippets => {
            const newSnippets = [...prevSnippets, { name: "", value: "" }];
            setTimeout(() => {
                const focusIndex = (newSnippets.length - 1) * 2;
                inputRefs.current[focusIndex]?.focus();
            }, 0);
            return newSnippets;
        });
    };

    const updateSnippet = (index: number, field: "name" | "value", value: string) => {
        setSnippets(prevSnippets => {
            const newSnippets = [...prevSnippets];
            newSnippets[index][field] = value;
            return newSnippets;
        });
    };

    const removeSnippet = (index: number) => {
        setSnippets(prevSnippets => prevSnippets.filter((_, i) => i !== index));
    };

    const saveAndClose = () => {
        const uniqueNames = new Set<string>();
        const validSnippets = snippets.filter(snippet => {
            const isValid = snippet.name.trim() !== "" && snippet.value.trim() !== "";
            const isUnique = !uniqueNames.has(snippet.name.trim());
            if (isValid && isUnique) {
                uniqueNames.add(snippet.name.trim());
                return true;
            }
            return false;
        });

        if (validSnippets.length !== snippets.length) {
            alert("Some snippets have empty names/values or duplicate names and were not saved.");
        }

        saveSnippets(validSnippets);
        onSave?.();
        close();
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className="manage-snippets-header">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Forms.FormTitle tag="h2" style={{ color: "white" }}>
                        Manage Snippets
                    </Forms.FormTitle>
                    <ModalCloseButton onClick={close} />
                </div>
            </ModalHeader>

            <div style={{ maxHeight: "80vh", overflowY: "auto", padding: "20px" }}>
                <ModalContent>
                    {snippets.map((snippet, index) => (
                        <div
                            key={index}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                marginBottom: "10px",
                                width: "100%",
                                boxSizing: "border-box"
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Name"
                                value={snippet.name}
                                onChange={e => updateSnippet(index, "name", e.target.value)}
                                ref={el => inputRefs.current[index * 2] = el}
                                style={{
                                    flex: "1",
                                    padding: "5px",
                                    background: "transparent",
                                    border: "1px solid var(--button-filled-brand-background)",
                                    borderRadius: "4px",
                                    color: "white",
                                    minWidth: "0",
                                    flexShrink: 1
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Value"
                                value={snippet.value}
                                onChange={e => updateSnippet(index, "value", e.target.value)}
                                ref={el => inputRefs.current[index * 2 + 1] = el}
                                style={{
                                    flex: "2",
                                    padding: "5px",
                                    background: "transparent",
                                    border: "1px solid var(--button-filled-brand-background)",
                                    borderRadius: "4px",
                                    color: "white",
                                    minWidth: "0",
                                    flexShrink: 1
                                }}
                            />
                            <button
                                onClick={() => removeSnippet(index)}
                                style={{
                                    background: "var(--button-filled-brand-background)",
                                    color: "white",
                                    border: "none",
                                    padding: "5px 10px",
                                    cursor: "pointer",
                                    borderRadius: "4px",
                                    flexShrink: 0
                                }}
                                title="Delete Snippet"
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                    <Button
                        onClick={addSnippet}
                        style={{
                            marginTop: "20px",
                            backgroundColor: "var(--button-filled-brand-background)",
                            color: "white"
                        }}
                    >
                        Add Snippet
                    </Button>
                </ModalContent>
            </div>

            <ModalFooter justify="flex-end">
                <div style={{ display: "flex", gap: "10px" }}>
                    <Button
                        onClick={saveAndClose}
                        style={{
                            backgroundColor: "var(--button-filled-brand-background)",
                            color: "white",
                            padding: "8px 12px"
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        onClick={() => {
                            onModalCancel?.();
                            close();
                        }}
                        style={{
                            backgroundColor: "var(--button-filled-brand-background)",
                            color: "white",
                            padding: "8px 12px"
                        }}
                    >
                        Cancel
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

interface SnippetModalProps {
    rootProps: ModalProps;
    close: () => void;
}

function SnippetModal({ rootProps, close }: SnippetModalProps) {
    const [selectedSnippet, setSelectedSnippet] = useState<string>("");
    const [snippets, setSnippets] = useState<Snippet[]>([]);
    const { autoSendSnippet } = settings.store;

    useEffect(() => {
        setSnippets(getSnippets());
    }, []);

    const openSnippetSettingsModal = () => {
        close();
        const key = openModal(props => (
            <SnippetSettingsModal
                rootProps={props}
                close={() => {
                    closeModal(key);
                    setSnippets(getSnippets());
                }}
                onSave={() => {
                    const newKey = openModal(newProps => (
                        <SnippetModal
                            rootProps={newProps}
                            close={() => closeModal(newKey)}
                        />
                    ));
                }}
                onModalCancel={() => {
                    const newKey = openModal(newProps => (
                        <SnippetModal
                            rootProps={newProps}
                            close={() => closeModal(newKey)}
                        />
                    ));
                }}
            />
        ));
    };

    const handleSnippetClick = (snippet: string) => {
        const processedSnippet = processSnippet(snippet);
        if (autoSendSnippet) {
            sendMessage(getCurrentChannel()?.id!, { content: processedSnippet });
        } else {
            insertTextIntoChatInputBox(processedSnippet + " ");
        }
        close();
    };
    const processSnippet = (snippet: string) => {
        if (!getCurrentChannel()?.isDM()) return snippet.replace(/\${userName}/g, "").replace(/\${myName}/g, "");
        const userName = getCurrentChannel()?.rawRecipients[0].username || "";
        const myName = getMyUsername() || "";
        return snippet
            .replace(/\${userName}/g, userName)
            .replace(/\${myName}/g, myName);
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <Forms.FormTitle tag="h2" style={{ color: "white" }}>
                        SNIPPET SELECTOR
                    </Forms.FormTitle>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                            onClick={openSnippetSettingsModal}
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                            aria-label="Manage Snippets"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24">
                                <path d="M19.14,12.936c0.036,-0.303 0.057,-0.61 0.057,-0.936c0,-0.326 -0.021,-0.633 -0.057,-0.936l2.037,-1.58c0.18,-0.14 0.23,-0.401 0.118,-0.61l-1.928,-3.341c-0.112,-0.209 -0.38,-0.28 -0.588,-0.205l-2.4,0.96c-0.498,-0.38 -1.04,-0.698 -1.627,-0.94l-0.36,-2.54c-0.034,-0.242 -0.24,-0.42 -0.49,-0.42h-3.856c-0.25,0 -0.456,0.178 -0.49,0.42l-0.36,2.54c-0.587,0.242 -1.129,0.56 -1.627,0.94l-2.4,-0.96c-0.208,-0.075 -0.476,-0.004 -0.588,0.205l-1.928,3.341c-0.112,0.209 -0.06,0.47 0.118,0.61l2.037,1.58c-0.036,0.303 -0.057,0.61 -0.057,0.936c0,0.326 0.021,0.633 0.057,0.936l-2.037,1.58c-0.18,0.14 -0.23,0.401 -0.118,0.61l1.928,3.341c0.112,0.209 0.38,0.28 0.588,0.205l2.4,-0.96c0.498,0.38 1.04,0.698 1.627,0.94l0.36,2.54c0.034,0.242 0.24,0.42 0.49,0.42h3.856c0.25,0 0.456,-0.178 0.49,-0.42l0.36,-2.54c0.587,-0.242 1.129,-0.56 1.627,-0.94l2.4,0.96c0.208,0.075 0.476,0.004 0.588,-0.205l1.928,-3.341c0.112,-0.209 0.06,-0.47 -0.118,-0.61l-2.037,-1.58ZM12,15.6c-1.989,0 -3.6,-1.611 -3.6,-3.6c0,-1.989 1.611,-3.6 3.6,-3.6c1.989,0 3.6,1.611 3.6,3.6c0,1.989 -1.611,3.6 -3.6,3.6Z" fill="currentColor" />
                            </svg>
                        </button>
                        <ModalCloseButton onClick={close} />
                    </div>
                </div>
            </ModalHeader>


            <ModalContent>
                <div
                    className="snippet-buttons-container"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "flex-start",
                        gap: "10px",
                        padding: "20px 0",
                        maxWidth: "600px",
                        margin: "0 auto"
                    }}
                >
                    {snippets.map((snippet, index) => {
                        const displayName = snippet.name.length > 10
                            ? snippet.name.slice(0, 10) + "…"
                            : snippet.name;

                        return (
                            <div
                                key={`${snippet.name}-${snippet.value}-${index}`}
                                onClick={() => handleSnippetClick(snippet.value)}
                                className="snippet-button"
                                style={{
                                    flex: "1 0 calc(33.333% - 10px)",
                                    boxSizing: "border-box",
                                    border: "2px solid var(--button-filled-brand-background)",
                                    padding: "9px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    background: "rgba(var(--button-filled-brand-background), 0.7)",
                                    color: "white",
                                    textAlign: "center",
                                    transition: "background 0.4s, border-color 0.4s, filter 0.4s"
                                }}
                            >
                                {displayName}
                            </div>
                        );
                    })}
                </div>
            </ModalContent>

            <ModalFooter>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "100%" }}>
                    <Button onClick={close}>
                        Close
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );


}

const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Use QuickSnip"
            onClick={() => {
                const key = openModal(props => (
                    <SnippetModal
                        rootProps={props}
                        close={() => closeModal(key)}
                    />
                ));
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <svg
                fill="#000000"
                version="1.1"
                id="quickSnip"
                width="24"
                height="24"
                viewBox="0 0 337.01199 278.617"
                xmlns="http://www.w3.org/2000/svg"
            >
                <g
                    id="g3"
                    fill="currentColor"
                    fillOpacity="1"
                    transform="translate(-0.0005,-29.198)"
                >
                    <g id="g2" fill="currentColor" fillOpacity="1">
                        <path
                            d="M 28.715,215.714 C 12.883,215.714 0,202.833 0,187.005 V 57.91 C 0,42.076 12.883,29.198 28.715,29.198 h 220.147 c 15.829,0 28.715,12.877 28.715,28.712 V 76.588 H 88.15 c -22.614,0 -41.006,18.399 -41.006,41.016 v 98.11 z"
                            id="path1"
                            fill="currentColor"
                            fillOpacity="1"
                        />
                        <path
                            d="m 337.013,246.692 c 0,15.834 -12.874,28.715 -28.703,28.715 h -14.705 c -3.394,0 -6.149,2.75 -6.149,6.148 v 26.26 l -25.58,-30.229 c -1.171,-1.387 -2.889,-2.18 -4.689,-2.18 H 88.15 c -15.826,0 -28.708,-12.881 -28.708,-28.715 v -18.682 -12.297 -98.11 c 0,-15.829 12.883,-28.718 28.708,-28.718 h 189.427 12.298 18.435 c 15.829,0 28.703,12.89 28.703,28.718 z"
                            id="path2"
                            fill="currentColor"
                            fillOpacity="1"
                        />
                    </g>
                </g>
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "QuickSnip",
    description: "Send quick customizable preset snippets in DMs and channels.",
    authors: [Devs.error],
    dependencies: ["ChatInputButtonAPI"],
    settings,
    start() {
        addChatBarButton("QuickSnip", ChatBarIcon);
    },
    stop() {
        removeChatBarButton("QuickSnip");
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Knocklive Development
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import { getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Forms, Select, TextInput, useState } from "@webpack/common";

const Formats = [
    {
        label: "Default",
        value: null,
    },
    {
        label: "Bold",
        value: "[1;2m",
    },
    {
        label: "Underline",
        value: "[4;2m",
    },
    {
        label: "Bold & Underline",
        value: "[1;2m[4;2m",
    }
] as const;
type Formats = typeof Formats[number];

const TextColors = [
    {
        label: "Default",
        value: null,
    },
    {
        label: "Dark Gray",
        value: 30,
    },
    {
        label: "Red",
        value: 31,
    },
    {
        label: "Green",
        value: 32,
    },
    {
        label: "Yellow",
        value: 33,
    },
    {
        label: "Light Blue",
        value: 34,
    },
    {
        label: "Magenta",
        value: 35,
    },
    {
        label: "Cyan",
        value: 36,
    },
    {
        label: "White",
        value: 37,
    }
] as const;
type TextColors = typeof TextColors[number];

const BackgroundColors = [
    {
        label: "Default",
        value: null,
    },
    {
        label: "Blueish Black",
        value: 40,
    },
    {
        label: "Orange",
        value: 41,
    },
    {
        label: "Gray (40%)",
        value: 42,
    },
    {
        label: "Gray (45%)",
        value: 44,
    },
    {
        label: "Gray (55%)",
        value: 45,
    },
    {
        label: "Blurple",
        value: 46,
    },
    {
        label: "Light Gray (60%)",
        value: 47,
    },
    {
        label: "Cream White",
        value: 48,
    }
] as const;
type BackgroundColors = typeof BackgroundColors[number];


function PickerModal({ rootProps, close }: { rootProps: ModalProps, close(): void; }) {
    const [value, setValue] = useState<string>("");
    const [format, setFormat] = useState<string>("");
    const [textColor, setTextColor] = useState<TextColors>(TextColors[0]);
    const [backgroundColor, setBackgroundColor] = useState<BackgroundColors>(BackgroundColors[0]);

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">
                    Insert Colored Text
                </Forms.FormTitle>

                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle>Text</Forms.FormTitle>
                <TextInput
                    type="text"
                    onChange={v => setValue(v)}
                    style={{
                        colorScheme: getTheme() === Theme.Light ? "light" : "dark",
                    }}
                />

                <Forms.FormTitle>Format</Forms.FormTitle>
                <Select
                    options={
                        Formats.map(m => ({
                            label: m.label,
                            value: m.value
                        }))
                    }
                    isSelected={v => v === format}
                    select={v => setFormat(v)}
                    serialize={v => v}
                />
                <Forms.FormTitle>Text Color</Forms.FormTitle>
                <Select
                    options={
                        TextColors.map(m => ({
                            label: m.label,
                            value: m.value
                        }))
                    }
                    isSelected={v => v === textColor}
                    select={v => setTextColor(v)}
                    serialize={v => v}
                />
                <Forms.FormTitle>Background Color</Forms.FormTitle>
                <Select
                    options={
                        BackgroundColors.map(m => ({
                            label: m.label,
                            value: m.value
                        }))
                    }
                    isSelected={v => v === backgroundColor}
                    select={v => setBackgroundColor(v)}
                    serialize={v => v}
                />
            </ModalContent>

            <ModalFooter>
                <Button
                    onClick={() => {
                        insertTextIntoChatInputBox(`\`\`\`ansi\n${typeof format === "string" ? format : ""}${typeof textColor === "number" ? `[2;${textColor}m` : ""}${typeof backgroundColor === "number" ? `[2;${backgroundColor}m` : ""}${value}[0m\n\`\`\``);
                        close();
                    }}
                >Insert</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

const ChatBarIcon: ChatBarButton = ({ isMainChat }) => {
    if (!isMainChat) return null;

    return (
        <ChatBarButton
            tooltip="Insert Colored Text"
            onClick={() => {
                const key = openModal(props => (
                    <PickerModal
                        rootProps={props}
                        close={() => closeModal(key)}
                    />
                ));
            }}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1">
                <g id="surface1">
                    <path fill="currentColor" d="M 7.050781 9.378906 L 14.660156 16.988281 " />
                    <path fill="currentColor" d="M 9.78125 17.152344 L 6.816406 20.117188 " />
                    <path fill="currentColor" d="M 7.015625 14.375 L 4.046875 17.339844 " />
                    <path fill="currentColor" d="M 13.199219 8.207031 L 18.421875 2.386719 C 19.3125 1.496094 20.761719 1.496094 21.652344 2.386719 C 22.546875 3.277344 22.546875 4.726562 21.652344 5.621094 L 15.832031 10.84375 C 15.679688 10.980469 15.585938 11.179688 15.582031 11.386719 C 15.574219 11.59375 15.660156 11.796875 15.804688 11.945312 L 16.679688 12.820312 C 17.265625 13.414062 17.265625 14.371094 16.679688 14.96875 L 9.386719 22.261719 L 1.777344 14.65625 L 9.074219 7.359375 C 9.667969 6.773438 10.625 6.773438 11.21875 7.359375 L 12.097656 8.234375 C 12.242188 8.382812 12.445312 8.464844 12.65625 8.457031 C 12.859375 8.453125 13.058594 8.363281 13.199219 8.207031 Z M 13.199219 8.207031 " />
                </g>
            </svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "ColoredMessages",
    description: "Adds a new button to the message bar that allows you to insert colored code blocks into your messages!",
    authors: [Devs.Knocklive],
    dependencies: ["ChatInputButtonAPI"],

    start() {
        addChatBarButton("ColoredMessages", ChatBarIcon);
    },

    stop() {
        removeChatBarButton("ColoredMessages");
    },
});

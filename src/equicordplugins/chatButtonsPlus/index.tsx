/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, React, TextInput } from "@webpack/common";

type ButtonEntry = {
    id: string;
    label: string;
    message: string;
    svg: string;
    enabled: boolean;
};

let buttonEntries: ButtonEntry[] = [];
const BUTTON_ENTRIES_KEY = "ChatButtonsPlus_buttonEntries";

function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

async function handleButtonClick(context: string) {
    const currentChannel = getCurrentChannel();

    if (!currentChannel) return;

    sendMessage(currentChannel.id, { content: context });
}

async function addButtonEntry(forceUpdate: () => void) {
    try {
        buttonEntries.push({
            id: generateId(),
            label: "New Button",
            message: "Hello!",
            svg: '<path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>',
            enabled: true
        });
        await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
        forceUpdate();
    } catch (error) {
        console.error("ChatButtonsPlus: Failed to add button entry:", error);
    }
}

async function removeButtonEntry(id: string, forceUpdate: () => void) {
    try {
        const index = buttonEntries.findIndex(entry => entry.id === id);
        if (index !== -1) {
            buttonEntries.splice(index, 1);
            await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
            forceUpdate();
        }
    } catch (error) {
        console.error("ChatButtonsPlus: Failed to remove button entry:", error);
    }
}

async function resetAllButtons(forceUpdate: () => void) {
    try {
        buttonEntries.length = 0;
        await DataStore.set(BUTTON_ENTRIES_KEY, []);
        forceUpdate();
    } catch (error) {
        console.error("ChatButtonsPlus: Failed to reset buttons:", error);
    }
}

function ButtonEntries() {
    const update = useForceUpdater();

    React.useEffect(() => {
        const loadEntries = async () => {
            try {
                const storedEntries = await DataStore.get(BUTTON_ENTRIES_KEY) ?? [];
                buttonEntries = storedEntries;
                update();
            } catch (error) {
                console.error("ChatButtonsPlus: Failed to load entries:", error);
            }
        };
        loadEntries();
    }, []);

    async function setLabel(id: string, value: string) {
        try {
            const index = buttonEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                buttonEntries[index].label = value.trim() || "Button";
                await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
                update();
            }
        } catch (error) {
            console.error("ChatButtonsPlus: Failed to update label:", error);
        }
    }

    async function setMessage(id: string, value: string) {
        try {
            const index = buttonEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                buttonEntries[index].message = value;
                await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
                update();
            }
        } catch (error) {
            console.error("ChatButtonsPlus: Failed to update message:", error);
        }
    }

    async function setSvg(id: string, value: string) {
        try {
            const index = buttonEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                if (value.trim() === "" || isValidSvg(value.trim())) {
                    buttonEntries[index].svg = value.trim();
                    await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
                    update();
                }
            }
        } catch (error) {
            console.error("ChatButtonsPlus: Failed to update SVG:", error);
        }
    }

    async function setEnabled(id: string, value: boolean) {
        try {
            const index = buttonEntries.findIndex(entry => entry.id === id);
            if (index !== -1) {
                buttonEntries[index].enabled = value;
                await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
                update();
            }
        } catch (error) {
            console.error("ChatButtonsPlus: Failed to update enabled state:", error);
        }
    }

    function isValidSvg(svg: string): boolean {
        if (!svg) return true;

        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+=/i,
            /<iframe/i,
            /<object/i,
            /<embed/i,
            /<link/i,
            /<meta/i
        ];

        if (dangerousPatterns.some(pattern => pattern.test(svg))) {
            return false;
        }

        return svg.includes("<") && (
            svg.includes("path") ||
            svg.includes("svg") ||
            svg.includes("circle") ||
            svg.includes("rect") ||
            svg.includes("polygon") ||
            svg.includes("g")
        );
    }

    const elements = buttonEntries.map((entry, i) => {
        return (
            <div key={entry.id} className="chatButtonsPlus-card">
                <div className="chatButtonsPlus-header">
                    <Heading className="chatButtonsPlus-title">Button {i + 1}</Heading>
                    <div className="chatButtonsPlus-controls">
                        <FormSwitch
                            title="Enabled"
                            value={entry.enabled ?? true}
                            onChange={value => setEnabled(entry.id, value)}
                            className="chatButtonsPlus-toggle"
                        />
                        <Button
                            onClick={() => removeButtonEntry(entry.id, update)}
                            look={Button.Looks.FILLED}
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="chatButtonsPlus-field">
                    <Paragraph className="chatButtonsPlus-label">Button Label (Tooltip)</Paragraph>
                    <TextInput
                        placeholder="Button label/tooltip"
                        value={entry.label}
                        onChange={e => setLabel(entry.id, e)}
                    />
                </div>

                <div className="chatButtonsPlus-field">
                    <Paragraph className="chatButtonsPlus-label">Message to Send</Paragraph>
                    <textarea
                        className="chatButtonsPlus-textarea"
                        placeholder="Message to send when clicked"
                        value={entry.message}
                        onChange={e => setMessage(entry.id, e.target.value)}
                        rows={2}
                    />
                </div>

                <div className="chatButtonsPlus-field">
                    <Paragraph className="chatButtonsPlus-label">Custom SVG Path (24x24 viewBox)</Paragraph>
                    <textarea
                        className="chatButtonsPlus-textarea"
                        placeholder='<path fill="currentColor" d="..."/>'
                        value={entry.svg}
                        onChange={e => setSvg(entry.id, e.target.value)}
                        rows={3}
                    />
                    <Paragraph className="chatButtonsPlus-description">
                        Enter SVG path elements for a 24x24 viewBox. Use "currentColor" for the fill to match Discord's theme.
                    </Paragraph>
                </div>
            </div>
        );
    });

    return (
        <>
            {elements}
            <div className="chatButtonsPlus-actions">
                <Button onClick={() => addButtonEntry(update)}>Add Button</Button>
                <Button
                    onClick={() => resetAllButtons(update)}
                    look={Button.Looks.FILLED}
                    color={Button.Colors.RED}
                >
                    Reset All
                </Button>
            </div>
        </>
    );
}

const settings = definePluginSettings({
    buttons: {
        type: OptionType.COMPONENT,
        description: "Manage your custom chat buttons",
        component: () => <ButtonEntries />
    }
});

export default definePlugin({
    name: "ChatButtonsPlus",
    description: "Add custom chat buttons with personalized + messages and SVG icons",
    authors: [EquicordDevs.creations],
    settings,

    renderChatBarButton: ({ isMainChat }) => {
        if (!isMainChat) return null;

        return (
            <>
                {buttonEntries.filter(entry => entry.enabled !== false).map(entry => (
                    <ChatBarButton
                        key={entry.id}
                        tooltip={entry.label}
                        onClick={() => handleButtonClick(entry.message)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24">
                            <g dangerouslySetInnerHTML={{ __html: entry.svg }} />
                        </svg>
                    </ChatBarButton>
                ))}
            </>
        );
    },

    async start() {
        const storedEntries = await DataStore.get(BUTTON_ENTRIES_KEY) ?? [];
        await DataStore.set(BUTTON_ENTRIES_KEY, storedEntries);

        buttonEntries = storedEntries;
    }
});

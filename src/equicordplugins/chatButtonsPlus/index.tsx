/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { definePluginSettings, migratePluginSettings, Settings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { getCurrentChannel, sendMessage } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, Switch, TextInput } from "@webpack/common";

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
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

function ButtonEntries() {
    const update = useForceUpdater();

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
                buttonEntries[index].message = value.trim() || "Hello!";
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
            if (index !== -1 && isValidSvg(value.trim())) {
                buttonEntries[index].svg = value.trim();
                await DataStore.set(BUTTON_ENTRIES_KEY, buttonEntries);
                update();
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
                    <Forms.FormTitle tag="h5" className="chatButtonsPlus-title">Button {i + 1}</Forms.FormTitle>
                    <div className="chatButtonsPlus-controls">
                        <Switch
                            value={entry.enabled ?? true}
                            onChange={value => setEnabled(entry.id, value)}
                            className="chatButtonsPlus-toggle"
                        >
                            Enabled
                        </Switch>
                        <Button
                            onClick={() => removeButtonEntry(entry.id, update)}
                            look={Button.Looks.OUTLINED}
                            color={Button.Colors.RED}
                            size={Button.Sizes.SMALL}
                        >
                            Delete
                        </Button>
                    </div>
                </div>

                <div className="chatButtonsPlus-field">
                    <Forms.FormText className="chatButtonsPlus-label">Button Label (Tooltip)</Forms.FormText>
                    <TextInput
                        placeholder="Button label/tooltip"
                        value={entry.label}
                        onChange={e => setLabel(entry.id, e)}
                    />
                </div>

                <div className="chatButtonsPlus-field">
                    <Forms.FormText className="chatButtonsPlus-label">Message to Send</Forms.FormText>
                    <TextInput
                        placeholder="Message to send when clicked"
                        value={entry.message}
                        onChange={e => setMessage(entry.id, e)}
                    />
                </div>

                <div className="chatButtonsPlus-field">
                    <Forms.FormText className="chatButtonsPlus-label">Custom SVG Path (24x24 viewBox)</Forms.FormText>
                    <TextInput
                        placeholder='<path fill="currentColor" d="..."/>'
                        value={entry.svg}
                        onChange={e => setSvg(entry.id, e)}
                    />
                    <Forms.FormText className="chatButtonsPlus-description">
                        Enter SVG path elements for a 24x24 viewBox. Use "currentColor" for the fill to match Discord's theme.
                    </Forms.FormText>
                </div>
            </div>
        );
    });

    return (
        <>
            {elements}
            <Button onClick={() => addButtonEntry(update)}>Add Button</Button>
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

migratePluginSettings("ChatButtonsPlus", "Meow", "Woof");
export default definePlugin({
    name: "ChatButtonsPlus",
    description: "Add custom chat buttons with personalized + messages and SVG icons",
    authors:
        [EquicordDevs.creations],
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

        if (Settings.plugins?.Woof.enabled) {
            storedEntries.push({
                id: generateId(),
                label: "Woof",
                message: "Woof",
                svg: '<path fill="currentColor" d="M 12.898438 7.9375 L 13.863281 2.160156 C 13.941406 1.683594 14.355469 1.332031 14.835938 1.332031 C 15.148438 1.332031 15.441406 1.480469 15.628906 1.730469 L 16.332031 2.667969 L 18.503906 2.667969 C 19.035156 2.667969 19.542969 2.878906 19.917969 3.253906 L 20.667969 4 L 23 4 C 23.554688 4 24 4.445312 24 5 L 24 6 C 24 7.839844 22.507812 9.332031 20.667969 9.332031 L 17.777344 9.332031 L 17.566406 10.605469 Z M 17.332031 12.003906 L 17.332031 21.332031 C 17.332031 22.070312 16.738281 22.667969 16 22.667969 L 14.667969 22.667969 C 13.929688 22.667969 13.332031 22.070312 13.332031 21.332031 L 13.332031 16.535156 C 12.332031 17.046875 11.199219 17.332031 10 17.332031 C 8.800781 17.332031 7.667969 17.046875 6.667969 16.535156 L 6.667969 21.332031 C 6.667969 22.070312 6.070312 22.667969 5.332031 22.667969 L 4 22.667969 C 3.261719 22.667969 2.667969 22.070312 2.667969 21.332031 L 2.667969 11.742188 C 1.464844 11.289062 0.523438 10.269531 0.199219 8.972656 L 0.0429688 8.324219 C -0.136719 7.613281 0.296875 6.886719 1.011719 6.707031 C 1.730469 6.527344 2.449219 6.960938 2.628906 7.679688 L 2.792969 8.324219 C 2.9375 8.917969 3.472656 9.332031 4.082031 9.332031 L 12.660156 9.332031 Z M 19.332031 4.667969 C 19.332031 4.296875 19.035156 4 18.667969 4 C 18.296875 4 18 4.296875 18 4.667969 C 18 5.035156 18.296875 5.332031 18.667969 5.332031 C 19.035156 5.332031 19.332031 5.035156 19.332031 4.667969 "/>',
                enabled: true
            });

            Settings.plugins.Woof.enabled = false;
        }

        if (Settings.plugins?.Meow.enabled) {
            storedEntries.push({
                id: generateId(),
                label: "Meow",
                message: "Meow",
                svg: '<path fill="currentColor" d="M 13.332031 9 L 14.046875 9 C 14.964844 10.796875 16.691406 12 18.667969 12 C 19.125 12 19.574219 11.933594 20 11.8125 L 20 22.5 C 20 23.328125 19.402344 24 18.667969 24 C 17.929688 24 17.332031 23.328125 17.332031 22.5 L 17.332031 15.898438 L 11.667969 21 L 14 21 C 14.738281 21 15.332031 21.671875 15.332031 22.5 C 15.332031 23.328125 14.738281 24 14 24 L 8 24 C 5.792969 24 4 21.984375 4 19.5 L 4 9.023438 C 4 8.269531 3.5 7.625 2.832031 7.53125 L 2.503906 7.484375 C 1.773438 7.382812 1.253906 6.632812 1.347656 5.8125 C 1.4375 4.992188 2.105469 4.40625 2.832031 4.507812 L 3.164062 4.554688 C 5.164062 4.835938 6.667969 6.75 6.667969 9.023438 L 6.667969 13.023438 C 8.101562 10.597656 10.550781 9 13.332031 9 M 20 10.242188 C 19.582031 10.40625 19.132812 10.5 18.667969 10.5 C 17.484375 10.5 16.417969 9.917969 15.683594 9 C 15.527344 8.808594 15.390625 8.601562 15.269531 8.382812 C 14.886719 7.6875 14.667969 6.871094 14.667969 6 L 14.667969 0.5 C 14.667969 0.226562 14.863281 0.00390625 15.109375 0 L 15.117188 0 C 15.253906 0 15.382812 0.0742188 15.464844 0.195312 L 15.464844 0.203125 L 16 1 L 17.132812 2.699219 L 17.332031 3 L 20 3 L 20.199219 2.699219 L 21.332031 1 L 21.867188 0.203125 L 21.867188 0.195312 C 21.949219 0.0742188 22.078125 0 22.214844 0 L 22.226562 0 C 22.472656 0.00390625 22.667969 0.226562 22.667969 0.5 L 22.667969 6 C 22.667969 6.8125 22.476562 7.574219 22.140625 8.230469 C 21.671875 9.160156 20.910156 9.882812 20 10.242188 M 18 6 C 18 5.585938 17.703125 5.25 17.332031 5.25 C 16.964844 5.25 16.667969 5.585938 16.667969 6 C 16.667969 6.414062 16.964844 6.75 17.332031 6.75 C 17.703125 6.75 18 6.414062 18 6 M 20 6.75 C 20.367188 6.75 20.667969 6.414062 20.667969 6 C 20.667969 5.585938 20.367188 5.25 20 5.25 C 19.632812 5.25 19.332031 5.585938 19.332031 6 C 19.332031 6.414062 19.632812 6.75 20 6.75 "/>',
                enabled: true
            });

            Settings.plugins.Meow.enabled = false;
        }

        await DataStore.set(BUTTON_ENTRIES_KEY, storedEntries);

        buttonEntries = storedEntries;
    }
});

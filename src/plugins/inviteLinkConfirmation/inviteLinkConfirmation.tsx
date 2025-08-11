/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { openModal, ModalContent, ModalFooter, ModalHeader, ModalRoot } from "@utils/modal";
import { Button, Text } from "@webpack/common";

const MessageActions = findByPropsLazy("sendMessage", "editMessage");

// Default patterns as a constant for easy reset
const DEFAULT_PATTERNS = [
    "discord\\.gg\\/[a-zA-Z0-9]+",
    "discordapp\\.com\\/invite\\/[a-zA-Z0-9]+",
    "discord\\.com\\/invite\\/[a-zA-Z0-9]+",
    "https?:\\/\\/(www\\.)?(discord\\.gg|discordapp\\.com\\/invite|discord\\.com\\/invite)\\/[a-zA-Z0-9]+"
];

const settings = definePluginSettings({
    enabled: {
        description: "Enable invite link confirmation",
        type: OptionType.BOOLEAN,
        default: true,
    },
    customMessage: {
        description: "Custom confirmation message",
        type: OptionType.STRING,
        default: "You're about to send a Discord invite link. Are you sure you want to send it?",
    },
    patterns: {
        description: "Regex patterns to match invite links (separate with semicolons)",
        type: OptionType.STRING,
        default: DEFAULT_PATTERNS.join('; '),
        placeholder: "pattern1; pattern2; pattern3..."
    },
    resetPatterns: {
        description: "Reset patterns to default",
        type: OptionType.COMPONENT,
        component: () => (
            <Button
                size={Button.Sizes.SMALL}
                color={Button.Colors.PRIMARY}
                onClick={() => {
                    settings.store.patterns = DEFAULT_PATTERNS.join('; ');
                }}
            >
                Reset to Default
            </Button>
        )
    }
});

function getPatterns() {
    const patternsText = settings.store.patterns || DEFAULT_PATTERNS.join('; ');
    return patternsText
        .split(';')
        .map(pattern => pattern.trim())
        .filter(pattern => pattern.length > 0)
        .map(pattern => {
            try {
                return new RegExp(pattern, 'gi');
            } catch (e) {
                console.warn(`Invalid regex pattern: ${pattern}`, e);
                return null;
            }
        })
        .filter(Boolean);
}

function containsDiscordInvite(message) {
    if (!message || typeof message !== 'string') return false;

    const patterns = getPatterns();
    
    return patterns.some(pattern => {
        pattern.lastIndex = 0; // Reset regex state
        return pattern.test(message);
    });
}

export default definePlugin({
    name: "InviteLinkConfirmation",
    description: "Asks for confirmation before sending messages containing Discord invite links",
    authors: [Devs.Byakuran],
    settings,

    start() {
        console.log("InviteLinkConfirmation plugin started");

        // Backup original sendMessage function
        if (MessageActions?.sendMessage) {
            this.originalSendMessage = MessageActions.sendMessage;

            // Override with our interceptor
            MessageActions.sendMessage = async (channelId, message, ...args) => {
                // Check if plugin is enabled
                if (!settings.store.enabled) {
                    return this.originalSendMessage(channelId, message, ...args);
                }

                const messageContent = message?.content || "";

                // Check if message contains Discord invite links
                if (containsDiscordInvite(messageContent)) {
                    console.log("Discord invite detected in message:", messageContent);

                    // Show confirmation modal
                    const confirmed = await new Promise((resolve) => {
                        openModal((props) => (
                            <ModalRoot {...props}>
                                <ModalHeader>
                                    <Text variant="heading-lg/semibold">Confirm Invite Link</Text>
                                </ModalHeader>
                                <ModalContent>
                                    <Text>{settings.store.customMessage}</Text>
                                </ModalContent>
                                <ModalFooter>
                                    <Button
                                        color={Button.Colors.BRAND}
                                        onClick={() => {
                                            props.onClose();
                                            resolve(true);
                                        }}
                                    >
                                        Yes
                                    </Button>
                                    <Button
                                        color={Button.Colors.TRANSPARENT}
                                        onClick={() => {
                                            props.onClose();
                                            resolve(false);
                                        }}
                                    >
                                        No
                                    </Button>
                                </ModalFooter>
                            </ModalRoot>
                        ));
                    });

                    if (!confirmed) {
                        console.log("User cancelled sending invite link");
                        return; // Don't send the message
                    }

                    console.log("User confirmed sending invite link");
                }

                // Send the message (either no invite found, or user confirmed)
                return this.originalSendMessage(channelId, message, ...args);
            };

            console.log("sendMessage function hooked successfully for invite link checking");
        } else {
            console.log("Could not find MessageActions.sendMessage");
        }
    },

    stop() {
        console.log("InviteLinkConfirmation plugin stopped");

        // Restore original function
        if (this.originalSendMessage) {
            MessageActions.sendMessage = this.originalSendMessage;
        }
    }
});
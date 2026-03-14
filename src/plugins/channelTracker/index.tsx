/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { ColorPicker, Forms, Tooltip, UserStore } from "@webpack/common";

interface InteractionData {
    viewed: boolean;
    messaged: boolean;
}

type InteractionMap = Record<string, InteractionData>;

const DATASTORE_KEY = "ChannelTracker_data";

let interactions: InteractionMap = {};

async function loadInteractions() {
    interactions = await DataStore.get<InteractionMap>(DATASTORE_KEY) ?? {};
}

async function saveInteractions() {
    await DataStore.set(DATASTORE_KEY, interactions);
}

function getInteraction(channelId: string): InteractionData {
    return interactions[channelId] ?? { viewed: false, messaged: false };
}

function markViewed(channelId: string) {
    if (!channelId) return;
    const data = getInteraction(channelId);
    if (!data.viewed) {
        interactions[channelId] = { ...data, viewed: true };
        saveInteractions();
    }
}

function markMessaged(channelId: string) {
    if (!channelId) return;
    const data = getInteraction(channelId);
    if (!data.messaged) {
        interactions[channelId] = { ...data, messaged: true };
        saveInteractions();
    }
}

function ColorPickerSetting({ settingKey, label }: { settingKey: "viewedIconColor" | "messagedIconColor" | "defaultIconColor"; label: string; }) {
    const color = parseInt(settings.store[settingKey], 16);
    return (
        <div style={{ marginBottom: "1em" }}>
            <Forms.FormTitle tag="h3">{label}</Forms.FormTitle>
            <ColorPicker
                color={color}
                onChange={(c: number) => {
                    settings.store[settingKey] = c.toString(16).padStart(6, "0");
                }}
                showEyeDropper={false}
            />
        </div>
    );
}

const settings = definePluginSettings({
    showViewedIcon: {
        type: OptionType.BOOLEAN,
        description: "Show the eye icon for viewed channels",
        default: true
    },
    viewedIconColor: {
        type: OptionType.COMPONENT,
        description: "Color of the viewed (eye) icon",
        default: "ffffff",
        component: () => <ColorPickerSetting settingKey="viewedIconColor" label="Viewed Icon Color" />
    },
    showMessagedIcon: {
        type: OptionType.BOOLEAN,
        description: "Show the pen icon for channels you sent a message in",
        default: true
    },
    messagedIconColor: {
        type: OptionType.COMPONENT,
        description: "Color of the messaged (pen) icon",
        default: "ffffff",
        component: () => <ColorPickerSetting settingKey="messagedIconColor" label="Messaged Icon Color" />
    },
    showBothIcons: {
        type: OptionType.BOOLEAN,
        description: "Show both viewed and messaged icons at the same time if both apply (instead of only the messaged icon)",
        default: false
    },
    showDefaultIcon: {
        type: OptionType.BOOLEAN,
        description: "Show a default icon on channels you haven't interacted with",
        default: false
    },
    defaultIconColor: {
        type: OptionType.COMPONENT,
        description: "Color of the default (no interaction) icon",
        default: "808080",
        component: () => <ColorPickerSetting settingKey="defaultIconColor" label="Default Icon Color" />
    },
});

function InteractionIcons({ channelId }: { channelId: string; }) {
    const data = getInteraction(channelId);
    const hasInteraction = data.viewed || data.messaged;

    if (!hasInteraction && !settings.store.showDefaultIcon) return null;

    const showViewed = settings.store.showViewedIcon && data.viewed
        && (!data.messaged || !settings.store.showMessagedIcon || settings.store.showBothIcons);
    const showMessaged = settings.store.showMessagedIcon && data.messaged;
    const showDefault = settings.store.showDefaultIcon && !hasInteraction;

    return (
        <span className="vc-cit-icons">
            {showDefault && (
                <Tooltip text="Not interacted">
                    {props => (
                        <span {...props} className="vc-cit-icon" style={{ color: `#${settings.store.defaultIconColor}` }} aria-label="Not interacted">
                            ○
                        </span>
                    )}
                </Tooltip>
            )}
            {showViewed && (
                <Tooltip text="Viewed">
                    {props => (
                        <span {...props} className="vc-cit-icon" style={{ color: `#${settings.store.viewedIconColor}` }} aria-label="Viewed">
                            👁
                        </span>
                    )}
                </Tooltip>
            )}
            {showMessaged && (
                <Tooltip text="Sent a message">
                    {props => (
                        <span {...props} className="vc-cit-icon" style={{ color: `#${settings.store.messagedIconColor}` }} aria-label="Sent a message">
                            ✏
                        </span>
                    )}
                </Tooltip>
            )}
        </span>
    );
}

export default definePlugin({
    name: "ChannelTracker",
    description: "Tracks your channel interactions.",
    authors: [Devs.paxe],
    settings,

    patches: [
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.renderIcons($1.id)"
            }
        }
    ],

    renderIcons: (channelId: string) => (
        <ErrorBoundary noop>
            <InteractionIcons channelId={channelId} />
        </ErrorBoundary>
    ),

    flux: {
        CHANNEL_SELECT({ channelId }: { channelId: string | null; }) {
            if (channelId) {
                markViewed(channelId);
            }
        },

        MESSAGE_CREATE({ message, optimistic }: { message: { channel_id: string; author: { id: string; }; }; optimistic: boolean; }) {
            if (optimistic) return;
            const currentUserId = UserStore.getCurrentUser()?.id;
            if (message.author.id === currentUserId) {
                markMessaged(message.channel_id);
            }
        }
    },

    async start() {
        await loadInteractions();
    },

    stop() { }
});

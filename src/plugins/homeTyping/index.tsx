/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findComponentByCodeLazy, findStoreLazy } from "@webpack";
import { ColorPicker, Forms, NavigationRouter, SelectedChannelStore, Select, Slider, TypingStore, UserStore, useStateFromStores } from "@webpack/common";

const ThreeDots = findComponentByCodeLazy("Math.min(1,Math.max(", "dotRadius:");

const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore") as { getPrivateChannelIds: () => string[]; };


const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938", "#b6908f", "#bfa088", "#d3c77d",
    "#86ac86", "#88aab3", "#8693b5", "#8a89ba", "#ad94bb",
];


function relativeLuminance(hexCode: string) {
    const normalize = (x: number) => (
        x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    );

    const r = normalize(parseInt(hexCode.substring(0, 2), 16) / 255);
    const g = normalize(parseInt(hexCode.substring(2, 4), 16) / 255);
    const b = normalize(parseInt(hexCode.substring(4, 6), 16) / 255);

    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function getTextColor(bgHex: string) {
    const luminance = relativeLuminance(bgHex);
    return luminance > 0.5 ? "#000000" : "#ffffff";
}

function getSecondaryTextColor(bgHex: string) {
    const luminance = relativeLuminance(bgHex);
    return luminance > 0.5 ? "#666666" : "#b9bbbe";
}


function NotificationSettingsComponent() {
    const onPickColor = (color: number) => {
        const hexColor = color.toString(16).padStart(6, "0");
        settings.store.notificationColor = hexColor;
        updateNotificationStyles();
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
            <div>
                <Forms.FormTitle tag="h3">Notification Background Color</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "0.5em" }}>Choose a color for your typing notifications</Forms.FormText>
                <ColorPicker
                    color={parseInt(settings.store.notificationColor, 16)}
                    onChange={onPickColor}
                    showEyeDropper={false}
                    suggestedColors={colorPresets}
                />
            </div>

            <div>
                <Forms.FormTitle tag="h3">Notification Position</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "0.5em" }}>Choose preset position or use custom coordinates below</Forms.FormText>
                <Select
                    options={[
                        { label: "Top Right", value: "top-right" },
                        { label: "Top Left", value: "top-left" },
                        { label: "Bottom Right", value: "bottom-right" },
                        { label: "Bottom Left", value: "bottom-left" },
                        { label: "Custom Position", value: "custom" },
                    ]}
                    isSelected={(value: string) => value === settings.store.notificationPosition}
                    select={(value: string) => {
                        settings.store.notificationPosition = value;
                        updateNotificationStyles();
                    }}
                    serialize={(value: string) => value}
                />
            </div>

            {settings.store.notificationPosition === "custom" && (
                <>
                    <div>
                        <Forms.FormTitle tag="h3">Custom Position - X (Horizontal)</Forms.FormTitle>
                        <Forms.FormText style={{ marginBottom: "0.5em" }}>Distance from left edge (in pixels, 0-2000)</Forms.FormText>
                        <Slider
                            initialValue={settings.store.customX}
                            onValueChange={(value: number) => {
                                settings.store.customX = value;
                                updateNotificationStyles();
                            }}
                            minValue={0}
                            maxValue={2000}
                            markers={[0, 500, 1000, 1500, 2000]}
                            stickToMarkers={false}
                            onValueRender={(value: number) => `${value}px`}
                        />
                    </div>

                    <div>
                        <Forms.FormTitle tag="h3">Custom Position - Y (Vertical)</Forms.FormTitle>
                        <Forms.FormText style={{ marginBottom: "0.5em" }}>Distance from top edge (in pixels, 0-1500)</Forms.FormText>
                        <Slider
                            initialValue={settings.store.customY}
                            onValueChange={(value: number) => {
                                settings.store.customY = value;
                                updateNotificationStyles();
                            }}
                            minValue={0}
                            maxValue={1500}
                            markers={[0, 375, 750, 1125, 1500]}
                            stickToMarkers={false}
                            onValueRender={(value: number) => `${value}px`}
                        />
                    </div>
                </>
            )}

            <div>
                <Forms.FormTitle tag="h3">Notification Size</Forms.FormTitle>
                <Forms.FormText style={{ marginBottom: "0.5em" }}>Scale the size of notifications (50% - 150%)</Forms.FormText>
                <Slider
                    initialValue={settings.store.notificationSize}
                    onValueChange={(value: number) => {
                        settings.store.notificationSize = value;
                        updateNotificationStyles();
                    }}
                    minValue={50}
                    maxValue={150}
                    markers={[50, 75, 100, 125, 150]}
                    stickToMarkers={false}
                    onValueRender={(value: number) => `${value}%`}
                />
            </div>
        </div>
    );
}

function ResetNotificationSettingsComponent() {
    return (
        <button
            onClick={() => {
                settings.store.notificationColor = "2b2d31";
                settings.store.notificationSize = 100;
                settings.store.notificationPosition = "top-right";
                settings.store.customX = 20;
                settings.store.customY = 80;
                updateNotificationStyles();
            }}
            style={{
                padding: "10px 16px",
                backgroundColor: "var(--button-danger-background)",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: 500,
            }}
        >
            Reset Settings
        </button>
    );
}

const settings = definePluginSettings({
    showNotifications: {
        type: OptionType.BOOLEAN,
        description: "Show typing notifications popup",
        default: true,
    },
    notificationColor: {
        type: OptionType.COMPONENT,
        description: "",
        default: "2b2d31",
        component: NotificationSettingsComponent
    },
    notificationPosition: {
        type: OptionType.STRING,
        description: "Position of notifications",
        default: "top-right",
        hidden: true
    },
    customX: {
        type: OptionType.NUMBER,
        description: "Custom X position (pixels from left)",
        default: 20,
        hidden: true
    },
    customY: {
        type: OptionType.NUMBER,
        description: "Custom Y position (pixels from top)",
        default: 80,
        hidden: true
    },
    notificationSize: {
        type: OptionType.NUMBER,
        description: "Size of notifications",
        default: 100,
        hidden: true
    },
    maxNotifications: {
        type: OptionType.NUMBER,
        description: "Maximum number of notifications to show at once",
        default: 3,
    },
    resetSettings: {
        type: OptionType.COMPONENT,
        description: "",
        component: ResetNotificationSettingsComponent
    }
});

interface TypingUser {
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    channelId: string;
}

let notificationContainer: HTMLDivElement | null = null;
let updateInterval: any = null;

function generateNotificationCSS() {
    const bgColor = settings.store.notificationColor;
    const textColor = getTextColor(bgColor);
    const secondaryTextColor = getSecondaryTextColor(bgColor);
    const scale = settings.store.notificationSize / 100;
    const position = settings.store.notificationPosition;


    let positionCSS = "";
    if (position === "custom") {
        positionCSS = `
.vc-typing-notifications-container.custom {
    top: ${settings.store.customY}px;
    left: ${settings.store.customX}px;
}`;
    } else {
        positionCSS = `
.vc-typing-notifications-container.top-right {
    top: 80px;
    right: 20px;
}

.vc-typing-notifications-container.top-left {
    top: 80px;
    left: 20px;
}

.vc-typing-notifications-container.bottom-right {
    bottom: 20px;
    right: 20px;
}

.vc-typing-notifications-container.bottom-left {
    bottom: 20px;
    left: 20px;
}`;
    }

    return `
.vc-typing-notifications-container {
    position: fixed;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: ${8 * scale}px;
}

${positionCSS}

.vc-typing-notification {
    display: flex;
    align-items: center;
    gap: ${12 * scale}px;
    padding: ${12 * scale}px ${16 * scale}px;
    background-color: #${bgColor};
    border-radius: ${8 * scale}px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    cursor: pointer;
    min-width: ${280 * scale}px;
    max-width: ${340 * scale}px;
    transition: all 0.2s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: vc-typing-slide-in 0.3s ease-out;
}

.vc-typing-notification:hover {
    filter: brightness(1.15);
    transform: translateX(${-4 * scale}px);
}

.vc-typing-notifications-container.top-left .vc-typing-notification:hover,
.vc-typing-notifications-container.bottom-left .vc-typing-notification:hover {
    transform: translateX(${4 * scale}px);
}

.vc-typing-notification-avatar {
    width: ${48 * scale}px;
    height: ${48 * scale}px;
    border-radius: 50%;
    flex-shrink: 0;
}

.vc-typing-notification-content {
    flex: 1;
    min-width: 0;
}

.vc-typing-notification-name {
    color: ${textColor} !important;
    font-weight: 600;
    font-size: ${15 * scale}px;
    margin-bottom: ${4 * scale}px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.vc-typing-notification-status {
    color: ${secondaryTextColor};
    font-size: ${13 * scale}px;
    display: flex;
    align-items: center;
    gap: ${4 * scale}px;
}

.vc-typing-dots {
    display: inline-block;
    width: ${20 * scale}px;
    text-align: left;
}

.vc-typing-dots::after {
    content: '';
    animation: vc-typing-dots-animation 1.5s infinite;
}

@keyframes vc-typing-dots-animation {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
    100% { content: ''; }
}

@keyframes vc-typing-slide-in {
    from {
        opacity: 0;
        transform: translateX(${20 * scale}px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.vc-typing-notifications-container.top-left .vc-typing-notification,
.vc-typing-notifications-container.bottom-left .vc-typing-notification {
    animation: vc-typing-slide-in-left 0.3s ease-out;
}

@keyframes vc-typing-slide-in-left {
    from {
        opacity: 0;
        transform: translateX(${-20 * scale}px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}
`;
}

function updateNotificationStyles() {
    let styleElement = document.getElementById("vc-typing-notifications-css") as HTMLStyleElement;

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "vc-typing-notifications-css";
        document.head.appendChild(styleElement);
    }

    styleElement.textContent = generateNotificationCSS();
}

function getTypingUsers(): TypingUser[] {
    const currentUserId = UserStore.getCurrentUser()?.id;
    if (!currentUserId) return [];

    const typingUsers: TypingUser[] = [];
    const channelIds = PrivateChannelSortStore.getPrivateChannelIds();

    for (const channelId of channelIds) {
        const typing = TypingStore.getTypingUsers(channelId);
        const userIds = Object.keys(typing);

        for (const userId of userIds) {
            if (userId !== currentUserId) {
                const user = UserStore.getUser(userId);
                if (user) {
                    typingUsers.push({
                        userId,
                        username: user.username,
                        displayName: user.globalName || user.username,
                        avatarUrl: user.getAvatarURL(undefined, 128, true),
                        channelId
                    });
                }
            }
        }
    }

    return typingUsers.slice(0, settings.store.maxNotifications);
}

function createNotificationElement(user: TypingUser) {
    const notification = document.createElement("div");
    notification.className = "vc-typing-notification";
    notification.dataset.userId = user.userId;
    notification.dataset.channelId = user.channelId;

    notification.addEventListener("click", () => {

        notification.style.opacity = "0";
        notification.style.transition = "opacity 0.2s";
        setTimeout(() => notification.remove(), 200);


        NavigationRouter.transitionTo(`/channels/@me/${user.channelId}`);
    });

    const avatar = document.createElement("img");
    avatar.className = "vc-typing-notification-avatar";
    avatar.src = user.avatarUrl;
    avatar.alt = user.displayName;

    const content = document.createElement("div");
    content.className = "vc-typing-notification-content";

    const name = document.createElement("div");
    name.className = "vc-typing-notification-name";
    name.textContent = user.displayName;

    const status = document.createElement("div");
    status.className = "vc-typing-notification-status";

    const typingText = document.createElement("span");
    typingText.textContent = "is typing";

    const dots = document.createElement("span");
    dots.className = "vc-typing-dots";

    status.appendChild(typingText);
    status.appendChild(dots);

    content.appendChild(name);
    content.appendChild(status);

    notification.appendChild(avatar);
    notification.appendChild(content);

    return notification;
}

function updateNotifications() {
    if (!notificationContainer) return;


    notificationContainer.className = `vc-typing-notifications-container ${settings.store.notificationPosition}`;

    if (!settings.store.showNotifications) {
        notificationContainer.innerHTML = "";
        return;
    }


    const selectedChannelId = SelectedChannelStore.getChannelId();

    const typingUsers = getTypingUsers();
    const existingIds = new Set(
        Array.from(notificationContainer.children).map(
            (el: any) => el.dataset.userId
        )
    );
    const newIds = new Set(typingUsers.map(u => u.userId));


    Array.from(notificationContainer.children).forEach((child: any) => {
        const shouldRemove = !newIds.has(child.dataset.userId) ||
            child.dataset.channelId === selectedChannelId;
        if (shouldRemove) {
            child.style.opacity = "0";
            child.style.transition = "opacity 0.2s";
            setTimeout(() => child.remove(), 200);
        }
    });


    typingUsers.forEach(user => {
        if (!existingIds.has(user.userId) && user.channelId !== selectedChannelId) {
            const notification = createNotificationElement(user);
            notificationContainer!.appendChild(notification);
        }
    });
}

function createContainer() {
    if (notificationContainer) return;

    notificationContainer = document.createElement("div");
    notificationContainer.className = `vc-typing-notifications-container ${settings.store.notificationPosition}`;
    document.body.appendChild(notificationContainer);
}

function removeContainer() {
    if (notificationContainer) {
        notificationContainer.remove();
        notificationContainer = null;
    }
}

export default definePlugin({
    name: "HomeTyping",
    description: "Changes the home button to a typing indicator if someone in your dms is typing, and shows typing notifications",
    authors: [Devs.cute],
    settings,

    TypingIcon() {
        return <ThreeDots dotRadius={3} themed={true} />;
    },

    isTyping() {
        return useStateFromStores([TypingStore], () =>
            PrivateChannelSortStore.getPrivateChannelIds().some(id =>
                Object.keys(TypingStore.getTypingUsers(id)).some(userId => userId !== UserStore.getCurrentUser().id)
            )
        );
    },

    patches: [
        {
            find: "#{intl::DISCODO_DISABLED}",
            replacement: [
                {
                    match: /(\(0,\i.jsx\)\(\i.\i,{}\))/,
                    replace: "arguments[0].user == null ? null : (vcIsTyping ? $self.TypingIcon() : $1)"
                },
                {
                    match: /if\(null==\i\)return null;/,
                    replace: "let vcIsTyping = $self.isTyping();$&"
                }
            ],
            group: true
        }
    ],

    start() {

        updateNotificationStyles();


        createContainer();


        updateInterval = setInterval(updateNotifications, 100);
    },

    stop() {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }

        removeContainer();


        const styleElement = document.getElementById("vc-typing-notifications-css");
        if (styleElement) {
            styleElement.remove();
        }
    }
});

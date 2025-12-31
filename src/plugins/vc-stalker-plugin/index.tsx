import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType, PluginDef } from "@utils/types";
import { Menu, Toasts, UserStore, MessageStore, RestAPI, ChannelStore } from "@webpack/common";
import { findByProps } from "@webpack";
import { getCurrentChannel, openUserProfile } from "@utils/discord";
import { Notifications } from "@api/index";
import { Message } from "discord-types/general";
import { MessageCreatePayload, MessageUpdatePayload, MessageDeletePayload, TypingStartPayload, UserUpdatePayload, ThreadCreatePayload, VoiceStateUpdatePayload } from "./types";
import { addToWhitelist, isInWhitelist, logger, removeFromWhitelist, convertSnakeCaseToCamelCase } from "./utils";
import { React } from "@webpack/common";
import { Devs } from "@utils/constants";

// TypeScript declaration for global window objects
declare global {
    interface Window {
        BdApi?: any;
        Vencord?: any;
    }
}

// Simple DOM notification panel
let notificationPanel: HTMLDivElement | null = null;

interface NotificationItem {
    id: string;
    title: string;
    body: string;
    icon: string;
    timestamp: number;
    onClick: () => void;
    type: "message" | "edit" | "delete" | "typing" | "profile" | "thread" | "voice";
    userId: string;
    guildName?: string;
    channelName?: string;
    serverLink?: string;
    channelLink?: string;
}

let notifications: NotificationItem[] = [];

// Add a new notification
function addNotification(notification: NotificationItem) {
    notifications.unshift(notification);

    // Limit stored notifications (e.g., 100)
    if (notifications.length > 100) {
        notifications = notifications.slice(0, 100);
    }

    // Always log notifications for debugging
    logger.info(`New notification: ${notification.title} - Type: ${notification.type}`);

    try {
        // Build notification text with server and channel links
        let notificationBody = notification.body;
        if (notification.guildName) {
            notificationBody = `${notificationBody}\nServer: ${notification.guildName}`;
        }
        if (notification.channelName) {
            notificationBody = `${notificationBody}\nChannel: ${notification.channelName}`;
        }

        // Send system notification
        Notifications.showNotification({
            title: notification.title,
            body: notificationBody,
            onClick: notification.onClick,
            icon: notification.icon
        });

        // If the notification panel is open, update it
        updateNotificationPanel();
    } catch (err) {
        logger.error("Error showing notification:", err);
    }
}

async function importLoggedMessages() {
    let module;
    try {
        // @ts-ignore
        module = await import("plugins/vc-message-logger-enhanced/LoggedMessageManager");
    } catch {
        try {
            // @ts-ignore
            module = await import("userplugins/vc-message-logger-enhanced/LoggedMessageManager");
        } catch {
            console.error("Failed to load loggedMessages from both 'plugins' and 'userplugins' directories.");
        }
    }
    return module ? module.loggedMessages : null;
}

// Get server and channel information
function getServerAndChannelInfo(guildId?: string | null, channelId?: string | null) {
    let serverLink = "";
    let channelLink = "";
    let guildName = "Direct Message";
    let channelName = "";

    try {
        if (guildId && channelId) {
            // روابط منتظمة للسيرفر والقناة
            serverLink = `https://discord.com/channels/${guildId}`;
            channelLink = `https://discord.com/channels/${guildId}/${channelId}`;

            // الحصول على اسم السيرفر
            let guild: any = null;
            try {
                const getGuildModule = findByProps("getGuild");
                if (getGuildModule && typeof getGuildModule.getGuild === 'function') {
                    guild = getGuildModule.getGuild(guildId);
                }
            } catch (e) {
                logger.error(`Error getting guild info for ${guildId}:`, e);
            }

            if (guild && guild.name) {
                guildName = guild.name;
            } else {
                guildName = guildId; // استخدام معرف السيرفر إذا لم نستطع الحصول على الاسم
            }

            // الحصول على اسم القناة
            let channel: any = null;
            try {
                if (ChannelStore && typeof ChannelStore.getChannel === 'function') {
                    channel = ChannelStore.getChannel(channelId);
                }
            } catch (e) {
                logger.error(`Error getting channel info for ${channelId}:`, e);
            }

            if (channel && channel.name) {
                channelName = channel.name;
            } else {
                channelName = `Channel ${channelId}`; // استخدام معرف القناة إذا لم نستطع الحصول على الاسم
            }
        } else if (channelId) {
            // قنوات DM
            serverLink = `https://discord.com/channels/@me`;
            channelLink = `https://discord.com/channels/@me/${channelId}`;

            let channel: any = null;
            try {
                if (ChannelStore && typeof ChannelStore.getChannel === 'function') {
                    channel = ChannelStore.getChannel(channelId);
                }
            } catch (e) {
                logger.error(`Error getting DM channel info for ${channelId}:`, e);
            }

            if (channel) {
                // محاولة الحصول على اسم القناة الخاصة
                if (channel.name) {
                    channelName = channel.name;
                } else if (channel.recipients && Array.isArray(channel.recipients) && channel.recipients.length) {
                    // لـ DMs، حاول الحصول على اسماء المستخدمين
                    try {
                        const recipients = channel.recipients.map((id: string) => {
                            const user = UserStore.getUser(id);
                            return user ? (user.globalName || user.username) : id;
                        });
                        channelName = recipients.join(", ");
                    } catch (e) {
                        channelName = "Private Message";
                    }
                } else {
                    channelName = "Private Message";
                }
            } else {
                channelName = "Private Message";
            }
        }
    } catch (err) {
        logger.error("Error getting server and channel info:", err);
    }

    return {
        serverLink,
        channelLink,
        guildName,
        channelName
    };
}

// Create and display a DOM-based notification panel
function createNotificationPanel() {
    try {
        // Remove any existing panel
        if (notificationPanel) {
            document.body.removeChild(notificationPanel);
            notificationPanel = null;
        }

        // Create container
        const panel = document.createElement('div');
        panel.className = 'vc-stalker-panel';
        panel.style.position = 'fixed';
        panel.style.top = '50%';
        panel.style.left = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
        panel.style.width = '600px';
        panel.style.maxHeight = '80vh';
        panel.style.backgroundColor = '#2f3136';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
        panel.style.zIndex = '9999';
        panel.style.display = 'flex';
        panel.style.flexDirection = 'column';

        // Create header
        const header = document.createElement('div');
        header.style.padding = '16px';
        header.style.borderBottom = '1px solid #202225';
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';

        // Add title
        const title = document.createElement('h3');
        title.textContent = 'User Tracker';
        title.style.margin = '0';
        title.style.color = '#ffffff';
        title.style.fontSize = '16px';

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = '#ffffff';
        closeButton.style.fontSize = '24px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.padding = '0 8px';
        closeButton.onclick = () => {
            if (notificationPanel) {
                document.body.removeChild(notificationPanel);
                notificationPanel = null;
            }
        };

        // Add search box
        const searchContainer = document.createElement('div');
        searchContainer.style.padding = '8px 16px';
        searchContainer.style.borderBottom = '1px solid #202225';

        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search notifications...';
        searchInput.style.width = '100%';
        searchInput.style.padding = '8px 12px';
        searchInput.style.backgroundColor = '#40444b';
        searchInput.style.border = 'none';
        searchInput.style.borderRadius = '4px';
        searchInput.style.color = '#ffffff';
        searchInput.style.fontSize = '14px';
        searchInput.oninput = () => updateNotificationList(searchInput.value);

        // Create content area
        const content = document.createElement('div');
        content.className = 'vc-stalker-panel-content';
        content.style.padding = '8px 16px';
        content.style.overflowY = 'auto';
        content.style.maxHeight = 'calc(80vh - 120px)';

        // Assemble the panel
        header.appendChild(title);
        header.appendChild(closeButton);
        panel.appendChild(header);
        searchContainer.appendChild(searchInput);
        panel.appendChild(searchContainer);
        panel.appendChild(content);

        // Add to document
        document.body.appendChild(panel);
        notificationPanel = panel;

        // Initial population
        updateNotificationList();

        // Log the number of notifications for debugging
        logger.info(`Showing ${notifications.length} notifications in panel`);
    } catch (err) {
        logger.error("Error creating notification panel:", err);
        Toasts.show({
            type: Toasts.Type.FAILURE,
            message: "Failed to open tracker panel",
            id: Toasts.genId()
        });
    }
}

// Update the notification list in the panel
function updateNotificationList(filterText = '') {
    if (!notificationPanel) return;

    const content = notificationPanel.querySelector('.vc-stalker-panel-content');
    if (!content) return;

    // Clear content
    content.innerHTML = '';

    if (notifications.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.textContent = 'No notifications to display';
        emptyMsg.style.padding = '16px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#aaaaaa';
        content.appendChild(emptyMsg);
        return;
    }

    // Filter notifications
    const filteredNotifications = filterText
        ? notifications.filter(n =>
            n.title.toLowerCase().includes(filterText.toLowerCase()) ||
            (n.body && n.body.toLowerCase().includes(filterText.toLowerCase())) ||
            (n.guildName && n.guildName.toLowerCase().includes(filterText.toLowerCase())) ||
            (n.channelName && n.channelName.toLowerCase().includes(filterText.toLowerCase()))
        )
        : notifications;

    // Create notification items
    filteredNotifications.forEach(notif => {
        const itemContainer = document.createElement('div');
        itemContainer.style.backgroundColor = '#36393f';
        itemContainer.style.borderRadius = '4px';
        itemContainer.style.marginBottom = '8px';
        itemContainer.style.padding = '12px';

        // Header with icon and title
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.marginBottom = '8px';

        if (notif.icon) {
            const iconImg = document.createElement('img');
            iconImg.src = notif.icon;
            iconImg.style.width = '24px';
            iconImg.style.height = '24px';
            iconImg.style.borderRadius = '50%';
            iconImg.style.marginRight = '8px';
            header.appendChild(iconImg);
        }

        const titleEl = document.createElement('div');
        titleEl.textContent = notif.title;
        titleEl.style.fontWeight = 'bold';
        titleEl.style.color = '#ffffff';

        const timeEl = document.createElement('div');
        timeEl.textContent = new Date(notif.timestamp).toLocaleTimeString();
        timeEl.style.marginLeft = 'auto';
        timeEl.style.fontSize = '12px';
        timeEl.style.color = '#aaaaaa';

        header.appendChild(titleEl);
        header.appendChild(timeEl);
        itemContainer.appendChild(header);

        // Body with formatted links
        if (notif.body) {
            const bodyEl = document.createElement('div');
            bodyEl.style.margin = '8px 0';
            bodyEl.style.color = '#dcddde';
            bodyEl.style.whiteSpace = 'pre-line';

            // Split into lines and format
            const bodyLines = notif.body.split('\n');
            bodyLines.forEach((line, index) => {
                if (index > 0) {
                    bodyEl.appendChild(document.createElement('br'));
                }

                if (line.startsWith('Server: ') && notif.serverLink) {
                    const text = document.createTextNode('Server: ');
                    bodyEl.appendChild(text);

                    const link = document.createElement('a');
                    link.textContent = line.substring('Server: '.length);
                    link.href = notif.serverLink;
                    link.style.color = '#00b0f4';
                    link.style.textDecoration = 'none';
                    link.onclick = (e) => {
                        e.preventDefault();
                        window.open(notif.serverLink, '_blank');
                    };
                    bodyEl.appendChild(link);
                }
                else if ((line.startsWith('Voice Channel: ') || line.startsWith('Channel: ') || line.startsWith('To: ') || line.startsWith('From: ')) && notif.channelLink) {
                    let prefix = '';
                    if (line.startsWith('Voice Channel: ')) prefix = 'Voice Channel: ';
                    else if (line.startsWith('Channel: ')) prefix = 'Channel: ';
                    else if (line.startsWith('To: ')) prefix = 'To: ';
                    else if (line.startsWith('From: ')) prefix = 'From: ';

                    const text = document.createTextNode(prefix);
                    bodyEl.appendChild(text);

                    const link = document.createElement('a');
                    link.textContent = line.substring(prefix.length);
                    link.href = notif.channelLink;
                    link.style.color = '#00b0f4';
                    link.style.textDecoration = 'none';
                    link.onclick = (e) => {
                        e.preventDefault();
                        window.open(notif.channelLink, '_blank');
                    };
                    bodyEl.appendChild(link);
                } else {
                    bodyEl.appendChild(document.createTextNode(line));
                }
            });

            itemContainer.appendChild(bodyEl);
        }

        // Action buttons
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.justifyContent = 'flex-end';
        actions.style.marginTop = '8px';
        actions.style.gap = '8px';

        if (notif.serverLink) {
            const serverBtn = document.createElement('button');
            serverBtn.textContent = 'Open Server';
            serverBtn.style.backgroundColor = '#4f545c';
            serverBtn.style.border = 'none';
            serverBtn.style.borderRadius = '3px';
            serverBtn.style.padding = '6px 12px';
            serverBtn.style.fontSize = '12px';
            serverBtn.style.color = '#ffffff';
            serverBtn.style.cursor = 'pointer';
            serverBtn.onclick = () => window.open(notif.serverLink, '_blank');
            actions.appendChild(serverBtn);
        }

        if (notif.channelLink) {
            const channelBtn = document.createElement('button');
            channelBtn.textContent = 'Open Channel';
            channelBtn.style.backgroundColor = '#5865f2';
            channelBtn.style.border = 'none';
            channelBtn.style.borderRadius = '3px';
            channelBtn.style.padding = '6px 12px';
            channelBtn.style.fontSize = '12px';
            channelBtn.style.color = '#ffffff';
            channelBtn.style.cursor = 'pointer';
            channelBtn.onclick = () => window.open(notif.channelLink, '_blank');
            actions.appendChild(channelBtn);
        }

        const goToBtn = document.createElement('button');
        goToBtn.textContent = 'Go To';
        goToBtn.style.backgroundColor = '#3ba55c';
        goToBtn.style.border = 'none';
        goToBtn.style.borderRadius = '3px';
        goToBtn.style.padding = '6px 12px';
        goToBtn.style.fontSize = '12px';
        goToBtn.style.color = '#ffffff';
        goToBtn.style.cursor = 'pointer';
        goToBtn.onclick = () => {
            try {
                notif.onClick();
            } catch (err) {
                logger.error("Error with Go To button:", err);
            }
        };
        actions.appendChild(goToBtn);

        itemContainer.appendChild(actions);
        content.appendChild(itemContainer);
    });
}

// Update the notification panel if it's open
function updateNotificationPanel() {
    if (notificationPanel) {
        updateNotificationList();
    }
}

const settings = definePluginSettings({
    whitelistedIds: {
        default: "",
        type: OptionType.STRING,
        description: "Whitelisted user IDs to stalk"
    },
    trackUserProfileChanges: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification for 'user profile changed'"
    },
    trackStartedTyping: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification for 'user started typing'"
    },
    trackSentMessage: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification for 'user sent a message'"
    },
    trackVoiceChannelJoin: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification when user joins a voice channel"
    },
    showMessageBody: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Include message contents in notification"
    },
    charLimit: {
        default: 100,
        type: OptionType.NUMBER,
        description: "Character limit for notifications. Set to 0 for no limit. Default=100"
    },
    trackVoiceChannelLeave: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification when user leaves a voice channel"
    },
    trackVoiceChannelMove: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show notification when user moves to a different voice channel"
    }
});


const switchToMsg = (gid: string, cid?: string, mid?: string) => {
    try {
        if (gid) findByProps("transitionToGuildSync")?.transitionToGuildSync(gid);
        if (cid) findByProps("selectChannel")?.selectChannel({
            guildId: gid ?? "@me",
            channelId: cid,
            messageId: mid
        });
    } catch (err) {
        logger.error("Error navigating to message:", err);
    }
};


function getMessageBody(settings: any, payload: MessageCreatePayload | MessageUpdatePayload): string {
    if (!settings.store.showMessageBody) return "Click to jump to the message";

    const { charLimit } = settings.store;
    const { content, attachments } = payload.message;
    const baseContent = content || attachments?.[0]?.filename || "Click to jump to the message";

    return (charLimit > 0 && baseContent.length > charLimit)
        ? `${baseContent.substring(0, charLimit)}...`
        : baseContent;
}

let oldUsers: {
    [id: string]: UserUpdatePayload;
} = {};
let loggedMessages: Record<string, Message> = {};

const _plugin: PluginDef & Record<string, any> = {
    name: "10 Stalker",
    description: "This plugin allows you to stalk users, made for delusional people like myself.",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],
    dependencies: ["MessageLoggerEnhanced"],
    settings,
    flux: {
        MESSAGE_CREATE: (payload: MessageCreatePayload) => {
            if (!payload.message || !payload.message.author || !payload.message.channel_id || !settings.store.trackSentMessage) return;

            const authorId = payload.message.author?.id;
            if (!isInWhitelist(authorId) || getCurrentChannel()?.id === payload.channelId) return;
            const author = UserStore.getUser(authorId);
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(payload.guildId, payload.channelId);

            if (payload.message.type === 7) {
                addNotification({
                    id: `join-${payload.message.id}`,
                    title: `${author.globalName || author.username} joined a server`,
                    body: "Click to jump to the message",
                    timestamp: Date.now(),
                    type: "message",
                    userId: authorId,
                    guildName,
                    channelName,
                    serverLink,
                    channelLink,
                    onClick: () => switchToMsg(payload.guildId, payload.channelId, payload.message.id),
                    icon: author.getAvatarURL(undefined, undefined, false)
                });
                return;
            }

            addNotification({
                id: `msg-${payload.message.id}`,
                title: `${author.globalName || author.username} sent a message`,
                body: getMessageBody(settings, payload),
                timestamp: Date.now(),
                type: "message",
                userId: authorId,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => switchToMsg(payload.guildId, payload.channelId, payload.message.id),
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        MESSAGE_UPDATE: (payload: MessageUpdatePayload) => {
            if (!payload.message || !payload.message.author || !payload.message.channel_id) return;

            const authorId = payload.message.author?.id;
            if (!isInWhitelist(authorId) || getCurrentChannel()?.id === payload.message.channel_id) return;
            const author = UserStore.getUser(authorId);
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(payload.guildId, payload.message.channel_id);

            addNotification({
                id: `edit-${payload.message.id}`,
                title: `${author.globalName || author.username} edited a message`,
                body: getMessageBody(settings, payload),
                timestamp: Date.now(),
                type: "edit",
                userId: authorId,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => switchToMsg(payload.guildId, payload.message.channel_id, payload.message.id),
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        MESSAGE_DELETE: async (payload: MessageDeletePayload) => {
            if (!payload || !payload?.channelId || !payload?.id || !payload?.guildId) return;
            let message: Message | null;
            if (loggedMessages[payload.id]) {
                message = MessageStore.getMessage(payload.channelId, payload.id) ?? loggedMessages[payload.id];
            } else {
                loggedMessages = await importLoggedMessages();
                message = MessageStore.getMessage(payload.channelId, payload.id) ?? loggedMessages[payload.id];
            }
            if (!message) return logger.error("Received a MESSAGE_DELETE event but the message was not found in the MessageStore, try enabling \"Cache Messages From Servers\" setting in MessageLoggerEnhanced.");

            const { author } = message;
            if (!isInWhitelist(author?.id) || getCurrentChannel()?.id === message.channel_id) return;

            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(payload.guildId, message.channel_id);

            addNotification({
                id: `delete-${message.id}`,
                title: `${author.username} deleted a message!`,
                body: message.content.length > 100 ? message.content.substring(0, 100).concat("...") : message.content,
                timestamp: Date.now(),
                type: "delete",
                userId: author.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => {
                    switchToMsg(payload.guildId, message.channel_id, message.id);
                },
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        TYPING_START: (payload: TypingStartPayload) => {
            if (!payload || !payload.channelId || !payload.userId || !settings.store.trackStartedTyping) return;

            const author = UserStore.getUser(payload.userId);
            if (!isInWhitelist(author?.id) || getCurrentChannel()?.id === payload.channelId) return;

            const channel = ChannelStore.getChannel(payload.channelId);
            const guildId = channel?.guild_id;
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(guildId, payload.channelId);

            addNotification({
                id: `typing-${author.id}-${Date.now()}`,
                title: `${author.globalName || author.username} started typing...`,
                body: "Click to jump to the channel",
                timestamp: Date.now(),
                type: "typing",
                userId: author.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => switchToMsg(guildId, payload.channelId),
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        USER_PROFILE_FETCH_SUCCESS: async (payload: UserUpdatePayload) => {
            if (!payload || !payload.user || !payload.user.id || !isInWhitelist(payload.user.id) || !settings.store.trackUserProfileChanges) return;

            // Normalize incoming data
            payload = convertSnakeCaseToCamelCase(payload);

            // Cache user information if we have not seen them before
            const oldUser = oldUsers[payload.user.id] ? convertSnakeCaseToCamelCase(oldUsers[payload.user.id]) : null;

            if (!oldUser) {
                oldUsers[payload.user.id] = payload;
                return;
            }

            // Determine which properties have changed
            const changedKeys = (() => {
                const keysToCompare = ["username", "globalName", "avatar", "discriminator", "clan", "flags", "banner", "banner_color", "accent_color", "bio"];
                let changedKeys: string[] = [];

                keysToCompare.forEach(key => {
                    const newValue = payload.user[key];
                    const oldValue = oldUser.user[key];
                    if (newValue !== oldValue) changedKeys.push(key);
                });

                return changedKeys;
            })();

            // If no properties have changed, nothing further to do
            if (changedKeys.length === 0) return;

            // Send a notification showing what has changed
            const notificationTitle = payload.user.globalName || payload.user.username;
            const changedPropertiesList = changedKeys.join(', ');
            const notificationBody = `Updates: ${changedPropertiesList}`;
            const avatarURL = UserStore.getUser(payload.user.id).getAvatarURL(undefined, undefined, false);

            addNotification({
                id: `profile-${payload.user.id}-${Date.now()}`,
                title: `${notificationTitle} updated their profile!`,
                body: notificationBody,
                timestamp: Date.now(),
                type: "profile",
                userId: payload.user.id,
                onClick: () => openUserProfile(payload.user.id),
                icon: avatarURL
            });

            // Update cached user for next time
            oldUsers[payload.user.id] = payload;
        },

        THREAD_CREATE: (payload: ThreadCreatePayload) => {
            if (!payload || !payload.channel || !payload.channel.id || !payload.channel.ownerId || !isInWhitelist(payload.channel.ownerId)) return;

            if (payload.isNewlyCreated) {
                const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(payload.channel.guild_id, payload.channel.parent_id);

                addNotification({
                    id: `thread-${payload.channel.id}`,
                    title: `${UserStore.getUser(payload.channel.ownerId).globalName || UserStore.getUser(payload.channel.ownerId).username} created a new thread`,
                    body: `Thread name: ${payload.channel.name}`,
                    timestamp: Date.now(),
                    type: "thread",
                    userId: payload.channel.ownerId,
                    guildName,
                    channelName: payload.channel.name,
                    serverLink,
                    channelLink: `https://discord.com/channels/${payload.channel.guild_id}/${payload.channel.id}`,
                    onClick: () => switchToMsg(payload.channel.guild_id, payload.channel.id),
                    icon: UserStore.getUser(payload.channel.ownerId).getAvatarURL(undefined, undefined, false)
                });
            }
        },
        VOICE_STATE_UPDATE: (payload: VoiceStateUpdatePayload) => {
            try {
                // إضافة تسجيل أكثر تفصيلاً
                logger.info(`VOICE_STATE_UPDATE received: ${JSON.stringify({
                    userId: payload.userId,
                    channelId: payload.channelId,
                    oldChannelId: payload.oldChannelId,
                    // إزالة الحقول غير الموجودة في VoiceStateUpdatePayload
                    // وإضافة معلومات أكثر فائدة
                    timestamp: new Date().toISOString()
                })}`);

                // التحقق الأساسي
                if (!payload || !payload.userId) {
                    logger.info("Voice update event missing userId");
                    return;
                }

                // الحصول على معلومات المستخدم
                const user = UserStore.getUser(payload.userId);
                if (!user) {
                    logger.error(`Cannot find user with ID ${payload.userId}`);
                    return;
                }

                logger.info(`Processing voice update for user: ${user.username} (${user.id})`);

                // التحقق مما إذا كان يجب تتبع هذا المستخدم
                if (!isInWhitelist(user.id)) {
                    logger.info(`User ${user.username} (${user.id}) is not in whitelist, ignoring voice update`);
                    return;
                }

                // تخطي المستخدم الحالي
                if (user.id === UserStore.getCurrentUser().id) {
                    logger.info("Skipping voice update for current user");
                    return;
                }

                // محاولة تحديد نوع الحدث (انضمام، خروج، انتقال)
                let eventType = "";
                let newChannelId: string | null = null;
                let oldChannelId: string | null = null;

                if (payload.channelId && !payload.oldChannelId) {
                    // انضمام لقناة
                    eventType = "join";
                    newChannelId = payload.channelId;
                    logger.info(`User ${user.username} joined voice channel ${payload.channelId}`);
                } else if (!payload.channelId && payload.oldChannelId) {
                    // خروج من قناة
                    eventType = "leave";
                    oldChannelId = payload.oldChannelId;
                    logger.info(`User ${user.username} left voice channel ${payload.oldChannelId}`);
                } else if (payload.channelId && payload.oldChannelId && payload.channelId !== payload.oldChannelId) {
                    // انتقال بين قنوات
                    eventType = "move";
                    newChannelId = payload.channelId;
                    oldChannelId = payload.oldChannelId;
                    logger.info(`User ${user.username} moved from ${payload.oldChannelId} to ${payload.channelId}`);
                } else {
                    // تحديث آخر للحالة الصوتية (مكتوم، أصم، إلخ)
                    logger.info(`Other voice state update for ${user.username}, not handling`);
                    return;
                }

                // التعامل مع كل نوع حدث
                if (eventType === "join" && newChannelId && settings.store.trackVoiceChannelJoin) {
                    try {
                        // الحصول على معلومات القناة والسيرفر
                        const channel = ChannelStore?.getChannel(newChannelId);
                        if (!channel) {
                            logger.error(`Cannot find channel with ID ${newChannelId} for join event`);
                            return;
                        }

                        const guildId = channel.guild_id;
                        logger.info(`Channel guild_id: ${guildId || 'null/undefined'}`);

                        const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(
                            guildId,
                            newChannelId
                        );

                        // إضافة إشعار
                        const notificationId = `voice-${user.id}-${Date.now()}`;
                        logger.info(`Creating notification with ID: ${notificationId}`);

                        // استخدام معلومات القناة والسيرفر بشكل صحيح
                        addNotification({
                            id: notificationId,
                            title: `${user.globalName || user.username} joined a voice channel`,
                            body: `Voice Channel: ${channelName || 'Unknown'}\nServer: ${guildName || 'Unknown'}`,
                            timestamp: Date.now(),
                            type: "voice",
                            userId: user.id,
                            guildName,
                            channelName,
                            serverLink,
                            channelLink,
                            onClick: () => {
                                try {
                                    logger.info(`Switching to channel: guild=${guildId}, channel=${newChannelId}`);
                                    switchToMsg(guildId || "", newChannelId);
                                } catch (err) {
                                    logger.error("Error navigating to voice channel:", err);
                                }
                            },
                            icon: user.getAvatarURL(undefined, undefined, false)
                        });
                    } catch (err) {
                        logger.error("Error processing join event:", err);
                    }
                }
                else if (eventType === "leave" && oldChannelId && settings.store.trackVoiceChannelLeave) {
                    try {
                        // الحصول على معلومات القناة القديمة
                        const oldChannel = ChannelStore?.getChannel(oldChannelId);
                        if (!oldChannel) {
                            logger.error(`Cannot find old channel with ID ${oldChannelId} for leave event`);
                            return;
                        }

                        const guildId = oldChannel.guild_id;

                        const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(
                            guildId,
                            oldChannelId
                        );

                        addNotification({
                            id: `voice-leave-${user.id}-${Date.now()}`,
                            title: `${user.globalName || user.username} left a voice channel`,
                            body: `Left Voice Channel: ${channelName || 'Unknown'}\nServer: ${guildName || 'Unknown'}`,
                            timestamp: Date.now(),
                            type: "voice",
                            userId: user.id,
                            guildName,
                            channelName,
                            serverLink,
                            channelLink,
                            onClick: () => {
                                try {
                                    switchToMsg(guildId || "", oldChannelId);
                                } catch (err) {
                                    logger.error("Error navigating to old voice channel:", err);
                                }
                            },
                            icon: user.getAvatarURL(undefined, undefined, false)
                        });
                    } catch (err) {
                        logger.error("Error processing leave event:", err);
                    }
                }
                else if (eventType === "move" && newChannelId && oldChannelId && settings.store.trackVoiceChannelMove) {
                    try {
                        const newChannel = ChannelStore?.getChannel(newChannelId);
                        const oldChannel = ChannelStore?.getChannel(oldChannelId);

                        if (!newChannel || !oldChannel) {
                            logger.error(`Cannot find channels for move: new=${newChannelId}, old=${oldChannelId}`);
                            return;
                        }

                        const newGuildId = newChannel.guild_id;
                        const oldGuildId = oldChannel.guild_id;

                        const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(
                            newGuildId,
                            newChannelId
                        );

                        const oldChannelInfo = getServerAndChannelInfo(
                            oldGuildId,
                            oldChannelId
                        );

                        addNotification({
                            id: `voice-move-${user.id}-${Date.now()}`,
                            title: `${user.globalName || user.username} moved voice channels`,
                            body: `From: ${oldChannelInfo.channelName || 'Unknown'}\nTo: ${channelName || 'Unknown'}\nServer: ${guildName || 'Unknown'}`,
                            timestamp: Date.now(),
                            type: "voice",
                            userId: user.id,
                            guildName,
                            channelName,
                            serverLink,
                            channelLink,
                            onClick: () => {
                                try {
                                    switchToMsg(newGuildId || "", newChannelId);
                                } catch (err) {
                                    logger.error("Error navigating to new voice channel:", err);
                                }
                            },
                            icon: user.getAvatarURL(undefined, undefined, false)
                        });
                    } catch (err) {
                        logger.error("Error processing move event:", err);
                    }
                }
            } catch (err) {
                logger.error("Error in VOICE_STATE_UPDATE handler:", err);
            }
        },
    },
    async start() {
        try {
            logger.info("Starting Stalker plugin");

            // Check for required plugin safely
            try {
                const vcPlugins = window?.["Vencord"]?.["Plugins"]?.["plugins"];

                if (vcPlugins && !vcPlugins["MessageLoggerEnhanced"]) {
                    Notifications.showNotification({
                        title: "Stalker plugin requires MessageLoggerEnhanced to be enabled",
                        body: "Click to download it.",
                        onClick: () => open("https://github.com/Syncxv/vc-message-logger-enhanced/")
                    });
                }
            } catch (err) {
                logger.error("Error checking required plugins:", err);
            }

            // Load tracked users data and validate whitelist
            const whitelist = settings.store.whitelistedIds.split(",").filter(Boolean);
            logger.info(`Whitelist contains ${whitelist.length} users: ${whitelist.join(", ")}`);

            for (const id of whitelist) {
                try {
                    const user = UserStore.getUser(id);
                    if (!user) {
                        logger.warn(`User ${id} in whitelist does not exist or is not accessible`);
                        continue;
                    }

                    logger.info(`Loading profile data for user ${id} (${user.username})`);

                    const { body } = await RestAPI.get({
                        url: `/users/${id}/profile`,
                        query: {
                            with_mutual_guilds: true,
                            with_mutual_friends_count: true,
                        }
                    });
                    oldUsers[id] = body;
                } catch (error) {
                    logger.error(`Failed to cache user ${id}`, error);
                }
            }

            // Add context menu patch
            addContextMenuPatch("user-context", contextMenuPatch);

            // Cache logged messages for deletion tracking
            this.loggedMessages = await importLoggedMessages();

            // بدء نظام تتبع القنوات الصوتية
            this._startVoiceTracking();

            // Show startup notification
            Toasts.show({
                type: Toasts.Type.SUCCESS,
                message: "Stalker plugin started - tracking is active",
                id: Toasts.genId()
            });
        } catch (error) {
            logger.error("Error in plugin startup", error);
        }
    },
    stop() {
        // Remove context menu
        try {
            removeContextMenuPatch("user-context", contextMenuPatch);
        } catch (err) {
            logger.error("Error removing context menu:", err);
        }

        // Close notification panel if open
        if (notificationPanel && document.body.contains(notificationPanel)) {
            document.body.removeChild(notificationPanel);
            notificationPanel = null;
        }

        // إيقاف نظام تتبع القنوات الصوتية
        this._stopVoiceTracking();
    },
    async stalkUser(id: string) {
        try {
            // Log for debugging
            logger.info(`Adding user ${id} to stalking list`);

            // Get user info to display
            const user = UserStore.getUser(id);
            if (!user) {
                logger.error(`Failed to get user info for ID ${id}`);
                Toasts.show({
                    type: Toasts.Type.FAILURE,
                    message: `Failed to add user to tracking list - user not found`,
                    id: Toasts.genId()
                });
                return;
            }

            // Add to whitelist
            addToWhitelist(id);

            // Show success message
            Toasts.show({
                type: Toasts.Type.SUCCESS,
                message: `Now tracking ${user.globalName || user.username}`,
                id: Toasts.genId()
            });

            // Cache user profile data
            try {
                const { body } = await RestAPI.get({
                    url: `/users/${id}/profile`,
                    query: {
                        with_mutual_guilds: true,
                        with_mutual_friends_count: true,
                    }
                });
                oldUsers[id] = convertSnakeCaseToCamelCase(body);
                logger.info(`Cached profile data for user ${id} (${oldUsers[id].user.globalName || oldUsers[id].user.username})`);
            } catch (error) {
                logger.error(`Failed to cache profile for user ${id}`, error);
            }

            // Add initial notification about tracking
            addNotification({
                id: `tracking-start-${id}-${Date.now()}`,
                title: `Started tracking ${user.globalName || user.username}`,
                body: `You will now receive notifications about this user's activities`,
                timestamp: Date.now(),
                type: "profile",
                userId: id,
                onClick: () => openUserProfile(id),
                icon: user.getAvatarURL(undefined, undefined, false)
            });
        } catch (error) {
            logger.error(`Failed to stalk user ${id}`, error);
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: `Failed to add user to tracking list - error occurred`,
                id: Toasts.genId()
            });
        }
    },
    unStalkuser(id: string) {
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            message: `Stopped stalking ${UserStore.getUser(id).globalName || UserStore.getUser(id).username}`,
            id: Toasts.genId()
        });
        removeFromWhitelist(id);
        delete oldUsers[id];
    },
    // Add function to show stored notifications
    getNotifications() {
        return notifications;
    },
    // Clear notifications
    clearNotifications() {
        notifications = [];
        updateNotificationPanel();
    },
    // Open the tracker panel using direct DOM manipulation instead of React
    openTrackerPanel() {
        try {
            // Log for debugging
            logger.info("Opening tracker panel");
            logger.info(`Current notifications: ${notifications.length}`);

            createNotificationPanel();
        } catch (err) {
            logger.error("Error creating tracker panel:", err);
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: "Error opening tracker panel",
                id: Toasts.genId()
            });
        }
    },
    // إضافة وظيفة جديدة لاختبار الإشعارات
    // سنضيف هذا إلى plugin object كوظيفة منفصلة
    testVoiceNotification(userId: string, channelId: string | null, guildId: string | null) {
        try {
            const user = UserStore.getUser(userId);
            if (!user) {
                logger.error(`Test notification: Cannot find user with ID ${userId}`);
                Toasts.show({
                    type: Toasts.Type.FAILURE,
                    message: `Cannot find user with ID ${userId}`,
                    id: Toasts.genId()
                });
                return;
            }

            logger.info(`Creating TEST voice notification for ${user.username}`);

            // عرض الحالة الصوتية الحالية
            const voiceState = this._getUserVoiceState(userId);
            logger.info(`Current voice state for ${user.username}: ${JSON.stringify(voiceState)}`);

            // إذا كان المستخدم حاليًا في قناة صوتية، استخدمها
            const useChannelId = voiceState.channelId || channelId || "@me";
            const useGuildId = voiceState.guildId || guildId || null;

            // الحصول على معلومات القناة
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(useGuildId, useChannelId);

            // عرض المعلومات المستخدمة
            logger.info(`TEST notification using: channelId=${useChannelId}, guildId=${useGuildId}`);
            logger.info(`Server Name: ${guildName}, Channel Name: ${channelName}`);
            logger.info(`Server Link: ${serverLink}, Channel Link: ${channelLink}`);

            // إنشاء إشعار اختبار
            addNotification({
                id: `test-voice-${user.id}-${Date.now()}`,
                title: `[TEST] ${user.globalName || user.username} joined a voice channel`,
                body: `Voice Channel: ${channelName}\nServer: ${guildName}\n\nThis is a test notification`,
                timestamp: Date.now(),
                type: "voice",
                userId: user.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => {
                    try {
                        switchToMsg(useGuildId || "", useChannelId);
                    } catch (err) {
                        logger.error("Error navigating in test notification:", err);
                    }
                },
                icon: user.getAvatarURL(undefined, undefined, false)
            });

            // عرض إشعار إضافي
            Toasts.show({
                type: Toasts.Type.SUCCESS,
                message: `Test voice notification created for ${user.username}`,
                id: Toasts.genId()
            });

            // عرض ملخص القيم
            logger.info(`Summary for ${user.username}:
                - Channel: ${channelName} (${useChannelId})
                - Server: ${guildName} (${useGuildId})
                - Links: Server=${serverLink}, Channel=${channelLink}
            `);
        } catch (err) {
            logger.error("Error creating test voice notification:", err);
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: "Error creating test notification",
                id: Toasts.genId()
            });
        }
    },
    // متغير لتتبع حالات القنوات الصوتية
    voiceStates: {} as Record<string, { channelId: string | null, guildId: string | null }>,
    voiceStatesInterval: null as any,

    // إعداد واجهة برمجة التطبيقات للصوت
    _setupVoiceAPI() {
        try {
            // محاولة الحصول على مكتبات Discord للصوت
            this.voiceStateStore = findByProps("getVoiceStates", "getVoiceState");
            this.voiceModule = findByProps("getVoiceChannelId");

            if (this.voiceStateStore) {
                logger.info("Voice state store found");
            } else {
                logger.error("Could not find voice state store");
            }

            if (this.voiceModule) {
                logger.info("Voice module found");
            } else {
                logger.error("Could not find voice module");
            }

            // تسجيل أحداث الصوت إن أمكن
            try {
                const voiceStateEvents = findByProps("VOICE_STATE_UPDATES");
                if (voiceStateEvents && voiceStateEvents.VOICE_STATE_UPDATES) {
                    logger.info("Found voice state events API");
                    this.voiceEventsAvailable = true;
                } else {
                    logger.warn("Could not find voice state events API, falling back to polling");
                    this.voiceEventsAvailable = false;
                }
            } catch (err) {
                logger.error("Error setting up voice events:", err);
                this.voiceEventsAvailable = false;
            }
        } catch (err) {
            logger.error("Error setting up voice API:", err);
            return false;
        }

        return true;
    },

    // إطلاق نظام المراقبة
    _startVoiceTracking() {
        // إعداد واجهة برمجة التطبيقات للصوت
        if (!this._setupVoiceAPI()) {
            logger.error("Failed to set up voice API, voice tracking might not work");
        }

        // تهيئة المستخدمين المتتبعين
        this._initializeTrackedUsers();

        // بدء المراقبة
        this.voiceStatesInterval = setInterval(() => {
            this._checkVoiceStates();
        }, 3000); // التحقق كل 3 ثوانٍ

        // التحقق مباشرة
        this._checkVoiceStates();

        logger.info("Voice tracking system started");
    },

    // إيقاف نظام المراقبة
    _stopVoiceTracking() {
        if (this.voiceStatesInterval) {
            clearInterval(this.voiceStatesInterval);
            this.voiceStatesInterval = null;
            logger.info("Voice tracking system stopped");
        }
    },

    // تهيئة المستخدمين المتتبعين
    _initializeTrackedUsers() {
        try {
            const whitelist = settings.store.whitelistedIds.split(",").filter(Boolean);

            // مسح الحالات السابقة
            this.voiceStates = {};

            for (const userId of whitelist) {
                // الحصول على الحالة الأولية
                const state = this._getUserVoiceState(userId);
                this.voiceStates[userId] = state;

                if (state.channelId) {
                    logger.info(`Initialized user ${userId} in voice channel ${state.channelId}`);
                }
            }
        } catch (err) {
            logger.error("Error initializing tracked users:", err);
        }
    },

    // التحقق من حالات القنوات الصوتية
    _checkVoiceStates() {
        try {
            const whitelist = settings.store.whitelistedIds.split(",").filter(Boolean);

            for (const userId of whitelist) {
                try {
                    const user = UserStore.getUser(userId);
                    if (!user) continue;

                    // تخطي المستخدم الحالي
                    if (userId === UserStore.getCurrentUser().id) continue;

                    // الحصول على الحالة الحالية
                    const currentState = this._getUserVoiceState(userId);

                    // إذا لم يكن لدينا حالة سابقة، نضيفها فقط
                    if (!this.voiceStates[userId]) {
                        this.voiceStates[userId] = currentState;
                        continue;
                    }

                    // الحالة السابقة
                    const previousState = this.voiceStates[userId];

                    // مقارنة الحالة الحالية بالحالة السابقة
                    if (currentState.channelId !== previousState.channelId) {
                        // تغيرت قناة الصوت

                        if (currentState.channelId && !previousState.channelId) {
                            // انضم إلى قناة
                            this._handleUserJoinedVoice(user, currentState.channelId, currentState.guildId);
                        }
                        else if (!currentState.channelId && previousState.channelId) {
                            // غادر قناة
                            this._handleUserLeftVoice(user, previousState.channelId, previousState.guildId);
                        }
                        else if (currentState.channelId && previousState.channelId) {
                            // انتقل بين قنوات
                            this._handleUserMovedVoice(
                                user,
                                previousState.channelId, previousState.guildId,
                                currentState.channelId, currentState.guildId
                            );
                        }

                        // تحديث الحالة
                        this.voiceStates[userId] = currentState;
                    }
                } catch (innerErr) {
                    logger.error(`Error checking voice state for user ${userId}:`, innerErr);
                }
            }
        } catch (err) {
            logger.error("Error in voice state check:", err);
        }
    },

    // الحصول على حالة القناة الصوتية للمستخدم
    _getUserVoiceState(userId: string): { channelId: string | null, guildId: string | null } {
        try {
            // إذا كان لدينا voiceStateStore، نستخدمه لأنه الأكثر دقة
            if (this.voiceStateStore) {
                // طريقة 1: getVoiceState
                try {
                    const state = this.voiceStateStore.getVoiceStateForUser?.(userId) ||
                                 this.voiceStateStore.getVoiceState?.(userId);

                    if (state && state.channelId) {
                        return {
                            channelId: state.channelId,
                            guildId: state.guildId || null
                        };
                    }
                } catch (e) {
                    // فشل الطريقة 1، ننتقل للطريقة 2
                }

                // طريقة 2: تصفح جميع الحالات
                try {
                    const states = this.voiceStateStore.getVoiceStates();

                    for (const guildId in states) {
                        const guildStates = states[guildId];
                        if (guildStates && guildStates[userId]) {
                            const channelId = guildStates[userId].channelId;
                            if (channelId) {
                                return { channelId, guildId };
                            }
                        }
                    }
                } catch (e) {
                    // فشل الطريقة 2، ننتقل للطريقة 3
                }
            }

            // طريقة 3: استخدام voiceModule
            if (this.voiceModule && typeof this.voiceModule.getVoiceChannelId === 'function') {
                const channelId = this.voiceModule.getVoiceChannelId(userId);
                if (channelId) {
                    // نحتاج للحصول على معرف السيرفر من القناة
                    const channel = ChannelStore?.getChannel(channelId);
                    return {
                        channelId,
                        guildId: channel?.guild_id || null
                    };
                }
            }
        } catch (err) {
            logger.error(`Error getting voice state for ${userId}:`, err);
        }

        // لا يوجد حالة صوت نشطة
        return { channelId: null, guildId: null };
    },

    // معالجة حدث انضمام المستخدم إلى قناة صوتية
    _handleUserJoinedVoice(user: any, channelId: string, guildId: string | null) {
        try {
            logger.info(`${user.username} joined voice channel ${channelId}`);

            // الحصول على معلومات القناة والسيرفر
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(guildId, channelId);

            // إنشاء نص الإشعار
            const notificationText = [
                `Voice Channel: ${channelName}`,
                `Server: ${guildName}`,
                '',
                'Click buttons below to join them'
            ].join('\n');

            // إضافة إشعار
            addNotification({
                id: `voice-join-${user.id}-${Date.now()}`,
                title: `${user.globalName || user.username} joined a voice channel`,
                body: notificationText,
                timestamp: Date.now(),
                type: "voice",
                userId: user.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => {
                    try {
                        logger.info(`Navigating to voice channel: ${channelId} in ${guildId || 'DM'}`);
                        switchToMsg(guildId || "", channelId);
                    } catch (err) {
                        logger.error("Error navigating to voice channel:", err);
                    }
                },
                icon: user.getAvatarURL(undefined, undefined, false)
            });

            // عرض إشعار نظام إضافي
            Toasts.show({
                type: Toasts.Type.SUCCESS,
                message: `${user.globalName || user.username} joined voice in ${channelName}`,
                id: Toasts.genId()
            });

        } catch (err) {
            logger.error("Error handling voice join event:", err);
        }
    },

    // معالجة حدث خروج المستخدم من قناة صوتية
    _handleUserLeftVoice(user: any, channelId: string, guildId: string | null) {
        try {
            logger.info(`${user.username} left voice channel ${channelId}`);

            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(guildId, channelId);

            addNotification({
                id: `voice-leave-${user.id}-${Date.now()}`,
                title: `${user.globalName || user.username} left a voice channel`,
                body: `Left Voice Channel: ${channelName}\nServer: ${guildName}`,
                timestamp: Date.now(),
                type: "voice",
                userId: user.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => switchToMsg(guildId || "", channelId),
                icon: user.getAvatarURL(undefined, undefined, false)
            });
        } catch (err) {
            logger.error("Error handling voice leave event:", err);
        }
    },

    // معالجة حدث انتقال المستخدم بين قنوات صوتية
    _handleUserMovedVoice(
        user: any,
        oldChannelId: string, oldGuildId: string | null,
        newChannelId: string, newGuildId: string | null
    ) {
        try {
            logger.info(`${user.username} moved from ${oldChannelId} to ${newChannelId}`);

            const oldInfo = getServerAndChannelInfo(oldGuildId, oldChannelId);
            const newInfo = getServerAndChannelInfo(newGuildId, newChannelId);

            addNotification({
                id: `voice-move-${user.id}-${Date.now()}`,
                title: `${user.globalName || user.username} moved to another voice channel`,
                body: `From: ${oldInfo.channelName}\nTo: ${newInfo.channelName}\nServer: ${newInfo.guildName}`,
                timestamp: Date.now(),
                type: "voice",
                userId: user.id,
                guildName: newInfo.guildName,
                channelName: newInfo.channelName,
                serverLink: newInfo.serverLink,
                channelLink: newInfo.channelLink,
                onClick: () => {
                    try {
                        switchToMsg(newGuildId || "", newChannelId);
                    } catch (err) {
                        logger.error("Error navigating to new voice channel:", err);
                    }
                },
                icon: user.getAvatarURL(undefined, undefined, false)
            });
        } catch (err) {
            logger.error("Error handling voice move event:", err);
        }
    },

    // تحديث وظيفة اختبار الإشعارات الصوتية
    testVoiceNotification(userId: string, channelId: string | null, guildId: string | null) {
        try {
            const user = UserStore.getUser(userId);
            if (!user) {
                Toasts.show({
                    type: Toasts.Type.FAILURE,
                    message: `Cannot find user with ID ${userId}`,
                    id: Toasts.genId()
                });
                return;
            }

            logger.info(`Creating TEST voice notification for ${user.username}`);

            // عرض الحالة الصوتية الحالية
            const voiceState = this._getUserVoiceState(userId);
            logger.info(`Current voice state for ${user.username}: ${JSON.stringify(voiceState)}`);

            // إذا كان المستخدم حاليًا في قناة صوتية، استخدمها
            const useChannelId = voiceState.channelId || channelId || "@me";
            const useGuildId = voiceState.guildId || guildId || null;

            // الحصول على معلومات القناة
            const { serverLink, channelLink, guildName, channelName } = getServerAndChannelInfo(useGuildId, useChannelId);

            // عرض المعلومات المستخدمة
            logger.info(`TEST notification using: channelId=${useChannelId}, guildId=${useGuildId}`);
            logger.info(`Server Name: ${guildName}, Channel Name: ${channelName}`);
            logger.info(`Server Link: ${serverLink}, Channel Link: ${channelLink}`);

            // إنشاء إشعار اختبار
            addNotification({
                id: `test-voice-${user.id}-${Date.now()}`,
                title: `[TEST] ${user.globalName || user.username} joined a voice channel`,
                body: `Voice Channel: ${channelName}\nServer: ${guildName}\n\nThis is a test notification`,
                timestamp: Date.now(),
                type: "voice",
                userId: user.id,
                guildName,
                channelName,
                serverLink,
                channelLink,
                onClick: () => {
                    try {
                        switchToMsg(useGuildId || "", useChannelId);
                    } catch (err) {
                        logger.error("Error navigating in test notification:", err);
                    }
                },
                icon: user.getAvatarURL(undefined, undefined, false)
            });

            // عرض إشعار إضافي
            Toasts.show({
                type: Toasts.Type.SUCCESS,
                message: `Test voice notification created for ${user.username}`,
                id: Toasts.genId()
            });

            // عرض ملخص القيم
            logger.info(`Summary for ${user.username}:
                - Channel: ${channelName} (${useChannelId})
                - Server: ${guildName} (${useGuildId})
                - Links: Server=${serverLink}, Channel=${channelLink}
            `);
        } catch (err) {
            logger.error("Error creating test voice notification:", err);
            Toasts.show({
                type: Toasts.Type.FAILURE,
                message: "Error creating test notification",
                id: Toasts.genId()
            });
        }
    },
};

// تحديث قائمة السياق لإضافة وظائف فحص واختبار
const contextMenuPatch = (children, props) => _plugin.contextMenuPatch(children, props);

export default definePlugin(_plugin);
export { settings };

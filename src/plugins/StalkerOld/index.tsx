import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType, PluginDef } from "@utils/types";
import { Menu, Toasts, UserStore, MessageStore, RestAPI, ChannelStore } from "@webpack/common";
import { findByProps } from "@webpack";
import { getCurrentChannel, openUserProfile } from "@utils/discord";
import { Notifications } from "@api/index";
import { Message } from "discord-types/general";
import { MessageCreatePayload, MessageUpdatePayload, MessageDeletePayload, TypingStartPayload, UserUpdatePayload, ThreadCreatePayload } from "./types";
import { addToWhitelist, isInWhitelist, logger, removeFromWhitelist, convertSnakeCaseToCamelCase } from "./utils";

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
    showMessageBody: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Include message contents in notification"
    },
    charLimit: {
        default: 100,
        type: OptionType.NUMBER,
        description: "Character limit for notifications. Set to 0 for no limit. Default=100"
    }
});


const switchToMsg = (gid: string, cid?: string, mid?: string) => {
    if (gid) findByProps("transitionToGuildSync").transitionToGuildSync(gid);
    if (cid) findByProps("selectChannel").selectChannel({
        guildId: gid ?? "@me",
        channelId: cid,
        messageId: mid
    });
};

// Takes a payload and returns the correct message string based on settings
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
    name: "StalkerOld",
    description: "This plugin allows you to stalk users, made for delusional people like myself.",
    authors: [
        {
            id: 253302259696271360n,
            name: "zastix",
        },
    ],
    dependencies: ["MessageLoggerEnhanced"],
    settings,
    flux: {
        MESSAGE_CREATE: (payload: MessageCreatePayload) => {
            if (!payload.message || !payload.message.author || !payload.message.channel_id || !settings.store.trackSentMessage) return;

            const authorId = payload.message.author?.id;
            if (!isInWhitelist(authorId) || getCurrentChannel()?.id === payload.channelId) return;
            const author = UserStore.getUser(authorId);

            if (payload.message.type === 7) {
                Notifications.showNotification({
                    // @ts-ignore outdated types lib doesnt have .globalName
                    title: `${author.globalName || author.username} Joined a server`,
                    body: "Click to jump to the message.",
                    onClick: () => switchToMsg(payload.guildId, payload.channelId, payload.message.id),
                    icon: author.getAvatarURL(undefined, undefined, false)
                });
                return;
            }
            Notifications.showNotification({
                // @ts-ignore outdated types lib doesnt have .globalName
                title: `${author.globalName || author.username} Sent a message`,
                body: getMessageBody(settings, payload),
                onClick: () => switchToMsg(payload.guildId, payload.channelId, payload.message.id),
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        MESSAGE_UPDATE: (payload: MessageUpdatePayload) => {
            if (!payload.message || !payload.message.author || !payload.message.channel_id) return;

            const authorId = payload.message.author?.id;
            if (!isInWhitelist(authorId) || getCurrentChannel()?.id === payload.message.channel_id) return;
            const author = UserStore.getUser(authorId);

            Notifications.showNotification({
                // @ts-ignore outdated types lib doesnt have .globalName
                title: `${author.globalName || author.username} Edited a message`,
                body: getMessageBody(settings, payload),
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

            Notifications.showNotification({
                // @ts-ignore outdated types lib doesnt have .globalName
                title: `${author.globalName || author.username} Deleted a message!`,
                body: `"${message.content.length > 100 ? message.content.substring(0, 100).concat("...") : message.content}"`,
                onClick: () => {
                    findByProps("selectChannel").selectChannel({
                        guildId: payload.guildId,
                        channelId: message.channel_id,
                        messageId: message.id,
                    });
                },
                icon: author.getAvatarURL(undefined, undefined, false)
            });
        },
        TYPING_START: (payload: TypingStartPayload) => {
            if (!payload || !payload.channelId || !payload.userId || !settings.store.trackStartedTyping) return;

            const author = UserStore.getUser(payload.userId);
            if (!isInWhitelist(author?.id) || getCurrentChannel()?.id === payload.channelId) return;

            Notifications.showNotification({
                // @ts-ignore outdated types lib doesnt have .globalName
                title: `${author.globalName || author.username} Started typing...`,
                body: "Click to jump to the channel.",
                icon: author.getAvatarURL(undefined, undefined, false),
                onClick: () => switchToMsg(ChannelStore.getChannel(payload.channelId).guild_id, payload.channelId)
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
            const notificationBody = `Updated properties: ${changedPropertiesList}.`;
            const avatarURL = UserStore.getUser(payload.user.id).getAvatarURL(undefined, undefined, false);

            Notifications.showNotification({
                title: `${notificationTitle} updated their profile!`,
                body: notificationBody,
                onClick: () => openUserProfile(payload.user.id),
                icon: avatarURL
            });

            // Update cached user for next time
            oldUsers[payload.user.id] = payload;
        },

        THREAD_CREATE: (payload: ThreadCreatePayload) => {
            if (!payload || !payload.channel || !payload.channel.id || !payload.channel.ownerId || !isInWhitelist(payload.channel.ownerId)) return;

            if (payload.isNewlyCreated) {
                Notifications.showNotification({
                    // @ts-ignore outdated types lib doesnt have .globalName
                    title: `New thread created by ${UserStore.getUser(payload.channel.ownerId).globalName || UserStore.getUser(payload.channel.ownerId).username}`,
                    body: `Click to view the thread.`,
                    onClick: () => switchToMsg(payload.channel.guild_id, payload.channel.parent_id),
                    icon: UserStore.getUser(payload.channel.ownerId).getAvatarURL(undefined, undefined, false)
                });
            }
        },
    },
    async start() {
        if (!Vencord.Plugins.plugins["MessageLoggerEnhanced"]) {
            Notifications.showNotification({
                title: "Stalker plugin requires MessageLoggerEnhanced to be enabled",
                body: "Click to download it.",
                onClick: () => open("https://github.com/Syncxv/vc-message-logger-enhanced/")
            });
        }
        for (const id of settings.store.whitelistedIds.split(",")) {
            // is .getUser not a async function?
            const { body } = await RestAPI.get({
                url: `/users/${id}/profile`,
                query: {
                    with_mutual_guilds: true,
                    with_mutual_friends_count: true,
                }
            });
            oldUsers[id] = body;
            logger.info(`Cached user ${id} with name ${oldUsers[id].user.globalName || oldUsers[id].user.username} for further usage.`);
        }
        addContextMenuPatch("user-context", contextMenuPatch);

        this.loggedMessages = await importLoggedMessages();
    },
    stop() {
        removeContextMenuPatch("user-context", contextMenuPatch);
    },
    async stalkUser(id: string) {
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            // @ts-ignore outdated types lib doesnt have .globalName
            message: `Stalking ${UserStore.getUser(id).globalName || UserStore.getUser(id).username}`,
            id: Toasts.genId()
        });
        addToWhitelist(id);
        const { body } = await RestAPI.get({
            url: `/users/${id}/profile`,
            query: {
                with_mutual_guilds: true,
                with_mutual_friends_count: true,
            }
        });
        oldUsers[id] = convertSnakeCaseToCamelCase(body);
        logger.info(`Cached user ${id} with name ${oldUsers[id].user.globalName || oldUsers[id].user.username} for further usage.`);
    },
    unStalkuser(id: string) {
        Toasts.show({
            type: Toasts.Type.SUCCESS,
            // @ts-ignore outdated types lib doesnt have .globalName
            message: `Stopped stalking ${UserStore.getUser(id).globalName || UserStore.getUser(id).username}`,
            id: Toasts.genId()
        });
        removeFromWhitelist(id);
        delete oldUsers[id];
    }
};

const contextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    if (!props || props?.user?.id === UserStore.getCurrentUser().id) return;

    if (!children.some(child => child?.props?.id === "stalker-v1")) {
        children.push(
            <Menu.MenuSeparator />,

            <Menu.MenuItem
                id="stalker-v1"
                label={isInWhitelist(props.user.id) ? "Stop Stalking User" : "Stalk User"}
                action={() => isInWhitelist(props.user.id) ? _plugin.unStalkuser(props.user.id) : _plugin.stalkUser(props.user.id)} />
        );
    }
};

export default definePlugin(_plugin);
export { settings };
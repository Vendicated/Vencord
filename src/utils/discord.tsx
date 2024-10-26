/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./discord.css";

import { MessageObject } from "@api/MessageEvents";
import { ChannelStore, ComponentDispatch, Constants, FluxDispatcher, GuildStore, InviteActions, MessageActions, PrivateChannelsStore, RestAPI, SelectedChannelStore, SelectedGuildStore, UserProfileActions, UserProfileStore, UserSettingsActionCreators, UserUtils } from "@webpack/common";
import { Channel, Guild, Message, User } from "discord-types/general";
import { Except } from "type-fest";

import { MediaModalItem, MediaModalProps, openMediaModal } from "./modal";

/**
 * Open the invite modal
 * @param code The invite code
 * @returns Whether the invite was accepted
 */
export async function openInviteModal(code: string) {
    const { invite } = await InviteActions.resolveInvite(code, "Desktop Modal");
    if (!invite) throw new Error("Invalid invite: " + code);

    FluxDispatcher.dispatch({
        type: "INVITE_MODAL_OPEN",
        invite,
        code,
        context: "APP"
    });

    return new Promise<boolean>(r => {
        let onClose: () => void, onAccept: () => void;
        let inviteAccepted = false;

        FluxDispatcher.subscribe("INVITE_ACCEPT", onAccept = () => {
            inviteAccepted = true;
        });

        FluxDispatcher.subscribe("INVITE_MODAL_CLOSE", onClose = () => {
            FluxDispatcher.unsubscribe("INVITE_MODAL_CLOSE", onClose);
            FluxDispatcher.unsubscribe("INVITE_ACCEPT", onAccept);
            r(inviteAccepted);
        });
    });
}

export function getCurrentChannel(): Channel | undefined {
    return ChannelStore.getChannel(SelectedChannelStore.getChannelId());
}

export function getCurrentGuild(): Guild | undefined {
    return GuildStore.getGuild(getCurrentChannel()?.guild_id!);
}

export function openPrivateChannel(userId: string) {
    PrivateChannelsStore.openPrivateChannel(userId);
}

export const enum Theme {
    Dark = 1,
    Light = 2
}

export function getTheme(): Theme {
    return UserSettingsActionCreators.PreloadedUserSettingsActionCreators.getCurrentValue()?.appearance?.theme;
}

export function insertTextIntoChatInputBox(text: string) {
    ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
        rawText: text,
        plainText: text
    });
}

interface MessageExtra {
    messageReference: Message["messageReference"];
    allowedMentions: {
        parse: string[];
        replied_user: boolean;
    };
    stickerIds: string[];
}

export function sendMessage(
    channelId: string,
    data: Partial<MessageObject>,
    waitForChannelReady?: boolean,
    extra?: Partial<MessageExtra>
) {
    const messageData = {
        content: "",
        invalidEmojis: [],
        tts: false,
        validNonShortcutEmojis: [],
        ...data
    };

    return MessageActions.sendMessage(channelId, messageData, waitForChannelReady, extra);
}

/**
 * You must specify either height or width in the item
 */
export function openImageModal(item: Except<MediaModalItem, "type">, mediaModalProps?: Omit<MediaModalProps, "items">) {
    return openMediaModal({
        className: "vc-image-modal",
        fit: "vc-position-inherit",
        shouldAnimateCarousel: true,
        items: [{
            type: "IMAGE",
            original: item.original ?? item.url,
            ...item,
        }],
        ...mediaModalProps
    });
}

export async function openUserProfile(id: string) {
    const user = await UserUtils.getUser(id);
    if (!user) throw new Error("No such user: " + id);

    const guildId = SelectedGuildStore.getGuildId();
    UserProfileActions.openUserProfileModal({
        userId: id,
        guildId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: {
            page: guildId ? "Guild Channel" : "DM Channel",
            section: "Profile Popout"
        }
    });
}

interface FetchUserProfileOptions {
    friend_token?: string;
    connections_role_id?: string;
    guild_id?: string;
    with_mutual_guilds?: boolean;
    with_mutual_friends_count?: boolean;
}

/**
 * Fetch a user's profile
 */
export async function fetchUserProfile(id: string, options?: FetchUserProfileOptions) {
    const cached = UserProfileStore.getUserProfile(id);
    if (cached) return cached;

    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_START", userId: id });

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.USER_PROFILE(id),
        query: {
            with_mutual_guilds: false,
            with_mutual_friends_count: false,
            ...options
        },
        oldFormErrors: true,
    });

    FluxDispatcher.dispatch({ type: "USER_UPDATE", user: body.user });
    await FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCESS", ...body });
    if (options?.guild_id && body.guild_member)
        FluxDispatcher.dispatch({ type: "GUILD_MEMBER_PROFILE_UPDATE", guildId: options.guild_id, guildMember: body.guild_member });

    return UserProfileStore.getUserProfile(id);
}

/**
 * Get the unique username for a user. Returns user.username for pomelo people, user.tag otherwise
 */
export function getUniqueUsername(user: User) {
    return user.discriminator === "0" ? user.username : user.tag;
}

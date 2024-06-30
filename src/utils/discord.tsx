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

import type { MessageObject } from "@api/MessageEvents";
import type { MessageReference, UserRecord } from "@vencord/discord-types";
import { ChannelActionCreators, ChannelStore, ComponentDispatch, Constants, FluxDispatcher, GuildStore, InstantInviteActionCreators, MaskedLink, MessageActionCreators, ModalImageClasses, RestAPI, SelectedChannelStore, SelectedGuildStore, UserActionCreators, UserProfileModalActionCreators, UserProfileStore, UserSettingsProtoActionCreators } from "@webpack/common";
import type { ComponentProps } from "react";

import { ImageModal, ModalRoot, ModalSize, openModal } from "./modal";

/**
 * Open the invite modal
 * @param code The invite code
 * @returns Whether the invite was accepted
 */
export async function openInviteModal(code: string) {
    const { invite } = await InstantInviteActionCreators.resolveInvite(code, "Desktop Modal");
    if (!invite) throw new Error("Invalid invite: " + code);

    FluxDispatcher.dispatch({
        type: "INVITE_MODAL_OPEN",
        invite,
        code,
        context: "APP"
    });

    return new Promise<boolean>(resolve => {
        let onAccept: () => void;
        let onClose: () => void;
        let inviteAccepted = false;

        FluxDispatcher.subscribe("INVITE_ACCEPT", onAccept = () => {
            inviteAccepted = true;
        });

        FluxDispatcher.subscribe("INVITE_MODAL_CLOSE", onClose = () => {
            FluxDispatcher.unsubscribe("INVITE_MODAL_CLOSE", onClose);
            FluxDispatcher.unsubscribe("INVITE_ACCEPT", onAccept);
            resolve(inviteAccepted);
        });
    });
}

export const getCurrentChannel = () => ChannelStore.getChannel(SelectedChannelStore.getChannelId());

export const getCurrentGuild = () => GuildStore.getGuild(getCurrentChannel()?.guild_id);

export function openPrivateChannel(userId: string) {
    ChannelActionCreators.openPrivateChannel(userId);
}

export const enum Theme {
    Dark = 1,
    Light = 2
}

export const getTheme = (): Theme =>
    UserSettingsProtoActionCreators.PreloadedUserSettingsActionCreators.getCurrentValue()?.appearance?.theme;


export function insertTextIntoChatInputBox(text: string) {
    ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", {
        rawText: text,
        plainText: text
    });
}

interface MessageExtra {
    messageReference: MessageReference;
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

    return MessageActionCreators.sendMessage(channelId, messageData, waitForChannelReady, extra);
}

export const openImageModal = (url: string, props?: Partial<ComponentProps<ImageModal>>) =>
    openModal(modalProps => (
        <ModalRoot
            {...modalProps}
            className={ModalImageClasses.modal}
            size={ModalSize.DYNAMIC}>
            <ImageModal
                className={ModalImageClasses.image}
                original={url}
                placeholder={url}
                src={url}
                renderLinkComponent={props => <MaskedLink {...props} />}
                // Don't render forward message button
                renderForwardComponent={() => null}
                shouldHideMediaOptions={false}
                shouldAnimate
                {...props}
            />
        </ModalRoot>
    ));

export async function openUserProfile(userId: string) {
    const user = await UserActionCreators.getUser(userId);
    if (!user) throw new Error("No such user: " + userId);

    const guildId = SelectedGuildStore.getGuildId();
    UserProfileModalActionCreators.openUserProfileModal({
        userId,
        guildId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: {
            page: guildId ? "Guild Channel" : "DM Channel",
            section: "Profile Popout"
        }
    });
}

interface FetchUserProfileOptions {
    connections_role_id?: string;
    friend_token?: string;
    guild_id?: string;
    with_mutual_friends_count?: boolean;
    with_mutual_guilds?: boolean;
}

/**
 * Fetch a user's profile
 */
export async function fetchUserProfile(userId: string, options?: FetchUserProfileOptions) {
    const cached = UserProfileStore.getUserProfile(userId);
    if (cached) return cached;

    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_START", userId });

    const { body } = await RestAPI.get({
        url: Constants.Endpoints.USER_PROFILE(userId),
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

    return UserProfileStore.getUserProfile(userId);
}

/**
 * Get the unique username for a user. Returns user.username for pomelo people, user.tag otherwise
 */
export function getUniqueUsername(user: UserRecord) {
    return user.isPomelo() ? user.username : user.tag;
}

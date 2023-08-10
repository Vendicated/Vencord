/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { MessageObject } from "@api/MessageEvents";
import { findByCodeLazy, findByPropsLazy, findLazy } from "@webpack";
import { ChannelStore, ComponentDispatch, GuildStore, MaskedLink, ModalImageClasses, PrivateChannelsStore, SelectedChannelStore, SelectedGuildStore, UserUtils } from "@webpack/common";
import { Guild, Message, User } from "discord-types/general";

import { ImageModal, ModalRoot, ModalSize, openModal } from "./modal";

const PreloadedUserSettings = findLazy(m => m.ProtoClass?.typeName.endsWith("PreloadedUserSettings"));
const MessageActions = findByPropsLazy("editMessage", "sendMessage");

export function getCurrentChannel() {
    return ChannelStore.getChannel(SelectedChannelStore.getChannelId());
}

export function getCurrentGuild(): Guild | undefined {
    return GuildStore.getGuild(getCurrentChannel()?.guild_id);
}

export function openPrivateChannel(userId: string) {
    PrivateChannelsStore.openPrivateChannel(userId);
}

export const enum Theme {
    Dark = 1,
    Light = 2
}

export function getTheme(): Theme {
    return PreloadedUserSettings.getCurrentValue()?.appearance?.theme;
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

export function openImageModal(url: string, props?: Partial<React.ComponentProps<ImageModal>>): string {
    return openModal(modalProps => (
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
                shouldHideMediaOptions={false}
                shouldAnimate
                {...props}
            />
        </ModalRoot>
    ));
}

const openProfile = findByCodeLazy("friendToken", "USER_PROFILE_MODAL_OPEN");

export async function openUserProfile(id: string) {
    const user = await UserUtils.fetchUser(id);
    if (!user) throw new Error("No such user: " + id);

    const guildId = SelectedGuildStore.getGuildId();
    openProfile({
        userId: id,
        guildId,
        channelId: SelectedChannelStore.getChannelId(),
        analyticsLocation: {
            page: guildId ? "Guild Channel" : "DM Channel",
            section: "Profile Popout"
        }
    });
}

/**
 * Get the unique username for a user. Returns user.username for pomelo people, user.tag otherwise
 */
export function getUniqueUsername(user: User) {
    return user.discriminator === "0" ? user.username : user.tag;
}

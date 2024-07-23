/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize } from "@utils/modal";
import { findByCodeLazy,findByPropsLazy } from "@webpack";
import { Button, ChannelStore, MessageStore, RelationshipStore, Text, UserStore, useState } from "@webpack/common";

import { cl } from "../index";
import { InfoWithIcon } from "./InfoWithIcon";
const getCreatedAtDate = findByCodeLazy('month:"short",day:"numeric"');
const locale = findByPropsLazy("getLocale");
import moment from "moment";

import constants from "../constants";

const { getMutualFriendsCount, getMutualGuilds } = findByPropsLazy("getMutualFriendsCount", "getMutualFriends");
const { removeRelationship } = findByPropsLazy("removeFriend", "unblockUser");

function UserInfoComponent(props)
{
    const { user } = props;

    const userPicture = user.getAvatarURL();

    const dmChannel = ChannelStore.getChannel(ChannelStore.getDMFromUserId(user?.id));

    const lastMessage = dmChannel ? MessageStore.getMessage(dmChannel?.id, dmChannel?.lastMessageId) : null;

    const lastMessageTime = moment(lastMessage?.timestamp).format("MMM D, YYYY");

    return (
        <div className={cl("modalparent")}>
            <img src={userPicture}></img>
            <div className={cl("info")}>
                <InfoWithIcon svg={constants.book}>{user.globalName ?? user.username}</InfoWithIcon>
                <InfoWithIcon svg={constants.clock}>Friends since {getCreatedAtDate(RelationshipStore.getSince(user.id), locale.getLocale())}</InfoWithIcon>
                <InfoWithIcon svg={constants.pastClock}>{lastMessage?.timestamp && lastMessage ? `Last message was at ${lastMessageTime}` : "You have no messages with this person"}</InfoWithIcon>
                <InfoWithIcon svg={constants.heart}>{getMutualFriendsCount(user.id) ?? "0"} mutual friends</InfoWithIcon>
                <InfoWithIcon svg={constants.house}>{getMutualGuilds(user.id)?.length ?? 0} mutual servers</InfoWithIcon>
            </div>
        </div>
    );
}

export function FriendPruneModal(props)
{

    const friends = RelationshipStore.getFriendIDs().map(e => UserStore.getUser(e));

    const [index, setIndex] = useState(0);

    function ProcessNext(shouldLeave)
    {
        if(shouldLeave)
        {
            // not sure if the second paramater matters
            removeRelationship(friends[index].id, { location: "ContextMenu" });
        }
        if(friends[index + 1])
        {
            setIndex(index + 1);

        }
        else
        {
            props.onClose();
        }
    }

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader separator={false}>
                <Text color="header-primary" variant="heading-lg/semibold" tag="h1" style={{ flexGrow: 1 }}>
                    Friend Prune ({index + 1}/{friends.length})
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent scrollbarType="none">
                <UserInfoComponent user={friends[index]}/>
                <div className={cl("buttongroup")}>
                    <Button onClick={() => ProcessNext(false)} color={Button.Colors.GREEN}>Keep</Button>
                    <Button onClick={() => ProcessNext(true)} color={Button.Colors.RED}>Unfriend</Button>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

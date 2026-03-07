/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "styles.css?managed";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Divider } from "@components/Divider";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Menu, RelationshipStore, TextInput, useEffect, UserStore, useState } from "@webpack/common";

interface UserTagData {
    tagName: string;
    userIds: string[];
}

let SavedData: UserTagData[] = [];
const tagStoreName = "vc-friendtags-tags";

function parseUsertags(text: string): string[] {
    const matches = text.match(/&([^&]+)/g);
    if (!matches) return [];
    const tags = matches.map(match => match.substring(1).trim());
    return tags.filter(tag => tag !== "");
}

function queryFriendTags(query) {
    const tags = parseUsertags(query);
    if (!tags.length) return [];

    const filteredTagObjects = SavedData
        .filter(data => data.tagName.length && data.userIds.length)
        .filter(data => tags.some(tag => tag.toLowerCase() === data.tagName.toLowerCase()));
    if (!filteredTagObjects.length) return [];

    const users = Array.from(new Set([...ChannelStore.getDMUserIds(), ...RelationshipStore.getFriendIDs()]))
        .filter(user => filteredTagObjects.some(tag => tag.userIds.includes(user)));

    return users.map(user => {
        const userObject: any = UserStore.getUser(user);
        return {
            type: "USER",
            record: userObject,
            score: 20,
            comparator: userObject.globalName || userObject.username,
            sortable: userObject.globalName || userObject.username
        };
    });
}

async function SetData() {
    const fetchData = await DataStore.get(tagStoreName);
    if (SavedData !== fetchData) {
        await DataStore.set(tagStoreName, JSON.stringify(SavedData));
    }
    return true;
}

async function GetData() {
    const fetchData = await DataStore.get(tagStoreName);
    if (!fetchData) {
        DataStore.set(tagStoreName, JSON.stringify([]));
        SavedData = [];
        return;
    }
    SavedData = JSON.parse(fetchData);
}

function TagConfigCard(props) {
    const { tag } = props;
    const [tagName, setTagName] = useState(tag.tagName);
    const [userIds, setUserIDs] = useState(tag.userIds.join(", "));
    const update = useForceUpdater();

    useEffect(() => {
        const dataTag = SavedData.find(obj => obj.tagName === tag.tagName);
        if (dataTag) {
            dataTag.tagName = tagName;
        }
        SetData();
        update();
    }, [tagName]);

    useEffect(() => {
        const dataTag = SavedData.find(obj => obj.userIds === tag.userIds);
        if (dataTag) {
            dataTag.userIds = userIds.split(", ");
        }
        SetData();
        update();
    }, [userIds]);

    return (
        <>
            <BaseText size="md" tag="h5">Name</BaseText>
            <TextInput value={tagName} onChange={setTagName}></TextInput>
            <BaseText size="md" tag="h5">Users (Seperated by comma)</BaseText>
            <TextInput value={userIds} onChange={setUserIDs}></TextInput>
            <div className={"vc-friend-tags-user-header-container"}>
                <BaseText>User List (Click A User To Remove)</BaseText>
                <div className={"vc-friend-tags-user-header-btns"}>
                    {
                        userIds.split(", ").map(user => {
                            const userData: any = UserStore.getUser(user);
                            if (!userData) return null;
                            return (
                                <div style={{ display: "flex" }} key={user.id}>
                                    <img src={userData.getAvatarURL()} style={{ height: "20px", borderRadius: "50%", marginRight: "5px" }}></img>
                                    <BaseText style={{ cursor: "pointer" }} size="md" onClick={() => setUserIDs(userIds.replace(`, ${user}`, "").replace(user, ""))}>{userData.globalName || userData.username}</BaseText>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
            <Button
                onClick={async () => {
                    SavedData = SavedData.filter(data => (data.tagName !== tagName));
                    await SetData();
                    update();
                }}
                color={Button.Colors.RED}
            >
                Remove
            </Button>
        </>
    );
}

function TagConfigurationComponent() {
    const update = useForceUpdater();

    return (
        <>
            <Divider />
            {
                SavedData?.map(e => (
                    <>
                        <TagConfigCard tag={e} />
                        <Divider />
                    </>
                ))
            }
            <Button onClick={() => {
                SavedData.push(
                    {
                        tagName: "",
                        userIds: []
                    });
                SetData();
                update();
            }}>Add</Button>
        </>
    );
}

const settings = definePluginSettings({
    tagConfiguration: {
        type: OptionType.COMPONENT,
        description: "The tag configuration component",
        component: () => {
            return (
                <TagConfigurationComponent />
            );
        }
    }
});

function UserToTagID(user, tag, remove) {
    if (remove) {
        SavedData.filter(e => e.tagName === tag)[0].userIds = SavedData.filter(e => e.tagName === tag)[0].userIds.filter(e => e !== user);
    }
    else {
        SavedData.filter(e => e.tagName === tag)[0]?.userIds.push(user);
    }
    SetData();
}

const userPatch: NavContextMenuPatchCallback = (children, { user }) => {
    const buttonElement =
        <Menu.MenuItem
            id="vc-tag-group"
            label="Tag"
        >
            {SavedData.map(tag => {
                const isTagged = SavedData.filter(e => e.tagName === tag.tagName)[0].userIds.includes(user.id);

                return (
                    <Menu.MenuItem
                        label={`${isTagged ? "Remove from" : "Add to"} ${tag.tagName}`}
                        key={`vc-tag-${tag.tagName}`}
                        id={`vc-tag-${tag.tagName}`}
                        action={() => { UserToTagID(user.id, tag.tagName, isTagged); }}
                    />
                );
            })}
        </Menu.MenuItem>;

    children.push({ ...buttonElement });
};

export default definePlugin({
    name: "FriendTags",
    description: "Allows you to filter by custom tags in the quick switcher by starting a search with &",
    authors: [Devs.Samwich],
    settings,
    contextMenus: {
        "user-context": userPatch
    },
    patches: [
        {
            find: "#{intl::QUICKSWITCHER_PLACEHOLDER}",
            replacement: {
                match: /let{selectedIndex:\i,results:\i}/,
                replace: "if(this.state.query.includes(\"&\")){ this.props.results = $self.queryFriendTags(this.state.query); }$&"
            },
        }
    ],
    async start() {
        GetData();
    },
    queryFriendTags,
});

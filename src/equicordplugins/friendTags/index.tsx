/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "styles.css?managed";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Forms, Menu, RelationshipStore, Text, TextInput, useEffect, UserStore, useState } from "@webpack/common";

const tagStoreName = "vc-friendtags-tags";

function parseUsertags(text: string): string[] {
    const regex = /&(\w+)/g;
    const matches = text.match(regex);

    if (matches) {
        const tags = matches.map(match => match.substring(1));
        return tags.filter(tag => tag !== "");
    } else {
        return [];
    }
}


function queryFriendTags(query) {
    GetData();
    const tags = parseUsertags(query).map(e => e.toLowerCase());

    const filteredTagObjects = SavedData.filter(data => data.tagName.length && data.userIds.length).filter(data => tags.some(tag => tag === data.tagName));

    if (filteredTagObjects.length === 0) return [];

    const users = Array.from(new Set([...ChannelStore.getDMUserIds(), ...RelationshipStore.getFriendIDs()])).filter(user => filteredTagObjects.every(tag => tag.userIds.includes(user)));

    const response = users.map(user => {
        const userObject: any = UserStore.getUser(user);
        return (
            {
                "type": "USER",
                "record": userObject,
                "score": 20,
                "comparator": userObject.globalName || userObject.username,
                "sortable": userObject.globalName || userObject.username
            }
        );
    });
    return response;
}

let SavedData: UserTagData[] = [];

interface UserTagData {
    tagName: string;
    userIds: string[];
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
            <Text variant={"heading-md/normal"}>Name</Text>
            <TextInput value={tagName} onChange={setTagName}></TextInput>
            <Text variant={"heading-md/normal"}>Users (Seperated by comma)</Text>
            <TextInput value={userIds} onChange={setUserIDs}></TextInput>
            <div className={"vc-friend-tags-user-header-container"}>
                <Text variant="eyebrow">User List (Click A User To Remove)</Text>
                <div className={"vc-friend-tags-user-header-btns"}>
                    {
                        userIds.split(", ").map(user => {
                            const userData: any = UserStore.getUser(user);
                            if (!userData) return null;
                            return (
                                <div style={{ display: "flex" }} key={user.id}>
                                    <img src={userData.getAvatarURL()} style={{ height: "20px", borderRadius: "50%", marginRight: "5px" }}></img>
                                    <Text style={{ cursor: "pointer" }} variant={"text-md/normal"} onClick={() => setUserIDs(userIds.replace(`, ${user}`, "").replace(user, ""))}>{userData.globalName || userData.username}</Text>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
            <Button onClick={async () => {
                SavedData = SavedData.filter(data => (data.tagName !== tagName));
                await SetData();
                update();
            }} color={Button.Colors.RED}>Remove</Button>
        </>
    );
}
function TagConfigurationComponent() {

    const update = useForceUpdater();

    return (
        <>
            <Forms.FormDivider />
            {
                SavedData?.map(e => (
                    <>
                        <TagConfigCard tag={e} />
                        <Forms.FormDivider />
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


const settings = definePluginSettings(
    {
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
                    <Menu.MenuItem label={`${isTagged ? "Remove from" : "Add to"} ${tag.tagName}`} key={`vc-tag-${tag.tagName}`} id={`vc-tag-${tag.tagName}`} action={() => { UserToTagID(user.id, tag.tagName, isTagged); }} />
                );
            })}
        </Menu.MenuItem>;

    children.push({ ...buttonElement });

};


export default definePlugin({
    name: "FriendTags",
    description: "Allows you to filter by custom tags in the quick switcher",
    authors: [Devs.Samwich],
    settings,
    queryFriendTags: queryFriendTags,
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
    contextMenus:
    {
        "user-context": userPatch
    }
});

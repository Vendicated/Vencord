/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/index";
import { Devs } from "@utils/constants";
import { getCurrentGuild } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { GuildRoleStore, Menu, Popout, useRef, UserStore, useState } from "@webpack/common";

let uniqueParsedMentions: Set<string> = new Set<string>();
let popoutRendered = false;
let allowedMentionsBody: {
    parse: string[],
    users?: string[],
    roles?: string[]
} = {
    parse: []
};

const settings = definePluginSettings({
    mentionEveryoneOrHere: {
        type: OptionType.BOOLEAN,
        description: "Mention everyone and here by default",
        default: false,
        restartNeeded: true
    },
    mentionAllUsers: {
        type: OptionType.BOOLEAN,
        description: "Mention all users by default",
        default: true,
        restartNeeded: true
    },
    mentionAllRoles: {
        type: OptionType.BOOLEAN,
        description: "Mention all roles by default",
        default: true,
        restartNeeded: true
    }
});

const MentionIcon: IconComponent = ({ height = 20, width = 20, className }) => {
    return <svg width={width} height={height} viewBox="0 0 24 24">
        <path
            fill="currentColor"
            d="M12 2C6.486 2 2 6.486 2 12C2 17.515 6.486 22 12 22C14.039 22 15.993
            21.398 17.652 20.259L16.521 18.611C15.195 19.519 13.633 20 12 20C7.589
            20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12V12.782C20
            14.17 19.402 15 18.4 15L18.398 15.018C18.338 15.005 18.273 15 18.209
            15H18C17.437 15 16.6 14.182 16.6 13.631V12C16.6 9.464 14.537 7.4 12
            7.4C9.463 7.4 7.4 9.463 7.4 12C7.4 14.537 9.463 16.6 12 16.6C13.234 16.6
            14.35 16.106 15.177 15.313C15.826 16.269 16.93 17 18 17L18.002
            16.981C18.064 16.994 18.129 17 18.195 17H18.4C20.552 17 22 15.306 22
            12.782V12C22 6.486 17.514 2 12 2ZM12 14.599C10.566 14.599 9.4 13.433 9.4
            11.999C9.4 10.565 10.566 9.399 12 9.399C13.434 9.399 14.6 10.565 14.6
            11.999C14.6 13.433 13.434 14.599 12 14.599Z"
        />
    </svg>;
};

function renderPopout(
    onClose: () => void,
    update: () => void,
    checkedMentions: string[],
    setCheckedMentions: React.Dispatch<React.SetStateAction<string[]>>,
    checkAll: boolean,
    setCheckAll: React.Dispatch<React.SetStateAction<boolean>>,
    mentionEveryoneOrHere: boolean,
    setMentionEveryoneOrHere: React.Dispatch<React.SetStateAction<boolean>>,
    mentionUsers: boolean,
    setMentionUsers: React.Dispatch<React.SetStateAction<boolean>>,
    mentionRoles: boolean,
    setMentionRoles: React.Dispatch<React.SetStateAction<boolean>>
) {
    popoutRendered = true;
    const parsedMentions = [...uniqueParsedMentions];
    const userIds = new Set(parsedMentions.filter(mention => mention.split("-")[0] === "user"));
    const roleIds = new Set(parsedMentions.filter(mention => mention.split("-")[0] === "role"));
    allowedMentionsBody = {
        parse: []
    };

    if (mentionUsers) {
        allowedMentionsBody.parse.push("users");
    }

    if (mentionRoles) {
        allowedMentionsBody.parse.push("roles");
    }

    if (mentionEveryoneOrHere) {
        allowedMentionsBody.parse.push("everyone");
    }


    if (!mentionUsers) {
        if (userIds.size >= 1) {
            allowedMentionsBody.users = checkedMentions.filter(mention => mention.split("-")[0] === "user").map(mention => mention.split("-")[1]);
        }
    }

    if (!mentionRoles) {
        if (roleIds.size >= 1) {
            allowedMentionsBody.roles = checkedMentions.filter(mention => mention.split("-")[0] === "role").map(mention => mention.split("-")[1]);
        }
    }

    const mentionedEveryoneOrHere = parsedMentions.includes("everyone-here");

    return (
        <Menu.Menu
            navId="vc-allowed-mentions"
            onClose={onClose}
        >
            <Menu.MenuCheckboxItem
                id="vc-allowed-mentions-check-all"
                label="Check All"
                checked={checkAll}
                action={e => { e.stopPropagation(); setCheckAll(!checkAll); !checkAll ? setCheckedMentions(parsedMentions) : setCheckedMentions([]); }}
            />
            <Menu.MenuCheckboxItem
                id="vc-allowed-mentions-everyone-here"
                label="@everyone / @here"
                checked={mentionEveryoneOrHere}
                action={e => { e.stopPropagation(); setMentionEveryoneOrHere(!mentionEveryoneOrHere); }}
                disabled={!mentionedEveryoneOrHere}
            />
            <Menu.MenuGroup label="Allow">
                <Menu.MenuCheckboxItem
                    id="vc-allowed-mentions-mention-users"
                    label="Mention Users"
                    checked={mentionUsers}
                    action={e => { e.stopPropagation(); setMentionUsers(!mentionUsers); }}
                />
                <Menu.MenuCheckboxItem
                    id="vc-allowed-mentions-mention-roles"
                    label="Mention Roles"
                    checked={mentionRoles}
                    action={e => { e.stopPropagation(); setMentionRoles(!mentionRoles); }}
                />
            </Menu.MenuGroup>
            <Menu.MenuGroup label="Users">
                {userIds.size >= 1 ? [...userIds].map((mention, id) => {
                    const mention_id = mention.split("-")[1];
                    const label = UserStore.getUser(mention_id).globalName ?? UserStore.getUser(mention_id).username;

                    if (id === 100) return <Menu.MenuItem id={"vc-allowed-mentions-limit-message"} disabled={true} label={`Other ${userIds.size - 100} can't be selected due to limit`}/>;
                    if (id >= 101) return <></>;

                    return <Menu.MenuCheckboxItem id={`user-mention-${id}`} checked={checkedMentions.includes(mention)} action={
                        e => {
                            e.stopPropagation();
                            !checkedMentions.includes(mention_id)
                             ? setCheckedMentions(prev => [...prev, mention])
                             : setCheckedMentions(prev => prev.filter(selected_mention_id => selected_mention_id !== mention_id));
                            update();
                        }
                    } label={label} disabled={mentionUsers} key={`vc-allowed-mentions-users-${id}`}/>;
                }) : <Menu.MenuItem id="vc-allowed-mentions-nothing" label="No mentions yet" disabled={true}/>}
            </Menu.MenuGroup>
            <Menu.MenuGroup label="Roles">
                {roleIds.size >= 1 ? [...roleIds].map((mention, id) => {
                    const mention_id = mention.split("-")[1];
                    const label = GuildRoleStore.getRole(getCurrentGuild()!.id, mention_id).name;

                    if (id === 100) return <Menu.MenuItem id={"vc-allowed-mentions-limit-message"} disabled={true} label={`Other ${roleIds.size - 100} can't be selected due to limit`}/>;
                    if (id >= 101) return <></>;

                    return <Menu.MenuCheckboxItem id={`role-mention-${id}`} checked={checkedMentions.includes(mention)} action={
                        e => {
                            e.stopPropagation();
                            !checkedMentions.includes(mention_id)
                             ? setCheckedMentions(prev => [...prev, mention])
                             : setCheckedMentions(prev => prev.filter(selected_mention_id => selected_mention_id !== mention_id));
                            update();
                        }
                    } label={label} disabled={mentionRoles} key={`vc-allowed-mentions-roles-${id}`}/>;
                }) : <Menu.MenuItem id="vc-allowed-mentions-nothing" label="No mentions yet" disabled={true}/>}
            </Menu.MenuGroup>
        </Menu.Menu >
    );
}

const MentionChatBarIcon: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    const buttonRef = useRef(null);
    const [show, setShow] = useState(false);
    const update = useForceUpdater();
    const [checkedMentions, setCheckedMentions] = useState<string[]>([]);
    const [checkAll, setCheckAll] = useState<boolean>(false);
    const [mentionEveryoneOrHere, setMentionEveryoneOrHere] = useState<boolean>(settings.store.mentionEveryoneOrHere);
    const [mentionUsers, setMentionUsers] = useState<boolean>(settings.store.mentionAllUsers);
    const [mentionRoles, setMentionRoles] = useState<boolean>(settings.store.mentionAllRoles);

    const button = (
        <ChatBarButton tooltip="Manage Allowed Mentions" onClick={e => { setShow(!show); }} onContextMenu={() => {}} buttonProps={{ "aria-haspopup": "dialog" }}>
            <Popout position="bottom" align="center" animation={Popout.Animation.SCALE} shouldShow={show} onRequestClose={() => setShow(false)} targetElementRef={buttonRef} renderPopout={
                () => renderPopout(
                    () =>
                    setShow(false),
                    update,
                    checkedMentions,
                    setCheckedMentions,
                    checkAll,
                    setCheckAll,
                    mentionEveryoneOrHere,
                    setMentionEveryoneOrHere,
                    mentionUsers,
                    setMentionUsers,
                    mentionRoles,
                    setMentionRoles
                )
            }>
                {popoutProps => (
                    <Button {...popoutProps} ref={buttonRef} size="iconOnly" variant="none" >
                        <MentionIcon/>
                    </Button>
                )}
            </Popout>
        </ChatBarButton>
    );

    return button;
};

export default definePlugin({
    name: "AllowedMentions",
    description: "Allows you to choose whether a mention will actually send a notification to the user",
    authors: [Devs.imnotplayinginreallife, Devs.arHSM],

    settings: settings,
    patches: [
        {
            find: /,message_reference:\i,allowed_mentions:/,
            replacement: [
                {
                    match: /(,message_reference:\i,allowed_mentions:)(\i)/,
                    replace: "$1$self.getAllowedMentionsBody()"
                }
            ]
        },
        {
            find: "handleOnChange(){let{editor:",
            replacement: {
                match: /isEditorEmpty\(\i\)&&null==\i\.composition;/,
                replace: "$& $self.setAllowedMentions(this.props.editor.children);"
            }
        },
    ],

    setAllowedMentions(text: { children: { type: string, name?:string, userId?: string, roleId?: string, }[] }[]) {
        const ids = text.map(obj => obj.children.map(child => child.userId ? `user-${child.userId}` : (child.roleId ? `role-${child.roleId}` : (child.name ? "everyone-here": null))).filter(child => child != null)).flat();
        uniqueParsedMentions = new Set(ids);
    },
    getAllowedMentionsBody() {
        if (!popoutRendered) {
            allowedMentionsBody.parse = [];
            if (settings.store.mentionEveryoneOrHere) {
                allowedMentionsBody.parse.push("everyone");
            }

            if (settings.store.mentionAllUsers) {
                allowedMentionsBody.parse.push("users");
            }

            if (settings.store.mentionAllRoles) {
                allowedMentionsBody.parse.push("roles");
            }
        }
        return allowedMentionsBody;
    },

    chatBarButton: {
        icon: MentionIcon,
        render: MentionChatBarIcon
    },
});

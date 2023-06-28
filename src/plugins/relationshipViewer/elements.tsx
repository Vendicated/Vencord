/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import "./relationsStyles.css";

import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { LazyComponent } from "@utils/react";
import { findByCode } from "@webpack";
import { Button, Card, FluxDispatcher, Text, useState } from "@webpack/common";
import { User } from "discord-types/general";
import { SetStateAction } from "react";

// omg spotifyControls my beloved
const Svg = (path: string, label: string) => {
    return () => (
        <svg
            className="relation-avatar"
            height="24"
            width="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-label={label}
            focusable={false}
        >
            <path d={path} />
        </svg>
    );
};

const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const Expand = Svg("M15.88 9.29L12 13.17 8.12 9.29c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.39-.39.39-1.02 0-1.41-.39-.38-1.03-.39-1.42 0z", "Expand");

const OpenExpandClass = "relation-expand-opened";
const ClosedExpandClass = "relation-expand-closed";

const OpenRelationClass = "relation-opened";
const ClosedRelationClass = "relation-closed";

const openProfileModal = (user: User, guildId?: string) => {
    FluxDispatcher.dispatch({
        type: "USER_PROFILE_MODAL_OPEN",
        userId: user.id,
        guildId: guildId
    });
};

const onCollapsableFormClick = (isOpen: string[], setOpen: { (value: SetStateAction<string[]>): void; (arg0: string[]): void; }) => {
    setOpen([
        isOpen[0] === ClosedExpandClass ? OpenExpandClass : ClosedExpandClass,
        isOpen[1] === ClosedRelationClass ? OpenRelationClass : ClosedRelationClass
    ]);
};

export const createFormItem = (title: string, text?: string, element?: React.ReactElement) => {
    return (
        <Flex className={`${Margins.left8} ${Margins.top8} ${Margins.right8}`}>
            <Text variant="heading-sm/semibold">{title}</Text>
            {element}
            {text &&
                <Text variant="text-sm/normal">{text}</Text>
            }
        </Flex>
    );
};


export const createFormMember = (user: User | string, guildId?: string, isMember?: boolean) => {
    const loadedUser = typeof user === "object";

    let name = user as string;
    let displayName = "";
    if (loadedUser) {
        if (user.discriminator === "0") {
            displayName = user.username;
            // someone somehow managed to have "" as their displayname HOW THE FUCK?
            displayName = displayName !== "" ? displayName : user.username;

            name = (user as User & { globalName: string; }).globalName;
        } else {
            name = user.username;
            displayName = user.tag;
        }
    }

    return (
        <Flex style={{ flexDirection: "row" }} className={`${isMember && Margins.bottom8} ${isMember && Margins.left8} ${isMember && Margins.top8} ${isMember && Margins.right8} relation-nogap`}>
            <Flex className="relation-nogap">
                {loadedUser && (<UserSummaryItem
                    users={[user]}
                    count={1}
                    guildId={guildId}
                    renderIcon={false}
                    max={2}
                    showDefaultAvatarsForNullUsers
                    showUserPopout
                />)}

                {loadedUser &&
                    (
                        <Button className="relation-form-container" onClick={() => openProfileModal(user)} style={{ all: "unset", cursor: "pointer" }}>
                            <Text tag="span" variant={isMember ? "text-md/normal" : "text-sm/normal"}>
                                {name} <span style={{ color: "#6e7277" }}>{displayName}</span>
                            </Text>
                        </Button>
                    ) || (<Text tag="span" variant={isMember ? "text-md/normal" : "text-sm/normal"}>Loading user...</Text>)}
            </Flex>
        </Flex >
    );
};


export const createCollapsableForm = (title: string, children: Array<React.ReactElement>, count?: number) => {
    const [isOpen, setOpen] = useState(["relation-expand-opened", "relation-opened"]);

    return (
        <Card className={`${Margins.top8} ${Margins.bottom16} ${Margins.left16} ${Margins.right16}`}>
            <div id="scrollstylerelatiowon" className={`${Margins.top16} ${Margins.bottom16} ${Margins.left8} ${Margins.right8}`}>

                <Flex style={{ justifyContent: "space-between" }}>
                    <Text variant="heading-sm/semibold">{title} {count && `(${count})`}</Text>

                    <Button className="relation-avatar" onClick={() => onCollapsableFormClick(isOpen, setOpen)}>
                        <div id={`expansionbtn-${title}`} className={isOpen[0]}>
                            <Expand />
                        </div>
                    </Button>
                </Flex>

                <Flex className={"relation-form-container " + isOpen[1]}>
                    {isOpen[1] === "relation-opened" && children}
                </Flex>

            </div>
        </Card>
    );
};

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Forms, Parser, SnowflakeUtils, TabBar, UserUtils, useState } from "@webpack/common";
import { Guild } from "discord-types/general";

const cl = classNameFactory("vc-gp-");

export function openGuildProfileModal(guild: Guild) {
    openModal(props =>
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <GuildProfileModal guild={guild} />
        </ModalRoot>
    );
}

const Tabs = {
    ServerInfo: {
        label: "Server Info",
        component: ServerInfoTab
    },
    Friends: {
        label: "Friends",
        component: FriendsTab
    },
    BlockedUsers: {
        label: "Blocked Users",
        component: BlockedUsersTab
    }
} as const;

type TabKeys = keyof typeof Tabs;

interface GuildProps {
    guild: Guild;
}

function GuildProfileModal({ guild }: GuildProps) {
    const [currentTab, setCurrentTab] = useState<TabKeys>("ServerInfo");

    const Tab = Tabs[currentTab].component;

    return (
        <div className={cl("root")}>
            <TabBar
                type="top"
                look="brand"
                className={cl("tab-bar")}
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                {Object.entries(Tabs).map(([id, { label }]) =>
                    <TabBar.Item
                        className={cl("tab", { selected: currentTab === id })}
                        id={id}
                        key={id}
                    >
                        {label}
                    </TabBar.Item>
                )}
            </TabBar>

            <div className={cl("tab-content")}>
                <Tab guild={guild} />
            </div>
        </div>
    );
}


const dateFormat = new Intl.DateTimeFormat(void 0, { timeStyle: "short", dateStyle: "medium" });
function renderTimestampFromId(id: string) {
    return dateFormat.format(SnowflakeUtils.extractTimestamp(id));
}

function ServerInfoTab({ guild }: GuildProps) {
    useAwaiter(() => UserUtils.fetchUser(guild.ownerId), {
        deps: [guild.ownerId],
        fallbackValue: null
    });

    const Fields = {
        "Server Owner": Parser.parse(`<@${guild.ownerId}>`),
        "Created At": renderTimestampFromId(guild.id),
        "Joined At": dateFormat.format(guild.joinedAt),
        "Vanity Link": guild.vanityURLCode ? Parser.parse(`https://discord.gg/${guild.vanityURLCode}`) : "-",
        "Preferred Locale": guild.preferredLocale || "-",
        "Verification Level": ["Low", "Medium", "High", "Highest"][guild.verificationLevel] || "?"
    };

    return (
        <div className={cl("server-info")}>
            {Object.entries(Fields).map(([name, node]) =>
                <div className={cl("server-info-pair")} key={name}>
                    <Forms.FormTitle tag="h5">{name}</Forms.FormTitle>
                    {typeof node === "string" ? <span>{node}</span> : node}
                </div>
            )}
        </div>
    );
}

function FriendsTab({ guild }: GuildProps) {
    return null;
}

function BlockedUsersTab({ guild }: GuildProps) {
    return null;
}

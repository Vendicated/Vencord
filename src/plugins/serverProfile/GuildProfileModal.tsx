/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import { openImageModal } from "@utils/discord";
import { classes } from "@utils/misc";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { findByPropsLazy } from "@webpack";
import { Forms, GuildMemberStore, Parser, SnowflakeUtils, TabBar, UserUtils, useState } from "@webpack/common";
import { Guild, User } from "discord-types/general";

const IconUtils = findByPropsLazy("getGuildBannerURL");
const IconClasses = findByPropsLazy("icon", "acronym", "childWrapper");

const cl = classNameFactory("vc-gp-");

export function openGuildProfileModal(guild: Guild) {
    openModal(props =>
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
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

    const bannerUrl = guild.banner && IconUtils.getGuildBannerURL({
        id: guild.id,
        banner: guild.banner
    }, true).replace(/\?size=\d+$/, "?size=1024");

    const iconUrl = guild.icon && IconUtils.getGuildIconURL({
        id: guild.id,
        icon: guild.icon,
        canAnimate: true,
        size: 512
    });

    return (
        <div className={cl("root")}>
            {bannerUrl && currentTab === "ServerInfo" && (
                <img
                    className={cl("banner")}
                    src={bannerUrl}
                    alt=""
                    onClick={() => openImageModal(bannerUrl)}
                />
            )}

            <div className={cl("header")}>
                {guild.icon
                    ? <img
                        src={iconUrl}
                        alt=""
                        onClick={() => openImageModal(iconUrl)}
                    />
                    : <div aria-hidden className={classes(IconClasses.childWrapper, IconClasses.acronym)}>{guild.acronym}</div>
                }

                <div className={cl("name-and-description")}>
                    <Forms.FormTitle tag="h5" className={cl("name")}>{guild.name}</Forms.FormTitle>
                    {guild.description && <Forms.FormText>{guild.description}</Forms.FormText>}
                </div>
            </div>

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

function Owner(guildId: string, owner: User) {
    const guildAvatar = GuildMemberStore.getMember(guildId, owner.id)?.avatar;
    const ownerAvatarUrl =
        guildAvatar
            ? IconUtils.getGuildMemberAvatarURLSimple({
                userId: owner!.id,
                avatar: guildAvatar,
                guildId,
                canAnimate: true
            }, true)
            : IconUtils.getUserAvatarURL(owner, true);

    return (
        <div className={cl("owner")}>
            <img src={ownerAvatarUrl} alt="" onClick={() => openImageModal(ownerAvatarUrl)} />
            {Parser.parse(`<@${owner.id}>`)}
        </div>
    );
}

function ServerInfoTab({ guild }: GuildProps) {
    // FIXME: This doesn't rerender the mention correctly
    const [owner] = useAwaiter(() => UserUtils.fetchUser(guild.ownerId), {
        deps: [guild.ownerId],
        fallbackValue: null
    });

    const Fields = {
        "Server Owner": owner ? Owner(guild.id, owner) : "Loading...",
        "Created At": renderTimestampFromId(guild.id),
        "Joined At": dateFormat.format(guild.joinedAt),
        "Vanity Link": guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : "-",
        "Preferred Locale": guild.preferredLocale || "-",
        "Verification Level": ["None", "Low", "Medium", "High", "Highest"][guild.verificationLevel] || "?",
        "Nitro Boosts": guild.premiumSubscriberCount ?? 0,
        "Nitro Boost Level": guild.premiumTier ?? 0,
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

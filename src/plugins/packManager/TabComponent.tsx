/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { isNonNullish } from "@utils/guards";
import { findByPropsLazy } from "@webpack";
import { Avatar, Button, EmojiStore, GuildStore, InventoryStore, ScrollerThin, SortedGuildStore, TextInput, Toasts, useState, useStateFromStores } from "@webpack/common";
import { PropsWithChildren } from "react";

import * as PackManager from "./packManager";

const ScrollerClasses = findByPropsLazy("scroller", "listItems", "listWrapper");
const HeadingWrapperClasses = findByPropsLazy("categorySection", "header");
const HeadingTextClasses = findByPropsLazy("headerLabel", "headerIcon");
const ProfileListClasses = findByPropsLazy("emptyIconFriends", "emptyIconGuilds");
const GuildLabelClasses = findByPropsLazy("guildNick", "guildAvatarWithoutIcon");
const FlexClasses = findByPropsLazy("flex", "flexChild", "flexGutterSmall");

async function addPack(packId: string) {
    try {
        await PackManager.addPack(packId);
    } catch (e) {
        Toasts.show({
            message: (e as Error).message,
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
    }
}

async function removePack(packId: string) {
    try {
        await PackManager.removePack(packId);
    } catch (e) {
        Toasts.show({
            message: (e as Error).message,
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE
        });
    }
}

function CategorySection({ heading, children }: PropsWithChildren & { heading: string; }) {
    return <div className={HeadingWrapperClasses.categorySection}>
        <div className={[HeadingTextClasses.wrapper, HeadingWrapperClasses.header, HeadingTextClasses.header].join(" ")}>
            <span className={HeadingTextClasses.headerLabel}>{heading}</span>
        </div>
        {children}
    </div>;
}

function GuildAvatar({ id, icon }: { id: string, icon: string | undefined; }) {
    return <Avatar
        src={`https://cdn.discordapp.com/${isNonNullish(icon) ? `icons/${id}/${icon}` : `embed/avatars/${BigInt(id) % 6n}.png`}.png?size=128"`}
        size="SIZE_40"
        className={ProfileListClasses.listAvatar}
    ></Avatar>;
}

function GuildEntry({
    name,
    id,
    icon,
    emojiCount,
    animatedCount,
    remove
}: {
    name: string,
    id: string,
    icon: string | undefined,
    emojiCount: number,
    animatedCount: number,
    remove: boolean;
}) {
    return <>
        <GuildAvatar
            id={id}
            icon={icon}
        />
        <div className={ProfileListClasses.listRowContent}>
            <Flex style={{ justifyContent: "space-between" }}>
                <Flex flexDirection="column" style={{ justifyContent: "space-between", gap: "0", minWidth: "0", textOverflow: "ellipsis" }}>
                    <div className={ProfileListClasses.listName}>{name}</div>
                    <div className={GuildLabelClasses.guildNick}>{emojiCount} Emojis · {animatedCount} Animated</div>
                </Flex>
                {
                    remove ?
                        <Button color={Button.Colors.RED} onClick={async () => await removePack(id)}>Remove</Button>
                        : <Button color={Button.Colors.GREEN} onClick={async () => await addPack(id)}>Add</Button>
                }
            </Flex>
        </div>
    </>;
}

export default function () {
    const packs = useStateFromStores([InventoryStore], () => InventoryStore.getPacksForUser());
    const eligibleGuilds = useStateFromStores(
        [SortedGuildStore, GuildStore],
        () => SortedGuildStore.getFlattenedGuildIds()
            .map(id => GuildStore.getGuild(id))
            .filter(g => {
                // @ts-ignore discord-types doesn't have this prop yet
                return g.inventorySettings?.isEmojiPackCollectible;
            })
    );

    const [input, setInput] = useState("");

    return <ScrollerThin
        className={ScrollerClasses.scroller}
        paddingFix={true}
        fade={true}
    >
        <div style={{ paddingLeft: "16px", paddingRight: "8px" }}>
            <CategorySection heading="Add Pack">
                <Flex style={{ padding: "4px" }} className={FlexClasses.flex}>
                    <TextInput
                        className={FlexClasses.flexChild}
                        placeholder="Enter Guild ID here."
                        type="number"
                        pattern="[0-9]+"
                        disabled={PackManager.hasReachedLimit()}
                        value={input}
                        onChange={value => setInput(value.trim())}
                        style={{ fontSize: "14px", height: "var(--custom-button-button-md-height)" }}
                    />
                    <Button
                        disabled={input.length === 0 || !(/^\d+$/.test(input))}
                        color={Button.Colors.GREEN}
                        onClick={async () => {
                            await addPack(input);
                            setInput("");
                        }}
                    >
                        Add
                    </Button>
                </Flex>
            </CategorySection>
            {InventoryStore.getIsFetching() || InventoryStore.countPacksCollected() === 0 ?
                null
                : <CategorySection heading="Your Packs">
                    <ul>
                        {packs.map((pack, i) => {
                            return (
                                <li
                                    className={ProfileListClasses.listRow}
                                    key={i}
                                >
                                    <GuildEntry
                                        name={pack.name}
                                        id={pack.id}
                                        icon={pack.icon}
                                        emojiCount={pack.content.emojis.length}
                                        animatedCount={pack.content.emojis.filter(e => e.animated).length}
                                        remove={true}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </CategorySection>
            }
            <CategorySection heading="Your Servers">
                <ul>
                    {eligibleGuilds.map((guild, i) => {
                        return (
                            <li
                                className={ProfileListClasses.listRow}
                                key={i}
                            >
                                <GuildEntry
                                    name={guild.name}
                                    id={guild.id}
                                    icon={guild.icon}
                                    emojiCount={EmojiStore.getUsableGuildEmoji(guild.id).length}
                                    animatedCount={EmojiStore.getUsableGuildEmoji(guild.id).filter(e => e.animated).length}
                                    remove={isNonNullish(InventoryStore.getPackByPackId({ packId: guild.id }))}
                                />
                            </li>
                        );
                    })}
                </ul>
            </CategorySection>
        </div>
    </ScrollerThin>;
}

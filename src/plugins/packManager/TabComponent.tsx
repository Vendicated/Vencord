/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { isNonNullish } from "@utils/guards";
import { findByPropsLazy } from "@webpack";
import { Avatar, Button, EmojiStore, Forms, GuildStore, InventoryStore, React, ScrollerThin, SortedGuildStore, TextInput, Toasts, useState, useStateFromStores } from "@webpack/common";
import { PropsWithChildren } from "react";

import * as PackManager from "./packManager";

type PinnedGuild = Record<"id" | "name", string>;

const PINNED_GUILDS_KEY = "PackManager_pinnedGuilds";
const makeEmptyPinnedGuild = (): PinnedGuild => ({
    id: "",
    name: ""
});
let pinnedGuilds = [makeEmptyPinnedGuild()];
export const populate = async () => {
    pinnedGuilds = await DataStore.get(PINNED_GUILDS_KEY) ?? [makeEmptyPinnedGuild()];
};

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
        src={isNonNullish(icon) ? `https://cdn.discordapp.com/icons/${id}/${icon}.png?size=128` : ""}
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
    icon?: string,
    emojiCount?: number,
    animatedCount?: number,
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
                    <div className={GuildLabelClasses.guildNick}>{emojiCount ?? "?"} Emojis · {animatedCount ?? "?"} Animated</div>
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

export function TabComponent() {
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
                        style={{ height: "var(--custom-button-button-md-height)" }}
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
                        {packs.map((pack, index) => (
                            <li
                                className={ProfileListClasses.listRow}
                                key={`${pack.id}-${index}`}
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
                        ))}
                    </ul>
                </CategorySection>
            }
            {pinnedGuilds.length > 1 && <CategorySection heading="Pinned Servers">
                <ul>
                    {pinnedGuilds.slice(0, pinnedGuilds.length - 1).map((guild, index) => (<li
                        className={ProfileListClasses.listRow}
                        key={`${guild.id}-${index}`}
                    >
                        <GuildEntry
                            name={guild.name}
                            id={guild.id}
                            remove={isNonNullish(InventoryStore.getPackByPackId({ packId: guild.id }))}
                        />
                    </li>))}
                </ul>
            </CategorySection>}
            <CategorySection heading="Your Servers">
                <ul>
                    {eligibleGuilds.map((guild, index) => (
                        <li
                            className={ProfileListClasses.listRow}
                            key={`${guild.id}-${index}`}
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
                    ))}
                </ul>
            </CategorySection>
        </div>
    </ScrollerThin>;
}

function Input({ initialValue, type, pattern, onChange, placeholder }: {
    placeholder: string;
    type?: string,
    pattern?: string,
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            type={type}
            pattern={pattern}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}

export function PinnedGuildsComponent({ update }: { update: () => void; }) {
    async function onClickRemove(index: number) {
        if (index === pinnedGuilds.length - 1) return;
        pinnedGuilds.splice(index, 1);

        await DataStore.set(PINNED_GUILDS_KEY, pinnedGuilds);
        update();
    }

    async function onChange(e: string, index: number, key: string) {
        if (index === pinnedGuilds.length - 1)
            pinnedGuilds.push(makeEmptyPinnedGuild());

        pinnedGuilds[index][key] = e;

        if (pinnedGuilds[index].id === "" && pinnedGuilds[index].name === "" && index !== pinnedGuilds.length - 1)
            pinnedGuilds.splice(index, 1);

        await DataStore.set(PINNED_GUILDS_KEY, pinnedGuilds);
        update();
    }

    return <>
        <Forms.FormTitle tag="h4">Pinned Servers</Forms.FormTitle>
        <Flex flexDirection="column">
            {
                pinnedGuilds.map((guild, index) =>
                    <React.Fragment key={`${guild.id}-${index}`}>
                        <Flex style={{ gap: 0 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr", gap: "0.5em" }}>
                                <Input
                                    placeholder="ID"
                                    initialValue={guild.id}
                                    type="number"
                                    pattern="[0-9]+"
                                    onChange={e => onChange(e, index, "id")}
                                />
                                <Input
                                    placeholder="Name"
                                    initialValue={guild.name}
                                    onChange={e => onChange(e, index, "name")}
                                />
                            </div>
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => onClickRemove(index)}
                                style={{
                                    background: "none",
                                    color: "var(--status-danger)",
                                    ...(index === pinnedGuilds.length - 1
                                        ? {
                                            visibility: "hidden",
                                            pointerEvents: "none"
                                        }
                                        : {}
                                    )
                                }}
                            >
                                <DeleteIcon />
                            </Button>
                        </Flex>
                    </React.Fragment>
                )
            }
        </Flex>
    </>;
}

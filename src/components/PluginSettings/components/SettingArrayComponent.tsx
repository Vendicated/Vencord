/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType, PluginOptionList } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, Button, ChannelStore, Forms, GuildStore, IconUtils, React, Text, TextInput, useState } from "@webpack/common";
import { Channel, Guild } from "discord-types/general";
import { JSX } from "react";

import { ISettingElementProps } from ".";

const cl = classNameFactory("vc-plugin-modal-");

const UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");
const getDMChannelIcon = findByCodeLazy(".getChannelIconURL({");
const GroupDMAvatars = findComponentByCodeLazy(".AvatarSizeSpecs[", "getAvatarURL");


// FIXME saving is broken, so are indexes apparently?

const CloseIcon = () => {
    return <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" width="18" height="18">
        <path d="M17.3 18.7a1 1 0 0 0 1.4-1.4L13.42 12l5.3-5.3a1 1 0 0 0-1.42-1.4L12 10.58l-5.3-5.3a1 1 0 0 0-1.4 1.42L10.58 12l-5.3 5.3a1 1 0 1 0 1.42 1.4L12 13.42l5.3 5.3Z" />
    </svg>;
};

const CheckMarkIcon = () => {
    return <svg width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M21.7 5.3a1 1 0 0 1 0 1.4l-12 12a1 1 0 0 1-1.4 0l-6-6a1 1 0 1 1 1.4-1.4L9 16.58l11.3-11.3a1 1 0 0 1 1.4 0Z"></path>
    </svg>;
};


interface UserMentionComponentProps {
    id: string;
    channelId: string;
    guildId: string;
}

export function SettingArrayComponent({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    onError,
    id
}: ISettingElementProps<PluginOptionList>) {
    const [error, setError] = useState<string | null>(null);

    const [items, setItems] = useState<string[]>([]);

    if (items.length === 0 && pluginSettings[id].length !== 0) {
        setItems(pluginSettings[id]);
    }

    const removeButton = (index: number) => {
        return (
            <Button
                size={Button.Sizes.MIN}
                onClick={() => removeItem(index)}
                style={
                    { background: "none", }
                }
            >
                <CloseIcon />
            </Button>
        );
    };

    const guildIcon = (guild: Guild) => {
        const icon = guild?.icon == null ? undefined : IconUtils.getGuildIconURL({
            id: guild.id,
            icon: guild.icon,
            size: 16,
        });
        return icon != null && <img className={cl("guild-icon")} src={icon} alt="" />;

    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            setItems([]);
            pluginSettings[id] = [];
            return;
        }
        setItems(items.filter((_, i) => i !== index));
        pluginSettings[id] = items;
    };

    function renderGuildView() {
        return items.map(item => GuildStore.getGuild(item))
            .map((guild, index) => (
                <Flex
                    flexDirection="row"
                    key={index}
                    style={{
                        gap: "1px",
                    }}
                >
                    {guild ? (
                        <div className={cl("name")} style={{ color: "var(--text-normal)" }}>
                            <span style={{ display: "inline-flex", alignItems: "center" }}>
                                {guildIcon(guild)}
                                <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{guild.name}</Text>
                            </span>
                        </div>
                    ) : <Text variant="text-sm/semibold">{"Unknown Guild"}</Text>}
                    {removeButton(index)}
                </Flex>
            ));
    }

    function renderChannelView() {

        const getChannelSymbol = (type: number) => {
            switch (type) {
                case 2:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z"></path>
                        <path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z"></path>
                    </svg>;

                case 5:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" fillRule="evenodd" d="M19.56 2a3 3 0 0 0-2.46 1.28 3.85 3.85 0 0 1-1.86 1.42l-8.9 3.18a.5.5 0 0 0-.34.47v10.09a3 3 0 0 0 2.27 2.9l.62.16c1.57.4 3.15-.56 3.55-2.12a.92.92 0 0 1 1.23-.63l2.36.94c.42.27.79.62 1.07 1.03A3 3 0 0 0 19.56 22h.94c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5h-.94Zm-8.53 15.8L8 16.7v1.73a1 1 0 0 0 .76.97l.62.15c.5.13 1-.17 1.12-.67.1-.41.29-.78.53-1.1Z" clipRule="evenodd"></path>
                        <path fill="currentColor" d="M2 10c0-1.1.9-2 2-2h.5c.28 0 .5.22.5.5v7a.5.5 0 0 1-.5.5H4a2 2 0 0 1-2-2v-4Z"></path>
                    </svg>;

                case 13:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19.61 18.25a1.08 1.08 0 0 1-.07-1.33 9 9 0 1 0-15.07 0c.26.42.25.97-.08 1.33l-.02.02c-.41.44-1.12.43-1.46-.07a11 11 0 1 1 18.17 0c-.33.5-1.04.51-1.45.07l-.02-.02Z"></path>
                        <path fill="currentColor" d="M16.83 15.23c.43.47 1.18.42 1.45-.14a7 7 0 1 0-12.57 0c.28.56 1.03.6 1.46.14l.05-.06c.3-.33.35-.81.17-1.23A4.98 4.98 0 0 1 12 7a5 5 0 0 1 4.6 6.94c-.17.42-.13.9.18 1.23l.05.06Z"></path>
                        <path fill="currentColor" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.33 20.03c-.25.72.12 1.5.8 1.84a10.96 10.96 0 0 0 9.73 0 1.52 1.52 0 0 0 .8-1.84 6 6 0 0 0-11.33 0Z"></path>
                    </svg>;

                case 15:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z"></path>
                        <path fill="currentColor" d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z"></path>
                    </svg>;

                default: // Text channel icon
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" fillRule="evenodd" d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z" clipRule="evenodd"></path>
                    </svg>;
            }
        };

        // collapsible guild list with channels in it
        const channels: Record<string, Channel[]> = {};
        const dmChannels: Channel[] = [];
        const elements: JSX.Element[] = [];
        for (const item of items) {
            const channel = ChannelStore.getChannel(item);
            if (!channel) {
                continue;
            }
            if (channel.isDM() || channel.isGroupDM()) {
                dmChannels.push(channel);
                continue;
            }
            if (!channels[channel.guild_id]) {
                channels[channel.guild_id] = [];
            }
            channels[channel.guild_id].push(channel);
        }

        if (dmChannels.length > 0) {
            elements.push(
                <details>
                    <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>DMs</summary>
                    <div style={{ paddingLeft: "16px" }}>
                        {dmChannels.map((channel, index) => (
                            <Flex
                                flexDirection="row"
                                key={index}
                                style={{
                                    gap: "1px",
                                    marginBottom: "8px",
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                    {channel.recipients.length >= 2 && channel.icon == null ? (
                                        <GroupDMAvatars recipients={channel.recipients} size="SIZE_16" />
                                    ) : (
                                        <Avatar src={getDMChannelIcon(channel)} size="SIZE_16" />
                                    )}
                                    <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{channel.name}</Text>
                                    {removeButton(index)}
                                </span>
                            </Flex>
                        ))}
                    </div>
                </details>
            );
        }
        Object.keys(channels).forEach(guildId => {
            const guild = GuildStore.getGuild(guildId);
            elements.push(
                <details>
                    {!guild ? <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>Unknown Guild</summary> : (
                        <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>
                            <span style={{ display: "inline-flex", alignItems: "center" }}>
                                {guildIcon(guild)}
                                <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{guild.name}</Text>
                            </span>
                        </summary>
                    )}
                    <div style={{ paddingLeft: "16px", color: "var(--text-normal)" }}>
                        {channels[guildId].map((channel, index) => (
                            <Flex
                                flexDirection="row"
                                key={index}
                                style={{
                                    gap: "1px",
                                    marginBottom: "8px"
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center" }}>
                                    {getChannelSymbol(channel.type)}
                                    <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{channel.name}</Text>
                                    {removeButton(index)}
                                </span>
                            </Flex>
                        ))}
                    </div>
                </details>
            );
        });
        return elements;
    }

    function handleSubmit() {
        const inputElement = document.getElementById(`vc-plugin-modal-input-${option.type === OptionType.CHANNELS ? "channel" : option.type === OptionType.GUILDS ? "guild" : option.type === OptionType.USERS ? "user" : "string"}`) as HTMLInputElement;
        if (!inputElement || inputElement.value === "") {
            return;
        }
        // TODO add picker for users etc?
        if (option.type !== OptionType.ARRAY && !(inputElement.value.length >= 18 && inputElement.value.length <= 19 && !isNaN(Number(inputElement.value)))) {
            setError("Value is not a valid snowflake ID");
            return;
        }

        if (items.includes(inputElement.value)) {
            setError("This item is already added");
            inputElement.value = "";
            return;
        }

        setItems([...items, inputElement.value]);
        console.log(pluginSettings[id]);
        pluginSettings[id] = items;
        console.log(pluginSettings[id]);
        inputElement.value = "";
    }


    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16} type="description">{option.description}</Forms.FormText>
            <ErrorBoundary noop>
                {option.type === OptionType.ARRAY || option.type === OptionType.USERS ?
                    items.map((item, index) => (
                        <Flex
                            flexDirection="row"
                            key={index}
                            style={{
                                gap: "1px",
                            }}
                        >
                            {option.type === OptionType.USERS ? (
                                <UserMentionComponent
                                    userId={item}
                                    className="mention"
                                />
                            ) : (
                                <span style={{ color: "var(--text-normal)" }}>{item}</span>
                            )}
                            {removeButton(index)}
                        </Flex>
                    )) : option.type === OptionType.CHANNELS ?
                        renderChannelView() : renderGuildView()
                }
                <Flex
                    flexDirection="row"
                    style={{
                        gap: "5px",
                        marginTop: "10px",
                    }}
                >
                    <TextInput
                        type="text"
                        placeholder="Add Item (as ID)"
                        id={`vc-plugin-modal-input-${option.type === OptionType.CHANNELS ? "channel" : option.type === OptionType.GUILDS ? "guild" : option.type === OptionType.USERS ? "user" : "string"}`}
                    />
                    <Button
                        size={Button.Sizes.MIN}
                        onClick={handleSubmit}
                        style={{ background: "none" }}
                    >
                        <CheckMarkIcon />
                    </Button>
                </Flex>
            </ErrorBoundary>
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}

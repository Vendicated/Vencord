/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
// import SearchModal from "@components/SearchModal";
import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType, PluginOptionArray } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import {
    Button,
    Flex,
    Forms,
    GuildStore,
    IconUtils,
    React,
    Text,
    TextInput,
    useEffect, UserStore,
    useState,
} from "@webpack/common";
import { Guild } from "discord-types/general";

import { ISettingElementProps } from ".";
import { DeleteIcon, PlusIcon } from "@components/Icons";

const cl = classNameFactory("vc-plugin-modal-");

const UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");
const getDMChannelIcon = findByCodeLazy(".getChannelIconURL({");
const GroupDMAvatars = findComponentByCodeLazy(".AvatarSizeSpecs[", "getAvatarURL");


const QuestionMarkIcon = () => {
    return <svg width="40" height="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4zm0 20a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2.25-7.5c-.69.69-1.5 1.125-1.5 2.25h-3c0-2.25 1.5-3 2.25-3.75.75-.75 1.5-1.5 1.5-2.25 0-1.5-1.125-2.25-2.25-2.25s-2.25.75-2.25 2.25h-3c0-3 2.25-5.25 5.25-5.25s5.25 2.25 5.25 5.25c0 1.5-.75 2.625-1.5 3.375z" />
    </svg>;
};

const SearchIcon = () => {
    return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="16" y1="16" x2="22" y2="22"></line>
    </svg>;
};

export const SettingArrayComponent = ErrorBoundary.wrap(function SettingArrayComponent({
    option,
    pluginSettings,
    definedSettings,
    onChange,
    onError,
    id
}: ISettingElementProps<PluginOptionArray>) {
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<string[]>(ensureSettingsMigrated() || []);
    const [text, setText] = useState<string>("");

    function ensureSettingsMigrated(): string[] | undefined {
        // in case the settings get manually overridden without a restart of Vencord itself this will prevent crashing
        if (pluginSettings[id] == null || Array.isArray(pluginSettings[id])) {
            return pluginSettings[id];
        }
        let migrated: string[];
        if (typeof option.oldStringSeparator === "string" || option.oldStringSeparator instanceof RegExp) {
            migrated = pluginSettings[id]?.split(option.oldStringSeparator);
        } else if (typeof option.oldStringSeparator === "function") {
            migrated = option.oldStringSeparator(pluginSettings[id]);
        } else {
            throw new Error(`Invalid oldStringSeparator for in setting ${id} for plugin ${definedSettings?.pluginName || "Unknown plugin"}`);
        }
        onChange(migrated);
        return migrated;
    }

    const removeButton = (id: string) => {
        return (
            <Button
                className={cl("remove-button")}
                size={Button.Sizes.MIN}
                onClick={() => removeItem(id)}
                style={{ background: "none", color: "red" }}
                look={Button.Looks.BLANK}
            >
                <DeleteIcon />
            </Button>
        );
    };

    const removeItem = (itemId: string) => {
        const idx = items.indexOf(itemId);
        setItems(items.filter((_, index) => index !== idx));
    };

    useEffect(() => { // TODO fix error-proofing everything with the new components
        if (text === "") {
            setError(null);
            return;
        }

        if (items.includes(text)) {
            setError("This item is already added");
            return;
        }

        if (option.type !== OptionType.ARRAY && !isNaN(Number(text)) && text !== "") {
            if (text.length >= 18 && text.length <= 19) {
                setError(null);
            } else {
                setError("Invalid ID");
            }
        } else {
            const isValid = option.isValid?.call(definedSettings, text) ?? true;
            if (typeof isValid === "string") setError(isValid);
            else if (!isValid) setError("Invalid input provided.");
            else setError(null);
        }
    }, [text]);


    useEffect(() => {
        pluginSettings[id] = items;
        onChange(items);
    }, [items]);

    useEffect(() => {
        onError(error !== null);
    }, [error]);

    /* function openSearchModal(val?: string) {
        return openModal(modalProps => (
            <SearchModal
                modalProps={modalProps}
                input={val}
                subText={"All selected items will be added to " + wordsToTitle(wordsFromCamel(id))}
                searchType={option.type === OptionType.USERS ? "USERS" : option.type === OptionType.CHANNELS ? "CHANNELS" : "GUILDS"}
                onSubmit={values => setItems([...items, ...values.map(v => v.id)])}
                excludeIds={items}
            />
        ));
    } */

    const guildIcon = (guild: Guild) => {
        const icon = guild?.icon == null ? undefined : IconUtils.getGuildIconURL({
            id: guild.id,
            icon: guild.icon,
            size: 32,
        });
        return icon != null ? <img className={cl("guild-icon")} src={icon} alt="" /> : QuestionMarkIcon();
    };


    function renderGuildView() {
        return items.map(item => GuildStore.getGuild(item) || item)
            .map((guild, index) => (
                <Flex
                    flexDirection="row"
                    key={index}
                    style={{
                        gap: "1px",
                        marginBottom: "8px"
                    }}
                >
                    <div className={cl("name")} style={{ color: "var(--text-normal)" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {guildIcon(guild)}
                            <TextInput
                                value={guild?.name ?? `Unknown Guild (${guild})`}
                                disabled={true}
                            />

                        </span>
                    </div>
                    {removeButton(typeof guild !== "string" ? guild.id : guild)}
                </Flex>
            ));
    }

    function renderChannelView() {
        return <></>;

        const getChannelSymbol = (type: number) => {
            switch (type) {
                case 2:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" />
                        <path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
                    </svg>;

                case 5:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" fillRule="evenodd" d="M19.56 2a3 3 0 0 0-2.46 1.28 3.85 3.85 0 0 1-1.86 1.42l-8.9 3.18a.5.5 0 0 0-.34.47v10.09a3 3 0 0 0 2.27 2.9l.62.16c1.57.4 3.15-.56 3.55-2.12a.92.92 0 0 1 1.23-.63l2.36.94c.42.27.79.62 1.07 1.03A3 3 0 0 0 19.56 22h.94c.83 0 1.5-.67 1.5-1.5v-17c0-.83-.67-1.5-1.5-1.5h-.94Zm-8.53 15.8L8 16.7v1.73a1 1 0 0 0 .76.97l.62.15c.5.13 1-.17 1.12-.67.1-.41.29-.78.53-1.1Z" clipRule="evenodd" />
                        <path fill="currentColor" d="M2 10c0-1.1.9-2 2-2h.5c.28 0 .5.22.5.5v7a.5.5 0 0 1-.5.5H4a2 2 0 0 1-2-2v-4Z" />
                    </svg>;

                case 13:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M19.61 18.25a1.08 1.08 0 0 1-.07-1.33 9 9 0 1 0-15.07 0c.26.42.25.97-.08 1.33l-.02.02c-.41.44-1.12.43-1.46-.07a11 11 0 1 1 18.17 0c-.33.5-1.04.51-1.45.07l-.02-.02Z" />
                        <path fill="currentColor" d="M16.83 15.23c.43.47 1.18.42 1.45-.14a7 7 0 1 0-12.57 0c.28.56 1.03.6 1.46.14l.05-.06c.3-.33.35-.81.17-1.23A4.98 4.98 0 0 1 12 7a5 5 0 0 1 4.6 6.94c-.17.42-.13.9.18 1.23l.05.06Z" />
                        <path fill="currentColor" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6.33 20.03c-.25.72.12 1.5.8 1.84a10.96 10.96 0 0 0 9.73 0 1.52 1.52 0 0 0 .8-1.84 6 6 0 0 0-11.33 0Z" />
                    </svg>;

                case 15:
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M18.91 12.98a5.45 5.45 0 0 1 2.18 6.2c-.1.33-.09.68.1.96l.83 1.32a1 1 0 0 1-.84 1.54h-5.5A5.6 5.6 0 0 1 10 17.5a5.6 5.6 0 0 1 5.68-5.5c1.2 0 2.32.36 3.23.98Z" />
                        <path fill="currentColor" d="M19.24 10.86c.32.16.72-.02.74-.38L20 10c0-4.42-4.03-8-9-8s-9 3.58-9 8c0 1.5.47 2.91 1.28 4.11.14.21.12.49-.06.67l-1.51 1.51A1 1 0 0 0 2.4 18h5.1a.5.5 0 0 0 .49-.5c0-4.2 3.5-7.5 7.68-7.5 1.28 0 2.5.3 3.56.86Z" />
                    </svg>;

                default: // Text channel icon
                    return <svg style={{ color: " var(--channel-icon)" }} className={cl("icon")} aria-hidden="true" role="img" width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path fill="currentColor" fillRule="evenodd" d="M10.99 3.16A1 1 0 1 0 9 2.84L8.15 8H4a1 1 0 0 0 0 2h3.82l-.67 4H3a1 1 0 1 0 0 2h3.82l-.8 4.84a1 1 0 0 0 1.97.32L8.85 16h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1 1 0 1 0 0-2h-3.82l.67-4H21a1 1 0 1 0 0-2h-3.82l.8-4.84a1 1 0 1 0-1.97-.32L15.15 8h-4.97l.8-4.84ZM14.15 14l.67-4H9.85l-.67 4h4.97Z" clipRule="evenodd" />
                    </svg>;
            }
        };

        // const channels: Record<string, Channel[]> = {};  TODO remake
        // const dmChannels: Channel[] = [];
        // const elements: React.JSX.Element[] = [];
        //
        // // to not remove items while iterating
        // const invalidChannels: string[] = [];
        //
        // for (const item of items) {
        //     const channel = ChannelStore.getChannel(item);
        //     if (!channel) {
        //         invalidChannels.push(item);
        //         continue;
        //     }
        //     if (channel.isDM() || channel.isGroupDM()) {
        //         dmChannels.push(channel);
        //         continue;
        //     }
        //     if (!channels[channel.guild_id]) {
        //         channels[channel.guild_id] = [];
        //     }
        //     channels[channel.guild_id].push(channel);
        // }
        //
        // for (const channel of invalidChannels) {
        //     removeItem(channel);
        // }
        //
        // const userMention = (channel: Channel) => {
        //     return <UserMentionComponent
        //         userId={channel.recipients[0]}
        //         className="mention"
        //     />;
        // };
        //
        // const gdmComponent = (channel: Channel) => {
        //     return <span style={{ display: "inline-flex", alignItems: "center" }}>
        //         {channel.recipients.length >= 2 && channel.icon == null ? (
        //             <GroupDMAvatars recipients={channel.recipients} size="SIZE_16" />
        //         ) : (
        //             <Avatar src={getDMChannelIcon(channel)} size="SIZE_16" />
        //         )}
        //         <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{channel.name}</Text>
        //     </span>;
        // };
        //
        // let idx = -1;
        //
        // if (dmChannels.length > 0) {
        //     elements.push(
        //         <details>
        //             <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>DMs</summary>
        //             <div style={{ paddingLeft: "16px" }}>
        //                 {dmChannels.map(channel => {
        //                     idx += 1;
        //                     return <Flex
        //                         flexDirection="row"
        //                         key={idx}
        //                         style={{
        //                             gap: "1px",
        //                             marginBottom: "8px",
        //                         }}
        //                     >
        //                         {channel.recipients.length === 1 ? userMention(channel) : gdmComponent(channel)}
        //                         {removeButton(channel.id)}
        //                     </Flex>;
        //                 })}
        //             </div>
        //         </details >
        //     );
        // }
        //
        // const guilds: { name: string; guild: React.JSX.Element }[] = [];
        //
        // Object.keys(channels).forEach(guildId => {
        //     const guild = GuildStore.getGuild(guildId);
        //     guilds.push(
        //         { name: guild?.name ?? `Unknown Guild (${guildId})`, guild: (
        //         <details>
        //             {!guild ? <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>{`Unknown Guild (${guildId})`}</summary> : (
        //                 <summary style={{ color: "var(--text-normal)", marginBottom: "8px" }}>
        //                     <span style={{ display: "inline-flex", alignItems: "center" }}>
        //                         {guildIcon(guild)}
        //                         <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{guild.name}</Text>
        //                     </span>
        //                 </summary>
        //             )}
        //             <div style={{ paddingLeft: "16px", color: "var(--text-normal)" }}>
        //                 {channels[guildId].map(channel => {
        //                     idx += 1;
        //                     return <Flex
        //                         flexDirection="row"
        //                         key={idx}
        //                         style={{
        //                             gap: "1px",
        //                             marginBottom: "8px"
        //                         }}>
        //                         <span style={{ display: "inline-flex", alignItems: "center" }}>
        //                             {getChannelSymbol(channel.type)}
        //                             <Text variant="text-sm/semibold" style={{ marginLeft: "4px" }}>{channel.name}</Text>
        //                             {removeButton(channel.id)}
        //                         </span>
        //                     </Flex>;
        //                 })}
        //             </div>
        //         </details>) }
        //     );
        // });
        //
        // guilds.sort((a, b) => a.name.localeCompare(b.name));
        //
        // for (const guild of guilds) {
        //     elements.push(guild.guild);
        // }
        //
        // return elements;
    }

    return (
        <Forms.FormSection>
             <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
             <Forms.FormText className={Margins.bottom8} type="description">{option.description}</Forms.FormText>
                {option.type === OptionType.ARRAY || option.type === OptionType.USERS ?
                    items.map((item, index) => (
                        <Flex
                            flexDirection="row"
                            key={index}
                            style={{
                                gap: "1px",
                                marginBottom: "8px"
                            }}
                        >
                            {option.type === OptionType.USERS ? (
                                <UserMentionComponent
                                    userId={item}
                                    className="mention"
                                />
                            ) : (
                                <TextInput
                                    value={item}
                                    onChange={v => {
                                        const idx = items.indexOf(item);
                                        setItems(items.map((i, index) => index === idx ? v : i));
                                    }}
                                    placeholder="Enter Text"
                                />
                            )}
                            {removeButton(item)}
                        </Flex>
                    )) : option.type === OptionType.CHANNELS ?
                        renderChannelView() : renderGuildView()
                }
                <Flex
                    flexDirection="row"
                    style={{
                        gap: "3px"
                    }}
                >
                    <TextInput
                        type="text"
                        placeholder={option.type === OptionType.ARRAY ? "Enter Text" : "Enter Text or ID"}
                        id={cl("input")}
                        onChange={v => setText(v)}
                        value={text}
                    />
                    {option.type !== OptionType.CHANNELS || (!isNaN(Number(text)) && text !== "") ?
                        // For channels, there will be only search modals, due to the channel names duplicating being more likely.
                        // However, in each guild section in the channel view users will find an extra text input
                        // through which they can search specifically channels for those guilds
                        // however, this requires the guild to be already added in the first place to be rendered.
                        <Button
                            size={Button.Sizes.MIN}
                            id={cl("add-button")}
                            // idk why discord is so fucked with button styles here but passing it as a prop doesn't work
                            style={{ background: "none", color: "var(--text-normal)" }}
                            onClick={() => {
                                if (option.type === OptionType.ARRAY && text !== "") {
                                    setItems([...items, text]);
                                    setText("");
                                }
                                else if (option.type === OptionType.GUILDS) {
                                    const found = Object.values(GuildStore.getGuilds()).find(guild => {
                                        if (guild.name.toLowerCase().includes(text.toLowerCase())) {
                                            // this is not the best solution, however i think users can figure it out
                                            // and usually you wouldn't input a completely generic text
                                            setItems([...items, guild.id]);
                                            setText("");
                                            return true;
                                        }
                                    });
                                    if (!found) {
                                        setError("Guild not found"); // FIXME open search modal with this text
                                    }
                                } else if (option.type === OptionType.USERS) {
                                    const found = Object.values(UserStore.getUsers()).find(user => {
                                        if (
                                            // since new usernames are unique, this works fine
                                            // however the globalName check might be too broad(?)
                                            user.username.toLowerCase() === text.toLowerCase()
                                            // @ts-ignore outdated lib
                                            || user.globalName?.toLowerCase().includes(text.toLowerCase())
                                        ) {
                                            setItems([...items, user.id]);
                                            setText("");
                                            return true;
                                        }
                                    });
                                    if (!found) {
                                        setError("User not found"); // FIXME open search modal with this text
                                    }
                                }
                            }}
                            disabled={text === "" || error != null}
                            look={Button.Looks.BLANK}
                        >
                            <PlusIcon />
                        </Button> :
                        < Button
                            id={cl("search-button")}
                            size={Button.Sizes.MIN}
                            style={{ background: "none", color: "var(--text-normal)" }}
                            // FIXME onClick={() => openSearchModal(text)}
                            look={Button.Looks.BLANK}
                        >
                            <SearchIcon />
                        </Button>
                    }
                </Flex>
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
});

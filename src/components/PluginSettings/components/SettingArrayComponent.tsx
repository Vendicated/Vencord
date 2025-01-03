/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { OptionType, PluginOptionList } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Button, ChannelStore, Forms, GuildStore, React, TextInput, useState } from "@webpack/common";
import { Channel } from "discord-types/general";

import { ISettingElementProps } from ".";

const UserMentionComponent = findComponentByCodeLazy(".USER_MENTION)");

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

    const removeItem = (index: number) => {
        if (items.length === 1) {
            setItems([]);
            pluginSettings[id] = [];
            return;
        }
        setItems(items.filter((_, i) => i !== index));
        pluginSettings[id] = items;
    };

    function wrapChannel(id: string) {
        const channel = ChannelStore.getChannel(id) as Channel;
        if (!channel) {
            return "Unknown Channel";
        }
        return (GuildStore.getGuild(channel.guild_id)?.name ?? "Unknown Guild") + " - " + channel.name;
    }

    /* Pseudocode for handling submit */
    function handleSubmit() {
        // Handle the submit action for the specific item
        // This could involve updating the state, making an API call, etc.
        // Clear the input field after submission
        const inputElement = document.getElementById(`vc-plugin-modal-input-${option.type === OptionType.CHANNELS ? "channel" : option.type === OptionType.GUILDS ? "guild" : option.type === OptionType.USERS ? "user" : "string"}`) as HTMLInputElement;
        if (!inputElement || inputElement.value === "") {
            return;
        }
        // TODO add searching for users, channels, and guilds lol
        setItems([...items, inputElement.value]);
        pluginSettings[id] = items;
        inputElement.value = "";
    }


    // FIXME make channels and guilds nicer!
    // TODO make string type work
    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16} type="description">{option.description}</Forms.FormText>
            <ErrorBoundary noop>
                <React.Fragment>
                    {items.map((item, index) => (
                        <Flex
                            flexDirection="row"
                            style={{
                                gap: "1px",
                            }}
                        >
                            {option.type === OptionType.USERS ? (
                                <UserMentionComponent
                                    userId={item}
                                    className="mention"
                                />
                            ) : option.type === OptionType.CHANNELS ? (
                                <span style={{ color: "white" }}>{wrapChannel(item)}</span>
                            ) : option.type === OptionType.GUILDS ? (
                                <span style={{ color: "white" }}>
                                    {GuildStore.getGuild(item)?.name || "Unknown Guild"}
                                </span>
                                // TODO add logo to guild and channel?
                            ) : (
                                <span style={{ color: "white" }}>{item}</span>
                            )}
                            <Button
                                size={Button.Sizes.MIN}
                                onClick={() => removeItem(index)}
                                style={
                                    { background: "none", }
                                }
                            >
                                <CloseIcon />
                            </Button>
                        </Flex>
                    ))}
                    <Flex
                        flexDirection="row"
                        style={{
                            gap: "5px",
                            marginTop: "10px",
                        }}
                    >
                        {/* Add a single input field */}
                        <TextInput
                            type="text"
                            placeholder="Add Item"
                            id={`vc-plugin-modal-input-${option.type === OptionType.CHANNELS ? "channel" : option.type === OptionType.GUILDS ? "guild" : option.type === OptionType.USERS ? "user" : "string"}`}
                        />
                        {/* Add a submit button */}
                        <Button
                            size={Button.Sizes.MIN}
                            onClick={handleSubmit}
                            style={{ background: "none" }}
                        >
                            <CheckMarkIcon />
                        </Button>
                    </Flex>
                </React.Fragment>
            </ErrorBoundary>


            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { IPluginOptionComponentProps, OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Button, Flex, Select, Text, TextInput } from "webpack/common/components";
import { useEffect, useState } from "webpack/common/react";

import * as betterTTS from "./index";
import AudioPlayer, { getDefaultVoice, getVoices, sourcesOptions } from "./libraries/AudioPlayer";
import { ChannelStore, GuildStore, UserSettingsProtoStore, UserStore } from "./stores";

const settings = definePluginSettings({
    enableTts: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Enables/Disables the TTS.",
        onChange: (value: boolean) => {
            if (value) {
                AudioPlayer.stopTTS();
            }
        }
    },
    enableTtsCommand: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Allow playback and usage of /tts command.",
        onChange: (value: boolean) => {
            UserSettingsProtoStore.settings.textAndImages.enableTtsCommand.value = value;
            betterTTS.default.messageRecieved;
        },
    },
    enableUserAnnouncement: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Enables/Disables the User Announcement when join/leaves the channel.",
    },
    enableMessageReading: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Enables/Disables the message reading from channels.",
    },
    messagesChannelsToRead: {
        type: OptionType.SELECT,
        description: "Choose the channels you want messages to be read.",
        options: [
            { label: "Never", value: "never" },
            { label: "All Channels", value: "allChannels" },
            { label: "Focused Channel", value: "focusedChannel" },
            { label: "Connected Channel", value: "connectedChannel" },
            { label: "Focused Server Channels", value: "focusedGuildChannels" },
            { label: "Connected Server Channels", value: "connectedGuildChannels" }
        ]
    },
    ignoreWhenConnected: {
        type: OptionType.SELECT,
        description: "Choose the channels you want messages to be ignored while in a voice channel.",
        options: [
            { label: "None", value: "none" },
            { label: "Subscribed", value: "subscribed" },
            { label: "Focused/Connected", value: "focusedConnected" },
            { label: "All", value: "all" }
        ]
    },
    subscribedChannels: {
        type: OptionType.COMPONENT,
        component: DropdownButtonGroup,
        componentProps: { id: "subscribedChannels", getNameFunction: ChannelStore.getChannel },
        default: new Array<string>()
    },
    subscribedGuilds: {
        type: OptionType.COMPONENT,
        component: DropdownButtonGroup,
        componentProps: { id: "subscribedGuilds", getNameFunction: GuildStore.getGuild },
        default: new Array<string>()
    },
    channelInfoReading: {
        type: OptionType.SELECT,
        description: "Sets which of the channel should prepend server and/or channel name.",
        options: [
            { label: "None", value: "none" },
            { label: "Subscribed", value: "subscribed" },
            { label: "Focused/Connected", value: "focusedConnected" },
            { label: "All", value: "all" }
        ]
    },
    messagePrependGuild: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Reads also the name of the server where the message comes from."
    },
    messagePrependChannel: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Reads also the name of the channel where the message comes from."
    },
    messagePrependNames: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Reads also the name of the user that sent the message."
    },
    messageNamesReading: {
        type: OptionType.SELECT,
        description: "Sets which of the names of a user is used by tts.",
        options: [
            { label: "Default", value: "default" },
            { label: "Username", value: "userName" },
            { label: "Display Name", value: "globalName" },
            { label: "Friend Name", value: "friendName" },
            { label: "Server Name", value: "serverName" }
        ]
    },
    messageLinksReading: {
        type: OptionType.SELECT,
        description: "Select how links should be read by TTS.",
        options: [
            { label: "Remove Links", value: "remove" },
            { label: "Read Only Domain", value: "domain" },
            { label: "Sobstitute With word URL", value: "sobstitute" },
            { label: "Keep URL", value: "keep" }
        ]
    },
    messageSpoilersReading: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "If enabled, it will read messages spoilers content."
    },
    ttsSelectSourceAndVoice: {
        type: OptionType.COMPONENT,
        component: DropdownSourceAndVoices
    },
    ttsSource: {
        type: OptionType.CUSTOM
    },
    ttsVoice: {
        type: OptionType.CUSTOM
    },
    mutedUsers: {
        type: OptionType.COMPONENT,
        component: DropdownButtonGroup,
        componentProps: { id: "mutedUsers", getNameFunction: UserStore.getUser },
        default: new Array<string>()
    },
    blockBlockedUsers: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Blocks blocked users from TTS."
    },
    blockIgnoredUsers: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Blocks ignored users from TTS."
    },
    blockNotFriendusers: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Blocks not friends users from TTS."
    },
    blockMutedChannels: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Blocks muteds channels from TTS."
    },
    blockMutedGuilds: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Blocks muteds server/guilds from TTS."
    },
    ttsVolume: {
        type: OptionType.SLIDER,
        default: 100,
        description: "Changes the volume of the TTS.",
        componentProps: {
            min: 0,
            max: 100,
            step: 1,
            units: "%"
        },
        stickToMarkers: false,
        markers: [0, 25, 50, 75, 100],
        onChange: (value: number) => {
            AudioPlayer.updateVolume(value / 100);
        }
    },
    ttsSpeechRate: {
        type: OptionType.SLIDER,
        default: 1,
        description: "Changes the speed of the TTS.",
        componentProps: {
            min: 0.1,
            max: 2,
            step: 0.05,
            units: "x"
        },
        stickToMarkers: false,
        markers: [0.1, 1, 1.25, 1.5, 1.75, 2],
        onChange: (value: number) => {
            AudioPlayer.updateRate(value);
        }
    },
    ttsPreview: {
        type: OptionType.COMPONENT,
        component: PreviewTTS
    },
    ttsDelayBetweenMessages: {
        type: OptionType.NUMBER,
        default: 1000,
        description: "Only works for Syncronous messages (ms).",
        onChange: (value: number) => {
            AudioPlayer.updateDelay(value);
        },
        placeholder: "Delay in milliseconds",
    },
    textReplacerRules: {
        type: OptionType.COMPONENT,
        component: TextReplaceDropdown,
        default: new Array<{ regex: string; replacement: string; }>()
    },
    /* ttsToggle: {
        type: OptionType.KEYBIND,
        description: "Shortcut to toggle the TTS.",
        clearable: true,
        global: false,
        default: [],
        onChange: (value: string[]) => {
            updateToggleKeys(value);
        }
    }, */
});
export default settings;


function DropdownSourceAndVoices({ }) {
    const initialSource = settings.store.ttsSource;
    const initialVoice = settings.store.ttsVoice;

    const optionsSources = sourcesOptions;
    const [selectedSource, setSelectedSource] = useState(initialSource);

    const [optionsVoices, setOptionsVoices] = useState(getVoices(initialSource));
    const [selectedVoice, setSelectedVoice] = useState(initialVoice || getDefaultVoice(initialSource));

    useEffect(() => {
        settings.store.ttsSource = selectedSource;
        settings.store.ttsVoice = selectedVoice;

        AudioPlayer.updateTTSSourceAndVoice(selectedSource, selectedVoice);
    }, [selectedVoice]);

    return (
        <SettingsSection description="Select the TTS source and voice you want to use." name="TTS Source and Voice" error={null}>
            <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.BETWEEN} align={Flex.Align.CENTER}>
                <Select
                    options={optionsSources}
                    placeholder="Select TTS Source"
                    closeOnSelect={true}
                    select={(value: string) => {
                        setSelectedSource(value);
                        setOptionsVoices(getVoices(value));
                        setSelectedVoice(getDefaultVoice(value));
                    }}
                    isSelected={(value: string) => selectedSource === value}
                    serialize={(value: string) => String(value)}
                />
                <Select
                    options={optionsVoices}
                    placeholder="Select TTS Voice"
                    closeOnSelect={true}
                    select={(value: string) => {
                        setSelectedVoice(value);
                    }}
                    isSelected={(value: string) => selectedVoice === value}
                    serialize={(value: string) => String(value)}
                />
            </Flex>
        </SettingsSection>
    );
}

function DropdownButtonGroup({ setValue, option }: IPluginOptionComponentProps) {
    const [selectedOption, setSelectedOption] = useState("");
    const { id } = option.componentProps;

    const [options, setOptions] = useState<string[]>(settings.store[id] || []);

    return (
        <SettingsSection inlineSetting={true} description="Use the dropdown to select an option to remove it from the list." name={id} error={null}>
            <Select
                placeholder="Select one to remove"
                select={value => setSelectedOption(value)}
                isSelected={value => selectedOption === value}
                serialize={value => String(value)}
                options={[
                    ...options.map((opt, index) => {
                        const obj = option.componentProps.getNameFunction(opt);
                        const name = obj?.name ?? obj?.username;
                        return { label: name, value: opt };
                    })
                ]}
            />
            <Button
                onClick={() => {
                    if (!selectedOption) return;
                    const index = options.findIndex(opt => opt === selectedOption);
                    if (index !== -1) {
                        const newOptions = options.filter((_, i) => i !== index);
                        setSelectedOption("");
                        setOptions([...newOptions]);
                        settings.store[id] = newOptions;
                    }
                }}
            >
                Remove
            </Button>
        </SettingsSection>
    );
}

const IconPlay = findByCodeLazy("M9.25 3.35C7.87 2.45");
const IconPause = findByCodeLazy("M6 4a1 1 0 0 0-1");
function PreviewTTS() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [text, setText] = useState("This is what text-to-speech sounds like at the current speed.");

    const getLabel = (play: boolean) => {
        if (play) {
            return (
                <Flex direction={Flex.Direction.HORIZONTAL} align={Flex.Align.CENTER}>
                    <IconPause />
                    <Text>
                        Preview
                    </Text>
                </Flex>
            );
        } else {
            return (
                <Flex direction={Flex.Direction.HORIZONTAL} align={Flex.Align.CENTER}>
                    <IconPlay />
                    <Text>Preview</Text>
                </Flex>
            );
        }
    };

    return (
        <SettingsSection inlineSetting={true} description="Preview the current TTS settings." name="TTS Preview" error={null}>
            <TextInput
                value={text}
                placeholder="Enter text to preview"
                onChange={event => {
                    setText(event);
                }}
            />
            <Button
                onClick={() => {
                    if (!isPlaying) {
                        AudioPlayer.startTTS(text, true);
                        AudioPlayer.stopCurrentTTS();
                    }
                    setIsPlaying(!isPlaying);
                }}
            >
                {getLabel(isPlaying)}
            </Button>
        </SettingsSection>
    );
}

function TextReplaceDropdown({ }) {
    const [options, setOptions] = useState(settings.store.textReplacerRules || []);
    const [selected, setSelected] = useState(0);

    useEffect(() => {
        settings.store.textReplacerRules = options;
    }, [options]);

    function addRegex(regex: { regex: string; replacement: string; }) {
        setOptions([...options, regex]);
    }

    function removeRegex() {
        setOptions(options.filter((_, i) => i !== selected));
    }

    return (
        <SettingsSection description="Manage text replacement rules." name="Text Replacement" error={null}>
            <Flex Direction="HORIZONTAL" justify={Flex.Justify.BETWEEN} align={Flex.Align.CENTER}>
                <Select
                    placeholder="Regex List"
                    options={[
                        ...options.map((option, index) => ({
                            label: `${option.regex} --> ${option.replacement}`,
                            value: index
                        }))
                    ]}
                    closeOnSelect={true}
                    select={value => setSelected(value)}
                    isSelected={value => selected === value}
                    serialize={value => String(value)}
                />
                <Button onClick={removeRegex}>
                    Remove Regex
                </Button>
            </Flex>
            <TextReplaceAdd onAdd={addRegex} />
        </SettingsSection>
    );
}


function TextReplaceAdd({ onAdd }) {
    const [regex, setRegex] = useState("");
    const [replacement, setReplacement] = useState("");

    const disabled = regex === "" || replacement === "";

    return (
        <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.BETWEEN} align={Flex.Align.CENTER}>
            <TextInput
                value={regex}
                placeholder="Enter Regex"
                onChange={event => {
                    setRegex(event);
                }}
            />
            <TextInput
                value={replacement}
                placeholder="Text To Soubstitute"
                onChange={event => {
                    setReplacement(event);
                }}
            />
            <Button
                disabled={disabled}
                onClick={() => {
                    onAdd({ regex: regex, replacement: replacement });
                    setRegex("");
                    setReplacement("");
                }}
            >
                Add Regex
            </Button>
        </Flex>
    );
}

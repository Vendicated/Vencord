/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { debounce } from "@shared/debounce";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { findByCode, findByProps, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ChannelRouter, ChannelStore, ContextMenuApi, GuildStore, MediaEngineStore, Menu, PermissionsBits, PermissionStore, React, SelectedChannelStore, Toasts, UserStore, VoiceActions, VoiceStateStore } from "@webpack/common";

import style from "./styles.css?managed";

const ChatVoiceIcon = findComponentByCodeLazy("0l1.8-1.8c.17");
const Button = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");
const ChannelActions = findByPropsLazy("selectChannel", "selectVoiceChannel");

const valueOperation = [
    { label: "More than", value: "<", default: false },
    { label: "Less than", value: ">", default: false },
    { label: "Equal to", value: "==", default: true },
];

const CONNECT = 1n << 20n;
const SPEAK = 1n << 21n;
const STREAM = 1n << 9n;
const VIDEO = 1 << 21;

const settings = definePluginSettings({
    UserAmountOperation: {
        description: "Select an operation for the amounts of users",
        type: OptionType.SELECT,
        options: [...valueOperation],
    },
    UserAmount: {
        description: "Select amount of users",
        type: OptionType.SLIDER,
        markers: makeRange(0, 15, 1),
        default: 3,
        stickToMarkers: true,
    },
    spacesLeftOperation: {
        description: "Select an operation for the maximum amounts of users",
        type: OptionType.SELECT,
        options: [...valueOperation],
    },
    spacesLeft: {
        description: "Select amount of max users",
        type: OptionType.SLIDER,
        markers: makeRange(0, 15, 1),
        default: 3,
        stickToMarkers: true,
    },
    vcLimitOperation: {
        description: "Select an operation for the voice-channel.",
        type: OptionType.SELECT,
        options: [...valueOperation],
    },
    vcLimit: {
        description: "Select a voice-channel limit",
        type: OptionType.SLIDER,
        markers: makeRange(1, 15, 1),
        default: 5,
        stickToMarkers: true,
    },
    Servers: {
        description: "Servers that are included",
        type: OptionType.STRING,
        default: "",
    },
    autoNavigate: {
        type: OptionType.BOOLEAN,
        description: "Automatically navigates to the voice-channel.",
        default: false,
    },
    autoCamera: {
        type: OptionType.BOOLEAN,
        description: "Automatically turns on camera",
        default: false,
    },
    autoStream: {
        type: OptionType.BOOLEAN,
        description: "Automatically turns on stream",
        default: false,
    },
    selfMute: {
        type: OptionType.BOOLEAN,
        description: "Automatically mutes your mic when joining voice-channel.",
        default: false,
    },
    selfDeafen: {
        type: OptionType.BOOLEAN,
        description: "Automatically deafems your mic when joining voice-channel.",
        default: false,
    },
    leaveEmpty: {
        type: OptionType.BOOLEAN,
        description: "Finds a random-call, when the voice chat is empty.",
        default: false,
    },
    avoidStages: {
        type: OptionType.BOOLEAN,
        description: "Avoids joining stage voice-channels.",
        default: false,
    },
    avoidAfk: {
        type: OptionType.BOOLEAN,
        description: "Avoids joining AFK voice-channels.",
        default: false,
    },
    video: {
        type: OptionType.BOOLEAN,
        description: "Searches for users with their video on",
        default: false,
    },
    stream: {
        type: OptionType.BOOLEAN,
        description: "Searches for users who are streaming",
        default: false,
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "Searches for users who are muted",
        default: false,
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "Searches for users who are deafened",
        default: false,
    },
    includeStates: {
        type: OptionType.BOOLEAN,
        description: "Option to include states",
        default: false,
    },
    avoidStates: {
        type: OptionType.BOOLEAN,
        description: "Option to avoid states",
        default: false,
    },
});

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream: boolean;
    selfVideo: boolean;
    sessionId: string;
    suppress: boolean;
    requestToSpeakTimestamp: string | null;
}

export default definePlugin({
    name: "RandomVoice",
    description: "Adds a Button near the Mute button to join a random voice call.",
    authors: [EquicordDevs.xijexo, EquicordDevs.omaw, EquicordDevs.thororen],
    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /className:\i\.buttons,.{0,60}children:\[/,
                replace: "$&$self.randomVoice(),"
            }
        }
    ],
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const currentUserId = UserStore.getCurrentUser().id;
            const myChannelId = VoiceStateStore.getVoiceStateForUser(currentUserId)?.channelId;
            if (!myChannelId || !settings.store.leaveEmpty) return;

            const voiceStatesMap = VoiceStateStore.getVoiceStates() as Record<string, VoiceState>;
            const othersInChannel = Object.values(voiceStatesMap).filter(vs =>
                vs.channelId === myChannelId && vs.userId !== currentUserId
            );

            if (othersInChannel.length === 0) {
                randomVoice();
            }
        },
    },
    start() {
        enableStyle(style);
    },
    stop() {
        disableStyle(style);
    },
    settings,
    randomVoice: ErrorBoundary.wrap(randomVoice, { noop: true }),
});

function randomVoice() {
    return (
        <>
            <Button
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <ContextMenu />)}
                onClick={() => getChannels()}
                role="switch"
                tooltipText={"Random Voice"}
                icon={<svg
                    width="18"
                    height="18"
                    id="test"
                    viewBox="0 0 24 24"
                >
                    <g fill={"currentColor"}>
                        <path d="M19,9H14a5.006,5.006,0,0,0-5,5v5a5.006,5.006,0,0,0,5,5h5a5.006,5.006,0,0,0,5-5V14A5.006,5.006,0,0,0,19,9Zm-5,6a1,1,0,1,1,1-1A1,1,0,0,1,14,15Zm5,5a1,1,0,1,1,1-1A1,1,0,0,1,19,20ZM15.6,5,12.069,1.462A5.006,5.006,0,0,0,5,1.462L1.462,5a5.006,5.006,0,0,0,0,7.071L5,15.6a4.961,4.961,0,0,0,2,1.223V14a7.008,7.008,0,0,1,7-7h2.827A4.961,4.961,0,0,0,15.6,5ZM5,10A1,1,0,1,1,6,9,1,1,0,0,1,5,10ZM9,6a1,1,0,1,1,1-1A1,1,0,0,1,9,6Z" />
                    </g>
                </svg>}
            />
        </>
    );
}

function ContextMenu() {
    let ServerList: any[] = [];
    Object.values(UserStore.getUsers()).forEach(user => {
        const { channelId } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
        if (!channelId) return;
        const channel = ChannelStore.getChannel(channelId);
        if (channel) ServerList.push(channel.getGuildId());
    });

    ServerList = Array.from(new Set(ServerList));
    const Servers = ServerList.map(server => GuildStore.getGuild(server)).filter(guild => guild && guild.id);
    const [servers, setServers] = React.useState(settings.store.Servers);
    const [SpacesLeftOperation, setSpacesLeftOperation] = React.useState(settings.store.spacesLeftOperation);
    const [userAmount, setuserAmount] = React.useState(settings.store.UserAmountOperation);
    const [vcOperation, setVcOperation] = React.useState(settings.store.vcLimitOperation);
    const [navigate, setnavigate] = React.useState(settings.store.autoNavigate);
    const [stage, setStage] = React.useState(settings.store.avoidStages);
    const [afk, setAfk] = React.useState(settings.store.avoidAfk);
    const [camera, setCamera] = React.useState(settings.store.autoCamera);
    const [stream, setStream] = React.useState(settings.store.autoStream);
    const [empty, setEmpty] = React.useState(settings.store.leaveEmpty);
    const [muteself, setSelfMute] = React.useState(settings.store.selfMute);
    const [deafenself, setSelfDeafen] = React.useState(settings.store.selfDeafen);
    const [mute, setMute] = React.useState(settings.store.mute);
    const [deafen, setDeafen] = React.useState(settings.store.deafen);
    const [video, setVideo] = React.useState(settings.store.video);
    const [state, setState] = React.useState(settings.store.includeStates);
    const [notstate, avoidState] = React.useState(settings.store.avoidStates);

    return (
        <Menu.Menu
            navId="random-vc"
            onClose={() => { }}
            aria-label="Voice state modifier"
        >


            <Menu.MenuItem
                id="servers"
                label="Select Servers"
                action={() => { }} >
                <>
                    {Servers.map(server => (
                        <>
                            <Menu.MenuCheckboxItem
                                key={String(server?.id ?? "invalid server")}
                                id={String(server?.name ?? "invalid server")}
                                label={server?.name ?? "invalid server"}
                                checked={servers.includes(server?.id ?? "invalid server")}
                                action={() => {
                                    if (settings.store.Servers.includes(server?.id ?? "invalid server"))
                                        settings.store.Servers = settings.store.Servers.replace(`/${server.id}`, "");
                                    else
                                        settings.store.Servers += `/${server?.id ?? "invalid server"}`;
                                    setServers(settings.store.Servers);
                                }} />
                        </>
                    ))}

                    <Menu.MenuItem
                        id="selectAll"
                        label="Select List"
                        action={() => {
                            const allServerIds = Servers.filter(server => server?.id).map(server => server.id);
                            settings.store.Servers = `/${allServerIds.join("/")}`;
                            setServers(settings.store.Servers);
                        }}
                        disabled={servers.length === Servers.filter(server => server?.id).length}
                        icon={() => {
                            return (
                                <ChatVoiceIcon
                                    className="selectList"
                                    role="img"
                                    width="18"
                                    height="18"
                                />
                            );
                        }}
                    />

                    <Menu.MenuItem
                        id="clear list "
                        label="Reset List"
                        disabled={servers.length === 0}
                        action={() => {
                            settings.store.Servers = "";
                            setServers("");

                        }}
                        icon={() => {
                            return (
                                <svg
                                    className={"reset-icon"}
                                    role="img"
                                    width={"22"}
                                    height={"22"}
                                    viewBox={"0 0 26 26"}
                                >
                                    <g fill={"#b5bac1"}
                                    >
                                        <path d="M12,2a10.032,10.032,0,0,1,7.122,3H16a1,1,0,0,0-1,1h0a1,1,0,0,0,1,1h4.143A1.858,1.858,0,0,0,22,5.143V1a1,1,0,0,0-1-1h0a1,1,0,0,0-1,1V3.078A11.981,11.981,0,0,0,.05,10.9a1.007,1.007,0,0,0,1,1.1h0a.982.982,0,0,0,.989-.878A10.014,10.014,0,0,1,12,2Z" /><path d="M22.951,12a.982.982,0,0,0-.989.878A9.986,9.986,0,0,1,4.878,19H8a1,1,0,0,0,1-1H9a1,1,0,0,0-1-1H3.857A1.856,1.856,0,0,0,2,18.857V23a1,1,0,0,0,1,1H3a1,1,0,0,0,1-1V20.922A11.981,11.981,0,0,0,23.95,13.1a1.007,1.007,0,0,0-1-1.1Z" />
                                    </g>

                                </svg>
                            );
                        }} />

                </>
            </Menu.MenuItem>

            <Menu.MenuItem
                id="Filter states"
                label="Select Filters"
                action={() => { }} >
                <>
                    <Menu.MenuCheckboxItem
                        key="muted"
                        id="muted"
                        label="Muted"
                        action={() => {
                            setMute(!mute);
                            settings.store.mute = !mute;
                        }}
                        checked={mute} />
                    <Menu.MenuCheckboxItem
                        key="deafen"
                        id="deafen"
                        label="Deafened"
                        action={() => {
                            setDeafen(!deafen);
                            settings.store.deafen = !deafen;
                        }}
                        checked={deafen} />
                    <Menu.MenuCheckboxItem
                        key="video"
                        id="video"
                        label="Camera"
                        action={() => {
                            setVideo(!video);
                            settings.store.video = !video;
                        }}
                        checked={video} />
                    <Menu.MenuCheckboxItem
                        key="stream"
                        id="stream"
                        label="Stream"
                        action={() => {
                            setStream(!stream);
                            settings.store.stream = !stream;
                        }}
                        checked={stream} />
                    <Menu.MenuCheckboxItem
                        key="state"
                        id="state"
                        label="Include Filters"
                        disabled={settings.store.avoidStates || !settings.store.includeStates && !settings.store.mute && !settings.store.deafen && !settings.store.video && !settings.store.stream}
                        action={() => {
                            setState(!state);
                            settings.store.includeStates = !state;
                        }}
                        checked={state} />

                    <Menu.MenuCheckboxItem
                        key="notstate"
                        id="notstate"
                        label="Avoid Filters"
                        disabled={settings.store.includeStates || !settings.store.avoidStates && !settings.store.avoidStates && !settings.store.mute && !settings.store.deafen && !settings.store.video && !settings.store.stream}
                        action={() => {
                            avoidState(!notstate);
                            settings.store.avoidStates = !notstate;
                        }}
                        checked={notstate} />
                </>
            </Menu.MenuItem>

            <Menu.MenuSeparator />

            <Menu.MenuGroup
                label="USER AMOUNT"
            >

                <Menu.MenuControlItem
                    id="min-user"
                    label="User Amount"
                    control={(props, ref) => (
                        <Menu.MenuSliderControl
                            ref={ref}
                            {...props}
                            minValue={1}
                            maxValue={15}
                            value={settings.store.UserAmount}
                            onChange={debounce((value: number) => {
                                settings.store.UserAmount = Number(value.toFixed(0));
                            }, 50)}
                            renderValue={(value: number) => `${value.toFixed(0)} user${Number(value.toFixed(0)) === 1 ? "" : "s"}`} />
                    )} />

                <Menu.MenuItem
                    id="minParms"
                    label="Parameters"
                    action={() => { }} >
                    <>
                        <Menu.MenuRadioItem
                            key={"More than"}
                            group="minGroup"
                            id={"More than"}
                            label={"More than"}
                            checked={userAmount === "<"}
                            action={() => {
                                setuserAmount("<");
                                settings.store.UserAmountOperation = "<";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Less than"}
                            group="minGroup"
                            id={"Less than"}
                            label={"Less than"}
                            checked={userAmount === ">"}
                            action={() => {
                                setuserAmount(">");
                                settings.store.UserAmountOperation = ">";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Equal to"}
                            group="minGroup"
                            id={"Equal to "}
                            label={"Equal to "}
                            checked={userAmount === "=="}
                            action={() => {
                                setuserAmount("==");
                                settings.store.UserAmountOperation = "==";
                            }} />
                    </>
                </Menu.MenuItem>

            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuGroup
                label="SPACES LEFT"
            >

                <Menu.MenuControlItem
                    id="max-user"
                    label="Spaces Left"
                    control={(props, ref) => (
                        <Menu.MenuSliderControl
                            ref={ref}
                            {...props}
                            minValue={1}
                            maxValue={15}
                            value={settings.store.spacesLeft}
                            onChange={debounce((value: number) => {
                                settings.store.spacesLeft = Number(value.toFixed(0));
                            }, 50)}
                            renderValue={(value: number) => `${value.toFixed(0)} user${Number(value.toFixed(0)) === 1 ? "" : "s"}`} />
                    )} />

                <Menu.MenuItem
                    id="maxGroup"
                    label="Parameters"
                    action={() => { }} >
                    <>
                        <Menu.MenuRadioItem
                            key={"More than"}
                            group="maxGroup"
                            id={"More than"}
                            label={"More than"}
                            checked={SpacesLeftOperation === "<"}
                            action={() => {
                                setSpacesLeftOperation("<");
                                settings.store.spacesLeftOperation = "<";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Less than"}
                            group="maxGroup"
                            id={"Less than"}
                            label={"Less than"}
                            checked={SpacesLeftOperation === ">"}
                            action={() => {
                                setSpacesLeftOperation(">");
                                settings.store.spacesLeftOperation = ">";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Equal to"}
                            group="maxGroup"
                            id={"Equal to "}
                            label={"Equal to "}
                            checked={SpacesLeftOperation === "=="}
                            action={() => {
                                setSpacesLeftOperation("==");
                                settings.store.spacesLeftOperation = "==";
                            }} />
                    </>
                </Menu.MenuItem>

            </Menu.MenuGroup >

            <Menu.MenuSeparator />

            <Menu.MenuGroup
                label="VOICE LIMIT"
            >

                <Menu.MenuControlItem
                    id="vc-limit"
                    label="Voice Limit"
                    control={(props, ref) => (
                        <Menu.MenuSliderControl
                            ref={ref}
                            {...props}
                            minValue={1}
                            maxValue={15}
                            value={settings.store.vcLimit}
                            onChange={debounce((value: number) => {
                                settings.store.vcLimit = Number(value.toFixed(0));
                            }, 50)}
                            renderValue={(value: number) => `${value.toFixed(0)} user${Number(value.toFixed(0)) === 1 ? "" : "s"}`} />
                    )} />

                <Menu.MenuItem
                    id="vcParms"
                    label="Parameters"
                    action={() => { }} >
                    <>
                        <Menu.MenuRadioItem
                            key={"More than"}
                            group="vcGroup"
                            id={"More than"}
                            label={"More than"}
                            checked={vcOperation === "<"}
                            action={() => {
                                setVcOperation("<");
                                settings.store.vcLimitOperation = "<";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Less than"}
                            group="vcGroup"
                            id={"Less than"}
                            label={"Less than"}
                            checked={vcOperation === ">"}
                            action={() => {
                                setVcOperation(">");
                                settings.store.vcLimitOperation = ">";
                            }} />
                        <Menu.MenuRadioItem
                            key={"Equal to"}
                            group="vcGroup"
                            id={"Equal to "}
                            label={"Equal to "}
                            checked={vcOperation === "=="}
                            action={() => {
                                setVcOperation("==");
                                settings.store.vcLimitOperation = "==";
                            }} />
                    </>
                </Menu.MenuItem>

            </Menu.MenuGroup>

            <Menu.MenuSeparator />
            <Menu.MenuGroup
                label="SELF SETTINGS"
            >
                <Menu.MenuItem id="voiceOptions" label="Voice Options" action={() => { }} >
                    <>
                        { }
                        <Menu.MenuCheckboxItem
                            key="selfMute"
                            id="selfMute"
                            label="Auto Mute"
                            action={() => {
                                setSelfMute(!muteself);
                                settings.store.selfMute = !muteself;
                            }}
                            checked={muteself} />
                        <Menu.MenuCheckboxItem
                            key="selfDeafen"
                            id="selfDeafen"
                            label="Auto Deafen"
                            action={() => {
                                setSelfDeafen(!deafenself);
                                settings.store.selfDeafen = !deafenself;
                            }}
                            checked={deafenself} />
                        <Menu.MenuCheckboxItem
                            key="autoCamera"
                            id="autoCamera"
                            label="Auto Camera"
                            action={() => {
                                setCamera(!camera);
                                settings.store.autoCamera = !camera;
                            }}
                            checked={camera} />
                        <Menu.MenuCheckboxItem
                            key="autoStream"
                            id="autoStream"
                            label="Auto Stream"
                            action={() => {
                                setStream(!stream);
                                settings.store.autoStream = !stream;
                            }}
                            checked={stream} />
                        <Menu.MenuCheckboxItem
                            key="leaveEmpty"
                            id="leaveEmpty"
                            label="Leave when Empty"
                            action={() => {
                                setEmpty(!empty);
                                settings.store.leaveEmpty = !empty;
                            }}
                            checked={empty} />
                    </>
                </Menu.MenuItem>

                <Menu.MenuCheckboxItem
                    key="autonavigate"
                    id="autonavigate"
                    label="Auto Navigate"
                    action={() => {
                        setnavigate(!navigate);
                        settings.store.autoNavigate = !navigate;
                    }}
                    checked={navigate} />

                <Menu.MenuCheckboxItem
                    key="avoidStage"
                    id="avoidStage"
                    label="Avoid Stage"
                    action={() => {
                        setStage(!stage);
                        settings.store.avoidStages = !stage;
                    }}
                    checked={stage} />

                <Menu.MenuCheckboxItem
                    key="avoidAfk"
                    id="avoidAfk"
                    label="Avoid AFK"
                    action={() => {
                        setAfk(!afk);
                        settings.store.avoidAfk = !afk;
                    }}
                    checked={afk} />

            </Menu.MenuGroup>
        </Menu.Menu>
    );
}

function getChannels() {
    const criteriaChannel: any[] = [];

    Object.values(UserStore.getUsers()).forEach(user => {

        const { channelId, selfDeaf, selfMute, selfStream, selfVideo } = VoiceStateStore.getVoiceStateForUser(user.id) ?? {};
        if (!channelId) return;
        if (criteriaChannel.includes(channelId)) return;

        const channel = ChannelStore.getChannel(channelId);
        if (!channel) return;
        const channelVoiceStates = VoiceStateStore.getVoiceStatesForChannel(channelId);

        if (!settings.store.Servers.split("/").includes(channel.getGuildId())) return;
        if (settings.store.avoidStages && channel.isGuildStageVoice()) return;
        const operations = {
            ">": (a, b) => a < b,
            "<": (a, b) => a > b,
            "==": (a, b) => a === b,
        };

        const users = Object.keys(channelVoiceStates).length;

        const VcLimit = channel.userLimit === 0 ? 99 : channel.userLimit;
        const spacesLeft = VcLimit - users;

        if (!operations[settings.store.spacesLeftOperation](spacesLeft, settings.store.spacesLeft)) return;
        if (!operations[settings.store.UserAmountOperation](users, settings.store.UserAmount)) return;
        if (!operations[settings.store.vcLimitOperation](VcLimit, settings.store.vcLimit)) return;
        if (Object.keys(channelVoiceStates).length === channel?.userLimit) return;
        if (Object.keys(channelVoiceStates).includes(UserStore.getCurrentUser().id)) return;
        if (!PermissionStore.can(CONNECT, channel)) return;
        if (settings.store.avoidAfk && !PermissionStore.can(SPEAK, channel)) return;
        if (settings.store.avoidStates) {
            let lowestMismatchCount = Infinity;
            const channelVoiceStates = VoiceStateStore.getVoiceStatesForChannel(channel.id);
            let mismatchedStates = 0;
            let bestChannelId: string | null = null;
            for (const state of Object.values(channelVoiceStates) as { selfMute?: boolean; selfDeaf?: boolean; selfVideo?: boolean; selfStream?: boolean; }[]) {
                if ((settings.store.deafen && state.selfDeaf) || (!settings.store.deafen && !state.selfDeaf)) mismatchedStates++;
                if ((settings.store.video && !state.selfVideo) || (!settings.store.video && state.selfVideo)) mismatchedStates++;
                if ((settings.store.stream && !state.selfStream) || (!settings.store.stream && state.selfStream)) mismatchedStates++;

                if (!settings.store.deafen) {
                    if ((settings.store.mute && state.selfMute) || (!settings.store.mute && !state.selfMute)) mismatchedStates++;
                }
            }

            if (mismatchedStates < lowestMismatchCount) {
                lowestMismatchCount = mismatchedStates;
                bestChannelId = channel.id;
            }
            if (bestChannelId) {
                criteriaChannel.push(channelId);
            }
        }


        if (settings.store.includeStates && !settings.store.avoidStates) {
            if ((settings.store.deafen && !selfDeaf) || (!settings.store.deafen && selfDeaf)) return;
            if ((settings.store.video && !selfVideo) || (!settings.store.video && selfVideo)) return;
            if ((settings.store.stream && !selfStream) || (!settings.store.stream && selfStream)) return;

            if (!settings.store.deafen)
                if ((settings.store.mute && !selfMute) || (!settings.store.mute && selfMute)) return;

        }

        criteriaChannel.push(channelId);
    });

    if (criteriaChannel.length === 0) {
        Toasts.show({
            message: "Failed to find a Voice channel!",
            id: "Vc-not-found",
            type: Toasts.Type.MESSAGE,
            options: {
                position: Toasts.Position.BOTTOM,
            }
        });
        return;
    }
    const randomIndex = Math.floor(Math.random() * criteriaChannel.length);

    JoinVc(criteriaChannel[randomIndex]);
}

function JoinVc(channelID) {
    const channel = ChannelStore.getChannel(channelID);
    ChannelActions.selectVoiceChannel(channelID);
    if (settings.store.autoNavigate) ChannelRouter.transitionToChannel(channel.id);
    if (settings.store.autoCamera && PermissionStore.can(VIDEO, channel)) autoCamera();
    if (settings.store.autoStream && PermissionStore.can(STREAM, channel)) autoStream();
    if (settings.store.selfMute && !MediaEngineStore.isSelfMute() && SelectedChannelStore.getVoiceChannelId()) VoiceActions.toggleSelfMute();
    if (settings.store.selfDeafen && !MediaEngineStore.isSelfDeaf() && SelectedChannelStore.getVoiceChannelId()) VoiceActions.toggleSelfDeaf();
}

async function autoStream() {
    const startStream = findByCode('type:"STREAM_START"');
    const mediaEngine = findByProps("getMediaEngine").getMediaEngine();
    const getDesktopSources = findByCode("desktop sources");
    const selected = SelectedChannelStore.getVoiceChannelId();
    if (!selected) return;
    const channel = ChannelStore.getChannel(selected);
    const sources = await getDesktopSources(mediaEngine, ["screen"], null);
    if (!sources || sources.length === 0) return;
    const source = sources[0];
    if (channel.type === 13 || !PermissionStore.can(PermissionsBits.STREAM, channel)) return;
    startStream(channel.guild_id, selected, {
        "pid": null,
        "sourceId": source.id,
        "sourceName": source.name,
        "audioSourceId": null,
        "sound": true,
        "previewDisabled": false
    });
}

function autoCamera() {
    const checkExist = setInterval(() => {
        const cameraOFF = document.querySelector('[aria-label="Turn off Camera" i]') as HTMLButtonElement;
        if (cameraOFF) clearInterval(checkExist);

        const camera = document.querySelector('[aria-label="Turn on Camera" i]') as HTMLButtonElement;

        if (camera) {
            clearInterval(checkExist);
            camera.click();
        }
    }, 50);
}

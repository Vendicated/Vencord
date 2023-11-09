//import start
import { Button, Forms, Text, FluxDispatcher, useState, useEffect, Tooltip, ButtonLooks, ButtonWrapperClasses, TextInput, Clickable, UserUtils, Timestamp, moment } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { DataStore } from "@api/index";
import { classNameFactory, enableStyle, disableStyle } from "@api/Styles";
import { Margins } from "@utils/margins";
import definePlugin, { OptionType } from "@utils/types";
import ErrorBoundary from "@components/ErrorBoundary";
import { classes, copyWithToast } from "@utils/misc";
import { openModal, ModalRoot, ModalSize, ModalHeader, ModalCloseButton, closeModal, ModalContent, ModalFooter } from "@utils/modal";
import { saveFile } from "@utils/web";
import { Flex } from "@components/Flex";
import { findByProps, findByCode, findByPropsLazy } from "@webpack";
import { proxyLazy } from "@utils/lazy";
import { Devs } from "@utils/constants";
import { LazyComponent } from "@utils/react";
import { User } from "discord-types/general";
import styles from "./styles.css?managed";
import { CopyIcon } from "@components/Icons";
import { openUserProfile } from "@utils/discord";
//import end


const cl = classNameFactory("vc-soundlog-");

// #region User stuff
// Taken from https://github.com/Vendicated/Vencord/blob/86e94343cca10b950f2dc8d18d496d6db9f3b728/src/components/PluginSettings/PluginModal.tsx#L45
const UserSummaryItem = LazyComponent(() => findByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));
const AvatarStyles = findByPropsLazy("moreUsers", "emptyUser", "avatarContainer", "clickableAvatar");
// #endregion User stuff

// #region Types

interface SoundEvent {
    type: "VOICE_CHANNEL_EFFECT_SEND",
    emoji: { name: string, id?: string, animated: boolean; },
    channelId: string,
    userId: string,
    animationType: number,
    animationId: number,
    soundId: string,
    soundVolume: number;
}

interface SoundLogEntry extends SoundEvent {
    users: { id: string, plays: number[]; }[];
}

// #endregion

// Start plugin settings
const settings = definePluginSettings({
    /* SavedIds: {
         description: "The amount of soundboard ids you want to save at a time (0 lets you save infinatly)",
         type: OptionType.NUMBER,
         default: 50,
         restartNeeded: false
     },*/
    SavedIds: {
        description: "The amount of soundboard ids you want to save at a time (0 lets you save infinite)",
        type: OptionType.COMPONENT,
        component: ({ setValue, setError }) => {
            const value = settings.store.SavedIds ?? 50;
            const [state, setState] = useState(`${value}`);
            const [shouldShowWarning, setShouldShowWarning] = useState(false);
            const [errorMessage, setErrorMessage] = useState<string | null>(null);

            function handleChange(newValue) {
                const changed = Number(newValue);

                if (Number.isNaN(changed) || changed % 1 != 0 || changed < 0) {
                    setError(true);
                    let errorMsg = "";
                    errorMsg += Number.isNaN(changed) ? "The value is not a number.\n" : '';
                    errorMsg += (changed % 1 != 0) ? "The value can't be a decimal number.\n" : '';
                    errorMsg += (changed < 0) ? "The value can't be a negative number.\n" : '';
                    setErrorMessage(errorMsg);
                    return;
                } else {
                    setError(false);
                    setErrorMessage(null);
                }


                if (changed < value) {
                    setShouldShowWarning(true);
                } else {
                    setShouldShowWarning(false);
                }
                setState(newValue);
                setValue(changed);
            };


            return (
                <Forms.FormSection>
                    <Forms.FormTitle>The amount of soundboard ids you want to save at a time (0 lets you save infinite)</Forms.FormTitle>
                    <TextInput
                        type="number"
                        pattern="-?[0-9]+"
                        value={state}
                        onChange={handleChange}
                        placeholder={"Enter a number"}
                    />
                    {shouldShowWarning && <Forms.FormText style={{ color: "var(--text-danger)" }}>Warning! Setting the number to a lower value will reset the log!</Forms.FormText>}
                    {errorMessage && <Forms.FormText style={{ color: "var(--text-danger)" }}>{errorMessage}</Forms.FormText>}
                </Forms.FormSection>
            );
        }

    },
    FileType: {
        description: "the format that you want to save your file",
        type: OptionType.SELECT,
        options: [
            { label: ".ogg", value: ".ogg", default: true },
            { label: ".mp3", value: ".mp3" },
            { label: ".wav", value: ".wav" },
        ],
    },
    IconLocation: {
        description: "choose where to show the SoundBoard Log icon (requires restart)",
        type: OptionType.SELECT,
        options: [
            { label: "Toolbar", value: "toolbar", default: true },
            { label: "Chat input", value: "chat" }
        ],
        restartNeeded: true
    },
    OpenLogs: {
        type: OptionType.COMPONENT,
        description: "show the logs",
        component: () =>
            <Button color={Button.Colors.LINK} size={Button.Sizes.SMALL} onClick={OpenSoundBoardLog}>Open Logs</Button>
    }
});
// End plugin settings

/** Save sound from its ID */
async function downloadaudio(id: string): Promise<void> {
    const filename = id + settings.store.FileType;
    const data = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${id}`).then(e => e.arrayBuffer());


    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "audio/ogg" }));
    }
}

// #region Icons
function LogIcon({ height = 24, width = 24, className }: { height?: number; width?: number; className?: string; }) {
    return (
        <svg
            viewBox="1.134 10.59 87.732 68.821"
            xmlns="http://www.w3.org/2000/svg"
            height={height}
            width={width}
            className={classes(cl("icon"), className)}
        >
            <path fill="currentColor" d="M84.075,10.597L5.932,10.59c-2.646,0-4.798,2.148-4.798,4.79v59.226c0,2.649,2.152,4.798,4.798,4.798l78.144,0.007  c2.643,0,4.79-2.141,4.79-4.794V15.391C88.865,12.745,86.718,10.597,84.075,10.597z M72.371,19.363c0-0.283,0.229-0.509,0.51-0.509  h7.105c0.279,0,0.501,0.226,0.501,0.509v7.102c0,0.28-0.222,0.509-0.501,0.509h-7.105c-0.28,0-0.51-0.229-0.51-0.509V19.363z   M8.403,19.363c0-0.283,0.229-0.509,0.509-0.509h29.399c0.28,0,0.502,0.226,0.502,0.509v7.102c0,0.28-0.222,0.509-0.502,0.509H8.912  c-0.28,0-0.509-0.229-0.509-0.509V19.363z M16.266,64.817c0,0.403-0.327,0.727-0.727,0.727H14.28v6.466c0,1-0.822,1.821-1.829,1.821  c-0.516,0-0.97-0.199-1.301-0.53c-0.33-0.331-0.531-0.792-0.531-1.291v-6.466H9.51c-0.4,0-0.727-0.323-0.727-0.727v-6.854  c0-0.4,0.327-0.727,0.727-0.727h1.11V37.583c0-1.017,0.822-1.839,1.832-1.839c0.505,0,0.96,0.211,1.291,0.542  c0.338,0.331,0.538,0.789,0.538,1.297v19.653h1.259c0.4,0,0.727,0.326,0.727,0.727V64.817z M27.286,51.613  c0,0.4-0.327,0.728-0.727,0.728h-1.11v19.651c0,1.018-0.822,1.839-1.832,1.839c-0.506,0-0.96-0.21-1.291-0.541  c-0.338-0.331-0.538-0.789-0.538-1.298V52.341H20.53c-0.4,0-0.727-0.327-0.727-0.728v-6.855c0-0.403,0.327-0.727,0.727-0.727h1.259  v-6.466c0-0.999,0.821-1.821,1.829-1.821c0.516,0,0.97,0.2,1.301,0.531c0.331,0.331,0.531,0.792,0.531,1.29v6.466h1.11  c0.4,0,0.727,0.324,0.727,0.727V51.613z M38.554,64.817c0,0.403-0.327,0.727-0.727,0.727h-1.259v6.466c0,1-0.821,1.821-1.829,1.821  c-0.516,0-0.97-0.199-1.301-0.53c-0.33-0.331-0.53-0.792-0.53-1.291v-6.466h-1.11c-0.4,0-0.727-0.323-0.727-0.727v-6.854  c0-0.4,0.327-0.727,0.727-0.727h1.11V37.583c0-1.017,0.821-1.839,1.832-1.839c0.505,0,0.959,0.211,1.291,0.542  c0.338,0.331,0.538,0.789,0.538,1.297v19.653h1.259c0.4,0,0.727,0.326,0.727,0.727V64.817z M49.494,51.613  c0,0.4-0.327,0.728-0.728,0.728h-1.11v19.651c0,1.018-0.821,1.839-1.832,1.839c-0.505,0-0.959-0.21-1.29-0.541  c-0.338-0.331-0.539-0.789-0.539-1.298V52.341h-1.259c-0.399,0-0.727-0.327-0.727-0.728v-6.855c0-0.403,0.327-0.727,0.727-0.727  h1.259v-6.466c0-0.999,0.822-1.821,1.829-1.821c0.516,0,0.97,0.2,1.301,0.531c0.331,0.331,0.53,0.792,0.53,1.29v6.466h1.11  c0.4,0,0.728,0.324,0.728,0.727V51.613z M58.197,19.363c0-0.283,0.229-0.509,0.508-0.509h7.106c0.279,0,0.501,0.226,0.501,0.509  v7.102c0,0.28-0.222,0.509-0.501,0.509h-7.106c-0.279,0-0.508-0.229-0.508-0.509V19.363z M62.373,73.29  c-2.254,0-4.082-1.828-4.082-4.082c0-2.25,1.828-4.078,4.082-4.078s4.078,1.828,4.078,4.078  C66.451,71.462,64.627,73.29,62.373,73.29z M62.373,58.581c-2.254,0-4.082-1.829-4.082-4.082c0-2.254,1.828-4.081,4.082-4.081  s4.078,1.827,4.078,4.081C66.451,56.752,64.627,58.581,62.373,58.581z M62.373,43.868c-2.254,0-4.082-1.828-4.082-4.081  c0-2.25,1.828-4.079,4.082-4.079s4.078,1.829,4.078,4.079C66.451,42.04,64.627,43.868,62.373,43.868z M76.438,73.29  c-2.253,0-4.081-1.828-4.081-4.082c0-2.25,1.828-4.078,4.081-4.078c2.254,0,4.078,1.828,4.078,4.078  C80.517,71.462,78.692,73.29,76.438,73.29z M76.438,58.581c-2.253,0-4.081-1.829-4.081-4.082c0-2.254,1.828-4.081,4.081-4.081  c2.254,0,4.078,1.827,4.078,4.081C80.517,56.752,78.692,58.581,76.438,58.581z M76.438,43.868c-2.253,0-4.081-1.828-4.081-4.081  c0-2.25,1.828-4.079,4.081-4.079c2.254,0,4.078,1.829,4.078,4.079C80.517,42.04,78.692,43.868,76.438,43.868z" />
        </svg>
    );
}

function LogChatBarIcon() {

    return (
        <Tooltip text="SoundBoard Log">
            {({ onMouseEnter, onMouseLeave }) => (
                <div style={{ display: "flex" }}>
                    <Button
                        aria-haspopup="dialog"
                        aria-label="Open SoundBoard Log"
                        size=""
                        look={ButtonLooks.BLANK}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        innerClassName={ButtonWrapperClasses.button}
                        onClick={
                            OpenSoundBoardLog
                        }
                        style={{ padding: "0 4px" }}
                    >
                        <div className={ButtonWrapperClasses.buttonWrapper}>
                            <LogIcon className="chatBarLogIcon" />
                        </div>
                    </Button>
                </div>
            )}
        </Tooltip>
    );
}

// Thanks svgrepo.com for the play and download icons.
// Licensed under CC Attribution License https://www.svgrepo.com/page/licensing/#CC%20Attribution

// https://www.svgrepo.com/svg/438144/multimedia-play-icon-circle-button
function PlayIcon() {
    return (
        <svg
            height={24}
            width={24}
            version="1.1"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
        >
            <g fill="none" fill-rule="evenodd">
                <g transform="translate(-821 -378)">
                    <g transform="translate(819 376)">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" />
                        <path d="m9.9981 8.4275 5.4922 3.1384c0.23976 0.137 0.32306 0.44243 0.18605 0.68219-0.044295 0.077516-0.10854 0.14176-0.18605 0.18605l-5.4922 3.1384c-0.23976 0.137-0.54519 0.053707-0.68219-0.18605-0.043171-0.075549-0.065878-0.16106-0.065878-0.24807v-6.2768c0-0.27614 0.22386-0.5 0.5-0.5 0.087013 0 0.17252 0.022708 0.24807 0.065878z" fill="currentColor" />
                    </g>
                </g>
            </g>
        </svg>
    );
}

// https://www.svgrepo.com/svg/528952/download
function DownloadIcon() {
    return (
        <svg
            height={24}
            width={24}
            version="1.1"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
        >
            <path d="m8 22h8c2.8284 0 4.2426 0 5.1213-0.8787 0.8787-0.8786 0.8787-2.2929 0.8787-5.1213v-1c0-2.8284 0-4.2426-0.8787-5.1213-0.7684-0.76839-1.9463-0.86484-4.1213-0.87695m-10 0c-2.175 0.01211-3.3529 0.10856-4.1213 0.87694-0.87868 0.87871-0.87868 2.2929-0.87868 5.1213v1c0 2.8284 0 4.2427 0.87868 5.1213 0.2998 0.2998 0.66194 0.4973 1.1213 0.6275" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
            <path d="m12 2v13m0 0-3-3.5m3 3.5 3-3.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
        </svg>
    );
}

function IconWithTooltip({ text, icon, onClick }) {
    return <Tooltip text={text}>
        {({ onMouseEnter, onMouseLeave }) => (
            <div style={{ display: "flex" }}>
                <Button
                    aria-haspopup="dialog"
                    aria-label={text}
                    size=""
                    look={ButtonLooks.BLANK}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    innerClassName={ButtonWrapperClasses.button}
                    onClick={onClick}
                    style={{ padding: "0 4px" }}
                >
                    <div className={ButtonWrapperClasses.buttonWrapper}>
                        {icon}
                    </div>
                </Button>
            </div>
        )}
    </Tooltip>;
}

// #endregion Icons


// #region List Functions

/** Attempts to add a sound event to the log */
async function updatelist(sound: SoundEvent): Promise<void> {
    const data = await getLoggedSounds();

    if (!data) {
        await DataStore.set("SoundBoardLogList", [{ ...sound, users: [{ id: sound.userId, plays: [+Date.now()] }] }]);
    } else {
        if (data.some(item => item.soundId === sound.soundId)) {
            const newSounds = data.map(item => {
                if (item.soundId != sound.soundId) return item;
                return {
                    ...item,
                    users: item.users.some(user => user.id === sound.userId) ?
                        item.users.map(user => {
                            if (user.id != sound.userId) return user;
                            return { id: sound.userId, plays: [...user.plays, +Date.now()] };
                        }) :
                        [
                            ...item.users,
                            { id: sound.userId, plays: [+Date.now()] }
                        ]
                };
            });
            await DataStore.set("SoundBoardLogList", newSounds);
            return;
        };

        let limit = settings.store.SavedIds ?? 50;
        if (limit == 0) limit = Infinity;
        const modified = [{ ...sound, users: [{ id: sound.userId, plays: [+Date.now()] }] }, ...data].slice(0, limit);

        await DataStore.set("SoundBoardLogList", modified);
    }
}

async function resetlist() {
    await DataStore.set("SoundBoardLogList", []);
}

/** Returns an array with the logged sounds */
async function getLoggedSounds(): Promise<SoundLogEntry[]> {
    let data = await DataStore.get("SoundBoardLogList");
    if (!data) {
        DataStore.set("SoundBoardLogList", []);
        return [];
    }
    else {
        return data;
    }
};
// #endregion List functions

//start logger gui
let listeners: Function[] = [];

async function OpenSoundBoardLog(): Promise<void> {
    const { getURL } = proxyLazy(() => findByProps("getEmojiColors", "getURL"));
    function getEmojiUrl(emoji) {
        if (!emoji) return getURL('❓'); // If the sound doesn't have a related emoji
        return emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.png?size=32` : getURL(emoji.name);
    };
    const data = await getLoggedSounds();
    const SoundBoardLog = props => {

        const [sounds, setSounds] = useState(data);
        const [users, setUsers] = useState<User[]>([]);
        const update = async () => setSounds(await getLoggedSounds());

        // Update the sounds state when a new sound is played
        useEffect(() => {
            const onSound = (() => update());
            listeners.push(onSound);
            return () => void (listeners = listeners.filter(f => f !== onSound));
        }, []);

        const avatarsMax = 2;

        // Update the users state when a new sound is played
        useEffect(() => {
            (async () => {
                /** Array of user IDs without a resolved user object */
                const missing = sounds
                    .flatMap(sound => sound.users)                              // Get all users who have used any sound
                    .map(user => user.id)                                       // Get their ID ( user is {id: string, plays: number[]} )
                    .filter((id, index, self) => index === self.indexOf(id))    // Filter the array to remove non unique values
                    .filter(id => !users.map(user => user.id).includes(id));    // Filter the IDs to only get the ones not already in the users state
                if (!missing.length) return;                                    // return if every user ID is already in users

                for (const id of missing) {
                    const user = await UserUtils.getUser(id).catch(() => void 0);
                    if (user) setUsers(u => [...u, user]);
                };
            })();
        }, [sounds]);

        function renderMoreUsers(item, itemUsers) {
            return (
                <Clickable
                    className={AvatarStyles.clickableAvatar}
                    onClick={() => {
                        onClickShowMoreUsers(item, itemUsers);
                    }}
                >
                    <Tooltip text={`${itemUsers.length - avatarsMax} other people used this sound...`}>
                        {({ onMouseEnter, onMouseLeave }) => (
                            <div
                                className={AvatarStyles.moreUsers}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                            >
                                +{itemUsers.length - avatarsMax}
                            </div>
                        )}
                    </Tooltip>
                </Clickable>
            );
        }

        /** This function is called when you click the "Show more users" button. */
        function onClickShowMoreUsers(item: SoundLogEntry, users: User[]): void {
            const key = openModal(props => {
                return (
                    <ModalRoot {...props}>
                        <ModalContent className={cl("more")}>
                            <div className={cl("more-header")}>
                                <img
                                    className={cl("more-emoji")}
                                    src={getEmojiUrl(item.emoji)}
                                    alt=""
                                />
                                <Forms.FormTitle tag="h2" className={cl("more-soundId")}>{item.soundId}</Forms.FormTitle>
                            </div>
                            <div className={cl("more-users")}>
                                {users.map(user => {
                                    const currentUser = item.users.find(({ id }) => id === user.id) ?? { id: '', plays: [0] };
                                    return (
                                        <Clickable onClick={() => {
                                            closeModal(key);
                                            onClickUser(item, user);
                                        }}>
                                            <div className={cl("more-user")} style={{ cursor: "pointer" }}>
                                                <Flex flexDirection="row" className={cl("more-user-profile")}>
                                                    <img
                                                        className={cl("user-avatar")}
                                                        src={user.getAvatarURL(void 0, 512, true)}
                                                        alt=""
                                                        style={{ cursor: "pointer" }}
                                                    />
                                                    <Forms.FormText variant="text-xs/medium" style={{ cursor: "pointer" }}>{user.username}</Forms.FormText>
                                                </Flex>
                                                <Forms.FormText variant="text-xs/medium" style={{ cursor: "pointer" }}>Played {currentUser.plays.length} times</Forms.FormText>
                                            </div>
                                        </Clickable>
                                    );
                                })}
                            </div>
                        </ModalContent>
                    </ModalRoot>
                );
            });
        }

        function onClickUser(item, user) {
            const key = openModal(props => {
                const currentUser = item.users.find(({ id }) => id === user.id) ?? { id: '', plays: [0] };
                const soundsDoneByCurrentUser = sounds.filter(sound => sound.users.some(itemUser => itemUser.id === user.id) && sound.soundId != item.soundId);
                return (
                    <ModalRoot {...props}>
                        <ModalContent className={cl("user")}>
                            <Clickable onClick={() => {
                                closeModal(key);
                                openUserProfile(user.id);
                            }}>
                                <div className={cl("user-header")}>
                                    <img
                                        className={cl("user-avatar")}
                                        src={user.getAvatarURL(void 0, 512, true)}
                                        alt=""
                                        style={{ cursor: "pointer" }}
                                    />
                                    <Forms.FormTitle tag="h2" className={cl("user-name")} style={{ textTransform: "none", cursor: "pointer" }}>{user.username}</Forms.FormTitle>
                                </div>
                            </Clickable>
                            <Flex flexDirection="row" style={{ gap: "10px" }}>
                                <img
                                    className={cl("user-sound-emoji")}
                                    src={getEmojiUrl(item.emoji)}
                                    alt=""
                                />
                                <Flex flexDirection="column" style={{ gap: "7px", height: "68px", justifyContent: "space-between" }}>
                                    <Text variant="text-md/bold" style={{ height: "20px" }}>{item.soundId}</Text>
                                    <Text variant="text-md/normal">Played {currentUser.plays.length} times.</Text>
                                    <Text variant="text-md/normal">Last played: <Timestamp timestamp={moment(currentUser.plays.at(-1))} /></Text>
                                </Flex>
                            </Flex>
                            <Text variant="heading-lg/semibold" tag="h2" className={classes(Margins.top16, Margins.bottom8)}>
                                {soundsDoneByCurrentUser.length ? 'Also played:' : ' '}
                            </Text>
                            <Flex style={{ justifyContent: "space-between" }}>
                                <UserSummaryItem
                                    users={soundsDoneByCurrentUser}
                                    count={soundsDoneByCurrentUser.length}
                                    guildId={undefined}
                                    renderIcon={false}
                                    max={10}
                                    showDefaultAvatarsForNullUsers
                                    showUserPopout
                                    renderMoreUsers={() =>
                                        <div className={AvatarStyles.emptyUser}>
                                            <div className={AvatarStyles.moreUsers}>
                                                ...
                                            </div>
                                        </div>
                                    }
                                    className={cl("user-sounds")}
                                    renderUser={({ soundId, emoji }) => (
                                        <Clickable
                                            className={AvatarStyles.clickableAvatar}
                                            onClick={() => {
                                                closeModal(key);
                                                onClickUser(sounds.find(sound => sound.soundId === soundId), user);
                                            }}
                                        >
                                            <img
                                                className={AvatarStyles.avatar}
                                                src={getEmojiUrl(emoji)}
                                                alt={soundId}
                                                title={soundId}
                                            />
                                        </Clickable>
                                    )}
                                />
                                <div className={cl("user-buttons")}>
                                    <IconWithTooltip text="Download" icon={<DownloadIcon />} onClick={() => downloadaudio(item.soundId)} />
                                    <IconWithTooltip text="Copy ID" icon={<CopyIcon />} onClick={() => copyWithToast(item.soundId, "ID copied to clipboard!")} />
                                    <IconWithTooltip text="Play Sound" icon={<PlayIcon />} onClick={() => (new Audio(`https://cdn.discordapp.com/soundboard-sounds/${item.soundId}`)).play()} />
                                </div>
                            </Flex>
                        </ModalContent>
                    </ModalRoot>
                );
            });
        }

        return (
            <ErrorBoundary>
                <ModalRoot {...props} size={ModalSize.LARGE}>
                    <ModalHeader className={cl("modal-header")}>
                        <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>SoundBoard log</Text>
                        <ModalCloseButton onClick={() => closeModal(key)} />
                    </ModalHeader>
                    <ModalContent className={classes(cl("modal-content"), Margins.top8)}>
                        {sounds.map(item => {
                            const itemUsers = users.filter(user => item.users.map(u => u.id).includes(user.id));

                            return (
                                <div className={cl("sound")}>
                                    <Flex flexDirection="row" className={cl("sound-info")}>
                                        <img
                                            src={getEmojiUrl(item.emoji)}
                                            className={cl("sound-emoji")}
                                        />
                                        <Forms.FormText variant="text-xs/medium" className={cl("sound-id")}>{item.soundId}</Forms.FormText>
                                    </Flex>
                                    <UserSummaryItem
                                        users={itemUsers.slice(0, avatarsMax)}  // Trimmed array to the size of max
                                        count={item.users.length - 1}           // True size (counting users that aren't rendered) - 1
                                        guildId={undefined}
                                        renderIcon={false}
                                        max={avatarsMax}
                                        showDefaultAvatarsForNullUsers
                                        showUserPopout
                                        renderMoreUsers={() => renderMoreUsers(item, itemUsers)}
                                        className={cl("sound-users")}
                                        renderUser={(user: User) => (
                                            <Clickable
                                                className={AvatarStyles.clickableAvatar}
                                                onClick={() => {
                                                    onClickUser(item, user);
                                                }}
                                            >
                                                <img
                                                    className={AvatarStyles.avatar}
                                                    src={user.getAvatarURL(void 0, 80, true)}
                                                    alt={user.username}
                                                    title={user.username}
                                                />
                                            </Clickable>
                                        )}
                                    />
                                    <Flex flexDirection="row" className={cl("sound-buttons")}>
                                        <Button color={Button.Colors.LINK} size={Button.Sizes.SMALL} onClick={() => downloadaudio(item.soundId)}>Download</Button>
                                        <Button color={Button.Colors.GREEN} size={Button.Sizes.SMALL} onClick={() => copyWithToast(item.soundId, "ID copied to clipboard!")}>Copy ID</Button>
                                        <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={() => (new Audio(`https://cdn.discordapp.com/soundboard-sounds/${item.soundId}`)).play()} > Play Sound</Button>
                                    </Flex>
                                </div>
                            );
                        })}
                    </ModalContent >
                    <ModalFooter className={cl("modal-footer")}>
                        <Button color={Button.Colors.RED} onClick={async () => { await resetlist(); update(); }}>
                            Clear logs
                        </Button>
                    </ModalFooter>
                </ModalRoot >
            </ErrorBoundary >
        );
    };
    const key = openModal(props => <SoundBoardLog {...props} />);
}
//end logger gui

//start plugin define
export default definePlugin({
    name: "SoundBoardLogger",
    authors: [
        Devs.ImpishMoxxie,
        Devs.fres,
        Devs.echo
    ],
    settings,
    patches: [
        {
            predicate: () => settings.store.IconLocation === "chat",
            find: "ChannelTextAreaButtons",
            replacement: {
                match: /(\i)\.push.{1,30}disabled:(\i),.{1,20}\},"gift"\)\)/,
                replace: "$&,(()=>{try{$2||$1.push($self.chatBarIcon(arguments[0]))}catch{}})()",
            }
        },
        {
            predicate: () => settings.store.IconLocation === "toolbar",
            find: ".iconBadge}):null",
            replacement: {
                match: /className:(\i).toolbar,children:(\i)/,
                replace: "className:$1.toolbar,children:$self.toolbarPatch($2)"
            }
        }
    ],
    description: "Logs all soundboards that are played in vc and allows you to download them",
    start() {
        enableStyle(styles);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async (sound) => {
            if (!sound?.soundId) return;
            await updatelist(sound);
            listeners.forEach(cb => cb());
        });
    },
    stop() {
        disableStyle(styles);
    },
    chatBarIcon: (slateProps: any) => (
        <ErrorBoundary noop>
            <LogChatBarIcon />
        </ErrorBoundary>
    ),
    toolbarPatch: (obj) => {
        if (!obj?.props?.children) return obj;
        obj.props.children = [<LogChatBarIcon />, ...obj.props.children];
        return obj;
    }
});
//end plugin define
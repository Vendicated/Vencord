/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Text } from "@components/Text";
import { clearLoggedSounds, getLoggedSounds } from "@plugins/SoundBoardLogger/store";
import { addListener, cl, copyWithToast, downloadAudio, getEmojiUrl, getPreviewVolume, playSound, removeListener, SoundLogEntry } from "@plugins/SoundBoardLogger/utils";
import { User } from "@vencord/discord-types";
import { Clickable, ContextMenuApi, FluxDispatcher, Menu, Modal, openModal, SoundboardStore, Tooltip, useEffect, UserUtils, useState } from "@webpack/common";
import shiggy from "file://../assets/shiggy.png?base64";

import { openCloneSoundModal } from "./CloneSoundModal";
import { openMoreUsersModal } from "./MoreUsersModal";
import { openUserModal } from "./UserModal";

export async function openSoundBoardLog(): Promise<void> {

    const data = await getLoggedSounds();
    openModal(props => <ErrorBoundary>
        <Modal {...props} title="Soundboard log" size="lg">
            <SoundBoardLog data={data} />
        </Modal>
    </ErrorBoundary>);

}

export default function SoundBoardLog({ data }: { data: SoundLogEntry[]; }) {
    const [sounds, setSounds] = useState(data);
    const [users, setUsers] = useState<User[]>([]);
    const update = async () => setSounds(await getLoggedSounds());

    // Update the sounds state when a new sound is played
    useEffect(() => {
        const onSound = () => update();
        addListener(onSound);
        return () => removeListener(onSound);
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ids = [...new Set(sounds.flatMap(sound => sound.users.map(user => user.id)))];
            const resolved = await Promise.all(ids.map(id => UserUtils.getUser(id).catch(() => undefined)));
            if (!cancelled) setUsers(resolved.filter((user): user is User => !!user));
        })();
        return () => { cancelled = true; };
    }, [sounds]);

    function renderMoreUsers(item, itemUsers) {
        return (
            <Clickable
                className={cl("avatar-button")}
                onClick={() => {
                    onClickShowMoreUsers(item, itemUsers);
                }}
            >
                <Tooltip text={`${itemUsers.length - 2} other people used this sound...`}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            className={cl("avatar-overflow")}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                flexShrink: 0,
                                borderRadius: "50%",
                                boxSizing: "border-box",
                                background: "var(--background-modifier-accent, #35363c)",
                                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                                color: "var(--text-normal, #dbdee1)",
                                fontSize: 11,
                                fontWeight: 600,
                                lineHeight: 1
                            }}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                        >
                            +{itemUsers.length - 2}
                        </div>
                    )}
                </Tooltip>
            </Clickable>
        );
    }

    function onClickShowMoreUsers(item: SoundLogEntry, users: User[]): void {
        openMoreUsersModal(item, users, onClickUser);
    }

    function onClickUser(item: SoundLogEntry, user: User) {
        openUserModal(item, user, sounds);
    }

    function SoundContextMenu({ item }) {
        const label = id => `soundboardlogger-${id}`;
        return (
            <Menu.Menu
                navId="soundboardlogger-sound-menu"
                onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            >
                <Menu.MenuGroup>
                    <Menu.MenuItem
                        id={label("clone")}
                        label="Clone sound"
                        action={() => openCloneSoundModal(item)}
                    />
                </Menu.MenuGroup>
            </Menu.Menu>
        );
    }

    return (
        <div className={cl("log")}>
            <div className={cl("summary")}>
                <Text size="sm" weight="medium">{sounds.length} {sounds.length === 1 ? "sound" : "sounds"} collected</Text>
                {sounds.length > 0 && <Text size="xs" className={cl("muted")}>Right-click a sound to clone it</Text>}
            </div>
            <div
                className={cl("modal-content")}
                role="region"
                aria-label="Logged sounds"
                tabIndex={0}
                style={{
                    maxHeight: "max(120px, calc(100dvh - 300px))",
                    minHeight: 0,
                    overflowY: "auto",
                    overscrollBehavior: "contain",
                    scrollbarWidth: "thin",
                    scrollbarGutter: "stable",
                    paddingInlineEnd: 4
                }}
            >
                {sounds.length ? sounds.map(item => {
                    const itemUsers = users.filter(user => item.users.map(u => u.id).includes(user.id));

                    const name = SoundboardStore.getSoundById(item.soundId)?.name ?? `Sound ${item.soundId}`;
                    const plays = item.users.reduce((total, user) => total + user.plays.length, 0);

                    return (
                        <div
                            key={item.soundId}
                            className={cl("sound")}
                            style={{ flexShrink: 0 }}
                            onContextMenu={e =>
                                ContextMenuApi.openContextMenu(e, () => <SoundContextMenu item={item} />)
                            }
                        >
                            <Flex flexDirection="row" className={cl("sound-info")}>
                                <div className={cl("emoji-tile")}>
                                    <img src={getEmojiUrl(item.emoji)} className={cl("sound-emoji")} alt="" />
                                </div>
                                <div className={cl("sound-details")}>
                                    <Text size="sm" weight="semibold" className={cl("sound-name")} title={name}>{name}</Text>
                                    <Text size="xs" className={cl("muted")}>{plays} {plays === 1 ? "play" : "plays"} · {item.users.length} {item.users.length === 1 ? "person" : "people"}</Text>
                                    <Text size="xs" className={cl("sound-id")}>{item.soundId}</Text>
                                </div>
                            </Flex>
                            <div className={cl("sound-users")}>
                                {itemUsers.slice(0, itemUsers.length > 3 ? 2 : 3).map(user => (
                                    <Clickable
                                        key={user.id}
                                        className={cl("avatar-button")}
                                        onClick={() => onClickUser(item, user)}
                                    >
                                        <img
                                            className={cl("avatar")}
                                            src={user.getAvatarURL(void 0, 80, true)}
                                            alt={user.username}
                                            title={user.username}
                                        />
                                    </Clickable>
                                ))}
                                {itemUsers.length > 3 && renderMoreUsers(item, itemUsers)}
                            </div>
                            <Flex flexDirection="row" className={cl("sound-buttons")}>
                                <Button variant="secondary" size="small" onClick={() => downloadAudio(item.soundId)}>Download</Button>
                                <Button variant="secondary" size="small" onClick={() => copyWithToast(item.soundId, "ID copied to clipboard!")}>Copy ID</Button>
                                <Tooltip text={`Preview volume: ${Math.floor(getPreviewVolume())}%`}>
                                    {({ onMouseEnter, onMouseLeave }) =>
                                        <Button variant="primary" size="small" onClick={() => playSound(item.soundId)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>▶ Play</Button>
                                    }
                                </Tooltip>
                            </Flex>
                        </div>
                    );
                }) :
                    <div className={cl("empty")}>
                        <img src={`data:image/png;base64,${shiggy}`} alt="Shiggy relaxing" width={200} style={{ maxWidth: "100%", height: "auto", alignSelf: "center" }} />
                        <Text size="lg" weight="semibold">Your sound collection starts here</Text>
                        <Text size="sm" className={cl("muted")}>Join a voice channel. Sounds played there will appear here.</Text>
                    </div>
                }
            </div >
            {sounds.length > 0 && <div className={cl("modal-footer")}>
                <Text size="xs" className={cl("muted")}>Click an avatar to view play history</Text>
                <Button variant="dangerSecondary" size="small" disabled={!sounds.length} onClick={async () => { await clearLoggedSounds(); update(); }}>
                    Clear logs
                </Button>
            </div>}
        </div>
    );
}

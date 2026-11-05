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
import { Heading } from "@components/Heading";
import { Text } from "@components/Text";
import { cl, getEmojiUrl, SoundEvent } from "@plugins/SoundBoardLogger/utils";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { Emoji, Guild } from "@vencord/discord-types";
import { EmojiIntention } from "@vencord/discord-types/enums";
import { findComponentByCodeLazy } from "@webpack";
import { Clickable, closeModal, GuildChannelStore, GuildStore, Modal, openModal, PermissionsBits, PermissionStore, Popout, RestAPI, SearchableSelect, showToast, TextInput, useMemo, useRef, UserStore, useState } from "@webpack/common";
import { HtmlHTMLAttributes } from "react";

export function openCloneSoundModal(item) {
    const key = openModal(props =>
        <Modal {...props} title="Clone Sound" size="lg">
            <ErrorBoundary>
                <CloneSoundModal item={item} closeModal={() => closeModal(key)} />
            </ErrorBoundary>
        </Modal>
    );
}

// Thanks https://github.com/Vendicated/Vencord/blob/ea11f2244fde469ce308f8a4e7224430be62f8f1/src/plugins/emoteCloner/index.tsx#L173-L177
const getFontSize = (s: string, small: boolean = false) => {
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[s.length + (small ? 1 : 0)] ?? 8;
};

function GuildAcronym({ acronym, small, style = {} }) {
    return (
        <Flex style={{ alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: getFontSize(acronym, small), ...style }}>
            <Text>{acronym}</Text>
        </Flex>
    );
}

function CustomInput({ children, className = "", ...props }: HtmlHTMLAttributes<HTMLDivElement>) {
    return <div className={classes(cl("clone-input"), className)} {...props}>
        {children}
    </div>;
}

const EmojiPicker = findComponentByCodeLazy("shouldHidePickerActions:", "onViewEmojiPacksChange:");

export function CloneSoundModal({ item, closeModal }: { item: SoundEvent, closeModal: () => void; }) {
    const ownedGuilds = useMemo(() => {
        return Object.values(GuildStore.getGuilds()).filter(guild =>
            guild.ownerId === UserStore.getCurrentUser().id ||
            (PermissionStore.getGuildPermissions({ id: guild.id }) & PermissionsBits.CREATE_GUILD_EXPRESSIONS) === PermissionsBits.CREATE_GUILD_EXPRESSIONS);
    }, []);

    const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
    const [soundName, setSoundName] = useState<string | undefined>(undefined);
    const [soundEmoji, setSoundEmoji] = useState<any | undefined>(undefined);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [show, setShow] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const emojiRef = useRef<HTMLDivElement>(null);

    const isEmojiValid = soundEmoji?.guildId ? soundEmoji.guildId === selectedGuild?.id : true;

    const styles = {
        selected: { height: "24px", width: "24px" },
        nonselected: { width: "36px", height: "36px", marginTop: "4px" }
    };
    const getStyle = key => key === "selected" ? styles.selected : styles.nonselected;

    function onSelectEmoji({ emoji }: { emoji: Emoji; }) {
        setShow(false);
        setSoundEmoji(emoji);
    }

    return <>
        <div>
            <Heading className={Margins.top16}>Cloning Sound</Heading>
            <CustomInput style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }} className={Margins.bottom16}>
                <img src={getEmojiUrl(item.emoji)} width="24" height="24" />
                <Text>{item.soundId}</Text>
            </CustomInput>
            <Heading aria-required="true">Add to server:</Heading>
            <SearchableSelect
                options={
                    ownedGuilds.map(guild => ({
                        label: guild.name,
                        value: guild
                    }))
                }

                placeholder="Select a server"
                value={selectedGuild ?? undefined}

                onChange={v => setSelectedGuild(v)}
                closeOnSelect={true}
                renderOptionPrefix={v => v ? (
                    v.value.icon ?
                        <img width={36} height={36} src={v.value.getIconURL(96, true)} style={{ borderRadius: "50%", ...getStyle(v.key) }} /> :
                        <GuildAcronym acronym={v.value.acronym} style={getStyle(v.key)} small={v.key === "selected"} />
                ) : null}
            />
            <Flex flexDirection="row" style={{ gap: "10px", justifyContent: "space-between" }} className={classes(Margins.top16, Margins.bottom16)}>
                <div style={{ flex: 1 }}>
                    <Heading aria-required="true">Sound Name</Heading>
                    <TextInput value={soundName} onChange={v => setSoundName(v)} placeholder="Sound Name" />
                </div>
                <div style={{ flex: 1 }}>
                    <Heading>Related Emoji</Heading>
                    <Popout
                        position="bottom"
                        align="right"
                        animation={Popout.Animation.NONE}
                        shouldShow={show}
                        targetElementRef={emojiRef}
                        onRequestClose={() => setShow(false)}
                        renderPopout={() => (
                            <ErrorBoundary>
                                <EmojiPicker
                                    pickerIntention={EmojiIntention.SOUNDBOARD}
                                    guildId={selectedGuild?.id}
                                    channel={selectedGuild ? GuildChannelStore.getDefaultChannel(selectedGuild.id) : undefined}
                                    onSelectEmoji={onSelectEmoji}
                                    closePopout={() => setShow(false)}
                                />
                            </ErrorBoundary>
                        )}
                    >
                        {() => (
                            <div ref={emojiRef}>
                            <Clickable onClick={() => setShow(v => !v)}>
                                <CustomInput style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center", cursor: "pointer" }}>
                                    {soundEmoji ?
                                        <>
                                            <img src={getEmojiUrl({ name: soundEmoji.surrogates, id: soundEmoji.id })} width="24" height="24" style={{ cursor: "pointer" }} />
                                            <Text style={{ color: "var(--text-muted)", cursor: "pointer" }}>:{soundEmoji.name ? soundEmoji.name.split("~")[0] : soundEmoji.uniqueName}:</Text>
                                        </> :
                                        <>
                                            <img src={getEmojiUrl({ name: "😊" })} width="24" height="24" style={{ filter: "grayscale(100%)", cursor: "pointer" }} />
                                            <Text style={{ color: "var(--text-muted)", cursor: "pointer" }}>Click to Select</Text>
                                        </>
                                    }
                                </CustomInput>
                            </Clickable>
                            </div>
                        )}
                    </Popout>
                    {soundEmoji && <Button variant="none" size="small" onClick={() => setSoundEmoji(undefined)}>Remove emoji</Button>}
                </div>
            </Flex>
            {!isEmojiValid && <Text style={{ color: "var(--text-danger)" }} className={Margins.bottom16}>You can't use that emoji in that server</Text>}
            {uploadError && <Text size="sm" role="alert" style={{ color: "var(--text-danger)", marginBottom: 12, overflowWrap: "anywhere" }}>{uploadError}</Text>}
            <Button onClick={async () => {
                if (!selectedGuild || !soundName?.trim() || !isEmojiValid) return;
                setUploadError(null);
                const name = soundName.trim();
                if (name.length < 2 || name.length > 32) {
                    setUploadError("Sound names must be between 2 and 32 characters.");
                    return;
                }
                setLoadingButton(true);
                try {
                    const response = await fetch(`https://cdn.discordapp.com/soundboard-sounds/${item.soundId}`);
                    if (!response.ok) throw new Error(`Could not download the original sound (HTTP ${response.status}).`);
                    const audio = await response.arrayBuffer();
                    const header = new Uint8Array(audio, 0, Math.min(4, audio.byteLength));
                    const isOgg = header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53;
                    const blob = new Blob([audio], { type: isOgg ? "audio/ogg" : "audio/mpeg" });
                    const sound = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(blob);
                    });
                    await RestAPI.post({
                        url: `/guilds/${selectedGuild.id}/soundboard-sounds`,
                        body: {
                            name,
                            sound,
                            emoji_id: soundEmoji?.id ?? null,
                            emoji_name: soundEmoji?.id ? null : soundEmoji?.surrogates ?? null,
                            volume: 1
                        }
                    });
                    showToast({ text: `Sound added to ${selectedGuild.name}`, variant: "success" });
                    closeModal();
                } catch (error) {
                    const failure = error as { body?: { message?: string; errors?: unknown; code?: number; }; message?: string; status?: number; };
                    const message = failure.body?.message ?? failure.message ?? "Unknown upload error";
                    const details = failure.body?.errors ? ` ${JSON.stringify(failure.body.errors)}` : "";
                    const code = failure.body?.code ?? failure.status;
                    setUploadError(`${message}${code ? ` (${code})` : ""}${details}`);
                    showToast({ text: `Could not clone sound: ${message}`, variant: "critical" });
                } finally {
                    setLoadingButton(false);
                }
            }}
                disabled={(!(selectedGuild && soundName?.trim() && isEmojiValid)) || loadingButton}
                size="medium"
                style={{ width: "100%" }}
                className={Margins.bottom16}>Add to Server</Button>
        </div>
    </>;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { closeModal, ModalCloseButton,ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { LazyComponent } from "@utils/react";
import { find, findByPropsLazy } from "@webpack";
import { Button, Clickable, Forms, GuildStore, PermissionsBits, PermissionStore, Popout, SearchableSelect, showToast, Text, TextInput, Toasts, useMemo, UserStore, useState } from "@webpack/common";
import { Guild } from "discord-types/general";
import { HtmlHTMLAttributes } from "react";

import { cl, getEmojiUrl,SoundEvent } from "../utils";

export function openCloneSoundModal(item) {
    const key = openModal(props =>
        <ModalRoot {...props}>
            <CloneSoundModal item={item} closeModal={() => closeModal(key)} />
        </ModalRoot>
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

const EmojiPicker = LazyComponent(() => find(e => e.default?.type?.render?.toString?.().includes?.(".updateNewlyAddedLastSeen)")).default);

const sounds = findByPropsLazy("uploadSound", "updateSound");

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

    const isEmojiValid = soundEmoji?.guildId ? soundEmoji.guildId === selectedGuild?.id : true;

    const styles = {
        selected: { height: "24px", width: "24px" },
        nonselected: { width: "36px", height: "36px", marginTop: "4px" }
    };
    const getStyle = key => key === "selected" ? styles.selected : styles.nonselected;

    function onSelectEmoji(emoji) {
        setShow(false);
        setSoundEmoji(emoji);
    }

    return <>
        <ModalHeader>
            <Flex style={{ width: "100%", justifyContent: "center" }}>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Clone Sound</Text>
                <ModalCloseButton onClick={closeModal} />
            </Flex>
        </ModalHeader>
        <ModalContent>
            <Forms.FormTitle className={Margins.top16}>Cloning Sound</Forms.FormTitle>
            <CustomInput style={{ display: "flex", flexDirection: "row", gap: "10px", alignItems: "center" }} className={Margins.bottom16}>
                <img src={getEmojiUrl(item.emoji)} width="24" height="24" />
                <Text>{item.soundId}</Text>
            </CustomInput>
            <Forms.FormTitle required={true} aria-required="true">Add to server:</Forms.FormTitle>
            <SearchableSelect
                options={
                    ownedGuilds.map(guild => ({
                        label: guild.name,
                        value: guild
                    }))
                }

                placeholder="Select a server"
                value={selectedGuild ? ({
                    label: selectedGuild.name,
                    value: selectedGuild,
                    key: "selected"
                }) : undefined}

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
                    <Forms.FormTitle required={true} aria-required="true">Sound Name</Forms.FormTitle>
                    <TextInput value={soundName} onChange={v => setSoundName(v)} placeholder="Sound Name" />
                </div>
                <div style={{ flex: 1 }}>
                    <Forms.FormTitle>Related Emoji</Forms.FormTitle>
                    <Popout
                        position="bottom"
                        align="right"
                        animation={Popout.Animation.NONE}
                        shouldShow={show}
                        onRequestClose={() => setShow(false)}
                        renderPopout={() => <EmojiPicker pickerIntention={2} channel={{ getGuildId: () => selectedGuild?.id }} onSelectEmoji={onSelectEmoji} />}
                    >
                        {() => (
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
                        )}
                    </Popout>
                </div>
            </Flex>
            {!isEmojiValid && <Forms.FormText style={{ color: "var(--text-danger)" }} className={Margins.bottom16}>You can't use that emoji in that server</Forms.FormText>}
            <Button onClick={() => {
                setLoadingButton(true);
                fetch(`https://cdn.discordapp.com/soundboard-sounds/${item.soundId}`).then(function (response) {
                    if (!response.body) {
                        setLoadingButton(false);
                        showToast("Error fetching the sound", Toasts.Type.FAILURE);
                        return;
                    }
                    response.body.getReader().read().then(function(result) {
                        if (!result.value) {
                            setLoadingButton(false);
                            showToast("Error reading the sound content", Toasts.Type.FAILURE);
                            return;
                        }
                        return btoa(String.fromCharCode(...result.value));
                    }).then(function (b64) {

                        sounds.uploadSound({
                            guildId: selectedGuild?.id,
                            name: soundName,
                            sound: `data:audio/ogg;base64,${b64}`,
                            ...(soundEmoji.id ? { emojiId: soundEmoji.id } : { emojiName: soundEmoji.surrogates }),
                            volume: 1
                        }).then(() => {
                            showToast(`Sound added to ${selectedGuild?.name}`, Toasts.Type.SUCCESS);
                            closeModal();
                        }).catch(() => {
                            setLoadingButton(false);
                            showToast("Error while adding sound", Toasts.Type.FAILURE);
                        });

                    });
                }).catch(e => {
                    setLoadingButton(false);
                    showToast("Error fetching the sound", Toasts.Type.FAILURE);
                    return;
                });
            }}
            disabled={(!(selectedGuild && soundName && isEmojiValid)) || loadingButton}
            size={Button.Sizes.MEDIUM}
            style={{ width: "100%" }}
            className={Margins.bottom16}>Add to Server</Button>
        </ModalContent>
    </>;
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, lodash, Text, TextInput, useState, useStateFromStores } from "@webpack/common";

import { ChatWallpaperStore, Wallpaper } from "./util";

interface Props {
    props: ModalProps;
    onSelect: (url: string) => void;
}

export function SetCustomWallpaperModal({ props, onSelect }: Props) {
    const [url, setUrl] = useState("");

    return (
        <ModalRoot {...props} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/normal" style={{ marginBottom: 8 }}>
                    Set a custom wallpaper
                </Text>
            </ModalHeader>
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                    <TextInput
                        placeholder="The image url"
                        value={url}
                        onChange={setUrl}
                        autoFocus
                    />
                    {url && (
                        <img
                            src={url}
                            alt="Wallpaper preview"
                            style={{
                                display: "block",
                                width: "100%",
                                height: "auto",
                                objectFit: "cover",
                                border: "1px solid var(--background-modifier-accent)",
                                borderRadius: 8
                            }}
                        />
                    )}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button onClick={props.onClose}>Cancel</Button>
                        <Button
                            color={Button.Colors.BRAND}
                            onClick={() => {
                                onSelect(url);
                                props.onClose();
                            }}
                            disabled={!url}
                        >Apply</Button>
                    </div>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

export function SetDiscordWallpaperModal({ props, onSelect }: Props) {
    const discordWallpapers: Wallpaper[] = useStateFromStores([ChatWallpaperStore], () => ChatWallpaperStore.wallpapers);

    return (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/normal" style={{ marginBottom: 8 }}>
                    Choose a Discord Wallpaper
                </Text>
            </ModalHeader>
            <ModalContent>
                <div className="vc-wpfree-discord-wp-modal">
                    {lodash.chunk(discordWallpapers, 2).map(group => {
                        const main = group[0];
                        return (
                            <div key={main.id} className="vc-wpfree-discord-wp-icon-container">
                                <figure style={{ margin: 0, textAlign: "center" }}>
                                    <img
                                        className="vc-wpfree-discord-wp-icon-img"
                                        src={`https://cdn.discordapp.com/assets/content/${main.default.icon}`}
                                        alt={main.label}
                                    />
                                    <figcaption>
                                        <Text variant="text-md/normal">{main.label}</Text>
                                    </figcaption>
                                </figure>
                                <div className="vc-wpfree-discord-set-buttons">
                                    {group.map(wp => (
                                        <Button
                                            key={wp.id}
                                            size={Button.Sizes.SMALL}
                                            color={Button.Colors.BRAND}
                                            onClick={() => {
                                                onSelect(`https://cdn.discordapp.com/assets/content/${wp.default.asset}`);
                                                props.onClose();
                                            }}
                                        >
                                            {wp.isBlurred ? "Blurred" : "Normal"}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}


/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, Text, TextInput, useState } from "@webpack/common";

interface Props {
    props: ModalProps;
    onSelect: (url: string) => void;
}

export function SetWallpaperModal({ props, onSelect }: Props) {
    const [url, setUrl] = useState("");

    return (
        <ModalRoot {...props} size={ModalSize.SMALL}>
            <ModalHeader>
                <Text variant="heading-lg/normal" style={{ marginBottom: 8 }}>
                    Set wallpaper
                </Text>
            </ModalHeader>
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <Text>The image url</Text>
                    <TextInput
                        value={url}
                        onChange={u => {
                            setUrl(u);
                        }}
                        autoFocus
                    />
                    {url && (
                        <img
                            alt=""
                            src={url}
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
        </ModalRoot >
    );
}

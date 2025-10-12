/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { Button, TextInput, useState } from "@webpack/common";

interface Props {
    props: ModalProps;
    onSelect: (url: string) => void;
    initialUrl: string | undefined;
}

export function SetWallpaperModal({ props, onSelect, initialUrl }: Props) {
    const [url, setUrl] = useState(initialUrl ?? "");

    return (
        <ModalRoot {...props} size={ModalSize.SMALL}>
            <ModalHeader>
                <BaseText size="lg" style={{ marginBottom: 8 }}>
                    Set wallpaper
                </BaseText>
            </ModalHeader>
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <BaseText>The image url</BaseText>
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

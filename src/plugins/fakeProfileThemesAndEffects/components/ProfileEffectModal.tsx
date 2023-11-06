/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, showToast, Text, Toasts, useState } from "@webpack/common";

interface ProfileEffectModalProps {
    modalProps: ModalProps,
    onClose: () => void,
    onSubmit: (i: string, n: string) => void,
    profileEffects: any
}

export function ProfileEffectModal({ modalProps, onClose, onSubmit, profileEffects }: ProfileEffectModalProps): JSX.Element {
    const [selected, setSelected] = useState(-1);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text style={{ color: "var(--header-primary)", fontSize: "20px", fontWeight: "600" }}>
                        {"Add Profile Effect"}
                    </Text>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <ModalContent
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >
                {profileEffects.map((e, i): JSX.Element =>
                    <div
                        style={{
                            background: "top / cover url(" + e.thumbnailPreviewSrc + "), top / cover url(/assets/f328a6f8209d4f1f5022.png)",
                            borderRadius: "4px",
                            boxShadow: i === selected ? "0 0 0 2px var(--brand-experiment-500, #5865f2)" : "none",
                            cursor: "pointer",
                            margin: "6px",
                            width: "80px",
                            height: "80px"
                        }}
                        onClick={() => { setSelected(i); }}
                    />
                )}
            </ModalContent>
            <ModalFooter>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text style={{ color: "var(--header-primary)", fontSize: "20px", fontWeight: "600" }}>
                        {selected === -1 ? "" : profileEffects[selected].title}
                    </Text>
                    <Button
                        color={Button.Colors.PRIMARY}
                        size={Button.Sizes.MEDIUM}
                        onClick={() => {
                            if (selected !== -1)
                                onSubmit(profileEffects[selected].id, profileEffects[selected].title);
                            else
                                showToast("No effect selected!", Toasts.Type.MESSAGE);
                        }}
                    >
                        {"Apply"}
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openProfileEffectModal(onSubmit: (i: string, n: string) => void, profileEffects: any): void {
    const key = openModal(modalProps =>
        <ProfileEffectModal
            modalProps={modalProps}
            onClose={() => { closeModal(key); }}
            onSubmit={onSubmit}
            profileEffects={profileEffects}
        />
    );
}

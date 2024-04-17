/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Flex, showToast, Text, useState } from "@webpack/common";

import type { ProfileEffect } from "../types";

interface ProfileEffectModalProps {
    modalProps: ModalProps;
    onClose: () => void;
    onSubmit: (v: ProfileEffect) => void;
    classNames: { [k: string]: string; };
    profileEffects: ProfileEffect[];
    initialEffectID?: string;
}

export function ProfileEffectModal({ modalProps, onClose, onSubmit, profileEffects, classNames = {}, initialEffectID }: ProfileEffectModalProps) {
    const [selected, setSelected] = useState(initialEffectID ? profileEffects.findIndex(e => e.id === initialEffectID) : -1);

    return (
        <ModalRoot {...modalProps} size={ModalSize.SMALL}>
            <ModalHeader justify={Flex.Justify.BETWEEN}>
                <Text color="header-primary" variant="heading-lg/semibold" tag="h1">
                    Add Profile Effect
                </Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent
                paddingFix={false}
                style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    justifyContent: "center",
                    padding: "16px 8px 16px 16px"
                }}
            >
                {profileEffects.map((e, i) => (
                    <div
                        className={classNames.effectGridItem + (i === selected ? " " + classNames.selected : "")}
                        role="button"
                        tabIndex={0}
                        style={{ width: "80px", height: "80px" }}
                        onClick={() => setSelected(i)}
                    >
                        <img
                            className={classNames.presetEffectBackground}
                            src="/assets/f328a6f8209d4f1f5022.png"
                            alt={e.accessibilityLabel}
                        />
                        <img
                            className={classNames.presetEffectImg}
                            src={e.thumbnailPreviewSrc}
                            alt={e.title}
                        />
                    </div>
                ))}
            </ModalContent>
            <ModalFooter
                justify={Flex.Justify.BETWEEN}
                direction={Flex.Direction.HORIZONTAL}
                align={Flex.Align.CENTER}
            >
                <Text color="header-primary" variant="heading-lg/semibold" tag="h1">
                    {selected === -1 ? "" : profileEffects[selected].title}
                </Text>
                <Button
                    onClick={() => {
                        if (selected !== -1)
                            onSubmit(profileEffects[selected]);
                        else
                            showToast("No effect selected!");
                    }}
                >
                    Apply
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openProfileEffectModal(
    onSubmit: (v: ProfileEffect) => void,
    profileEffects: ProfileEffect[],
    classNames: { [k: string]: string; } = {},
    initialEffectID?: string
) {
    const key = openModal(modalProps =>
        <ProfileEffectModal
            modalProps={modalProps}
            onClose={() => closeModal(key)}
            onSubmit={onSubmit}
            profileEffects={profileEffects}
            classNames={classNames}
            initialEffectID={initialEffectID}
        />
    );
    return key;
}

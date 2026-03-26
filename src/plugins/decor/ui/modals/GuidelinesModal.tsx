/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Flex } from "@components/Flex";
import { Link } from "@components/Link";
import { settings } from "@plugins/decor/settings";
import { cl, DecorationModalClasses, requireAvatarDecorationModal } from "@plugins/decor/ui";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button } from "@components/Button";
import { BaseText } from "@components/BaseText";
import { Paragraph } from "@components/Paragraph";

import { openCreateDecorationModal } from "./CreateDecorationModal";

function GuidelinesModal(props: ModalProps) {
    return <ModalRoot
        {...props}
        size={ModalSize.SMALL}
        className={DecorationModalClasses.modal}
    >
        <ModalHeader separator={false} className={cl("modal-header")}>
            <BaseText
                size="lg"
                weight="semibold"
                tag="h1"
                style={{ flexGrow: 1, color: "var(--text-strong)" }}
            >
                Hold on
            </BaseText>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent
            scrollbarType="none"
        >
            <Paragraph>
                By submitting a decoration, you agree to <Link
                    href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
                >
                    the guidelines
                </Link>. Not reading these guidelines may get your account suspended from creating more decorations in the future.
            </Paragraph>
        </ModalContent>
        <ModalFooter className={cl("modal-footer")}>
            <Flex gap="4px">
                <Button
                    onClick={() => {
                        settings.store.agreedToGuidelines = true;
                        props.onClose();
                        openCreateDecorationModal();
                    }}
                >
                    Continue
                </Button>
                <Button
                    onClick={props.onClose}
                    variant="primary"
                >
                    Go Back
                </Button>
            </Flex>
        </ModalFooter>
    </ModalRoot>;
}

export const openGuidelinesModal = () =>
    requireAvatarDecorationModal().then(() => openModal(props => <GuidelinesModal {...props} />));

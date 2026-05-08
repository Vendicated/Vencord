/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Link } from "@components/Link";
import { settings } from "@plugins/decor/settings";
import { DecorationModalClasses, requireAvatarDecorationModal } from "@plugins/decor/ui";
import { ModalProps, openModal } from "@utils/modal";
import { Forms, Text } from "@webpack/common";
import { Modal } from "@webpack/common/modalV2";

import { openCreateDecorationModal } from "./CreateDecorationModal";

function GuidelinesModal(props: ModalProps) {
    return <Modal
        {...props}
        {...({ className: DecorationModalClasses.modal } as any)}
        size="sm"
        title={<Text color="text-strong" variant="heading-lg/semibold" tag="h1">Hold on</Text>}
        actions={[
            {
                text: "Continue",
                variant: "primary",
                onClick: () => {
                    settings.store.agreedToGuidelines = true;
                    props.onClose();
                    openCreateDecorationModal();
                }
            },
            {
                text: "Go Back",
                variant: "secondary",
                onClick: props.onClose
            }
        ]}
    >
        <div>
            <Forms.FormText>
                By submitting a decoration, you agree to <Link
                    href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
                >
                    the guidelines
                </Link>. Not reading these guidelines may get your account suspended from creating more decorations in the future.
            </Forms.FormText>
        </div>
    </Modal>;
}

export const openGuidelinesModal = () =>
    requireAvatarDecorationModal().then(() => openModal(props => <GuidelinesModal {...props} />));

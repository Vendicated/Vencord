/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { Button, Forms, Text, TextInput, UserStore, useState } from "@webpack/common";

import requireDecorationModules from "../..//lib/utils/requireDecorationModule";
import cl from "../../lib/utils/cl";
import { AvatarDecorationPreview } from "../components";

const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");

export default function CreateDecorationModal(props) {
    const [name, setName] = useState("");
    return <ModalRoot
        {...props}
        size={ModalSize.MEDIUM}
        className={DecorationModalStyles.modal}
    >
        <div className={DecorationModalStyles.modalBody}>
            <ModalHeader separator={false} className={DecorationModalStyles.modalHeader}>
                <Text
                    color="header-primary"
                    variant="heading-lg/semibold"
                    tag="h1"
                    style={{ flexGrow: 1 }}
                >
                    Create Decor Decoration
                </Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent
                className={cl("create-decoration-modal-content")}
                scrollbarType="none"
            >
                <div className={cl("create-decoration-modal-form")}>
                    <Forms.FormSection title="File">
                        <TextInput
                            placeholder="FILE INPUT WILL GO HERE"
                            onChange={() => { }}
                        />
                        <Forms.FormText type="description" className={Margins.top8}>
                            Animated PNG or PNG, max 1MB
                        </Forms.FormText>
                    </Forms.FormSection>
                    <Forms.FormSection title="Name">
                        <TextInput
                            placeholder="Companion Cube"
                            value={name}
                            onChange={setName}
                        />
                        <Forms.FormText type="description" className={Margins.top8}>
                            This name will be used when referring to this decoration.
                        </Forms.FormText>
                    </Forms.FormSection>
                    <Forms.FormText type="description" className={Margins.bottom16}>
                        Make sure your decoration does not violate Decor's Guidelines before creating your decoration.
                    </Forms.FormText>
                </div>
                <AvatarDecorationPreview
                    avatarDecorationOverride={null}
                    user={UserStore.getCurrentUser()}
                />
            </ModalContent>
            <ModalFooter className={DecorationModalStyles.modalFooter}>
                <Button
                    onClick={() => {
                    }}
                >
                    Create
                </Button>
                <Button
                    onClick={props.onClose}
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.LINK}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </div>
    </ModalRoot>;
}

export const openCreateDecorationModal = () =>
    requireDecorationModules().then(() => openModal(props => <CreateDecorationModal {...props} />));

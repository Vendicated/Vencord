/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, Forms, Text, TextInput, UserStore, useState } from "@webpack/common";
import requireCreateStickerModal from "plugins/decor/lib/utils/requireCreateStickerModal";

import cl from "../../lib/utils/cl";
import requireAvatarDecorationModal from "../../lib/utils/requireAvatarDecorationModal";
import { AvatarDecorationPreview } from "../components";

const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");

const FileUpload = findByCodeLazy("fileUploadInput,");

export default function CreateDecorationModal(props) {
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);

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
                        <FileUpload
                            filename={file?.name}
                            placeholder="Choose a file"
                            buttonText="Browse"
                            onSelectFile={setFile}
                        />
                        <Forms.FormText type="description" className={Margins.top8}>
                            File should be APNG or PNG (1MB max)
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
    Promise.all([requireAvatarDecorationModal(), requireCreateStickerModal()])
        .then(() => openModal(props => <CreateDecorationModal {...props} />));

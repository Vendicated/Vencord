/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { Link } from "@components/Link";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { Button, FluxDispatcher, Forms, GuildStore, Text, TextInput, useEffect, UserStore, useState } from "@webpack/common";

import { GUILD_ID, INVITE_KEY, RAW_SKU_ID } from "../../lib/constants";
import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";
import cl from "../../lib/utils/cl";
import requireAvatarDecorationModal from "../../lib/utils/requireAvatarDecorationModal";
import requireCreateStickerModal from "../../lib/utils/requireCreateStickerModal";
import { AvatarDecorationPreview } from "../components";


const DecorationModalStyles = findByPropsLazy("modalFooterShopButton");

const FileUpload = findByCodeLazy("fileUploadInput,");

const InviteActions = findByPropsLazy("resolveInvite");

export default function CreateDecorationModal(props) {
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (error) setError(null);
    }, [file]);

    const { create: createDecoration } = useCurrentUserDecorationsStore();

    const decoration = file ? { asset: URL.createObjectURL(file), skuId: RAW_SKU_ID } : null;

    return <ModalRoot
        {...props}
        size={ModalSize.MEDIUM}
        className={DecorationModalStyles.modal}
    >
        <ModalHeader separator={false} className={cl("modal-header")}>
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
            <div className={cl("create-decoration-modal-form-preview-container")}>
                <div className={cl("create-decoration-modal-form")}>
                    {error !== null && <Text color="text-danger" variant="text-xs/normal">{error.message}</Text>}
                    <Forms.FormSection title="File">
                        <FileUpload
                            filename={file?.name}
                            placeholder="Choose a file"
                            buttonText="Browse"
                            filters={[{ name: "Decoration file", extensions: ["png", "apng"] }]}
                            onFileSelect={setFile}
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
                </div>
                <div>
                    <AvatarDecorationPreview
                        avatarDecorationOverride={decoration}
                        user={UserStore.getCurrentUser()}
                    />
                </div>
            </div>
            <Forms.FormText type="description" className={Margins.bottom16}>
                Make sure your decoration does not violate <Link
                    href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
                >
                    the guidelines
                </Link> before creating your decoration.
                {typeof GuildStore.getGuild(GUILD_ID) === "undefined" && <>
                    <br />You can recieve updates on your decoration's review by joining <Link
                        href={`https://discord.gg/${INVITE_KEY}}`}
                        onClick={async e => {
                            e.preventDefault();
                            const { invite } = await InviteActions.resolveInvite(INVITE_KEY, "Desktop Modal");

                            FluxDispatcher.dispatch({
                                type: "INVITE_MODAL_OPEN",
                                invite,
                                code: INVITE_KEY,
                                context: "APP"
                            });
                        }}
                    >Decor's Discord server
                    </Link>.
                </>}
            </Forms.FormText>
        </ModalContent>
        <ModalFooter className={cl("modal-footer")}>
            <Button
                onClick={() => {
                    setSubmitting(true);
                    createDecoration({ alt: name, file: file! })
                        .then(props.onClose).catch(e => { setSubmitting(false); setError(e); });
                }}
                disabled={!file || !name}
                submitting={submitting}
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
    </ModalRoot>;
}

export const openCreateDecorationModal = () =>
    Promise.all([requireAvatarDecorationModal(), requireCreateStickerModal()])
        .then(() => openModal(props => <CreateDecorationModal {...props} />));

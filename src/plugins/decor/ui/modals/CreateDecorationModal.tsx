/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { openInviteModal } from "@utils/discord";
import { Margins } from "@utils/margins";
import { closeAllModals, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { filters, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { Button, FluxDispatcher, Forms, GuildStore, NavigationRouter, Text, TextInput, useEffect, useMemo, UserStore, useState } from "@webpack/common";

import { GUILD_ID, INVITE_KEY, RAW_SKU_ID } from "../../lib/constants";
import { useCurrentUserDecorationsStore } from "../../lib/stores/CurrentUserDecorationsStore";
import { cl, DecorationModalStyles, requireAvatarDecorationModal, requireCreateStickerModal } from "../";
import { AvatarDecorationModalPreview } from "../components";

const FileUpload = findComponentByCodeLazy("fileUploadInput,");

const { HelpMessage, HelpMessageTypes } = mapMangledModuleLazy('POSITIVE=3]="POSITIVE', {
    HelpMessageTypes: filters.byProps("POSITIVE", "WARNING"),
    HelpMessage: filters.byCode(".iconDiv")
});

function useObjectURL(object: Blob | MediaSource | null) {
    const [url, setUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!object) return;

        const objectUrl = URL.createObjectURL(object);
        setUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
            setUrl(null);
        };
    }, [object]);

    return url;
}

function CreateDecorationModal(props: ModalProps) {
    const [name, setName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (error) setError(null);
    }, [file]);

    const { create: createDecoration } = useCurrentUserDecorationsStore();

    const fileUrl = useObjectURL(file);

    const decoration = useMemo(() => fileUrl ? { asset: fileUrl, skuId: RAW_SKU_ID } : null, [fileUrl]);

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
                Create Decoration
            </Text>
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent
            className={cl("create-decoration-modal-content")}
            scrollbarType="none"
        >
            <ErrorBoundary>
                <HelpMessage messageType={HelpMessageTypes.WARNING}>
                    Make sure your decoration does not violate <Link
                        href="https://github.com/decor-discord/.github/blob/main/GUIDELINES.md"
                    >
                        the guidelines
                    </Link> before submitting it.
                </HelpMessage>
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
                                File should be APNG or PNG.
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
                        <AvatarDecorationModalPreview
                            avatarDecorationOverride={decoration}
                            user={UserStore.getCurrentUser()}
                        />
                    </div>
                </div>
                <Forms.FormText type="description" className={Margins.bottom16}>
                    <br />You can receive updates on your decoration's review by joining <Link
                        href={`https://discord.gg/${INVITE_KEY}`}
                        onClick={async e => {
                            e.preventDefault();
                            if (!GuildStore.getGuild(GUILD_ID)) {
                                const inviteAccepted = await openInviteModal(INVITE_KEY);
                                if (inviteAccepted) {
                                    closeAllModals();
                                    FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                }
                            } else {
                                closeAllModals();
                                FluxDispatcher.dispatch({ type: "LAYER_POP_ALL" });
                                NavigationRouter.transitionToGuild(GUILD_ID);
                            }
                        }}
                    >
                        Decor's Discord server
                    </Link>.
                </Forms.FormText>
            </ErrorBoundary>
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
                Submit for Review
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { PlusIcon } from "@components/Icons";
import { cl, logger } from "@plugins/songSpotlight.desktop/lib/utils";
import { parseLink } from "@plugins/songSpotlight.desktop/service";
import { parsers } from "@song-spotlight/api/handlers";
import { Song } from "@song-spotlight/api/structs";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Clickable, TextInput, useState } from "@webpack/common";

interface AddSongModalProps {
    modalProps: ModalProps;
    close(): void;
    onAdd(song: Song): string | undefined;
}

function AddSongModal({ modalProps, close, onAdd }: AddSongModalProps) {
    const [url, setURL] = useState("");
    const [error, setError] = useState<string>();
    const [pending, setPending] = useState(false);

    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps}>
                <ModalHeader>
                    <BaseText size="xl" weight="bold">Add a new song</BaseText>
                </ModalHeader>
                <ModalContent>
                    <Flex flexDirection="column" gap="10px">
                        <BaseText size="md" weight="normal" className={cl("sub")}>
                            Song Spotlight supports these services: <b>{parsers.map(x => x.label).join(", ")}</b>
                        </BaseText>
                        <TextInput
                            placeholder="https://open.spotify.com/..."
                            error={error}
                            onChange={value => {
                                setURL(value);
                                try {
                                    if (value) new URL(value);
                                    setError(undefined);
                                } catch {
                                    setError("Invalid URL");
                                }
                            }}
                        />
                    </Flex>
                </ModalContent>
                <ModalFooter>
                    <Flex justifyContent="flex-end" gap={0}>
                        <Button
                            variant="primary"
                            onClick={async () => {
                                setPending(true);
                                try {
                                    const parsed = await parseLink(url);
                                    if (!parsed) {
                                        setError("Invalid link");
                                        return setPending(false);
                                    }

                                    const result = onAdd(parsed);
                                    if (result) {
                                        setError(result);
                                        return setPending(false);
                                    }

                                    close();
                                } catch (error) {
                                    logger.error("parseLink error", error);

                                    setError("Failed to parse link");
                                    setPending(false);
                                }
                            }}
                            disabled={!url || !!error || pending}
                        >
                            Add song
                        </Button>
                    </Flex>
                </ModalFooter>
            </ModalRoot>
        </ErrorBoundary>
    );
}

interface AddSongProps {
    onAdd(song: Song): string | undefined;
}

export function AddSong({ onAdd }: AddSongProps) {
    return (
        <Clickable
            onClick={() => {
                const key = openModal(modalProps => (
                    <AddSongModal
                        modalProps={modalProps}
                        close={() => closeModal(key)}
                        onAdd={onAdd}
                    />
                ));
            }}
        >
            <Flex alignItems="center" gap="12px" className={cl("editable-song", "add-song")}>
                <PlusIcon width={28} height={28} className={cl("icon")} />
                <Flex flexDirection="column" justifyContent="center" gap={0}>
                    <BaseText size="md" weight="medium">Add song</BaseText>
                </Flex>
            </Flex>
        </Clickable>
    );
}

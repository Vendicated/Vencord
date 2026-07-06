/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { PlusIcon } from "@components/Icons";
import { cl, logger } from "@plugins/songSpotlight.desktop/lib/utils";
import { Native } from "@plugins/songSpotlight.desktop/service";
import { parsers } from "@song-spotlight/api/handlers";
import { Song } from "@song-spotlight/api/structs";
import { RenderModalProps } from "@vencord/discord-types";
import { Clickable, closeModal, Modal, openModal, TextInput, useState } from "@webpack/common";

interface AddSongModalProps {
    modalProps: RenderModalProps;
    close(): void;
    onAdd(song: Song): string | undefined;
}

function AddSongModal({ modalProps, close, onAdd }: AddSongModalProps) {
    const [url, setURL] = useState("");
    const [error, setError] = useState<string>();
    const [pending, setPending] = useState(false);

    return (
        <ErrorBoundary>
            <Modal
                {...modalProps}
                size="md"
                title="Add a new song"
                actions={[
                    {
                        text: "Add song",
                        variant: "primary",
                        disabled: !url || !!error || pending,
                        onClick: async () => {
                            setPending(true);
                            try {
                                const parsed = await Native.parseLink(url);
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
                        }
                    }
                ]}
            >
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
            </Modal>
        </ErrorBoundary>
    );
}

interface AddSongProps {
    onAdd(song: Song): string | undefined;
}

export default function AddSong({ onAdd }: AddSongProps) {
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

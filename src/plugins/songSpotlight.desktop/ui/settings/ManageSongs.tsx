/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { apiConstants, deleteData, getData, saveData } from "@plugins/songSpotlight.desktop/lib/api";
import { presentOAuth2Modal } from "@plugins/songSpotlight.desktop/lib/oauth2";
import { useAuthorizationStore } from "@plugins/songSpotlight.desktop/lib/store/AuthorizationStore";
import { useSongStore } from "@plugins/songSpotlight.desktop/lib/store/SongStore";
import { cl, sid } from "@plugins/songSpotlight.desktop/lib/utils";
import { validateSong } from "@plugins/songSpotlight.desktop/service";
import { Spinner } from "@plugins/songSpotlight.desktop/ui/common";
import { Song, UserData, UserDataSchema } from "@song-spotlight/api/structs";
import { readClipboard } from "@utils/clipboard";
import { copyWithToast } from "@utils/discord";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Alerts, showToast, Toasts, useCallback, useEffect, useMemo, useRef, useState } from "@webpack/common";

import { AddSong } from "./AddSong";
import { EditableSong } from "./EditableSong";

interface ManageSongsModalProps extends ManageSongsProps {
    modalProps: ModalProps;
}

export function ManageSongsModal({ modalProps, ...props }: ManageSongsModalProps) {
    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps} size={ModalSize.LARGE}>
                <ModalHeader>
                    <BaseText size="xl" weight="bold">Song Spotlight</BaseText>
                </ModalHeader>
                <ModalContent>
                    <div style={{ marginBottom: "20px" }}>
                        <ManageSongs {...props} />
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary>
    );
}

interface ImportButtonProps {
    overwrite: boolean;
    pending: boolean;
    setPending(pending: boolean): void;
    onImport(data: UserData): void;
}

function ImportButton({ overwrite, pending, setPending, onImport }: ImportButtonProps) {
    const checkClipboard = useCallback(async () => {
        setPending(true);

        let json: any;
        try {
            json = JSON.parse(await readClipboard());
        } catch {
            setPending(false);
            return showToast("No JSON in clipboard!", Toasts.Type.FAILURE);
        }

        const { error, data } = UserDataSchema.max(apiConstants.songLimit).safeParse(json);
        if (error) {
            setPending(false);
            return showToast("Invalid Song Spotlight data in clipboard!", Toasts.Type.FAILURE);
        }

        const validated = await Promise.allSettled(data.map(song => validateSong(song)));
        if (!validated.every(x => x.status === "fulfilled" && x.value)) {
            setPending(false);
            return showToast("One or more imported songs were invalid.", Toasts.Type.FAILURE);
        }

        onImport(data);
        setPending(false);
        showToast("Imported songs from clipboard!", Toasts.Type.SUCCESS);
    }, [pending]);

    return (
        <Button
            variant="secondary"
            onClick={async () => {
                if (pending) return;

                if (overwrite) {
                    Alerts.show({
                        title: "Are you sure?",
                        body: "This will overwrite your current songs.",
                        onConfirm: checkClipboard,
                        confirmText: "Continue",
                        cancelText: "Nevermind",
                    });
                } else checkClipboard();
            }}
            disabled={pending}
        >
            Import from clipboard
        </Button>
    );
}

type Editable = {
    slot: "song";
    song: Song;
} | {
    slot: "add" | "empty";
    song: undefined;
};

interface ManageSongsProps {
    templateData?: UserData;
}

export function ManageSongs({ templateData }: ManageSongsProps) {
    const { isAuthorized, deleteToken } = useAuthorizationStore();
    const { self } = useSongStore();

    const ticked = useRef(false);
    const [localData, setLocalData] = useState(templateData ?? self?.data);
    useEffect(() => {
        // only setLocalData on the second time this effect runs
        if (ticked.current) setLocalData(self?.data);
        else ticked.current = true;
    }, [self?.data]);
    const [pending, setPending] = useState(!localData);

    const isSame = useMemo(() =>
        self?.data && localData
            ? self.data.length === localData.length && self.data.map(sid).join(",") === localData.map(sid).join(",")
            : true, [self?.data, localData]);

    const onAdd = useCallback((song: Song) => {
        if (!localData) return;

        if (localData.length >= apiConstants.songLimit) return "Not enough space";
        if (localData.some(x => sid(x) === sid(song))) return "You've already added this song";

        showToast("Added song!");
        setLocalData([
            ...localData,
            song,
        ]);
    }, [localData]);
    const onRemove = useCallback((song: Song) => {
        if (!localData) return;

        const i = localData.indexOf(song);
        if (i !== -1) {
            showToast("Removed song!");
            setLocalData(localData.toSpliced(i, 1));
        }
    }, [localData]);

    const editable = useMemo<Editable[]>(
        () =>
            localData
                ? new Array(apiConstants.songLimit).fill(null).map((_, i) => {
                    if (localData[i]) return { slot: "song", song: localData[i] };
                    else if (localData[i - 1] || i === 0) return { slot: "add" };
                    else return { slot: "empty" };
                })
                : [],
        [localData],
    );

    useEffect(() => {
        if (isAuthorized() && !localData) getData().then(() => setPending(false));
    }, [isAuthorized()]);

    if (!isAuthorized()) return <Button onClick={() => presentOAuth2Modal()}>Sign in to Song Spotlight</Button>;

    return (
        <Flex flexDirection="column" gap="20px">
            {localData
                ? (
                    <Flex flexDirection="column" gap="12px">
                        <Flex flexDirection="column" gap={0}>
                            <BaseText size="lg" weight="semibold">Songs</BaseText>
                            {self?.at
                                && (
                                    <BaseText size="xs" weight="normal" className={cl("sub")}>
                                        Last updated <b>{Intl.DateTimeFormat().format(new Date(self.at))}</b>
                                    </BaseText>
                                )}
                        </Flex>
                        <Flex flexDirection="column" gap="6px">
                            {editable.map(({ slot, song }, i) =>
                                slot === "song"
                                    ? <EditableSong song={song} index={i} onRemove={onRemove} key={sid(song)} />
                                    : slot === "add"
                                        ? <AddSong onAdd={onAdd} key={slot} />
                                        : <div className={cl("empty-song")} key={`${slot}-${i}`} />
                            )}
                        </Flex>
                        <Flex flexDirection="column" gap="8px">
                            <div className={cl("twin-buttons")}>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        if (pending) return;
                                        copyWithToast(JSON.stringify(localData));
                                    }}
                                    disabled={pending}
                                >
                                    Copy to clipboard
                                </Button>
                                <ImportButton
                                    overwrite={!!localData[0]}
                                    pending={pending}
                                    setPending={setPending}
                                    onImport={setLocalData}
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={async () => {
                                    if (isSame || pending) return;

                                    setPending(true);
                                    try {
                                        await saveData(localData);
                                        showToast("Successfully saved songs!", Toasts.Type.SUCCESS);
                                    } finally {
                                        setPending(false);
                                    }
                                }}
                                disabled={isSame || pending}
                            >
                                Save
                            </Button>
                        </Flex>
                    </Flex>
                )
                : <Spinner type={Spinner.Type.WANDERING_CUBES} />}
            <Flex flexDirection="column" gap="12px">
                <BaseText size="lg" weight="semibold">Authorization</BaseText>
                <div className={cl("twin-buttons")}>
                    <Button
                        variant="dangerPrimary"
                        onClick={() => {
                            if (pending) return;
                            deleteToken();
                            showToast("Successfully signed out!", Toasts.Type.SUCCESS);
                        }}
                        disabled={pending}
                    >
                        Sign out
                    </Button>
                    <Button
                        variant="dangerSecondary"
                        onClick={() =>
                            Alerts.show({
                                title: "Are you sure?",
                                body: "This will permanently delete all of your songs.",
                                onConfirm: async () => {
                                    setPending(true);
                                    try {
                                        await deleteData();
                                        deleteToken();

                                        showToast("Successfully deleted songs!", Toasts.Type.SUCCESS);
                                    } finally {
                                        setPending(false);
                                    }
                                },
                                confirmColor: "danger",
                                confirmText: "Delete",
                                cancelText: "Nevermind",
                            })}
                        disabled={!self?.data[0] || pending}
                    >
                        Delete songs
                    </Button>
                </div>
            </Flex>
        </Flex>
    );
}

export function openManageSongs(templateData?: UserData) {
    openModal(modalProps => <ManageSongsModal modalProps={modalProps} templateData={templateData} />);
}

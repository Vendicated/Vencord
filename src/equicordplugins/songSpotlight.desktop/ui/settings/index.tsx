/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { apiConstants, deleteData, getData, saveData } from "@equicordplugins/songSpotlight.desktop/lib/api";
import { presentOAuth2Modal } from "@equicordplugins/songSpotlight.desktop/lib/oauth2";
import { useAuthorizationStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/AuthorizationStore";
import { useSongStore } from "@equicordplugins/songSpotlight.desktop/lib/stores/SongStore";
import { cl } from "@equicordplugins/songSpotlight.desktop/lib/utils";
import { Native } from "@equicordplugins/songSpotlight.desktop/service";
import { Spinner } from "@equicordplugins/songSpotlight.desktop/ui/common";
import SongList from "@equicordplugins/songSpotlight.desktop/ui/settings/SongList";
import { UserData, UserDataSchema } from "@song-spotlight/api/structs";
import { sid } from "@song-spotlight/api/util";
import { readClipboard } from "@utils/clipboard";
import { copyWithToast } from "@utils/discord";
import { ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Alerts, Parser, showToast, Toasts, useCallback, useEffect, useMemo, useRef, useState } from "@webpack/common";

interface ImportButtonProps {
    overwrite: boolean;
    pending: boolean;
    setPending(pending: boolean): void;
    onImport(data: UserData): void;
}

function ImportButton({ overwrite, pending, setPending, onImport }: ImportButtonProps) {
    const checkClipboard = useCallback(async () => {
        setPending(true);

        let json: unknown;
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

        const validated = await Promise.allSettled(data.map(song => Native.validateSong(song)));
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

interface SettingsProps {
    templateData?: UserData;
}

export default function Settings({ templateData }: SettingsProps) {
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

    useEffect(() => {
        if (isAuthorized() && !localData) getData().then(() => setPending(false));
    }, [isAuthorized()]);

    if (!isAuthorized()) return <Button onClick={() => presentOAuth2Modal()}>Sign in to Song Spotlight</Button>;

    return (
        <Flex flexDirection="column" gap="20px">
            <BaseText size="md" weight="normal">
                You can also view your songs via the {Parser.parse("</songspotlight:1468320979938971802>")} command!
            </BaseText>
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
                            <SongList
                                localData={localData}
                                setLocalData={setLocalData}
                            />
                        </Flex>
                        <Flex flexDirection="column" gap="8px">
                            <div className={cl("twin-buttons")}>
                                <Button
                                    variant="secondary"
                                    onClick={() => copyWithToast(JSON.stringify(localData))}
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

export function SettingsModal({ modalProps, ...props }: SettingsProps & { modalProps: ModalProps; }) {
    return (
        <ErrorBoundary>
            <ModalRoot {...modalProps} size={ModalSize.LARGE}>
                <ModalHeader>
                    <BaseText size="xl" weight="bold">Song Spotlight</BaseText>
                </ModalHeader>
                <ModalContent>
                    <div style={{ marginBottom: "20px" }}>
                        <Settings {...props} />
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary>
    );
}

export function openSettingsModal(templateData?: UserData) {
    openModal(modalProps => <SettingsModal modalProps={modalProps} templateData={templateData} />);
}

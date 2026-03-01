/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/index";
import { apiConstants } from "@plugins/songSpotlight.desktop/lib/api";
import { validateSong } from "@plugins/songSpotlight.desktop/service";
import { UserData, UserDataSchema } from "@song-spotlight/api/structs";
import { readClipboard } from "@utils/clipboard";
import { Alerts, showToast, Toasts, useCallback } from "@webpack/common";

interface ImportButtonProps {
    overwrite: boolean;
    pending: boolean;
    setPending(pending: boolean): void;
    onImport(data: UserData): void;
}

export function ImportButton({ overwrite, pending, setPending, onImport }: ImportButtonProps) {
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

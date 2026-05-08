/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ErrorCard } from "@components/ErrorCard";
import { openModal } from "@utils/modal";
import { UpdateLogger } from "@utils/updater";
import { Parser } from "@webpack/common";
import { ConfirmModal } from "@webpack/common/modalV2";

const NO_OP = () => { };

function getErrorMessage(e: any) {
    if (!e?.code || !e.cmd)
        return "An unknown error occurred.\nPlease try again or see the console for more info.";

    const { code, path, cmd, stderr } = e;

    if (code === "ENOENT")
        return `Command \`${path}\` not found.\nPlease install it and try again.`;

    const extra = stderr || `Code \`${code}\`. See the console for more info.`;

    return `An error occurred while running \`${cmd}\`:\n${extra}`;
}

export function runWithDispatch(dispatch: React.Dispatch<React.SetStateAction<boolean>>, action: () => any) {
    return async () => {
        dispatch(true);

        try {
            await action();
        } catch (e: any) {
            UpdateLogger.error(e);

            const err = getErrorMessage(e);

            openModal(props => (
                <ConfirmModal
                    {...props}
                    title="Oops!"
                    confirmText="OK"
                    variant="primary"
                    onConfirm={NO_OP}
                >
                    <ErrorCard>
                        {err.split("\n").map((line, idx) =>
                            <div key={idx}>{Parser.parse(line)}</div>
                        )}
                    </ErrorCard>
                </ConfirmModal>
            ));
        } finally {
            dispatch(false);
        }
    };
}

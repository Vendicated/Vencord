/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { SessionInfo } from "@plugins/betterSessions/types";
import { openModal } from "@utils/modal";

import { RenameModal } from "./RenameModal";

export function RenameButton({ session, state }: { session: SessionInfo["session"], state: [string, React.Dispatch<React.SetStateAction<string>>]; }) {
    return (
        <Button
            variant="secondary"
            size="xs"
            className="vc-betterSessions-rename-btn"
            onClick={() =>
                openModal(props => (
                    <RenameModal
                        props={props}
                        session={session}
                        state={state}
                    />
                ))
            }
        >
            Rename
        </Button>
    );
}

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { Button } from "@webpack/common";

import { SessionInfo } from "../types";
import { RenameModal } from "./RenameModal";

export function RenameButton({ session, state }: { session: SessionInfo["session"], state: [string, React.Dispatch<React.SetStateAction<string>>]; }) {
    return (
        <Button
            look={Button.Looks.LINK}
            color={Button.Colors.LINK}
            size={Button.Sizes.NONE}
            style={{
                paddingTop: "0px",
                paddingBottom: "0px",
                top: "-2px"
            }}
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl, revealMessage } from "./";
import { HideIcon } from "./HideIcon";

export const HideMessageAccessory = ({ id }: { id: string; }) => {
    return (
        <span className={cl("accessory")}>
            <HideIcon width={16} height={16} />
            This message is hidden •{" "}
            <button onClick={() => revealMessage(id)} className={cl("reveal")}>
                Reveal
            </button>
        </span>
    );
};

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";

import { cl } from "./ChannelTabsContainer";

const { ChevronSmallDownIcon } = findByPropsLazy("ChevronSmallDownIcon");
const { ChevronSmallUpIcon } = findByPropsLazy("ChevronSmallUpIcon");
const XIcon = findComponentByCodeLazy("M18.4 4L12 10.4L5.6 4L4 5.6L10.4");

export const clwb = (name: string) => classes(cl("button"), cl("window-button"), cl(`${name}-button`));
export const clwbh = (name: string) => classes(cl("button"), cl("action-button"), cl(`${name}-button`), cl("hoverable"));

export const sp = e => { e.preventDefault(); e.stopPropagation(); };

export default function WindowButtons() {

    return <div
        className={cl("window-buttons")}
    >
        <button
            onClick={() => VesktopNative.win.minimize()}
            className={clwb("minimize")}
            onAuxClick={sp}
            onContextMenu={sp}
        >
            <div className={clwbh("minimize")}>
                <ChevronSmallDownIcon height={20} width={20} />
            </div>
        </button>
        <button
            onClick={() => VesktopNative.win.maximize()}
            className={clwb("maximize")}
            onAuxClick={sp}
            onContextMenu={sp}
        >
            <div className={clwbh("maximize")}>
                <ChevronSmallUpIcon height={20} width={20} />
            </div>
        </button>
        <button
            onClick={() => VesktopNative.win.close()}
            className={clwb("close-window")}
            onAuxClick={sp}
            onContextMenu={sp}
        >
            <div className={clwbh("close-window")}>
                <XIcon height={16} width={16} />
            </div>
        </button>

    </div >;
}

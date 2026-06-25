/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { debounce } from "@shared/debounce";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

import managedStyle from "./styles.css?managed";

export const settings = definePluginSettings({
    enabled: {
        description: "Darken Stream",
        type: OptionType.BOOLEAN,
        default: false,
        onChange: () => updateDom()
    },
    darkness: {
        description: "Darkness Level",
        type: OptionType.SLIDER,
        markers: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
        default: 50,
        onChange: () => updateDom()
    }
});

function updateDom() {
    const { enabled, darkness } = settings.store;
    if (enabled) {
        document.body.setAttribute("data-darken-stream", "true");
        // Convert darkness (0-100) to brightness (1.0 - 0.1).
        // 0 darkness = 1.0 brightness. 100 darkness = 0.1 brightness.
        const brightness = 1.0 - (darkness / 100) * 0.9;
        document.body.style.setProperty("--stream-brightness", brightness.toString());
    } else {
        document.body.removeAttribute("data-darken-stream");
        document.body.style.removeProperty("--stream-brightness");
    }
}

const streamContextMenuPatch: NavContextMenuPatchCallback = children => {
    const { enabled, darkness } = settings.use(["enabled", "darkness"]);

    children.push(
        <Menu.MenuGroup id="darken-stream-group">
            <Menu.MenuCheckboxItem
                id="darken-stream-toggle"
                label="Darken Stream"
                checked={enabled}
                action={() => {
                    settings.store.enabled = !enabled;
                    updateDom();
                }}
            />
            {enabled && (
                <Menu.MenuControlItem
                    id="darken-stream-slider"
                    label="Darkness"
                    control={(props, ref) => (
                        <Menu.MenuSliderControl
                            ref={ref}
                            {...props}
                            minValue={0}
                            maxValue={100}
                            value={darkness}
                            onChange={debounce((value: number) => {
                                settings.store.darkness = value;
                                updateDom();
                            }, 100)}
                        />
                    )}
                />
            )}
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "Darken Stream (HDR Fix)",
    description: "Lowers the brightness of screenshares to combat HDR glare, accessible via stream context menu.",
    authors: [Devs.ashbyalis],
    settings,
    managedStyle,

    contextMenus: {
        "stream-context": streamContextMenuPatch,
        "user-context": streamContextMenuPatch // Also add to user context for robustness, sometimes streams are accessed here
    },

    start() {
        updateDom();
    },

    stop() {
        document.body.removeAttribute("data-darken-stream");
        document.body.style.removeProperty("--stream-brightness");
    }
});

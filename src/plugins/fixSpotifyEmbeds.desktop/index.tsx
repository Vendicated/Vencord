/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { makeRange, OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "The volume % to set for spotify embeds. Anything above 10% is veeeery loud",
        markers: makeRange(0, 100, 10),
        stickToMarkers: false,
        default: 10
    }
});

// The entire code of this plugin can be found in ipcPlugins
export default definePlugin({
    name: "FixSpotifyEmbeds",
    description: "Fixes spotify embeds being incredibly loud by letting you customise the volume",
    authors: [Devs.Ven],
    settings,

    toolboxActions() {
        return (
            <Menu.MenuControlItem
                id="fix-spotify-embeds-settings"
                label="Embed Volume"
                control={(props, ref) => (
                    <Menu.MenuSliderControl
                        ref={ref}
                        {...props}
                        minValue={0}
                        maxValue={100}
                        value={settings.store.volume}
                        onChange={v => settings.store.volume = v}
                    />
                )}
            />
        );
    }
});

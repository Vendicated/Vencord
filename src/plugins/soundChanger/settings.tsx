/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { useMemo } from "@webpack/common";

import { SettingsComponent } from "./components";
import type { Def, Props, SoundIDs, SoundsChanged } from "./types";



export const settings = definePluginSettings({
    sounds: {
        description: "The sounds changed.",
        type: OptionType.COMPONENT,

        component: (({ setValue, setError }: Props) => {
            const customSounds = useMemo<SoundsChanged>(() => (settings.store.sounds ?? []), []);
            const sounds = useMemo<SoundIDs>(() => {
                const plugin = Vencord.Plugins.plugins[settings.pluginName] as any as Def;
                return plugin.soundModules;
            }, []);

            return (
                <SettingsComponent
                    value={customSounds}
                    sounds={sounds}
                    setValue={setValue}
                    setError={setError}
                />
            );
        }) as any,
    }
});

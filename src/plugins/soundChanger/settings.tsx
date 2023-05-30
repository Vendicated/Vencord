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
import { Forms, React } from "@webpack/common";

import type { Def, SoundsChanged } from "./types";

interface Props {
    setValue: (value: SoundsChanged) => void;
    setError: (error: string) => void;
}

export const settings = definePluginSettings({
    sounds: {
        description: "The sounds changed.",
        type: OptionType.COMPONENT,

        component: (({ setValue, setError }: Props) => {
            const [customSounds, setCustomSounds] = React.useState<SoundsChanged>(() => settings.store.sounds ?? []);
            const [sounds, setSounds] = React.useState<Record<string, number>>({});

            React.useEffect(() => {
                if (customSounds.length) return;

                const plugin = Vencord.Plugins.plugins[settings.pluginName] as any as Def;
                setSounds(plugin.soundModules);
            }, []);

            return <div>
                <Forms.FormText>{Object.keys(sounds).join(", ")}</Forms.FormText>
            </div>;
        }) as any,
    }
});

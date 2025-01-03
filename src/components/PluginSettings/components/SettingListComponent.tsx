/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { Margins } from "@utils/margins";
import { wordsFromCamel, wordsToTitle } from "@utils/text";
import { PluginOptionSelect } from "@utils/types";
import { Forms, useState, useEffect, ChannelStore, UserStore, GuildStore } from "@webpack/common";

import { ISettingElementProps } from ".";

export function SettingListComponent({ option, pluginSettings, definedSettings, onChange, onError, id }: ISettingElementProps<PluginOptionSelect>) {
    const [error, setError] = useState<string | null>(null);

    const [items, setItems] = useState<string[]>([]);
    const [newItem, setNewItem] = useState<string>("");

    const addItem = () => {
        if (newItem.trim() !== "") {
            setItems([...items, newItem]);
            setNewItem("");
        }
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };


    useEffect(() => {
        onError(error !== null);
    }, [error]);

    function handleChange(newValue) {
        const isValid = option.isValid?.call(definedSettings, newValue) ?? true;
        if (typeof isValid === "string") setError(isValid);
        else if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            onChange(newValue);
        }
    }

    return (
        <Forms.FormSection>
            <Forms.FormTitle>{wordsToTitle(wordsFromCamel(id))}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16} type="description">{option.description}</Forms.FormText>

            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
        </Forms.FormSection>
    );
}

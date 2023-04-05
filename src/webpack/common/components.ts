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

// eslint-disable-next-line path-alias/no-relative
import { filters, findByPropsLazy, waitFor } from "@webpack";

import { waitForComponent } from "./internal";
import * as t from "./types/components";

export let Forms = {} as {
    FormTitle: t.FormTitle,
    FormSection: t.FormSection,
    FormDivider: t.FormDivider,
    FormText: t.FormText,
};

export let Card: t.Card;
export let Button: t.Button;
export let Switch: t.Switch;
export let Tooltip: t.Tooltip;
export let TextInput: t.TextInput;
export let TextArea: t.TextArea;
export let Text: t.Text;
export let Select: t.Select;
export let SearchableSelect: t.SearchableSelect;
export let Slider: t.Slider;
export let ButtonLooks: t.ButtonLooks;
export let TabBar: any;

export const Timestamp = waitForComponent<t.Timestamp>("Timestamp", filters.byCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"));
export const Flex = waitForComponent<t.Flex>("Flex", ["Justify", "Align", "Wrap"]);

export const ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent") as Record<string, string>;

waitFor("FormItem", m => {
    ({ Card, Button, FormSwitch: Switch, Tooltip, TextInput, TextArea, Text, Select, SearchableSelect, Slider, ButtonLooks, TabBar } = m);
    Forms = m;
});

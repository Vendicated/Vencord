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
import { filters, findByPropsLazy } from "../webpack";
import { makeWaitForComponent } from "./internal";
import * as t from "./types/components";

export const Forms = {
    FormTitle: makeWaitForComponent<t.FormTitle>("FormTitle", filters.byCode("errorSeparator")),
    FormSection: makeWaitForComponent<t.FormSection>("FormSection", filters.byCode("titleClassName", "sectionTitle")),
    FormDivider: makeWaitForComponent<t.FormDivider>("FormDivider", m => {
        if (typeof m !== "function") return false;
        const s = m.toString();
        return s.length < 200 && s.includes(".divider");
    }),
    FormText: makeWaitForComponent<t.FormText>("FormText", m => m.Types?.INPUT_PLACEHOLDER),
};

export const Card = makeWaitForComponent<t.Card>("Card", m => m.Types?.PRIMARY === "cardPrimary");
export const Button = makeWaitForComponent<t.Button>("Button", ["Hovers", "Looks", "Sizes"]);
export const Switch = makeWaitForComponent<t.Switch>("Switch", filters.byCode("tooltipNote", "ringTarget"));
export const Tooltip = makeWaitForComponent<t.Tooltip>("Tooltip", ["Positions", "Colors"]);
export const Timestamp = makeWaitForComponent<t.Timestamp>("Timestamp", filters.byCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"));
export const TextInput = makeWaitForComponent<t.TextInput>("TextInput", ["defaultProps", "Sizes", "contextType"]);
export const TextArea = makeWaitForComponent<t.TextArea>("TextArea", filters.byCode("handleSetRef", "textArea"));
export const Text = makeWaitForComponent<t.Text>("Text", m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return (s.length < 1500 && s.includes("data-text-variant") && s.includes("always-white"));
});
export const Select = makeWaitForComponent<t.Select>("Select", filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
export const Slider = makeWaitForComponent<t.Slider>("Slider", filters.byCode("closestMarkerIndex", "stickToMarkers"));

export const ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent") as Record<string, string>;
export const Margins: t.Margins = findByPropsLazy("marginTop20");
export const ButtonLooks: t.ButtonLooks = findByPropsLazy("BLANK", "FILLED", "INVERTED");

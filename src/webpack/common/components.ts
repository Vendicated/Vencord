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
import { waitForComponent } from "./internal";
import * as t from "./types/components";

export const Forms = {
    FormTitle: waitForComponent<t.FormTitle>("FormTitle", filters.byCode("errorSeparator")),
    FormSection: waitForComponent<t.FormSection>("FormSection", filters.byCode("titleClassName", "sectionTitle")),
    FormDivider: waitForComponent<t.FormDivider>("FormDivider", m => {
        if (typeof m !== "function") return false;
        const s = m.toString();
        return s.length < 200 && s.includes(".divider");
    }),
    FormText: waitForComponent<t.FormText>("FormText", m => m.Types?.INPUT_PLACEHOLDER),
};

export const Card = waitForComponent<t.Card>("Card", m => m.Types?.PRIMARY === "cardPrimary");
export const Button = waitForComponent<t.Button>("Button", ["Hovers", "Looks", "Sizes"]);
export const Switch = waitForComponent<t.Switch>("Switch", filters.byCode("tooltipNote", "ringTarget"));
export const Tooltip = waitForComponent<t.Tooltip>("Tooltip", ["Positions", "Colors"]);
export const Timestamp = waitForComponent<t.Timestamp>("Timestamp", filters.byCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"));
export const TextInput = waitForComponent<t.TextInput>("TextInput", ["defaultProps", "Sizes", "contextType"]);
export const TextArea = waitForComponent<t.TextArea>("TextArea", filters.byCode("handleSetRef", "textArea"));
export const Text = waitForComponent<t.Text>("Text", m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return (s.length < 1500 && s.includes("data-text-variant") && s.includes("always-white"));
});
export const Select = waitForComponent<t.Select>("Select", filters.byCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
const searchableSelectFilter = filters.byCode("autoFocus", ".Messages.SELECT")(m.render);
export const SearchableSelect = waitForComponent<t.SearchableSelect>("SearchableSelect", m => {
    return m.render && searchableSelectFilter(m.render);
});
export const Slider = waitForComponent<t.Slider>("Slider", filters.byCode("closestMarkerIndex", "stickToMarkers"));
export const Flex = waitForComponent<t.Flex>("Flex", ["Justify", "Align", "Wrap"]);

export const ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent") as Record<string, string>;
/**
 * @deprecated Use @utils/margins instead
 */
export const Margins: t.Margins = findByPropsLazy("marginTop20");
export const ButtonLooks: t.ButtonLooks = findByPropsLazy("BLANK", "FILLED", "INVERTED");

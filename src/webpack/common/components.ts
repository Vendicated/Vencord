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

import { LazyComponent } from "@utils/misc";
import type Components from "discord-types/components";
import type { ComponentType } from "react";

// eslint-disable-next-line path-alias/no-relative
import { filters, findByCode, findByCodeLazy, findByPropsLazy } from "../webpack";
import { makeWaitForComponent } from "./internal";
import type * as t from "./types/components";

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

export const Card = makeWaitForComponent("Card", m => m.Types?.PRIMARY === "cardPrimary");
export const Button = makeWaitForComponent("Button", ["Hovers", "Looks", "Sizes"]);
export const Switch = makeWaitForComponent("Switch", filters.byCode("tooltipNote", "ringTarget"));
export const Tooltip = makeWaitForComponent<Components.Tooltip>("Tooltip", ["Positions", "Colors"]);
export const Timestamp = makeWaitForComponent("Timestamp", filters.byCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"));
export const TextInput = makeWaitForComponent<Components.TextInput>("TextInput", ["defaultProps", "Sizes", "contextType"]);
export const Text = makeWaitForComponent<ComponentType<t.TextProps>>("Text", m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return (s.length < 1500 && s.includes("data-text-variant") && s.includes("always-white"));
});

export const TextArea = findByCodeLazy("handleSetRef", "textArea") as React.ComponentType<React.PropsWithRef<any>>;
export const ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent") as Record<string, string>;
export const Select = LazyComponent(() => findByCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
export const Slider = LazyComponent(() => findByCode("closestMarkerIndex", "stickToMarkers"));

export const Margins: t.Margins = findByPropsLazy("marginTop20");
export const ButtonLooks = findByPropsLazy("BLANK", "FILLED", "INVERTED") as Record<"FILLED" | "INVERTED" | "OUTLINED" | "LINK" | "BLANK", string>;

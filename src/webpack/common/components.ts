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

// eslint-disable-next-line path-alias/no-relative
import { filters, findByCode, findByCodeLazy, findByPropsLazy, waitFor } from "../webpack";


export const Forms = {} as {
    FormTitle: Components.FormTitle;
    FormSection: any;
    FormDivider: any;
    FormText: Components.FormText;
};
export let Card: Components.Card;
export let Button: any;
export const ButtonLooks = findByPropsLazy("BLANK", "FILLED", "INVERTED") as Record<"FILLED" | "INVERTED" | "OUTLINED" | "LINK" | "BLANK", string>;
export let Switch: any;
export let Tooltip: Components.Tooltip;
export let Timestamp: any;
export let Router: any;
export let TextInput: any;
export let Text: (props: TextProps) => JSX.Element;
export const TextArea = findByCodeLazy("handleSetRef", "textArea") as React.ComponentType<React.PropsWithRef<any>>;
export const ButtonWrapperClasses = findByPropsLazy("buttonWrapper", "buttonContent") as Record<string, string>;

export const Select = LazyComponent(() => findByCode("optionClassName", "popoutPosition", "autoFocus", "maxVisibleItems"));
export const Slider = LazyComponent(() => findByCode("closestMarkerIndex", "stickToMarkers"));

waitFor(["Hovers", "Looks", "Sizes"], m => Button = m);

waitFor(filters.byCode("tooltipNote", "ringTarget"), m => Switch = m);

waitFor(filters.byCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"), m => Timestamp = m);

waitFor(["Positions", "Colors"], m => Tooltip = m);
waitFor(m => m.Types?.PRIMARY === "cardPrimary", m => Card = m);

waitFor(filters.byCode("errorSeparator"), m => Forms.FormTitle = m);
waitFor(filters.byCode("titleClassName", "sectionTitle"), m => Forms.FormSection = m);
waitFor(m => m.Types?.INPUT_PLACEHOLDER, m => Forms.FormText = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return s.length < 200 && s.includes(".divider");
}, m => Forms.FormDivider = m);

waitFor(["open", "saveAccountChanges"], m => Router = m);
waitFor(["defaultProps", "Sizes", "contextType"], m => TextInput = m);

waitFor(m => {
    if (typeof m !== "function") return false;
    const s = m.toString();
    return (s.length < 1500 && s.includes("data-text-variant") && s.includes("always-white"));
}, m => Text = m);

export type TextProps = React.PropsWithChildren & {
    variant: TextVariant;
    style?: React.CSSProperties;
    color?: string;
    tag?: "div" | "span" | "p" | "strong" | `h${1 | 2 | 3 | 4 | 5 | 6}`;
    selectable?: boolean;
    lineClamp?: number;
    id?: string;
    className?: string;
};

export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/semibold" | "heading-sm/bold" | "heading-md/normal" | "heading-md/medium" | "heading-md/semibold" | "heading-md/bold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/semibold" | "heading-lg/bold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/bold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/bold" | "eyebrow" | "heading-deprecated-14/normal" | "heading-deprecated-14/medium" | "heading-deprecated-14/bold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold" | "display-sm" | "display-md" | "display-lg" | "code";

export const Margins = findByPropsLazy("marginTop20");

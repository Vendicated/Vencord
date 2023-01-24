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

import type { ComponentType, CSSProperties, HtmlHTMLAttributes, PropsWithChildren, ReactNode } from "react";

export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/semibold" | "heading-sm/bold" | "heading-md/normal" | "heading-md/medium" | "heading-md/semibold" | "heading-md/bold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/semibold" | "heading-lg/bold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/bold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/bold" | "eyebrow" | "heading-deprecated-14/normal" | "heading-deprecated-14/medium" | "heading-deprecated-14/bold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold" | "display-sm" | "display-md" | "display-lg" | "code";

type Heading = `h${1 | 2 | 3 | 4 | 5 | 6}`;

export type TextProps = PropsWithChildren<HtmlHTMLAttributes<HTMLDivElement> & {
    variant?: TextVariant;
    tag?: "div" | "span" | "p" | "strong" | Heading;
    selectable?: boolean;
    lineClamp?: number;
}>;

export type Margins = Record<"marginTop16" | "marginTop8" | "marginBottom8" | "marginTop20" | "marginBottom20", string>;

export type FormTitle = ComponentType<HtmlHTMLAttributes<HTMLTitleElement> & PropsWithChildren<{
    /** default is h5 */
    tag?: Heading;
    faded?: boolean;
    disabled?: boolean;
    required?: boolean;
    error?: ReactNode;
}>>;

export type FormSection = ComponentType<PropsWithChildren<{
    /** default is h5 */
    tag?: Heading;
    className?: string;
    titleClassName?: string;
    titleId?: string;
    title?: ReactNode;
    disabled?: boolean;
    htmlFor?: unknown;
}>>;

export type FormDivider = ComponentType<{
    className?: string;
    style?: CSSProperties;
}>;

export type FormTextTypes = Record<"DEFAULT" | "INPUT_PLACEHOLDER" | "DESCRIPTION" | "LABEL_BOLD" | "LABEL_SELECTED" | "LABEL_DESCRIPTOR" | "ERROR" | "SUCCESS", string>;

export type FormText = ComponentType<PropsWithChildren<{
    disabled?: boolean;
    selectable?: boolean;
    /** defaults to FormText.Types.DEFAULT */
    type?: string;
}> & TextProps> & { Types: FormTextTypes; };

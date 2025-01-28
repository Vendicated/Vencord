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

import { LazyComponent } from "@utils/lazyReact";
import { filters, findByPropsLazy, mapMangledModuleLazy, waitFor } from "@webpack";

import { waitForComponent } from "./internal";
import * as t from "./types/components";

const FormTitle = waitForComponent<t.FormTitle>("FormTitle", filters.byCode(".SELECTABLE),"));
const FormSection = waitForComponent<t.FormSection>("FormSection", filters.byCode(".titleId)&&"));
const FormDivider = waitForComponent<t.FormDivider>("FormDivider", filters.byCode(".divider,", ",style:", '"div"', /\.divider,\i\),style:/));
const FormText = waitForComponent<t.FormText>("FormText", filters.byCode('["defaultMargin".concat'));

export const Forms = {
    FormTitle,
    FormSection,
    FormDivider,
    FormText
};

waitFor(filters.byCode(".SELECTABLE),"), m => Forms.FormText = m);
waitFor(filters.byCode(".titleId)&&"), m => Forms.FormSection = m);
waitFor(filters.byCode(".divider,", ",style:", '"div"', /\.divider,\i\),style:/), m => Forms.FormDivider = m);
waitFor(filters.byCode('["defaultMargin".concat'), m => Forms.FormText = m);

export const Card = waitForComponent<t.Card>("Card", filters.byCode(".editable),"));
export const Button = waitForComponent<t.Button>("Button", filters.byCode("#{intl::A11Y_LOADING_STARTED}))),!1"));
export const Switch = waitForComponent<t.Switch>("Switch", filters.byCode('("Switch")'));

const Tooltips = mapMangledModuleLazy(".tooltipTop,bottom:", {
    Tooltip: filters.byCode("this.renderTooltip()]"),
    TooltipContainer: filters.byCode('="div",')
}) as {
    Tooltip: t.Tooltip,
    TooltipContainer: t.TooltipContainer;
};

export const Tooltip = LazyComponent(() => Tooltips.Tooltip);
export const TooltipContainer = LazyComponent(() => Tooltips.TooltipContainer);

export const TextInput = waitForComponent<t.TextInput>("TextInput", filters.byCode(".error]:this.hasError()"));
export const TextArea = waitForComponent<t.TextArea>("TextArea", filters.byCode("this.getPaddingRight()},id:"));
export const Text = waitForComponent<t.Text>("Text", filters.byCode('case"always-white"'));
export const Heading = waitForComponent<t.Heading>("Heading", filters.byCode(">6?{", "variant:"));
export const Select = waitForComponent<t.Select>("Select", filters.byCode('.selectPositionTop]:"top"===', '"Escape"==='));
export const SearchableSelect = waitForComponent<t.SearchableSelect>("SearchableSelect", filters.byCode('.selectPositionTop]:"top"===', ".multi]:"));
export const Slider = waitForComponent<t.Slider>("Slider", filters.byCode('"markDash".concat('));
export const Popout = waitForComponent<t.Popout>("Popout", filters.byCode("ref:this.ref,preload:"));
export const Dialog = waitForComponent<t.Dialog>("Dialog", filters.byCode('role:"dialog",tabIndex:-1'));
export const TabBar = waitForComponent("TabBar", filters.byCode("ref:this.tabBarRef,className:"));
export const Paginator = waitForComponent<t.Paginator>("Paginator", filters.byCode('rel:"prev",children:'));
export const ScrollerThin = waitForComponent<t.ScrollerThin>("ScrollerThin", filters.byCode('="ltr",orientation:', "onScroll:"));
export const Clickable = waitForComponent<t.Clickable>("Clickable", filters.byCode("this.context?this.renderNonInteractive():"));
export const Avatar = waitForComponent<t.Avatar>("Avatar", filters.byCode(".size-1.375*"));

const { FocusLock_ } = mapMangledModuleLazy("attachTo:null!==", {
    FocusLock_: filters.byCode(".containerRef")
}) as {
    FocusLock_: t.FocusLock;
};

export const FocusLock = LazyComponent(() => FocusLock_);

export let ButtonLooks: t.ButtonLooks;
waitFor(["BLANK", "FILLED", "LINK"], m => ButtonLooks = m);
export let useToken: t.useToken;
waitFor(filters.byCode('("useToken")'), m => useToken = m);

export const MaskedLink = waitForComponent<t.MaskedLink>("MaskedLink", filters.componentByCode("MASKED_LINK)"));
export const Timestamp = waitForComponent<t.Timestamp>("Timestamp", filters.byCode("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}"));
export const Flex = waitForComponent<t.Flex>("Flex", ["Justify", "Align", "Wrap"]);

export const { OAuth2AuthorizeModal } = findByPropsLazy("OAuth2AuthorizeModal");

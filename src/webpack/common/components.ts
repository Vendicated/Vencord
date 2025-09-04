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
import * as t from "@vencord/discord-types";
import { filters, mapMangledModuleLazy, waitFor } from "@webpack";

import { waitForComponent } from "./internal";


const FormTitle = waitForComponent<t.FormTitle>("FormTitle", filters.componentByCode('["defaultMargin".concat', '="h5"'));
const FormText = waitForComponent<t.FormText>("FormText", filters.componentByCode(".SELECTABLE),", ".DISABLED:"));
const FormSection = waitForComponent<t.FormSection>("FormSection", filters.componentByCode(".titleId)"));
const FormDivider = waitForComponent<t.FormDivider>("FormDivider", filters.componentByCode(".divider,", ",style:", '"div"', /\.divider,\i\),style:/));

export const Forms = {
    FormTitle,
    FormText,
    FormSection,
    FormDivider
};

export const Card = waitForComponent<t.Card>("Card", filters.componentByCode(".editable),", ".outline:"));
export const Button = waitForComponent<t.Button>("Button", filters.componentByCode("#{intl::A11Y_LOADING_STARTED}))),!1"));
export const Switch = waitForComponent<t.Switch>("Switch", filters.componentByCode(".labelRow,ref:", ".disabledText"));
export const Checkbox = waitForComponent<t.Checkbox>("Checkbox", filters.componentByCode(".checkboxWrapperDisabled:"));

const Tooltips = mapMangledModuleLazy(".tooltipTop,bottom:", {
    Tooltip: filters.componentByCode("this.renderTooltip()]"),
    TooltipContainer: filters.componentByCode('="div"')
}) as {
    Tooltip: t.Tooltip,
    TooltipContainer: t.TooltipContainer;
};

export const Tooltip = LazyComponent(() => Tooltips.Tooltip);
export const TooltipContainer = LazyComponent(() => Tooltips.TooltipContainer);

export const TextInput = waitForComponent<t.TextInput>("TextInput", filters.componentByCode("#{intl::MAXIMUM_LENGTH_ERROR}", '"input"'));
export const TextArea = waitForComponent<t.TextArea>("TextArea", filters.componentByCode("this.getPaddingRight()},id:"));
export const Text = waitForComponent<t.Text>("Text", filters.componentByCode('case"always-white"'));
export const Heading = waitForComponent<t.Heading>("Heading", filters.componentByCode(">6?{", "variant:"));
export const Select = waitForComponent<t.Select>("Select", filters.componentByCode('.selectPositionTop]:"top"===', '"Escape"==='));
export const SearchableSelect = waitForComponent<t.SearchableSelect>("SearchableSelect", filters.componentByCode('.selectPositionTop]:"top"===', ".multi]:"));
export const Slider = waitForComponent<t.Slider>("Slider", filters.componentByCode('"markDash".concat('));
export const Popout = waitForComponent<t.Popout>("Popout", filters.componentByCode("ref:this.ref,", "renderPopout:this.renderPopout,"));
export const Dialog = waitForComponent<t.Dialog>("Dialog", filters.componentByCode('role:"dialog",tabIndex:-1'));
export const TabBar = waitForComponent("TabBar", filters.componentByCode("ref:this.tabBarRef,className:"));
export const Paginator = waitForComponent<t.Paginator>("Paginator", filters.componentByCode('rel:"prev",children:'));
export const Clickable = waitForComponent<t.Clickable>("Clickable", filters.componentByCode("this.context?this.renderNonInteractive():"));
export const Avatar = waitForComponent<t.Avatar>("Avatar", filters.componentByCode(".size-1.375*"));

export const ColorPicker = waitForComponent<t.ColorPicker>("ColorPicker", filters.componentByCode("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", "showEyeDropper"));

export const UserSummaryItem = waitForComponent("UserSummaryItem", filters.componentByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));

export let createScroller: (scrollbarClassName: string, fadeClassName: string, customThemeClassName: string) => t.ScrollerThin;
export let scrollerClasses: Record<string, string>;
waitFor(filters.byCode('="ltr",orientation:', "customTheme:", "forwardRef"), m => createScroller = m);
waitFor(["thin", "auto", "customTheme"], m => scrollerClasses = m);

export const ScrollerNone = LazyComponent(() => createScroller(scrollerClasses.none, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerThin = LazyComponent(() => createScroller(scrollerClasses.thin, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerAuto = LazyComponent(() => createScroller(scrollerClasses.auto, scrollerClasses.fade, scrollerClasses.customTheme));

const { FocusLock_ } = mapMangledModuleLazy('document.getElementById("app-mount"))', {
    FocusLock_: filters.componentByCode(".containerRef")
}) as {
    FocusLock_: t.FocusLock;
};

export const FocusLock = LazyComponent(() => FocusLock_);

export let useToken: t.useToken;
waitFor(m => {
    if (typeof m !== "function") {
        return false;
    }

    const str = String(m);
    return str.includes(".resolve({theme:null") && !str.includes("useMemo");
}, m => useToken = m);

export const MaskedLink = waitForComponent<t.MaskedLink>("MaskedLink", filters.componentByCode("MASKED_LINK)"));
export const Timestamp = waitForComponent<t.Timestamp>("Timestamp", filters.componentByCode("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}"));
export const Flex = waitForComponent<t.Flex>("Flex", ["Justify", "Align", "Wrap"]);
export const OAuth2AuthorizeModal = waitForComponent("OAuth2AuthorizeModal", filters.componentByCode(".authorize,children:", ".contentBackground"));

export const Animations = mapMangledModuleLazy(".assign({colorNames:", {
    Transition: filters.componentByCode('["items","children"]', ",null,"),
    animated: filters.byProps("div", "text")
});

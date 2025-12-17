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

import { TextCompat } from "@components/BaseText";
import { ButtonCompat } from "@components/Button";
import { Divider } from "@components/Divider";
import { FormSwitchCompat } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { LazyComponent } from "@utils/lazyReact";
import * as t from "@vencord/discord-types";
import { filters, mapMangledModuleLazy, waitFor } from "@webpack";

import { waitForComponent } from "./internal";

export const Forms = {
    // TODO: Stop using this and use Heading/Paragraph directly
    /** @deprecated use Heading from Vencord */
    FormTitle: Heading,
    /** @deprecated use Paragraph from Vencord */
    FormText: Paragraph,
    /** @deprecated don't use this */
    FormSection: "section" as never, // Backwards compat since Vesktop uses this
    /** @deprecated use `@components/Divider` */
    FormDivider: Divider as never, // Backwards compat since Vesktop uses this
};

// TODO: Stop using this and use Paragraph/Span directly
/** @deprecated use Paragraph, Span, or BaseText from Vencord */
export const Text = TextCompat;
/** @deprecated use Button from Vencord */
export const Button = ButtonCompat;
/** @deprecated Use FormSwitch from Vencord */
export const Switch = FormSwitchCompat as never;

/** @deprecated Use Card from Vencord */
export const Card = waitForComponent<never>("Card", filters.componentByCode(".editable),", ".outline:"));
export const Checkbox = waitForComponent<t.Checkbox>("Checkbox", filters.componentByCode(".checkboxWrapperDisabled:"));

const Tooltips = mapMangledModuleLazy(".tooltipTop,bottom:", {
    Tooltip: filters.componentByCode("this.renderTooltip()]"),
    TooltipContainer: filters.componentByCode('="div"')
}) as {
    Tooltip: t.Tooltip,
    TooltipContainer: t.TooltipContainer;
};

// TODO: if these finds break, they should just return their children
export const Tooltip = LazyComponent(() => Tooltips.Tooltip);
export const TooltipContainer = LazyComponent(() => Tooltips.TooltipContainer);

export const TextInput = waitForComponent<t.TextInput>("TextInput", filters.componentByCode("#{intl::MAXIMUM_LENGTH_ERROR}", '"input"'));
export const TextArea = waitForComponent<t.TextArea>("TextArea", filters.componentByCode("this.getPaddingRight()},id:"));
export const Select = waitForComponent<t.Select>("Select", filters.componentByCode('"Select"', ".newOptionLabel"));
export const SearchableSelect = waitForComponent<t.SearchableSelect>("SearchableSelect", filters.componentByCode('"SearchableSelect"'));
export const Slider = waitForComponent<t.Slider>("Slider", filters.componentByCode('"markDash".concat('));
export const Popout = waitForComponent<t.Popout>("Popout", filters.componentByCode("ref:this.ref,", "renderPopout:this.renderPopout,"));
export const Dialog = waitForComponent<t.Dialog>("Dialog", filters.componentByCode('role:"dialog",tabIndex:-1'));
export const TabBar = waitForComponent("TabBar", filters.componentByCode("ref:this.tabBarRef,className:"));
export const Paginator = waitForComponent<t.Paginator>("Paginator", filters.componentByCode('rel:"prev",children:'));
// TODO: remake this component
export const Clickable = waitForComponent<t.Clickable>("Clickable", filters.componentByCode("this.context?this.renderNonInteractive():"));
export const Avatar = waitForComponent<t.Avatar>("Avatar", filters.componentByCode(".size-1.375*"));

export const ColorPicker = waitForComponent<t.ColorPicker>("ColorPicker", filters.componentByCode("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", "showEyeDropper"));

export const UserSummaryItem = waitForComponent("UserSummaryItem", filters.componentByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers"));

export let createScroller: (scrollbarClassName: string, fadeClassName: string, customThemeClassName: string) => t.ScrollerThin;
export let createListScroller: (scrollBarClassName: string, fadeClassName: string, someOtherClassIdkMan: string, resizeObserverClass: typeof ResizeObserver) => t.ListScrollerThin;
export let scrollerClasses: Record<string, string>;
export let listScrollerClasses: Record<string, string>;

waitFor(filters.byCode('="ltr",orientation:', "customTheme:", "forwardRef"), m => createScroller = m);
waitFor(filters.byCode("getScrollerNode:", "resizeObserver:", "sectionHeight:"), m => createListScroller = m);
waitFor(["thin", "auto", "customTheme"], m => scrollerClasses = m);
waitFor(m => m.thin && m.auto && !m.customTheme, m => listScrollerClasses = m);

export const ScrollerNone = LazyComponent(() => createScroller(scrollerClasses.none, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerThin = LazyComponent(() => createScroller(scrollerClasses.thin, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerAuto = LazyComponent(() => createScroller(scrollerClasses.auto, scrollerClasses.fade, scrollerClasses.customTheme));

export const ListScrollerNone = LazyComponent(() => createListScroller(listScrollerClasses.none, listScrollerClasses.fade, "", ResizeObserver));
export const ListScrollerThin = LazyComponent(() => createListScroller(listScrollerClasses.thin, listScrollerClasses.fade, "", ResizeObserver));
export const ListScrollerAuto = LazyComponent(() => createListScroller(listScrollerClasses.auto, listScrollerClasses.fade, "", ResizeObserver));

export const FocusLock = waitForComponent<t.FocusLock>("FocusLock", filters.componentByCode(".containerRef,{keyboardModeEnabled:"));

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
export const OAuth2AuthorizeModal = waitForComponent("OAuth2AuthorizeModal", filters.componentByCode(".authorize,children:", ".contentBackground"));

export const Animations = mapMangledModuleLazy(".assign({colorNames:", {
    Transition: filters.componentByCode('["items","children"]', ",null,"),
    animated: filters.byProps("div", "text")
});

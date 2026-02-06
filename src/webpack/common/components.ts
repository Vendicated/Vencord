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
import { TooltipContainer as TooltipContainerComponent } from "@components/TooltipContainer";
import { TooltipFallback } from "@components/TooltipFallback";
import { LazyComponent } from "@utils/lazyReact";
import * as t from "@vencord/discord-types";
import { filters, find, findCssClassesLazy, mapMangledCssClasses, mapMangledModuleLazy, proxyLazyWebpack, waitFor } from "@webpack";

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

export const Checkbox = waitForComponent<t.Checkbox>("Checkbox", filters.componentByCode('"data-toggleable-component":"checkbox'));

export const Tooltip = waitForComponent<t.Tooltip>("Tooltip", m => m.prototype?.shouldShowTooltip && m.prototype.render, TooltipFallback);
/** @deprecated import from @vencord/components */
export const TooltipContainer = TooltipContainerComponent as never;

export const TextInput = waitForComponent<t.TextInput>("TextInput", filters.componentByCode("#{intl::MAXIMUM_LENGTH_ERROR}", '"input"'));
export const TextArea = waitForComponent<t.TextArea>("TextArea", filters.componentByCode("this.getPaddingRight()},id:"));
export const Select = waitForComponent<t.Select>("Select", filters.componentByCode('"Select"'));
export const SearchableSelect = waitForComponent<t.SearchableSelect>("SearchableSelect", filters.componentByCode('"SearchableSelect"'));
export const Slider = waitForComponent<t.Slider>("Slider", filters.componentByCode("markDash", "this.renderMark("));
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

const listScrollerClassnames = ["thin", "auto", "fade"] as const;
export const scrollerClasses = findCssClassesLazy("thin", "auto", "fade", "customTheme", "none");

const isListScroller = filters.byClassNames(...listScrollerClassnames);
const isNotNormalScroller = filters.byClassNames("customTheme");
export const listScrollerClasses = proxyLazyWebpack(() => {
    const mod = find(m => isListScroller(m) && !isNotNormalScroller(m), { topLevelOnly: true });
    if (!mod) return {} as Record<typeof listScrollerClassnames[number], string>;

    return mapMangledCssClasses(mod, listScrollerClassnames);
});

waitFor(filters.byCode('="ltr",orientation:', "customTheme:", "forwardRef"), m => createScroller = m);
waitFor(filters.byCode("getScrollerNode:", "resizeObserver:", "sectionHeight:"), m => createListScroller = m);

export const ScrollerNone = LazyComponent(() => createScroller(scrollerClasses.none, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerThin = LazyComponent(() => createScroller(scrollerClasses.thin, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerAuto = LazyComponent(() => createScroller(scrollerClasses.auto, scrollerClasses.fade, scrollerClasses.customTheme));

export const ListScrollerThin = LazyComponent(() => createListScroller(listScrollerClasses.thin, listScrollerClasses.fade, "", ResizeObserver));
export const ListScrollerAuto = LazyComponent(() => createListScroller(listScrollerClasses.auto, listScrollerClasses.fade, "", ResizeObserver));

export const FocusLock = waitForComponent<t.FocusLock>("FocusLock", filters.componentByCode(".containerRef,{keyboardModeEnabled:"));

export let useToken: t.useToken;
waitFor(m => {
    if (typeof m !== "function") {
        return false;
    }

    const str = String(m);
    return str.includes(".resolve({theme:") && str.includes('"refresh-fast-follow-avatars"') && !str.includes("useMemo");
}, m => useToken = m);

export const MaskedLink = waitForComponent<t.MaskedLink>("MaskedLink", filters.componentByCode("MASKED_LINK)"));
export const Timestamp = waitForComponent<t.Timestamp>("Timestamp", filters.componentByCode("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}"));
export const OAuth2AuthorizeModal = waitForComponent("OAuth2AuthorizeModal", filters.componentByCode("hasContentBackground", "oauth2_authorize"));

export const Animations = mapMangledModuleLazy(".assign({colorNames:", {
    Transition: filters.componentByCode('["items","children"]', ",null,"),
    animated: filters.byProps("div", "text")
});

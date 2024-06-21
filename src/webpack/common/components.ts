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

import { NoopComponent } from "@utils/react";

// eslint-disable-next-line path-alias/no-relative
import { filters, find, findComponent, findExportedComponent } from "../webpack";
import * as t from "./types/components";

export let Card: t.Card = NoopComponent as any;
export let Button: t.Button = NoopComponent as any;
export let Switch: t.Switch = NoopComponent;
export let Tooltip: t.Tooltip = NoopComponent as any;
export let TextInput: t.TextInput = NoopComponent as any;
export let TextArea: t.TextArea = NoopComponent;
export let Text: t.Text = NoopComponent;
export let Heading: t.Heading = NoopComponent;
export let Select: t.Select = NoopComponent;
export let SearchableSelect: t.SearchableSelect = NoopComponent;
export let Slider: t.Slider = NoopComponent;
export let ButtonLooks: t.ButtonLooks;
export let Popout: t.Popout = NoopComponent as any;
export let Dialog: t.Dialog = NoopComponent;
export let TabBar: t.TabBar = NoopComponent as any;
export let Paginator: t.Paginator = NoopComponent;
export let ScrollerThin: t.ScrollerThin = NoopComponent;
export let Clickable: t.Clickable = NoopComponent;
export let Avatar: t.Avatar = NoopComponent;
export let FocusLock: t.FocusLock = NoopComponent;
export let useToken: t.useToken;

export const MaskedLink = findComponent<t.MaskedLinkProps>(filters.byComponentCode("MASKED_LINK)"));
export const Timestamp = findComponent<t.TimestampProps>(filters.byComponentCode(".Messages.MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL.format"));
export const Flex = findComponent(filters.byProps("Justify", "Align", "Wrap")) as t.Flex;

export const OAuth2AuthorizeModal = findExportedComponent("OAuth2AuthorizeModal");

export const Forms = find<t.Forms>(filters.byProps("FormItem", "Button"), m => {
    ({
        useToken,
        Card,
        Button,
        FormSwitch: Switch,
        Tooltip,
        TextInput,
        TextArea,
        Text,
        Select,
        SearchableSelect,
        Slider,
        ButtonLooks,
        TabBar,
        Popout,
        Dialog,
        Paginator,
        ScrollerThin,
        Clickable,
        Avatar,
        FocusLock,
        Heading
    } = m);

    return m;
});

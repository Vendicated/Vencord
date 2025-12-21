/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings";
import { Margins } from "@utils/margins";
import { TabBar, useState } from "@webpack/common";

import AnchorTab from "./tabs/AnchorTab";
import AvatarTab from "./tabs/AvatarTab";
import BadgeTab from "./tabs/BadgeTab";
import ButtonsTab from "./tabs/ButtonsTab";
import CalendarTab from "./tabs/CalendarTab";
import CheckboxGroupTab from "./tabs/CheckboxGroupTab";
import CheckboxTab from "./tabs/CheckboxTab";
import ClickableTab from "./tabs/ClickableTab";
import ColorPickerTab from "./tabs/ColorPickerTab";
import ComboboxTab from "./tabs/ComboboxTab";
import LayerModalTab from "./tabs/LayerModalTab";
import ListboxTab from "./tabs/ListboxTab";
import ModalTab from "./tabs/ModalTab";
import NoticeTab from "./tabs/NoticeTab";
import PaginatorTab from "./tabs/PaginatorTab";
import PopoverTab from "./tabs/PopoverTab";
import ProgressBarTab from "./tabs/ProgressBarTab";
import RadioGroupTab from "./tabs/RadioGroupTab";
import RichTooltipTab from "./tabs/RichTooltipTab";
import SearchBarTab from "./tabs/SearchBarTab";
import SelectTab from "./tabs/SelectTab";
import SliderTab from "./tabs/SliderTab";
import SpinnerTab from "./tabs/SpinnerTab";
import SwitchTab from "./tabs/SwitchTab";
import TabBarTab from "./tabs/TabBarTab";
import TextAreaTab from "./tabs/TextAreaTab";
import TextButtonTab from "./tabs/TextButtonTab";
import TextInputTab from "./tabs/TextInputTab";
import TooltipTab from "./tabs/TooltipTab";
import TypographyTab from "./tabs/TypographyTab";

const TABS = [
    { id: "anchor", label: "Anchor" },
    { id: "avatar", label: "Avatar" },
    { id: "badge", label: "Badge" },
    { id: "buttons", label: "Buttons" },
    { id: "calendar", label: "Calendar" },
    { id: "checkbox", label: "Checkbox" },
    { id: "checkboxgroup", label: "CheckboxGroup" },
    { id: "clickable", label: "Clickable" },
    { id: "colorpicker", label: "ColorPicker" },
    { id: "combobox", label: "Combobox" },
    { id: "layermodal", label: "LayerModal" },
    { id: "listbox", label: "Listbox" },
    { id: "modal", label: "Modal" },
    { id: "notice", label: "Notice" },
    { id: "paginator", label: "Paginator" },
    { id: "popover", label: "Popover" },
    { id: "progressbar", label: "ProgressBar" },
    { id: "radiogroup", label: "RadioGroup" },
    { id: "richtooltip", label: "RichTooltip" },
    { id: "searchbar", label: "SearchBar" },
    { id: "select", label: "Select" },
    { id: "slider", label: "Slider" },
    { id: "spinner", label: "Spinner" },
    { id: "switch", label: "Switch" },
    { id: "tabbar", label: "TabBar" },
    { id: "textarea", label: "TextArea" },
    { id: "textbutton", label: "TextButton" },
    { id: "textinput", label: "TextInput" },
    { id: "tooltip", label: "Tooltip" },
    { id: "typography", label: "Typography" },
].sort((a, b) => a.label.localeCompare(b.label));

type TabId = typeof TABS[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
    anchor: AnchorTab,
    avatar: AvatarTab,
    badge: BadgeTab,
    buttons: ButtonsTab,
    calendar: CalendarTab,
    checkbox: CheckboxTab,
    checkboxgroup: CheckboxGroupTab,
    clickable: ClickableTab,
    colorpicker: ColorPickerTab,
    combobox: ComboboxTab,
    layermodal: LayerModalTab,
    listbox: ListboxTab,
    modal: ModalTab,
    notice: NoticeTab,
    paginator: PaginatorTab,
    popover: PopoverTab,
    progressbar: ProgressBarTab,
    radiogroup: RadioGroupTab,
    richtooltip: RichTooltipTab,
    searchbar: SearchBarTab,
    select: SelectTab,
    slider: SliderTab,
    spinner: SpinnerTab,
    switch: SwitchTab,
    tabbar: TabBarTab,
    textarea: TextAreaTab,
    textbutton: TextButtonTab,
    textinput: TextInputTab,
    tooltip: TooltipTab,
    typography: TypographyTab,
};

function ComponentsTab() {
    const [currentTab, setCurrentTab] = useState<TabId>("avatar");
    const TabComponent = TAB_COMPONENTS[currentTab];

    return (
        <SettingsTab>
            <Heading className={Margins.bottom16}>Components</Heading>
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
                className="vc-compfinder-tabbar"
            >
                {TABS.map(tab => (
                    <TabBar.Item key={tab.id} id={tab.id} className="vc-compfinder-tab">
                        {tab.label}
                    </TabBar.Item>
                ))}
            </TabBar>
            <div className="vc-compfinder-content">
                <TabComponent />
            </div>
        </SettingsTab>
    );
}

export default wrapTab(ComponentsTab, "ComponentsTab");

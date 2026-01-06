/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings";
import { Margins } from "@utils/margins";
import { TabBar, useMemo, useState } from "@webpack/common";

import { SearchBar } from ".";
import AccordionTab from "./tabs/AccordionTab";
import AlertTab from "./tabs/AlertTab";
import AnchorTab from "./tabs/AnchorTab";
import AnimationsTab from "./tabs/AnimationsTab";
import AvatarTab from "./tabs/AvatarTab";
import BadgeTab from "./tabs/BadgeTab";
import ButtonsTab from "./tabs/ButtonsTab";
import CalendarTab from "./tabs/CalendarTab";
import CardTab from "./tabs/CardTab";
import CheckboxGroupTab from "./tabs/CheckboxGroupTab";
import CheckboxTab from "./tabs/CheckboxTab";
import ChipTab from "./tabs/ChipTab";
import ClickableTab from "./tabs/ClickableTab";
import CodeBlockTab from "./tabs/CodeBlockTab";
import ColorPickerTab from "./tabs/ColorPickerTab";
import ComboboxTab from "./tabs/ComboboxTab";
import DividerTab from "./tabs/DividerTab";
import ErrorBoundaryTab from "./tabs/ErrorBoundaryTab";
import FocusLockTab from "./tabs/FocusLockTab";
import GuildIconTab from "./tabs/GuildIconTab";
import HeadingTab from "./tabs/HeadingTab";
import LayerModalTab from "./tabs/LayerModalTab";
import ListboxTab from "./tabs/ListboxTab";
import MenuTab from "./tabs/MenuTab";
import ModalTab from "./tabs/ModalTab";
import NoticeTab from "./tabs/NoticeTab";
import PaginatorTab from "./tabs/PaginatorTab";
import PopoutTab from "./tabs/PopoutTab";
import PopoverTab from "./tabs/PopoverTab";
import ProgressBarTab from "./tabs/ProgressBarTab";
import RadioGroupTab from "./tabs/RadioGroupTab";
import RichTooltipTab from "./tabs/RichTooltipTab";
import ScrollerTab from "./tabs/ScrollerTab";
import SearchBarTab from "./tabs/SearchBarTab";
import SelectTab from "./tabs/SelectTab";
import SkeletonTab from "./tabs/SkeletonTab";
import SliderTab from "./tabs/SliderTab";
import SpinnerTab from "./tabs/SpinnerTab";
import SwitchTab from "./tabs/SwitchTab";
import TabBarTab from "./tabs/TabBarTab";
import TextAreaTab from "./tabs/TextAreaTab";
import TextButtonTab from "./tabs/TextButtonTab";
import TextInputTab from "./tabs/TextInputTab";
import TimestampTab from "./tabs/TimestampTab";
import ToastTab from "./tabs/ToastTab";
import TooltipTab from "./tabs/TooltipTab";
import TypographyTab from "./tabs/TypographyTab";
import UserSummaryItemTab from "./tabs/UserSummaryItemTab";

const TABS = [
    { id: "accordion", label: "Accordion" },
    { id: "alert", label: "Alert" },
    { id: "animations", label: "Animations" },
    { id: "anchor", label: "Anchor" },
    { id: "avatar", label: "Avatar" },
    { id: "badge", label: "Badge" },
    { id: "buttons", label: "Buttons" },
    { id: "calendar", label: "Calendar" },
    { id: "card", label: "Card" },
    { id: "chip", label: "Chip" },
    { id: "checkbox", label: "Checkbox" },
    { id: "checkboxgroup", label: "CheckboxGroup" },
    { id: "clickable", label: "Clickable" },
    { id: "codeblock", label: "CodeBlock" },
    { id: "colorpicker", label: "ColorPicker" },
    { id: "combobox", label: "Combobox" },
    { id: "divider", label: "Divider" },
    { id: "errorboundary", label: "ErrorBoundary" },
    { id: "focuslock", label: "FocusLock" },
    { id: "guildicon", label: "GuildIcon" },
    { id: "heading", label: "Heading" },
    { id: "layermodal", label: "LayerModal" },
    { id: "listbox", label: "Listbox" },
    { id: "menu", label: "Menu" },
    { id: "modal", label: "Modal" },
    { id: "notice", label: "Notice" },
    { id: "paginator", label: "Paginator" },
    { id: "popout", label: "Popout" },
    { id: "popover", label: "Popover" },
    { id: "progressbar", label: "ProgressBar" },
    { id: "radiogroup", label: "RadioGroup" },
    { id: "richtooltip", label: "RichTooltip" },
    { id: "scroller", label: "Scroller" },
    { id: "searchbar", label: "SearchBar" },
    { id: "select", label: "Select" },
    { id: "skeleton", label: "Skeleton" },
    { id: "slider", label: "Slider" },
    { id: "spinner", label: "Spinner" },
    { id: "switch", label: "Switch" },
    { id: "tabbar", label: "TabBar" },
    { id: "textarea", label: "TextArea" },
    { id: "textbutton", label: "TextButton" },
    { id: "textinput", label: "TextInput" },
    { id: "timestamp", label: "Timestamp" },
    { id: "toast", label: "Toast" },
    { id: "tooltip", label: "Tooltip" },
    { id: "typography", label: "Typography" },
    { id: "usersummaryitem", label: "UserSummaryItem" },

].sort((a, b) => a.label.localeCompare(b.label));

type TabId = typeof TABS[number]["id"];

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
    accordion: AccordionTab,
    alert: AlertTab,
    animations: AnimationsTab,
    anchor: AnchorTab,
    avatar: AvatarTab,
    badge: BadgeTab,
    buttons: ButtonsTab,
    calendar: CalendarTab,
    card: CardTab,
    chip: ChipTab,
    checkbox: CheckboxTab,
    checkboxgroup: CheckboxGroupTab,
    clickable: ClickableTab,
    codeblock: CodeBlockTab,
    colorpicker: ColorPickerTab,
    combobox: ComboboxTab,
    divider: DividerTab,
    errorboundary: ErrorBoundaryTab,
    focuslock: FocusLockTab,
    guildicon: GuildIconTab,
    heading: HeadingTab,
    layermodal: LayerModalTab,
    listbox: ListboxTab,
    menu: MenuTab,
    modal: ModalTab,
    notice: NoticeTab,
    paginator: PaginatorTab,
    popout: PopoutTab,
    popover: PopoverTab,
    progressbar: ProgressBarTab,
    radiogroup: RadioGroupTab,
    richtooltip: RichTooltipTab,
    scroller: ScrollerTab,
    searchbar: SearchBarTab,
    select: SelectTab,
    skeleton: SkeletonTab,
    slider: SliderTab,
    spinner: SpinnerTab,
    switch: SwitchTab,
    tabbar: TabBarTab,
    textarea: TextAreaTab,
    textbutton: TextButtonTab,
    textinput: TextInputTab,
    timestamp: TimestampTab,
    toast: ToastTab,
    tooltip: TooltipTab,
    typography: TypographyTab,
    usersummaryitem: UserSummaryItemTab,
};

function ComponentsTab() {
    const [currentTab, setCurrentTab] = useState<TabId>("avatar");
    const [search, setSearch] = useState("");
    const TabComponent = TAB_COMPONENTS[currentTab];

    const filteredTabs = useMemo(() => {
        if (!search.trim()) return TABS;
        const query = search.toLowerCase();
        return TABS.filter(tab => tab.label.toLowerCase().includes(query));
    }, [search]);

    return (
        <SettingsTab>
            <Heading className={Margins.bottom16}>Components</Heading>
            <div className="vc-compfinder-search">
                <SearchBar
                    query={search}
                    onChange={setSearch}
                    onClear={() => setSearch("")}
                    placeholder="Search components..."
                />
            </div>
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
                className="vc-compfinder-tabbar"
            >
                {filteredTabs.map(tab => (
                    <TabBar.Item key={tab.id} id={tab.id} className="vc-compfinder-tab">
                        {tab.label}
                    </TabBar.Item>
                ))}
            </TabBar>
            <div className="vc-compfinder-content">
                <ErrorBoundary message={`Failed to render ${currentTab} tab`}>
                    <TabComponent />
                </ErrorBoundary>
            </div>
        </SettingsTab>
    );
}

export default wrapTab(ComponentsTab, "ComponentsTab");

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaBaseRadioGroup, StandaloneRadioIndicator } from "@equicordplugins/components.dev";

import { RadioOption, useState } from "..";
import { DocPage, type PropDef, type PropGroup } from "../DocPage";
import { EquicordIcon } from "../icons/EquicordIcon";

const RADIOGROUP_PROPS: PropDef[] = [
    { name: "options", type: "RadioOption[]", required: true, description: "Array of radio options to display." },
    { name: "value", type: "string | number | null", description: "Currently selected value." },
    { name: "onChange", type: "(value: string | number) => void", description: "Called when the selection changes." },
    { name: "disabled", type: "boolean", default: "false", description: "Disable the entire radio group." },
    { name: "orientation", type: '"vertical" | "horizontal"', description: "Layout orientation of the radio items." },
    { name: "radioPosition", type: '"left" | "right"', default: '"left"', description: "Position of the radio indicator relative to the label." },
    { name: "withTransparentBackground", type: "boolean", description: "Use transparent background for radio items." },
    { name: "label", type: "string", description: "Field label text for the group." },
    { name: "description", type: "string", description: "Field description text." },
    { name: "required", type: "boolean", description: "Mark the field as required." },
    { name: "errorMessage", type: "string", description: "Error message displayed below the group." },
    { name: "aria-labelledby", type: "string", description: "ID of an external labelling element for accessibility." },
    { name: "className", type: "string", description: "Custom CSS class name." },
];

const OPTION_PROPS: PropDef[] = [
    { name: "value", type: "string | number", required: true, description: "The value for this option." },
    { name: "name", type: "string", required: true, description: "Display label text." },
    { name: "description", type: "string", description: "Description text shown below the label." },
    { name: "disabled", type: "boolean", description: "Disable this individual option." },
    { name: "icon", type: "ComponentType", description: "Icon component displayed alongside the radio option." },
    { name: "color", type: "string", description: "Custom color for the option highlight." },
];

const STANDALONE_PROPS: PropDef[] = [
    { name: "isSelected", type: "boolean", required: true, description: "Whether the indicator shows as selected." },
    { name: "disabled", type: "boolean", description: "Disable the indicator." },
];

const PROP_GROUPS: PropGroup[] = [
    { title: "ManaBaseRadioGroup", props: RADIOGROUP_PROPS },
    { title: "RadioOption", props: OPTION_PROPS },
    { title: "StandaloneRadioIndicator", props: STANDALONE_PROPS },
];

const BASIC_OPTIONS: RadioOption[] = [
    { value: "option1", name: "Option 1" },
    { value: "option2", name: "Option 2" },
    { value: "option3", name: "Option 3" },
];

const DESC_OPTIONS: RadioOption[] = [
    { value: "low", name: "Low Quality", description: "Faster loading, uses less data" },
    { value: "medium", name: "Medium Quality", description: "Balanced quality and performance" },
    { value: "high", name: "High Quality", description: "Best quality, uses more data" },
];

const ICON_OPTIONS: RadioOption[] = [
    { value: "item1", name: "Item with icon", description: "This option has an icon", icon: EquicordIcon },
    { value: "item2", name: "Another with icon", icon: EquicordIcon },
    { value: "item3", name: "Third with icon", icon: EquicordIcon },
];

const MIXED_OPTIONS: RadioOption[] = [
    { value: "enabled", name: "Enabled option" },
    { value: "disabled", name: "Disabled option", disabled: true },
    { value: "another", name: "Another enabled" },
];

function BasicDemo() {
    const [value, setValue] = useState<string | number>("option1");
    return <ManaBaseRadioGroup options={BASIC_OPTIONS} value={value} onChange={setValue} />;
}

function DescDemo() {
    const [value, setValue] = useState<string | number>("medium");
    return <ManaBaseRadioGroup options={DESC_OPTIONS} value={value} onChange={setValue} />;
}

function IconDemo() {
    const [value, setValue] = useState<string | number>("item1");
    return <ManaBaseRadioGroup options={ICON_OPTIONS} value={value} onChange={setValue} />;
}

function DisabledItemDemo() {
    const [value, setValue] = useState<string | number>("enabled");
    return <ManaBaseRadioGroup options={MIXED_OPTIONS} value={value} onChange={setValue} />;
}

function UnselectedDemo() {
    const [value, setValue] = useState<string | number | undefined>(undefined);
    return <ManaBaseRadioGroup options={BASIC_OPTIONS} value={value} onChange={setValue} />;
}

function StandaloneDemo() {
    const [selected, setSelected] = useState(false);
    return (
        <div onClick={() => setSelected(!selected)} style={{ cursor: "pointer", display: "inline-block" }}>
            <StandaloneRadioIndicator isSelected={selected} />
        </div>
    );
}

export default function RadioGroupTab() {
    return (
        <DocPage
            componentName="ManaBaseRadioGroup"
            overview="ManaBaseRadioGroup renders a group of mutually exclusive radio options. Options support descriptions, leading icons, and individual disabled states. StandaloneRadioIndicator is an animated radio circle for custom radio implementations."
            importPath={'import { ManaBaseRadioGroup, StandaloneRadioIndicator, RadioOption } from "../components";'}
            sections={[
                {
                    title: "Basic",
                    description: "Simple radio group with text-only options.",
                    children: <BasicDemo />,
                    code: `<ManaBaseRadioGroup
  options={[
    { value: "a", name: "Option A" },
    { value: "b", name: "Option B" },
  ]}
  value={value}
  onChange={setValue}
/>`,
                    relevantProps: ["options", "value", "onChange"],
                },
                {
                    title: "With Descriptions",
                    description: "Options with descriptive text using the description field.",
                    children: <DescDemo />,
                },
                {
                    title: "With Leading Icons",
                    description: "Each option can have an icon component before the radio indicator.",
                    children: <IconDemo />,
                },
                {
                    title: "Disabled Option",
                    description: "Individual options can be disabled while others remain interactive.",
                    children: <DisabledItemDemo />,
                },
                {
                    title: "No Initial Selection",
                    description: "Radio group with no option initially selected.",
                    children: <UnselectedDemo />,
                },
                {
                    title: "Entire Group Disabled",
                    description: "The entire group is non-interactive.",
                    children: <ManaBaseRadioGroup options={BASIC_OPTIONS} value="option2" disabled />,
                    relevantProps: ["disabled"],
                },
                {
                    title: "Standalone Radio Indicator",
                    description: "An animated radio circle component for custom radio UIs. Click to toggle.",
                    children: <StandaloneDemo />,
                    code: "<StandaloneRadioIndicator isSelected={selected} />",
                },
            ]}
            props={PROP_GROUPS}
        />
    );
}

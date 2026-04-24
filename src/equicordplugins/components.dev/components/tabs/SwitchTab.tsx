/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ManaSwitch } from "@equicordplugins/components.dev";
import { findComponentByCodeLazy } from "@webpack";

import { useState } from "..";
import { DocPage, type PropDef, type PropGroup } from "../DocPage";

interface SwitchWithLabelProps {
    checked: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
}

const SwitchWithLabel = findComponentByCodeLazy('"data-toggleable-component":"switch"') as React.ComponentType<SwitchWithLabelProps>;

const SWITCH_PROPS: PropDef[] = [
    { name: "checked", type: "boolean", required: true, description: "Current toggle state." },
    { name: "onChange", type: "(checked: boolean) => void", description: "Called when the switch is toggled." },
    { name: "disabled", type: "boolean", default: "false", description: "Disable interaction." },
    { name: "id", type: "string", description: "HTML id attribute." },
    { name: "hasIcon", type: "boolean", description: "Show a checkmark/x icon inside the toggle." },
    { name: "describedBy", type: "string", internal: true, description: "ID of an element describing this switch." },
    { name: "labelledBy", type: "string", internal: true, description: "ID of an element labelling this switch." },
    { name: "innerRef", type: "Ref<HTMLInputElement>", internal: true, description: "Ref to the underlying input element." },
];

const SWITCH_WITH_LABEL_PROPS: PropDef[] = [
    { name: "checked", type: "boolean", required: true, description: "Current toggle state." },
    { name: "onChange", type: "(checked: boolean) => void", description: "Called when the switch is toggled." },
    { name: "label", type: "string", description: "Label text displayed next to the switch." },
    { name: "description", type: "string", description: "Description text below the label." },
    { name: "disabled", type: "boolean", default: "false", description: "Disable interaction." },
];

const PROP_GROUPS: PropGroup[] = [
    { title: "ManaSwitch", props: SWITCH_PROPS },
    { title: "SwitchWithLabel", props: SWITCH_WITH_LABEL_PROPS },
];

function BasicDemo() {
    const [on, setOn] = useState(true);
    const [off, setOff] = useState(false);

    return (
        <div className="vc-compfinder-grid">
            <div className="vc-compfinder-switch-item">
                <span>On:</span>
                <ManaSwitch checked={on} onChange={setOn} />
            </div>
            <div className="vc-compfinder-switch-item">
                <span>Off:</span>
                <ManaSwitch checked={off} onChange={setOff} />
            </div>
            <div className="vc-compfinder-switch-item">
                <span>Disabled On:</span>
                <ManaSwitch checked={true} disabled />
            </div>
            <div className="vc-compfinder-switch-item">
                <span>Disabled Off:</span>
                <ManaSwitch checked={false} disabled />
            </div>
        </div>
    );
}

function LabelDemo() {
    const [on, setOn] = useState(true);
    const [off, setOff] = useState(false);

    return (
        <div className="vc-compfinder-grid-vertical">
            <SwitchWithLabel label="Enabled option" checked={on} onChange={setOn} />
            <SwitchWithLabel label="Disabled option" checked={off} onChange={setOff} />
        </div>
    );
}

function DescriptionDemo() {
    const [checked, setChecked] = useState(true);
    return (
        <SwitchWithLabel
            label="Feature toggle"
            description="Enable this feature to unlock additional functionality."
            checked={checked}
            onChange={setChecked}
        />
    );
}

export default function SwitchTab() {
    return (
        <DocPage
            componentName="ManaSwitch"
            overview="Discord provides two switch components: ManaSwitch is a bare toggle without label (used inline), and SwitchWithLabel wraps it with label and description text for settings-style layouts."
            notices={[
                { type: "info", children: "SwitchWithLabel is found via findComponentByCodeLazy, not directly exported. Use it for settings layouts, and ManaSwitch for inline toggle scenarios." },
            ]}
            importPath={`import { ManaSwitch } from "../components";
import { findComponentByCodeLazy } from "@webpack";
const SwitchWithLabel = findComponentByCodeLazy('"data-toggleable-component":"switch"');`}
            sections={[
                {
                    title: "Basic Switch",
                    description: "ManaSwitch in on, off, and disabled states.",
                    children: <BasicDemo />,
                    code: "<ManaSwitch checked={enabled} onChange={setEnabled} />",
                    relevantProps: ["checked", "onChange", "disabled"],
                },
                {
                    title: "Switch with Label",
                    description: "SwitchWithLabel renders a label next to the toggle.",
                    children: <LabelDemo />,
                    code: `<SwitchWithLabel
  label="Notifications"
  checked={enabled}
  onChange={setEnabled}
/>`,
                },
                {
                    title: "With Description",
                    description: "Label with description text below.",
                    children: <DescriptionDemo />,
                    code: `<SwitchWithLabel
  label="Feature toggle"
  description="Enable this to unlock additional functionality."
  checked={checked}
  onChange={setChecked}
/>`,
                },
                {
                    title: "Disabled States",
                    description: "Both checked and unchecked disabled states.",
                    children: (
                        <div className="vc-compfinder-grid-vertical">
                            <SwitchWithLabel label="Disabled (checked)" checked={true} disabled />
                            <SwitchWithLabel label="Disabled (unchecked)" checked={false} disabled />
                        </div>
                    ),
                },
            ]}
            props={PROP_GROUPS}
        />
    );
}

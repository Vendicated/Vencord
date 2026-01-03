/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, ContextMenuApi, Menu, Paragraph, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

function DemoMenu({ onClose }: { onClose: () => void; }) {
    const [checkboxValue, setCheckboxValue] = useState(false);
    const [switchValue, setSwitchValue] = useState(true);
    const [radioValue, setRadioValue] = useState("option1");
    const [sliderValue, setSliderValue] = useState(50);

    return (
        <Menu.Menu navId="demo-menu" onClose={onClose}>
            <Menu.MenuItem
                id="item-1"
                label="Basic Item"
                action={() => console.log("Basic item clicked")}
            />
            <Menu.MenuItem
                id="item-2"
                label="Item with Icon"
                icon={() => (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                )}
                action={() => console.log("Icon item clicked")}
            />
            <Menu.MenuItem
                id="item-with-hint"
                label="Item with Hint"
                hint="Ctrl+H"
                action={() => console.log("Hint item clicked")}
            />
            <Menu.MenuItem
                id="item-with-subtext"
                label="Item with Subtext"
                subtext="Additional description here"
                action={() => console.log("Subtext item clicked")}
            />
            <Menu.MenuItem
                id="item-disabled"
                label="Disabled Item"
                disabled
            />

            <Menu.MenuSeparator />

            <Menu.MenuGroup label="Colors">
                <Menu.MenuItem id="color-default" label="Default" color="default" action={() => { }} />
                <Menu.MenuItem id="color-brand" label="Brand" color="brand" action={() => { }} />
                <Menu.MenuItem id="color-danger" label="Danger" color="danger" action={() => { }} />
                <Menu.MenuItem id="color-success" label="Success" color="success" action={() => { }} />
                <Menu.MenuItem id="color-premium" label="Premium" color="premium" action={() => { }} />
                <Menu.MenuItem id="color-premium-gradient" label="Premium Gradient" color="premium-gradient" action={() => { }} />
            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuCheckboxItem
                id="checkbox-item"
                label="Checkbox Item"
                checked={checkboxValue}
                action={() => setCheckboxValue(v => !v)}
            />
            <Menu.MenuCheckboxItem
                id="checkbox-subtext"
                label="Checkbox with Subtext"
                checked={!checkboxValue}
                subtext="Toggle this option"
                action={() => setCheckboxValue(v => !v)}
            />

            <Menu.MenuSeparator />

            <Menu.MenuSwitchItem
                id="switch-item"
                label="Switch Item"
                checked={switchValue}
                action={() => setSwitchValue(v => !v)}
            />

            <Menu.MenuSeparator />

            <Menu.MenuGroup label="Radio Group">
                <Menu.MenuRadioItem
                    id="radio-1"
                    group="demo-radio"
                    label="Option 1"
                    checked={radioValue === "option1"}
                    action={() => setRadioValue("option1")}
                />
                <Menu.MenuRadioItem
                    id="radio-2"
                    group="demo-radio"
                    label="Option 2"
                    checked={radioValue === "option2"}
                    action={() => setRadioValue("option2")}
                />
                <Menu.MenuRadioItem
                    id="radio-3"
                    group="demo-radio"
                    label="Option 3"
                    checked={radioValue === "option3"}
                    action={() => setRadioValue("option3")}
                />
            </Menu.MenuGroup>

            <Menu.MenuSeparator />

            <Menu.MenuItem id="submenu" label="Submenu">
                <Menu.MenuItem
                    id="sub-item-1"
                    label="Sub Item 1"
                    action={() => console.log("Sub item 1")}
                />
                <Menu.MenuItem
                    id="sub-item-2"
                    label="Sub Item 2"
                    action={() => console.log("Sub item 2")}
                />
                <Menu.MenuItem id="nested-submenu" label="Nested Submenu">
                    <Menu.MenuItem
                        id="nested-1"
                        label="Nested Item"
                        action={() => console.log("Nested")}
                    />
                </Menu.MenuItem>
            </Menu.MenuItem>

            <Menu.MenuSeparator />

            <Menu.MenuControlItem
                id="slider-item"
                label="Volume"
                control={() => (
                    <Menu.MenuSliderControl
                        minValue={0}
                        maxValue={100}
                        value={sliderValue}
                        onChange={setSliderValue}
                        renderValue={v => `${v}%`}
                    />
                )}
            />
        </Menu.Menu>
    );
}

export default function MenuTab() {
    const openMenu = (e: React.MouseEvent) => {
        ContextMenuApi.openContextMenu(e, () => (
            <DemoMenu onClose={ContextMenuApi.closeContextMenu} />
        ));
    };

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Menu Demo">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Click or right-click the button to open a demo context menu.
                </Paragraph>
                <div className="vc-compfinder-grid">
                    <Button onClick={openMenu}>
                        Open Menu (Click)
                    </Button>
                    <Button variant="secondary" onContextMenu={openMenu}>
                        Open Menu (Right-Click)
                    </Button>
                </div>
            </SectionWrapper>

            <SectionWrapper title="Menu Components">
                <Paragraph color="text-muted">
                    <strong>Menu.Menu</strong> - Root container with navId and onClose.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuItem</strong> - Basic item with id, label, action, icon, hint, subtext, disabled, color.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuCheckboxItem</strong> - Toggleable checkbox item with checked state.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuRadioItem</strong> - Radio selection with group prop for mutual exclusion.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuSwitchItem</strong> - Toggle switch item with checked state.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuGroup</strong> - Groups items with optional label header.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuSeparator</strong> - Visual divider between items.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuControlItem</strong> - Wrapper for custom controls like sliders.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuSliderControl</strong> - Slider control inside MenuControlItem.
                </Paragraph>
                <Paragraph color="text-muted">
                    <strong>Menu.MenuSearchControl</strong> - Search input for filtering menu items.
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="MenuItem Colors">
                <Paragraph color="text-muted">
                    Available colors: <code>default</code>, <code>brand</code>, <code>danger</code>, <code>success</code>, <code>premium</code>, <code>premium-gradient</code>.
                </Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Usage">
                <Paragraph color="text-muted">
                    Use ContextMenuApi.openContextMenu(event, () =&gt; &lt;Menu /&gt;) to open menus.
                    For patches, use NavContextMenuPatchCallback from @api/ContextMenu.
                </Paragraph>
            </SectionWrapper>
        </div>
    );
}

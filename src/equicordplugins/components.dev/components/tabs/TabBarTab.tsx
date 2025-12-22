/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Paragraph, TabBar, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

export default function TabBarTab() {
    const [sideTab, setSideTab] = useState("tab1");
    const [topTab, setTopTab] = useState("tab1");
    const [topPillTab, setTopPillTab] = useState("tab1");
    const [brandTab, setBrandTab] = useState("tab1");
    const [colorTab, setColorTab] = useState("tab1");

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Side TabBar (Default)">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Default side-style tab bar with grey look. Selected: {sideTab}
                </Paragraph>
                <TabBar
                    type="side"
                    look="grey"
                    selectedItem={sideTab}
                    onItemSelect={setSideTab}
                >
                    <TabBar.Item id="tab1">First Tab</TabBar.Item>
                    <TabBar.Item id="tab2">Second Tab</TabBar.Item>
                    <TabBar.Item id="tab3">Third Tab</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="Top TabBar">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Top-style tab bar with underline indicator. Selected: {topTab}
                </Paragraph>
                <TabBar
                    type="top"
                    look="grey"
                    selectedItem={topTab}
                    onItemSelect={setTopTab}
                >
                    <TabBar.Item id="tab1">Overview</TabBar.Item>
                    <TabBar.Item id="tab2">Settings</TabBar.Item>
                    <TabBar.Item id="tab3">Members</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="Top Pill TabBar">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Pill-style tabs for top navigation. Selected: {topPillTab}
                </Paragraph>
                <TabBar
                    type="top-pill"
                    look="grey"
                    selectedItem={topPillTab}
                    onItemSelect={setTopPillTab}
                >
                    <TabBar.Item id="tab1">All</TabBar.Item>
                    <TabBar.Item id="tab2">Online</TabBar.Item>
                    <TabBar.Item id="tab3">Pending</TabBar.Item>
                    <TabBar.Item id="tab4">Blocked</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="Brand Look">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Brand-colored tab bar style. Selected: {brandTab}
                </Paragraph>
                <TabBar
                    type="top"
                    look="brand"
                    selectedItem={brandTab}
                    onItemSelect={setBrandTab}
                >
                    <TabBar.Item id="tab1">Home</TabBar.Item>
                    <TabBar.Item id="tab2">Explore</TabBar.Item>
                    <TabBar.Item id="tab3">Library</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="With Header and Separator">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Tab bar with header section and separator.
                </Paragraph>
                <TabBar
                    type="side"
                    look="grey"
                    selectedItem={sideTab}
                    onItemSelect={setSideTab}
                >
                    <TabBar.Header>User Settings</TabBar.Header>
                    <TabBar.Item id="tab1">My Account</TabBar.Item>
                    <TabBar.Item id="tab2">Privacy</TabBar.Item>
                    <TabBar.Separator />
                    <TabBar.Header>App Settings</TabBar.Header>
                    <TabBar.Item id="tab3">Appearance</TabBar.Item>
                    <TabBar.Item id="tab4">Notifications</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="With Disabled Items">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Some tabs can be disabled.
                </Paragraph>
                <TabBar
                    type="top"
                    look="grey"
                    selectedItem={topTab}
                    onItemSelect={setTopTab}
                >
                    <TabBar.Item id="tab1">Active</TabBar.Item>
                    <TabBar.Item id="tab2" disabled>Disabled</TabBar.Item>
                    <TabBar.Item id="tab3">Another Active</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="With Custom Colors">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Individual tabs can have custom colors. Selected: {colorTab}
                </Paragraph>
                <TabBar
                    type="top"
                    look="grey"
                    selectedItem={colorTab}
                    onItemSelect={setColorTab}
                >
                    <TabBar.Item id="tab1" color="#43b581">Green</TabBar.Item>
                    <TabBar.Item id="tab2" color="#faa61a">Yellow</TabBar.Item>
                    <TabBar.Item id="tab3" color="#f04747">Red</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="Destructive Variant">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Tab with destructive/danger styling.
                </Paragraph>
                <TabBar
                    type="side"
                    look="grey"
                    selectedItem={sideTab}
                    onItemSelect={setSideTab}
                >
                    <TabBar.Item id="tab1">Settings</TabBar.Item>
                    <TabBar.Item id="tab2">Privacy</TabBar.Item>
                    <TabBar.Item id="logout" variant="destructive">Log Out</TabBar.Item>
                </TabBar>
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>TabBar</strong> - Container component
                </Paragraph>
                <Paragraph color="text-muted">• type?: "side" | "top" | "top-pill" - Tab bar style</Paragraph>
                <Paragraph color="text-muted">• look?: "brand" | "grey" - Color scheme</Paragraph>
                <Paragraph color="text-muted">• selectedItem?: string - Currently selected tab ID</Paragraph>
                <Paragraph color="text-muted">• onItemSelect?: (id) ={">"} void - Selection callback</Paragraph>
                <Paragraph color="text-muted">• orientation?: "horizontal" | "vertical" - Layout direction</Paragraph>
                <Paragraph color="text-muted">• className?: string - Additional CSS classes</Paragraph>
                <Paragraph color="text-muted">• style?: CSSProperties - Inline styles</Paragraph>
                <Paragraph color="text-muted">• aria-label?: string - Accessibility label</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>TabBar.Item</strong> - Individual tab
                </Paragraph>
                <Paragraph color="text-muted">• id: string - Unique tab identifier (required)</Paragraph>
                <Paragraph color="text-muted">• disabled?: boolean - Disable the tab</Paragraph>
                <Paragraph color="text-muted">• color?: string - Custom tab color</Paragraph>
                <Paragraph color="text-muted">• variant?: "destructive" - Danger styling</Paragraph>
                <Paragraph color="text-muted">• disableItemStyles?: boolean - Remove default styles</Paragraph>
                <Paragraph color="text-muted">• onClick?: MouseEventHandler - Custom click handler</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>TabBar.Header</strong> - Section header
                </Paragraph>
                <Paragraph color="text-muted">• children: ReactNode - Header text</Paragraph>
                <Paragraph color="text-muted">• onClick?: MouseEventHandler - Click handler</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>TabBar.Separator</strong> - Visual divider
                </Paragraph>
                <Paragraph color="text-muted">• style?: CSSProperties - Custom styles</Paragraph>
            </SectionWrapper>
        </div>
    );
}

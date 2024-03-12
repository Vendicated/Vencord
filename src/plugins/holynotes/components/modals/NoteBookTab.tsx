/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByCode, findByProps } from "@webpack";
import { Button, Menu, Popout, React, TabBar } from "@webpack/common";

import { SvgOverFlowIcon } from "../icons/overFlowIcon";

export function NoteBookTabs({ tabs, selectedTabId, onSelectTab }) {
    const tabBarRef = React.useRef<HTMLDivElement>(null);
    const widthRef = React.useRef<number>(0);
    const tabWidthMapRef = React.useRef(new Map());
    const [overflowedTabs, setOverflowedTabs] = React.useState([]);
    const { tabBar } = findByProps("tabBar");
    const { forwardRef } = findByProps("forwardRef");

    const calculateOverflowedTabs = React.useCallback(() => {
        if (tabBarRef.current == null) return;
        const overflowed = [];
        let totalWidth = tabBarRef.current.getBoundingClientRect().width;

        if (totalWidth !== widthRef.current) {
            for (const tab of Object.keys(tabs)) {
                if (tab !== selectedTabId) {
                    const tabWidth = tabWidthMapRef.current.get(tab)?.width || 0;
                    totalWidth -= tabWidth;
                    if (totalWidth < 0) overflowed.push(tab);
                }
            }
            setOverflowedTabs(overflowed);
            widthRef.current = totalWidth;
        }
    }, [tabs, selectedTabId]);


    React.useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            calculateOverflowedTabs();
        });

        if (tabBarRef.current) resizeObserver.observe(tabBarRef.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [calculateOverflowedTabs]);

    const renderOverflowMenu = React.useCallback(({ closePopout }) => {
        return (
            <Menu.Menu
                navId="notebook-tabs"
                aria-label="Notebook Tabs"
                variant="fixed"
                onClose={closePopout}
                onSelect={closePopout}
            >
                {Object.keys(tabs).map(tab => {
                    if (overflowedTabs.includes(tab) && selectedTabId !== tab) {
                        return (
                            <Menu.MenuItem
                                id={tab}
                                label={tab}
                                action={() => onSelectTab(tab)}
                            />
                        );
                    }
                    return null;
                }
                )}

            </Menu.Menu>
        );
    }, [tabs, selectedTabId, onSelectTab, overflowedTabs]);

    return (
        <div
            className={classes(tabBar)}
            ref={tabBarRef}
        >
            <TabBar
                type="top"
                look="brand"
                className={classes("vc-notebook-tabbar-bar", "vc-notebook-tabbar")}
            >
                {
                    Object.keys(tabs).map(tab => {
                        if (!overflowedTabs.includes(tab)) {
                            return (
                                <forwardRef
                                    id={tab}
                                    selected={selectedTabId === tab}
                                    ref={ref => {
                                        const width = ref?.getBoundingClientRect().width || 0;
                                        tabWidthMapRef.current.set(tab, { node: ref, width });

                                    }}
                                    onClick={selectedTabId !== tab ? () => onSelectTab(tab) : undefined}
                                >
                                    <TabBar.Item key={tab} id={tab} className={classes("vc-notebook-tabbar-bar-item", "vc-notebook-tabbar-item")}>
                                        {tab}
                                    </TabBar.Item>
                                </forwardRef>
                            );
                        }
                    })
                }
                {overflowedTabs.length > 0 && (
                    <Popout
                        renderPopout={renderOverflowMenu}
                        position="bottom"
                        align="right"
                        spacing={0}
                    >
                        {() => (
                            <Button
                                className={"vc-notebook-overflow-chevron"}
                                size={Button.Sizes.ICON}
                                look={Button.Looks.BLANK}
                            >
                                <SvgOverFlowIcon />
                            </Button>
                        )
                        }

                    </Popout>
                )}
            </TabBar>
        </div>
    );
}

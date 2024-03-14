/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByProps } from "@webpack";
import { Button, Clickable, Menu, Popout, React, TabBar } from "@webpack/common";

import { SvgOverFlowIcon } from "../icons/overFlowIcon";



export function NoteBookTabs({ tabs, selectedTabId, onSelectTab }) {
    const tabBarRef = React.useRef<HTMLDivElement>(null);
    const widthRef = React.useRef<number>(0);
    const tabWidthMapRef = React.useRef(new Map());
    const [overflowedTabs, setOverflowedTabs] = React.useState([]);
    const resizeObserverRef = React.useRef(null);
    const [show, setShow] = React.useState(false);

    const { isNotNullish } = findByProps("isNotNullish");


    const handleResize = React.useCallback(() => {
        if (!tabBarRef.current) return;
        const overflowed = [];

        const totalWidth = tabBarRef.current.getBoundingClientRect().width;
        if (totalWidth !== widthRef.current) {
            for (const tab of tabs) {
                if (tab !== selectedTabId) {
                    const prevTabWidth = totalWidth?.current?.get(selectedTabId)?.width ?? 0;
                    const newWidth = totalWidth - (prevTabWidth || 0);
                    console.log(newWidth)
                    if (newWidth > 0) overflowed.push(tab);
                }
            }

            setOverflowedTabs(overflowed);
        }
    }, [tabs, selectedTabId]);


    React.useEffect(() => {
        resizeObserverRef.current = new ResizeObserver(handleResize);

        if (tabBarRef.current) resizeObserverRef.current.observe(tabBarRef.current);
        return () => {
            if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        };
    }, [handleResize]);

    const TabItem = React.forwardRef(function ({ id, selected, onClick, children }, ref) {
        return (
            <Clickable
                className={classes("vc-notebook-tabbar-item", selected ? "vc-notebook-selected" : "")}
                data-tab-id={id}
                innerRef={ref}
                onClick={onClick}
            >
                {children}
            </Clickable>
        );
    });

    const renderOverflowMenu = React.useCallback((closePopout: () => void) => {
        console.log("renderOverflowMenu")
        return (
            <Menu.Menu
                navId="notebook-tabs"
                aria-label="Notebook Tabs"
                variant="fixed"
                onClose={closePopout}
                onSelect={closePopout}
            >
                {tabs.map(tab => {
                    return overflowedTabs.includes(tab) && selectedTabId !== tab ? (
                        <Menu.MenuItem
                            id={tab}
                            label={tab}
                            action={() => onSelectTab(tab)}
                        />
                    ) : null;
                }).filter(isNotNullish)}

            </Menu.Menu>
        );
    }, [tabs, selectedTabId, onSelectTab, overflowedTabs]);

    return (
        <div
            className={classes("vc-notebook-tabbar")}
            ref={tabBarRef}
        >

            {tabs.map(tab => {
                if (!overflowedTabs.includes(tab)) {
                    return (
                        <TabItem
                            id={tab}
                            selected={selectedTabId === tab}
                            ref={el => {
                                const width = tabWidthMapRef.current.get(tab)?.width ?? 0;
                                tabWidthMapRef.current.set(tab, {
                                    node: el,
                                    width: el ? el.getBoundingClientRect().width : width
                                });
                            }}
                            onClick={selectedTabId !== tab ? () => onSelectTab(tab) : undefined}
                        >
                            {tab}
                        </TabItem>
                    );
                }
                return null;
            }).filter(isNotNullish)
            }
            {overflowedTabs.length > 0 && (
                <Popout
                    shouldShow={show}
                    onRequestClose={() => setShow(false)}
                    renderPopout={() => renderOverflowMenu(() => setShow(false))}
                    position="bottom"
                    align="right"
                    spacing={0}
                >
                    {() => (
                        <Button
                            className={"vc-notebook-overflow-chevron"}
                            size={Button.Sizes.ICON}
                            look={Button.Looks.BLANK}
                            onClick={() => setShow(v => !v)}
                        >
                            <SvgOverFlowIcon />
                        </Button>
                    )
                    }

                </Popout>

            )}
        </div>
    );
}

export function CreateTabBar({ tabs, firstSelectedTab, onChangeTab }) {
    const [selectedTab, setSelectedTab] = React.useState(firstSelectedTab);

    const tabKeys = Object.keys(tabs);
    const mainTabIndex = tabKeys.indexOf("Main");
    if (mainTabIndex !== -1 && mainTabIndex !== 0) {
        tabKeys.splice(mainTabIndex, 1);
        tabKeys.unshift("Main");
    }

    const renderSelectedTab = tabKeys.find(tab => tab === selectedTab);

    return (
        <NoteBookTabs
            tabs={tabKeys}
            selectedTabId={selectedTab}
            onSelectTab={(tab) => {
                setSelectedTab(tab);
                if (onChangeTab) onChangeTab(tab);
            }} />
    );
}

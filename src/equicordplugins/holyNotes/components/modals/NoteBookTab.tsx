/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/misc";
import { findByCode } from "@webpack";
import { Button, Clickable, Menu, Popout, React } from "@webpack/common";

import { SvgOverFlowIcon } from "../icons/overFlowIcon";



export function NoteBookTabs({ tabs, selectedTabId, onSelectTab }: { tabs: string[], selectedTabId: string, onSelectTab: (tab: string) => void; }) {
    const tabBarRef = React.useRef<HTMLDivElement>(null);
    const widthRef = React.useRef<number>(0);
    const tabWidthMapRef = React.useRef(new Map());
    const [overflowedTabs, setOverflowedTabs] = React.useState<string[]>([]);
    const resizeObserverRef = React.useRef<ResizeObserver | null>(null);
    const [show, setShow] = React.useState(false);

    function isNotNullish(value) {
        return value !== null && value !== undefined;
    }

    const { overflowIcon } = findByCode("overflowIcon");

    const handleResize = React.useCallback(() => {
        if (!tabBarRef.current) return;
        const overflowed = [] as string[];

        const totalWidth = tabBarRef.current.clientWidth;
        if (totalWidth !== widthRef.current) {

            // Thanks to daveyy1 for the help with this
            let width = 0;
            for (let i = 0; i < tabs.length; i++) {
                const tab = tabs[i];
                const tabRef = tabWidthMapRef.current.get(tab);

                if (!tabRef) continue;
                width += tabRef.width;

                if (width > totalWidth) {
                    overflowed.push(tab);
                }

            }

            setOverflowedTabs(overflowed);
        }
    }, [tabs, selectedTabId]);


    React.useEffect(() => {
        handleResize();

        resizeObserverRef.current = new ResizeObserver(handleResize);

        if (tabBarRef.current) resizeObserverRef.current.observe(tabBarRef.current);
        return () => {
            if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
        };
    }, [handleResize]);

    const TabItem = React.forwardRef(function ({ id, selected, onClick, children }: { id: string, selected: boolean, onClick: () => void, children: React.ReactNode; }, ref) {
        return (
            <Clickable
                className={classes("vc-notebook-tabbar-item", selected ? "vc-notebook-selected" : "")}
                data-tab-id={id}
                // @ts-expect-error
                innerRef={ref}
                onClick={onClick}
            >
                {children}
            </Clickable>
        );
    });

    const renderOverflowMenu = React.useCallback((closePopout: () => void) => {
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
                            key={tab}
                            id={tab}
                            selected={selectedTabId === tab}
                            ref={(el: HTMLElement | null) => {
                                const width = tabWidthMapRef.current.get(tab)?.width ?? 0;
                                tabWidthMapRef.current.set(tab, {
                                    node: el,
                                    width: el ? el.getBoundingClientRect().width : width
                                });
                            }}
                            onClick={selectedTabId !== tab ? () => onSelectTab(tab) : () => { }}
                        >
                            {tab}
                        </TabItem>
                    );
                }
                return null;
            }).filter(isNotNullish)}
            {overflowedTabs.length > 0 && (
                <Popout
                    shouldShow={show}
                    onRequestClose={() => setShow(false)}
                    renderPopout={() => renderOverflowMenu(() => setShow(false))}
                    position="bottom"
                    align="right"
                    spacing={0}
                >
                    {props => (
                        <Button
                            {...props}
                            className={"vc-notebook-overflow-chevron"}
                            size={Button.Sizes.ICON}
                            look={Button.Looks.BLANK}
                            onClick={() => setShow(v => !v)}
                        >
                            <SvgOverFlowIcon className={classes(overflowIcon)} width={16} height={16} />
                        </Button>
                    )}
                </Popout>

            )}
        </div >
    );
}

export function CreateTabBar({ tabs, firstSelectedTab, onChangeTab }) {
    const tabKeys = Object.keys(tabs);
    const mainTabIndex = tabKeys.indexOf("Main");
    if (mainTabIndex !== -1 && mainTabIndex !== 0) {
        tabKeys.splice(mainTabIndex, 1);
        tabKeys.unshift("Main");
    }

    const [selectedTab, setSelectedTab] = React.useState(
        firstSelectedTab || (tabKeys.length > 0 ? tabKeys[0] : null)
    );



    const renderSelectedTab = React.useCallback(() => {
        const selectedTabId = tabKeys.find(tab => tab === selectedTab);
        return selectedTabId;
    }, [tabs, selectedTab]);

    return {
        TabBar: <NoteBookTabs
            tabs={tabKeys}
            selectedTabId={selectedTab}
            onSelectTab={tab => {
                setSelectedTab(tab);
                if (onChangeTab) onChangeTab(tab);
            }} />,
        renderSelectedTab,
        selectedTab
    };
}

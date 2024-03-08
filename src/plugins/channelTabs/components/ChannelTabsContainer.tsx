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

import { classNameFactory } from "@api/Styles";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, ContextMenuApi, Flex, FluxDispatcher, Forms, useCallback, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { BasicChannelTabsProps, ChannelTabsProps, closeTab, createTab, handleChannelSwitch, isTabSelected, moveToTab, openedTabs, openStartupTabs, saveTabs, settings, setUpdaterFunction } from "../util";
import BookmarkContainer from "./BookmarkContainer";
import ChannelTab, { PreviewTab } from "./ChannelTab";
import { BasicContextMenu, TabContextMenu } from "./ContextMenus";

type TabSet = Record<string, ChannelTabsProps[]>;

const { PlusSmallIcon } = findByPropsLazy("PlusSmallIcon");
const XIcon = findComponentByCodeLazy("M18.4 4L12 10.4L5.6 4L4 5.6L10.4");

const cl = classNameFactory("vc-channeltabs-");

export default function ChannelsTabsContainer(props: BasicChannelTabsProps) {
    const [userId, setUserId] = useState("");
    const { showBookmarkBar } = settings.use(["showBookmarkBar"]);

    const _update = useForceUpdater();
    const update = useCallback((save = true) => {
        _update();
        if (save) saveTabs(userId);
    }, [userId]);

    useEffect(() => {
        // for some reason, the app directory is it's own page instead of a layer, so when it's opened
        // everything behind it is destroyed, including our container. this workaround is required
        // to properly add the container back without reinitializing everything
        if ((Vencord.Plugins.plugins.ChannelTabs as any).appDirectoryClosed) {
            setUserId(UserStore.getCurrentUser().id);
            update(false);
        }
    }, []);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setUpdaterFunction(update);
        const onLogin = () => {
            const { id } = UserStore.getCurrentUser();
            if (id === userId && openedTabs.length) return;
            setUserId(id);

            openStartupTabs({ ...props, userId: id }, setUserId);
        };

        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        return () => {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        };
    }, []);

    useEffect(() => {
        (Vencord.Plugins.plugins.ChannelTabs as any).containerHeight = ref.current?.clientHeight;
    }, [userId, showBookmarkBar]);

    if (!userId) return null;
    handleChannelSwitch(props);
    saveTabs(userId);

    return <div
        className={cl("container")}
        ref={ref}
        onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <BasicContextMenu />)}
    >
        <div className={cl("tab-container")}>
            {openedTabs.map((tab, i) => <div
                className={cl("tab", { "tab-compact": tab.compact, "tab-selected": isTabSelected(tab.id) })}
                key={i}
                onAuxClick={e => {
                    if (e.button === 1 /* middle click */)
                        closeTab(tab.id);
                }}
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <TabContextMenu tab={tab} />)}
            >
                <button
                    className={cl("button", "channel-info")}
                    onClick={() => moveToTab(tab.id)}
                >
                    <ChannelTab {...tab} index={i} />
                </button>

                {openedTabs.length > 1 && (tab.compact ? isTabSelected(tab.id) : true) && <button
                    className={cl("button", "close-button", { "close-button-compact": tab.compact, "hoverable": !tab.compact })}
                    onClick={() => closeTab(tab.id)}
                >
                    <XIcon height={16} width={16} />
                </button>}
            </div>)
            }

            <button
                onClick={() => createTab(props, true)}
                className={cl("button", "new-button", "hoverable")}
            >
                <PlusSmallIcon height={20} width={20} />
            </button>
        </div >
        {showBookmarkBar && <>
            <div className={cl("separator")} />
            <BookmarkContainer {...props} userId={userId} />
        </>}
    </div>;
}

export function ChannelTabsPreview(p) {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) return <Forms.FormText>there's no logged in account?????</Forms.FormText>;

    const { setValue }: { setValue: (v: TabSet) => void; } = p;
    const { tabSet }: { tabSet: TabSet; } = settings.use(["tabSet"]);

    const placeholder = [{ guildId: "@me", channelId: undefined as any }];
    const [currentTabs, setCurrentTabs] = useState(tabSet?.[id] ?? placeholder);

    return <>
        <Forms.FormTitle>Startup tabs</Forms.FormTitle>
        <Flex flexDirection="row" style={{ gap: "2px" }}>
            {currentTabs.map(t => <>
                <PreviewTab {...t} />
            </>)}
        </Flex>
        <Flex flexDirection="row-reverse">
            <Button
                onClick={() => {
                    setCurrentTabs([...openedTabs]);
                    setValue({ ...tabSet, [id]: [...openedTabs] });
                }}
            >Set to currently open tabs</Button>
        </Flex>
    </>;
}

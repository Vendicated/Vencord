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

import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, React, SelectedChannelStore, SelectedGuildStore, useCallback, useEffect, useRef, UserStore, useState, useStateFromStores } from "@webpack/common";

import { ChannelTabsUtils } from "../util";
import ChannelTab from "./ChannelTab";
import { ChannelPickerContextMenu, TabContextMenu } from "./ContextMenus";

const {
    closeTab, createTab, handleChannelSwitch, isTabSelected,
    moveToTab, saveTabs, openStartupTabs, setUpdaterFunction
} = ChannelTabsUtils;

const { PlusSmallIcon } = findByPropsLazy("PlusSmallIcon");
const XIcon = findComponentByCodeLazy("M18.4 4L12 10.4L5.6 4L4 5.6L10.4");

export const cl = (name: string) => `vc-channeltabs-${name}`;
export const clab = (name: string) => classes(cl("button"), cl("action-button"), cl(`${name}-button`), cl("hoverable"));

export default function ChannelsTabsContainer() {
    const props = useStateFromStores([SelectedChannelStore, SelectedGuildStore], () => {
        return {
            channelId: SelectedChannelStore.getChannelId(),
            guildId: SelectedGuildStore.getGuildId() || "@me",
            messageId: location.pathname.split("/")[4] // fix later??????????
        };
    });
    const { openTabs } = ChannelTabsUtils;
    const [userId, setUserId] = useState("");

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
    const tabRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setUpdaterFunction(update);
        const onLogin = () => {
            const { id } = UserStore.getCurrentUser() || {};
            if (!id || (id === userId && openTabs.length)) return;
            setUserId(id);

            openStartupTabs({ ...props, userId: id }, setUserId);
        };
        // onLogin();

        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        return () => {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        };
    }, []);

    if (!userId) return null;
    handleChannelSwitch(props);
    saveTabs(userId);

    return <div
        className={cl("tab-container")}
        ref={ref}
    >
        <div
            className={cl("scroller")}
            onWheel={e => {
                if (e.deltaY !== 0 && !e.shiftKey) {
                    // e.preventDefault();
                    const modifier = e.deltaY < 0 ? -1 : 1;
                    let index = ChannelTabsUtils.openTabs.findIndex(c => c.id === ChannelTabsUtils.getCurrentTabId()) + modifier;
                    if (index >= ChannelTabsUtils.openTabs.length) index = 0;
                    if (index < 0) index = ChannelTabsUtils.openTabs.length - 1;
                    ChannelTabsUtils.moveToTab(ChannelTabsUtils.openTabs[index].id);
                    // tabRef.current?.scrollIntoView({
                    //     inline: modifier > 0 ? "start" : "end"
                    // });
                }
            }}
        >
            {openTabs.map((tab, i) => <button
                className={classes(cl("button"), cl("tab"), tab.compact && cl("tab-compact"), isTabSelected(tab.id) && cl("tab-selected"))}
                key={i}
                onClick={() => moveToTab(tab.id)}
                onAuxClick={e => {
                    if (e.button === 1 /* middle click */) {
                        closeTab(tab.id);
                        e.preventDefault();
                    }
                }}
                onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <TabContextMenu tab={tab} />)}
                ref={isTabSelected(tab.id) ? tabRef : undefined}
            >
                <div
                    className={classes(cl("channel-info"))}
                >
                    <ChannelTab {...tab} index={i} />

                    {openTabs.length > 1 && (tab.compact ? isTabSelected(tab.id) : true) && <button
                        className={classes(cl("button"), cl("close-button"), tab.compact ? cl("close-button-compact") : cl("hoverable"))}
                        onClick={() => closeTab(tab.id)}
                    >
                        <XIcon height={16} width={16} />
                    </button>}
                </div>
            </button>)}
        </div>
        <button
            onClick={() => createTab(props, true)}
            className={clab("new")}
            onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <ChannelPickerContextMenu />)}
        >
            <PlusSmallIcon height={20} width={20} />
        </button>
    </div>;
}

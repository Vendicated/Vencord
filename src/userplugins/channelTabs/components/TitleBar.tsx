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
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { ContextMenuApi, FluxDispatcher, NavigationRouter, React, useEffect, useRef, UserStore, useState } from "@webpack/common";

import { channelTabsSettings as settings, ChannelTabsUtils } from "../util";
import BookmarkContainer from "./BookmarkContainer";
import ChannelsTabsContainer from "./ChannelTabsContainer";
import { BasicContextMenu } from "./ContextMenus";
import QuickSwitcherButton from "./QuickSwitcherButton";
import TotalMentionsBadge from "./TotalMentionsBadge";
import WindowButtons from "./WindowButtons";

const { setTitleBarUpdaterFunction } = ChannelTabsUtils;

const { ClydeIcon } = findByPropsLazy("ClydeIcon");
const DefaultRouteStore = findStoreLazy("DefaultRouteStore");

export const cl = (name: string) => `vc-channeltabs-${name}`;
export const clab = (name: string) => classes(cl("button"), cl("action-button"), cl(`${name}-button`), cl("hoverable"));

export default function TitleBar() {
    const [userId, setUserId] = useState("");
    const [height, setHeight] = useState(0);
    const {
        showBookmarkBar,
        showHomeButton,
        tabStyle,
        compactWhenMaximized
    } = settings.use([
        "showBookmarkBar",
        "showHomeButton",
        "tabStyle",
        "compactWhenMaximized"
    ]);

    const update = useForceUpdater();

    useEffect(() => {
        // for some reason, the app directory is it's own page instead of a layer, so when it's opened
        // everything behind it is destroyed, including our container. this workaround is required
        // to properly add the container back without reinitializing everything
        if ((Vencord.Plugins.plugins.ChannelTabs as any).appDirectoryClosed) {
            setUserId(UserStore.getCurrentUser().id);
            update();
        }
    }, []);

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTitleBarUpdaterFunction(update);
        const onLogin = () => {
            update();
            const { id } = UserStore.getCurrentUser() || {};
            if (!id || (id === userId)) return;
            setUserId(id);
        };
        onLogin();

        FluxDispatcher.subscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        return () => {
            FluxDispatcher.unsubscribe("CONNECTION_OPEN_SUPPLEMENTAL", onLogin);
        };
    }, []);

    useEffect(() => {
        (Vencord.Plugins.plugins.ChannelTabs as any).containerHeight = ref.current?.clientHeight;
        setHeight(ref.current?.clientHeight || 0);
    }, [userId, showBookmarkBar]);

    const maximizeSupported = IS_VESKTOP ? "isMaximized" in VesktopNative.win : false;
    const [isMaximized, setMaximized] = useState(maximizeSupported ? VesktopNative.win.isMaximized() : false);
    if (maximizeSupported) {
        useEffect(() => {
            VesktopNative.win.onMaximized(setMaximized);
            return () => {
                VesktopNative.win.offMaximized(setMaximized);
            };
        }, []);
    }

    return <div
        className={cl("container")}
        ref={ref}
        onContextMenu={e => ContextMenuApi.openContextMenu(e, () => <BasicContextMenu />)}
    >
        <style id={cl("titlebar-height-style")}>
            {`
            :root {
                /* This is generated at runtime. It is recommended to avoid overriding any of this */
                --vc-channeltabs-titlebar-height-auto: ${height}px;
                --vc-channeltabs-titlebar-height: var(--vc-channeltabs-titlebar-height-auto);
            }
            `}
        </style>
        <div className={classes(cl("titlebar"), cl(`tab-style-${tabStyle}`), ...[cl("maximized")].filter(() => isMaximized && compactWhenMaximized))}>
            {showHomeButton && <>
                <button
                    onClick={() => NavigationRouter.transitionTo(DefaultRouteStore.defaultRoute)}
                    className={clab("home")}
                >
                    <ClydeIcon height={20} width={20} color="currentColor" />
                </button>
                {userId && <TotalMentionsBadge />}
            </>}
            <ChannelsTabsContainer />
            <div className={classes(cl("spacer"))} />
            {userId && <QuickSwitcherButton />}
            {IS_VESKTOP && <WindowButtons />}
        </div >
        {(showBookmarkBar && userId) && <>
            <div className={cl("separator")} />
            <BookmarkContainer userId={userId} />
        </>}
    </div>;
}


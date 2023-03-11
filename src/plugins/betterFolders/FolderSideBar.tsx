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

import { Settings } from "@api/settings";
import { findByPropsLazy, findLazy } from "@webpack";
import { React, useStateFromStores } from "@webpack/common";

const classes = findByPropsLazy("sidebar", "guilds");
const i18n = findLazy(m => m.Messages?.["en-US"]);

const Animations = findByPropsLazy("a", "animated", "useTransition");
const FullscreenStore = findByPropsLazy("isFullscreenInContext");
const ExpandedFolderStore = findByPropsLazy("getExpandedFolders");

const Guilds = props => {
    // @ts-expect-error
    const res = Vencord.Plugins.plugins.BetterFolders.Guilds(props);
    const scrollerProps = res.props.children?.props?.children?.[1]?.props;
    if (scrollerProps?.children) {
        const servers = scrollerProps.children.find(c => c?.props?.["aria-label"] === i18n.Messages.SERVERS);
        if (servers) scrollerProps.children = servers;
    }
    return res;
};

export default () => {
    const expandedFolders = useStateFromStores([ExpandedFolderStore], () => ExpandedFolderStore.getExpandedFolders());
    const fullscreen = useStateFromStores([FullscreenStore], () => FullscreenStore.isFullscreenInContext());

    const guilds = document.querySelector(`.${classes.guilds}`);
    const Sidebar = <Guilds className={classes.guilds} bfGuildFolders={Array.from(expandedFolders)} />;
    const visible = !!expandedFolders.size;
    const className = `vc-bf-folder-sidebar${fullscreen ? " vc-bf-fullscreen" : ""}`;
    if (!guilds || !Settings.plugins.BetterFolders.sidebarAnim)
        return visible ? <div className={className}>{Sidebar}</div> : null;
    const SidebarWidth = guilds.getBoundingClientRect().width;
    return <Animations.Transition
        items={visible}
        from={{ width: 0 }}
        enter={{ width: SidebarWidth }}
        leave={{ width: 0 }}
        config={{ duration: 200 }}
    >{(style, show) => show &&
        <Animations.animated.div style={style} className={className}>
            {Sidebar}
        </Animations.animated.div>}
    </Animations.Transition>;
};

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
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { i18n, React, useStateFromStores } from "@webpack/common";

const cl = classNameFactory("vc-bf-");
const classes = findByPropsLazy("sidebar", "guilds");

const Animations = findByPropsLazy("a", "animated", "useTransition");
const ChannelRTCStore = findStoreLazy("ChannelRTCStore");
const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");

function Guilds(props: {
    className: string;
    bfGuildFolders: any[];
}) {
    // @ts-expect-error
    const res = Vencord.Plugins.plugins.BetterFolders.Guilds(props);

    const scrollerProps = res.props.children?.props?.children?.[1]?.props;
    if (scrollerProps?.children) {
        const servers = scrollerProps.children.find(c => c?.props?.["aria-label"] === i18n.Messages.SERVERS);
        if (servers) scrollerProps.children = servers;
    }

    return res;
}

export default ErrorBoundary.wrap(() => {
    const expandedFolders = useStateFromStores([ExpandedGuildFolderStore], () => ExpandedGuildFolderStore.getExpandedFolders());
    const fullscreen = useStateFromStores([ChannelRTCStore], () => ChannelRTCStore.isFullscreenInContext());

    const guilds = document.querySelector(`.${classes.guilds}`);

    const visible = !!expandedFolders.size;
    const className = cl("folder-sidebar", { fullscreen });

    const Sidebar = (
        <Guilds
            className={classes.guilds}
            bfGuildFolders={Array.from(expandedFolders)}
        />
    );

    if (!guilds || !Settings.plugins.BetterFolders.sidebarAnim)
        return visible
            ? <div className={className}>{Sidebar}</div>
            : null;

    return (
        <Animations.Transition
            items={visible}
            from={{ width: 0 }}
            enter={{ width: guilds.getBoundingClientRect().width }}
            leave={{ width: 0 }}
            config={{ duration: 200 }}
        >
            {(style, show) => show && (
                <Animations.animated.div style={style} className={className}>
                    {Sidebar}
                </Animations.animated.div>
            )}
        </Animations.Transition>
    );
}, { noop: true });

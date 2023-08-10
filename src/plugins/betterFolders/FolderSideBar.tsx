/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
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

    // TODO: Make this better
    const scrollerProps = res.props.children?.props?.children?.props?.children?.[1]?.props;
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

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { makeRange } from "@components/PluginSettings/components";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

type PreloadUserProps = React.Component & {
    props: {
        preload: () => Promise<void>,
        isLoading: boolean
    }
};

const settings = definePluginSettings({
    delay: {
        type: OptionType.SLIDER,
        markers: makeRange(0, 150, 10),
        description: "The delay, in ms, to wait after hovering before preloading the users profile. Set to 0 to preload instantly",
        default: 50,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "PreloadUserProfiles",
    description: "Preloads user profiles after hovering for a set duration.",
    authors: [Devs.Void, Devs.sadan],

    settings,

    patches: [
        {
            find: "Popout cannot find DOM node",
            replacement: {
                match: /(?=onMouseDown:this.handlePreload)/,
                replace: "onMouseOver:$self.preloadUser.bind(null,this),"
            }
        }
    ],


    preloadUser(c: PreloadUserProps, event: React.MouseEvent) {
        if (!c.props.preload) return;
        if (c.props.isLoading) return;
        const { delay } = settings.store;
        if (delay === 0) {
            preload();
        } else {
            setTimeout(() => {
                if((event.target as Partial<Element> | null)?.matches?.(":hover")) {
                    preload();
                }
            }, delay);
        }
        function preload() {
            if(c.props.isLoading) return;
            c.setState({
                isLoading: true,
            });
            c.props.preload().then(() => {
                c.setState({
                    isLoading: false
                });
            });
        }
    }
});

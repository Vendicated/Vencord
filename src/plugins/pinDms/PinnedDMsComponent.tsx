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

import ErrorBoundary from "@components/ErrorBoundary";
import { LazyComponent } from "@utils/misc";
import { filters, find, findByCode, findByPropsLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, SelectedChannelStore, useEffect, useState } from "@webpack/common";

import { usePinnedDms } from "./settings";

const classes = findByPropsLazy("privateChannelsHeaderContainer");
const DMComponent = LazyComponent(() => findByCode("getRecipientId()", "isFavorite"));
const dmGroupFilter = filters.byCode("isFavorite:", "channelName:");
const DMGroupComponent = LazyComponent(() => find(m => dmGroupFilter(m) && !filters.byCode("getRecipientId")(m)));

export default ErrorBoundary.wrap(function PinnedDmsComponent() {
    const pins = usePinnedDms();
    const [selectedChannelId, setSelectedChannelId] = useState(SelectedChannelStore.getChannelId());

    useEffect(() => {
        const cb = ({ channelId }) => setSelectedChannelId(channelId);

        FluxDispatcher.subscribe("CHANNEL_SELECT", cb);

        return () => FluxDispatcher.unsubscribe("CHANNEL_SELECT", cb);
    }, []);

    if (!pins.size) return null;

    return (
        <>
            {/* Have to hardcode this class because it is exported by a module that only contains container
             (and there's dozens of those, so it's impossible to find) */}
            <h2 className={`${classes.privateChannelsHeaderContainer} container-q97qHp`}>Pinned DMs</h2>

            {Array.from(pins, p => {
                const channel = ChannelStore.getChannel(p);
                if (!channel) return null;

                const Component = channel.isMultiUserDM() ? DMGroupComponent : DMComponent;

                return (
                    <Component
                        key={channel.id}
                        channel={channel}
                        selected={channel.id === selectedChannelId}
                        inPins={true}
                    />
                );
            })}
        </>
    );
});

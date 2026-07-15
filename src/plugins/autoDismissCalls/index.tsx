import { addContextMenuPatch, findGroupChildrenByChildId, removeContextMenuPatch } from "@api/ContextMenu";
import { Devs } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, FluxDispatcher, Menu } from "@webpack/common";
import * as DataStore from "@api/DataStore";
import { findByProps } from "@webpack";
import { definePluginSettings } from "@api/Settings";
import css from "./style.css";

let delaysData = {};

const formatDelay = (ms) => Number(ms) < 1000 ? `${Number(ms)}ms` : `${Number(ms) / 1000}s`;

const settings = definePluginSettings({
    configuredConversations: {
        type: OptionType.COMPONENT,
        component: () => {
            return (
                <div className="adc-table">
                    <div className="adc-row adc-header">
                        <div>Conversation</div>
                        <div>Delay (ms)</div>
                    </div>

                    {Object.entries(delaysData).map(([channelId, delay]) => {
                            const channel = ChannelStore.getChannel(channelId);

                            const name =
                                channel?.name ||
                                channel?.rawRecipients
                                    ?.map(r => r.display_name ?? r.global_name ?? r.username)
                                    .join(", ") ||
                                `Unknown (${channelId})`;

                            return (
                                <div key={channelId} className="adc-row">
                                    <div>{name}</div>
                                    <div>
                                        <input
                                            type="number"
                                            defaultValue={String(delay)}
                                            min={0}
                                            onFocus={e => {
                                                e.target.select();
                                            }}
                                            onBlur={e => {
                                                const delay = Math.max(0, Number(e.target.value));
                                                e.target.value = String(delay);
                                                void setDelay(channelId, delay);
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                </div>
            );
        }
    }
});

const patch = (children, props) => {
    const channel = props.channel;

    const group = findGroupChildrenByChildId("mute-channel", children) || findGroupChildrenByChildId("unmute-channel", children) || [];
    const index = group.findIndex(c => ["mute-channel", "unmute-channel"].includes(c?.props?.id));

    const autoDismissItem = (
        <Menu.MenuItem
            id="auto-dismiss"
            label={`Auto Dismiss Calls: ${delaysData[channel.id] === undefined ? "Off" : formatDelay(delaysData[channel.id])}`}
        >
            <Menu.MenuItem
                id="off"
                label="Off"
                action={() => void setDelay(channel.id, undefined)}
            />

            <Menu.MenuItem
                id="1s"
                label="After 1 second"
                action={() => void setDelay(channel.id, 1000)}
            />

            <Menu.MenuItem
                id="2s"
                label="After 2 seconds"
                action={() => void setDelay(channel.id, 2000)}
            />

            <Menu.MenuItem
                id="5s"
                label="After 5 seconds"
                action={() => void setDelay(channel.id, 5000)}
            />

            <Menu.MenuItem
                id="10s"
                label="After 10 seconds"
                action={() => void setDelay(channel.id, 10000)}
            />

            <Menu.MenuItem
                id="15s"
                label="After 15 seconds"
                action={() => void setDelay(channel.id, 15000)}
            />
        </Menu.MenuItem>
    );

    if (index !== -1) {
        group.splice(
            index + 1, 0,
            autoDismissItem
        );
    } else {
        children.push(autoDismissItem);
    }
};

export default definePlugin({
    name: "AutoDismissCalls",
    description: "Automatically dismisses incoming calls",
    authors: [Devs.commandblocks0],
    managedStyle: css,
    settings,
    
    async start() {
        delaysData = await DataStore.get("autoDismissDelays") ?? {};

        FluxDispatcher.subscribe("CALL_CREATE", onCallCreate);
        FluxDispatcher.subscribe("CHANNEL_DELETE", onChannelDelete);

        addContextMenuPatch("user-context", patch);
        addContextMenuPatch("gdm-context", patch);
    },

    stop() {
        FluxDispatcher.unsubscribe("CALL_CREATE", onCallCreate);
        FluxDispatcher.unsubscribe("CHANNEL_DELETE", onChannelDelete);

        removeContextMenuPatch("user-context", patch);
        removeContextMenuPatch("gdm-context", patch);
    }
});

function onCallCreate(call) {
    const channelId = call.channelId;
    const delay = delaysData[channelId];

    if (delay === undefined) return;

    setTimeout(() => {
        const callActions = findByProps("stopRinging")
        if (callActions) {
            callActions.stopRinging(channelId);
        }
    }, delay);
}

async function setDelay(channelId, delay) {
    delaysData[channelId] = delay;
    if (delay === undefined) delete delaysData[channelId];
    await DataStore.set("autoDismissDelays", delaysData);
}

async function onChannelDelete(event) {
    delete delaysData[event.channel.id];
    await DataStore.set("autoDismissDelays", delaysData);
}
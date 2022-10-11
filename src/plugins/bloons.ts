import definePlugin from "../utils/types";
import { Devs } from "../utils/constants";
import { filters, findByProps } from "../webpack";
import { lazyWebpack } from "../utils/misc";
import { FluxDispatcher, SelectedChannelStore } from "../webpack/common";
import { Message } from "discord-types/general";
import IpcEvents from "../utils/IpcEvents";

interface IMessageCreate {
    type: "MESSAGE_CREATE";
    optimistic: boolean;
    isPushNotification: boolean;
    channelId: string;
    message: Message;
} // guhh this plugin just c+p

export default definePlugin({
    name: "Hop on Bloons",
    description: "Makes you hop on bloons (steam only)",
    authors: [Devs.Animal],
    dependencies: ["MessageEventsAPI"],
    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", this.messageCreate);
    },

    async messageCreate(e: IMessageCreate) {
        if (e.optimistic || e.type !== "MESSAGE_CREATE") return;
        if (e.message.state === "SENDING") return;
        if (e.message.author?.bot) return;
        if (e.channelId !== SelectedChannelStore.getChannelId()) return;
        if (e.message.content && e.message.content.toLowerCase().includes("hop on bloons"))
            VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "steam://rungameid/960090");
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", this.messageCreate);
    }
});

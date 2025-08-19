import { definePluginSettings } from "@api/Settings";
import { Devs, IS_MAC } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, SelectedChannelStore } from "@webpack/common";

const settings = definePluginSettings({
    keybind: {
        type: OptionType.STRING,
        description: "Keybind (shft+w, ctrl+w, cmd+w, ect)",
        default: "["
    }
});

const PrivateChannels: any = findByPropsLazy("closePrivateChannel");

function matchesBinding(e: KeyboardEvent, binding: string) {
    const tokens = binding.toLowerCase().replace(/\s+/g, "").split("+").filter(Boolean);
    const req = {
        ctrl: tokens.includes("ctrl"),
        alt: tokens.includes("alt") || tokens.includes("option"),
        shift: tokens.includes("shift"),
        meta: tokens.includes("meta") || tokens.includes("cmd")
    };
    const hasMod = tokens.includes("mod");
    const keyToken = tokens.find(t => !["ctrl","alt","option","shift","meta","cmd","mod"].includes(t));

    const keyOk = keyToken ? (e.key?.toLowerCase?.() === keyToken) : true;
    if (!keyOk) return false;

    if (hasMod) {
        if (IS_MAC ? !e.metaKey : !e.ctrlKey) return false;
    } else {
        if (e.ctrlKey !== req.ctrl) return false;
    }

    if (e.metaKey !== req.meta) return false;
    if (e.altKey !== req.alt) return false;
    if (e.shiftKey !== req.shift) return false;
    return true;
}

export default definePlugin({
    name: "CloseDMs Keybind",
    description: "Allows you to close DMs with a keybind.",
    authors: [Devs.eternal, Devs.Fusi],
    settings,

    onKey(e: KeyboardEvent) {
        if (!matchesBinding(e, settings.store.keybind)) return;
        const id = SelectedChannelStore.getChannelId();
        if (!id) return;
        const channel = ChannelStore.getChannel(id);
        if (!channel?.isPrivate?.()) return;
        e.preventDefault();
        try { PrivateChannels.closePrivateChannel(id); } catch { }
    },

    start() {
        document.addEventListener("keydown", this.onKey);
    },

    stop() {
        document.removeEventListener("keydown", this.onKey);
    }
});
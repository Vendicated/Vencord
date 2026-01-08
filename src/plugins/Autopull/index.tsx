
/*
 * AutoPull Anywhere - Vencord Plugin
 * يسحب أشخاص محددين أينما تروح
 */

import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { Menu, Toasts, UserStore, RestAPI } from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const ChannelActions = findByPropsLazy("selectVoiceChannel");

let targets = [];

function getUserVoiceChannel(userId) {
    try {
        const vs = VoiceStateStore.getAllVoiceStates();
        for (const [guildId, states] of Object.entries(vs)) {
            if (states[userId]?.channelId) return states[userId].channelId;
        }
    } catch {}
    return null;
}

async function moveMember(userId, channelId) {
    try {
        const vs = VoiceStateStore.getAllVoiceStates();
        let guildId = null;
        for (const [gId, states] of Object.entries(vs)) {
            if (states[userId]) {
                guildId = gId;
                break;
            }
        }
        if (!guildId) return;
        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: channelId }
        });
    } catch (e) {
        console.error("[AutoPullAnywhere] Move failed", e);
    }
}

function addContextMenu(children, { user }) {
    if (!user) return;
    const isTarget = targets.includes(user.id);
    children.push(
        <Menu.MenuItem
            id="pull-anywhere"
            label="سحب مع الاذن"
            action={() => {
                if (isTarget) {
                    targets = targets.filter(id => id !== user.id);
                    Toasts.show({
                        message: `تم إزالة ${user.username} من قائمة السحب`,
                        id: Toasts.genId(),
                        type: Toasts.Type.INFO
                    });
                } else {
                    targets.push(user.id);
                    Toasts.show({
                        message: `تم إضافة ${user.username} لقائمة السحب`,
                        id: Toasts.genId(),
                        type: Toasts.Type.SUCCESS
                    });
                }
            }}
            style={{ color: isTarget ? "white" : "" }}
        />
    );
}

export default definePlugin({
    name: "سحب اعضاء الروم",
    description: "يسحب الأشخاص المحددين لأي روم صوتي تدخله",
    authors:[{
        name: "rz30",
        id: 786315593963536415n
    }],
    contextMenus: {
        "user-context": addContextMenu
    },
    start() {
        this.interval = setInterval(() => {
            const me = UserStore.getCurrentUser().id;
            const myChannel = getUserVoiceChannel(me);
            if (!myChannel) return;
            for (const targetId of targets) {
                const targetChannel = getUserVoiceChannel(targetId);
                if (targetChannel !== myChannel) {
                    moveMember(targetId, myChannel);
                }
            }
        }, 3000);
    },
    stop() {
        clearInterval(this.interval);
        targets = [];
    }
});


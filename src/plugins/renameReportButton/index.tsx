import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";

function makePatch(label: string): NavContextMenuPatchCallback {
    return (children) => {
        const group = findGroupChildrenByChildId("report", children);
        if (!group) return;

        const item = group.find(c => c?.props?.id === "report");
        if (item) item.props.label = label;
    };
}

export default definePlugin({
    name: "RenameReportButton",
    description: "Renames Discord's native Report button in message, user, and guild context menus",
    authors: [],

    contextMenus: {
        "message-actions": makePatch("Inform Israel about this message."),
        "user-context":    makePatch("Inform Israel about this user."),
        "guild-context":   makePatch("Inform Israel about this guild."),
    }
});

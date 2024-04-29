import { Menu } from "@webpack/common";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { openModal } from "./createUserModal.tsx";

function init(username: string, userID: string) {
    return (
        <Menu.MenuItem
            id="edit-edit"
            label="Edit user"
            action={() => openModal(username, userID)}
        />
    );
}



const UserContext: NavContextMenuPatchCallback = (children, props) => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        let username = Vencord.Webpack.Common.UserStore.getUser(props.user.id).username;
        container.splice(idx, 0, init(username, props.user.id));
    }
};

export const contextMenus = {
    "user-context": UserContext
};

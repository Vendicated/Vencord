import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu } from "@webpack/common";

export const BLURLIST_TOGGLE_KEY = "ba-blurlist";

export const patchMessageContextMenu: (
    hasUser: (id: string) => boolean,
    onClick: (id: string) => void
) => NavContextMenuPatchCallback = (hasUser, onClick) => {
    return (children, props) => {
        const id = props?.user?.id; // Safely access user.id
        if (!id) return; // Handle cases where id is undefined

        children.push((
            <Menu.MenuItem
                id={BLURLIST_TOGGLE_KEY}
                key={BLURLIST_TOGGLE_KEY}
                label={!hasUser(id) ? "Add to Blurlist" : "Remove from Blurlist"}
                color="danger"
                action={() => onClick(id)} // Pass as a callback
            />
        ));
    };
};
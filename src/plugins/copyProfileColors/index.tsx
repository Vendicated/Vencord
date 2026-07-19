
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast, fetchUserProfile } from "@utils/discord";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { Menu, showToast, Toasts } from "@webpack/common";

function toHex(color: number) {
    return `#${color.toString(16).padStart(6, "0")}`;
}

async function copyProfileColors(user: User) {
    const profile = await fetchUserProfile(user.id);
    const colors = profile?.themeColors;

    if (!colors) {
        showToast("This user doesn't have any profile theme colors", Toasts.Type.FAILURE);
        return;
    }

    const [primary, accent] = colors;
    copyWithToast(`Primary: ${toHex(primary)}, Accent: ${toHex(accent)}`, "Profile colors copied");
}

const userContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="copy-profile-colors"
            key="copy-profile-colors"
            label="Copy Profile Colors"
            action={() => copyProfileColors(user)}
        />
    );
};

export default definePlugin({
    name: "CopyProfileColors",
    description: "Adds a right click button to the user's profile to copy their profile colors.",
    authors: [Devs.alexagian],
    tags: ["Utility", "Appearance"],

    contextMenus: {
        "user-context": userContextPatch,
        "user-profile-actions": userContextPatch,
        "user-profile-overflow-menu": userContextPatch
    }
});
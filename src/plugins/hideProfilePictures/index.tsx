import definePlugin, { OptionType } from "@utils/types";
import { Devs } from "@utils/constants";
import { Toasts, Menu } from "@webpack/common";
import { definePluginSettings } from "@api/Settings";
import { ImageIcon } from "@components/Icons";

const DEFAULT_PFP_URL = "https://cdn.discordapp.com/embed/avatars/0.png";
const PROFILE_PICTURE_HIDDEN_MSG = "Profile picture hidden.";
const PROFILE_PICTURE_UNHIDDEN_MSG = "Profile picture unhidden (reload to take effect).";
const AVATAR_IMG_CLASS = "img.avatar_c19a55";

const settings = definePluginSettings({
    hiddenUserIds: {
        type: OptionType.CUSTOM,
        default: [],
        description: "List of user IDs whose profile pictures are hidden.",
    },
});

let hiddenUsersSet = new Set<string>();
const isProfilePictureHidden = (userId: string) => hiddenUsersSet.has(userId);

const updateHiddenUserSettings = () => {
    settings.store.hiddenUserIds = Array.from(hiddenUsersSet) as never[];
};

const replaceUserProfilePictures = () => {
    document.querySelectorAll(AVATAR_IMG_CLASS).forEach((img) => {
        if (img instanceof HTMLImageElement) {
            const userId = img.src.match(/avatars\/(\d+)/)?.[1];
            if (userId && hiddenUsersSet.has(userId)) {
                img.src = DEFAULT_PFP_URL;
            }
        }
    });
};

const hideProfilePicture = (userId: string) => {
    hiddenUsersSet.add(userId);
    updateHiddenUserSettings();
    replaceUserProfilePictures();
    Toasts.show({ message: PROFILE_PICTURE_HIDDEN_MSG, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
};

const unhideProfilePicture = (userId: string) => {
    hiddenUsersSet.delete(userId);
    updateHiddenUserSettings();
    replaceUserProfilePictures();
    Toasts.show({ message: PROFILE_PICTURE_UNHIDDEN_MSG, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
};

const observeProfilePictures = () => {
    const observer = new MutationObserver((mutations) => {
        if (mutations.some((m) => m.addedNodes.length)) {
            replaceUserProfilePictures();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
};

const UserContextMenuPatch = (children: any, { user }: { user: { id: string; }; }) => {
    const isHidden = isProfilePictureHidden(user.id);

    children.push(
        <Menu.MenuItem
            id={`vc-hide-profile-${user.id}`}
            label={isHidden ? "Unhide Profile Picture" : "Hide Profile Picture"}
            action={() => (isHidden ? unhideProfilePicture(user.id) : hideProfilePicture(user.id))}
            icon={ImageIcon}
        />
    );
};


export default definePlugin({
    name: "HideProfilePictures",
    description: "Adds a right-click option to hide/unhide user profile pictures, persisted via Vencord settings.",
    authors: [Devs.J3],

    settings,

    async start() {
        hiddenUsersSet = new Set(settings.store.hiddenUserIds);
        replaceUserProfilePictures();
        observeProfilePictures();
    },

    contextMenus: {
        "user-context": UserContextMenuPatch,
    },
});
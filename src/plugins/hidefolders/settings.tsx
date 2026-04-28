/*
 * Settings لبلوقن HideFolders
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Button } from "@webpack/common";

import { addIndicator, removeIndicator } from "./indicator";
import { HiddenFoldersMenu } from "./modal";
import { HiddenFoldersStore } from "./store";

export default definePluginSettings({
    showIndicator: {
        type: OptionType.BOOLEAN,
        description: "Show menu to unhide folders at the bottom of the list",
        default: true,
        onChange: val => {
            if (val) addIndicator();
            else removeIndicator();
        },
    },
    foldersList: {
        type: OptionType.COMPONENT,
        description: "Manage hidden folders",
        component: () => <HiddenFoldersMenu />,
    },
    resetHidden: {
        type: OptionType.COMPONENT,
        description: "Remove all hidden folders from the list",
        component: () => (
            <div>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    onClick={() => HiddenFoldersStore.clearHidden()}
                >
                    Reset Hidden Folders
                </Button>
            </div>
        ),
    },
});

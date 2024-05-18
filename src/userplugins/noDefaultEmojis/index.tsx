/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch } from "@api/ContextMenu";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { findGroupChildrenByChildId } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { disableStyle,enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { OptionType } from "@utils/types";
import { Menu } from "@webpack/common";

import style from "./style.css?managed";

const settings = definePluginSettings({
    except: {
        type: OptionType.STRING,
        description: "",
        default: ""
    }
});

const expressionPickerPatch: NavContextMenuPatchCallback = (children, props: { target: HTMLElement; }) => () => {
    const { id, type, name } = props?.target?.dataset;
    if (id) return;

    if (type === "emoji") {
        children.push(buttonThingy(name));
    }

};

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {

    const { favoriteableName } = props ?? {};
    if(!favoriteableName) { return; }
    // WHY DID I DO IT THIS WAY
    const name = favoriteableName.split(":").join("");
    if (name == null) { return; }
    const group = findGroupChildrenByChildId("favorite", children) || findGroupChildrenByChildId("unfavorite", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "favorite" || c?.props?.id === "unfavorite") + 1, 0, buttonThingy(name));

};


function buttonThingy(name)
{
    return (
        <Menu.MenuItem
            id="add-emoji-autofill"
            key="add-emoji-autofill"
            label={`${(isEmojiExcepted(name)) ? "Remove From " : "Add To "} Autofill`}
            action={() => addEmojiToAutofill(name)}
        />
    );
}

function addEmojiToAutofill(name)
{
    const excepted = isEmojiExcepted(name);
    if(excepted)
    {
        // remove the emoji if its already in there
        // split up the exceptions by the seperator, filter out the emoji, then re join it.
        settings.store.except = settings.store.except.split(", ").filter(item => item !== name).join(", ");
    }
    else
    {
        // add the emoji to the exceptions
        settings.store.except = settings.store.except + (", " + name);
    }

}

function isEmojiExcepted(name)
{
    return settings.store.except.split(", ").includes(name);
}


export default definePlugin({
    name: "NoDefaultEmojis",
    description: "Stops default emojis showing in the autocomplete. (You can add exceptions)",
    authors:
    [
        Devs.Samwich
    ],
    settings,
    patches: [
        {
            find: "default.Messages.EMOJI_MATCHING",
            replacement: {
                match: /renderResults\(e\){/,
                replace: "renderResults(e){ e.results.emojis = e.results.emojis.filter(emoji => !emoji.uniqueName || Vencord.Settings.plugins.NoDefaultEmojis.except.split(',\\ ').includes(emoji.uniqueName));"
            }
        }
    ],
    contextMenus: 
    {
        "expression-picker": expressionPickerPatch,
        "message": messageContextMenuPatch
    },
    start()
    {
        enableStyle(style);
    },
    stop()
    {
        disableStyle(style);
    }
});





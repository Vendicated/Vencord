/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { EquicordDevs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, TextInput, useState } from "@webpack/common";

const WORDS_KEY = "ContentWarning_words";

let triggerWords = [""];

function safeMatchesRegex(s: string, r: string) {
    if (r === "") return false;
    try {
        return s.match(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    } catch {
        return false;
    }
}

function TriggerContainer({ child }) {
    const [visible, setVisible] = useState(false);

    if (visible) {
        return child;
    } else {
        return (<div onClick={() => setVisible(true)}>
            <div style={{
                filter: "blur(4px) brightness(70%)",
                transition: "filter 0.2s ease-in-out",
                cursor: "pointer",
            }}
                onMouseEnter={event => {
                    event.currentTarget.style.filter = "none";
                }}
                onMouseLeave={event => {
                    event.currentTarget.style.filter = "blur(4px) brightness(70%)";
                }}
            >
                {child}
            </div>
        </div>);
    }
}

function FlaggedInput({ index, forceUpdate }) {
    const [value, setValue] = useState(triggerWords[index]);

    if (value !== triggerWords[index]) {
        setValue(triggerWords[index]);
    }

    const isLast = index === triggerWords.length - 1;

    const updateValue = v => {
        triggerWords[index] = v;
        setValue(v);
        DataStore.set(WORDS_KEY, triggerWords);

        if (isLast) {
            triggerWords.push("");
            forceUpdate();
        }
    };

    const removeSelf = () => {
        if (triggerWords.length === 1) {
            return;
        }
        triggerWords = triggerWords.slice(0, index).concat(triggerWords.slice(index + 1));
        forceUpdate();
    };

    return (<Flex flexDirection="row">
        <div style={{ flexGrow: 1 }}>
            <TextInput
                placeholder="Word"
                spellCheck={false}
                value={value}
                onChange={updateValue}
            />
        </div>

        <Button
            onClick={removeSelf}
            look={Button.Looks.BLANK}
            size={Button.Sizes.ICON}
            style={{
                padding: 0,
                color: "var(--primary-400)",
                transition: "color 0.2s ease-in-out",
                opacity: isLast ? "0%" : "100%"
            }}>
            <DeleteIcon />
        </Button>
    </Flex>);
}

function FlaggedWords() {
    const forceUpdate = useForceUpdater();

    const inputs = triggerWords.map((_, idx) => {
        return (
            <FlaggedInput
                key={idx}
                index={idx}
                forceUpdate={forceUpdate}
            />
        );
    });

    return (<>
        <Forms.FormTitle tag="h4">Flagged Words</Forms.FormTitle>
        {inputs}
    </>);
}

const settings = definePluginSettings({
    flagged: {
        type: OptionType.COMPONENT,
        component: () => <FlaggedWords />,
    }
});

export default definePlugin({
    name: "ContentWarning",
    authors: [EquicordDevs.camila314],
    description: "Allows you to specify certain trigger words that will be blurred by default. Hovering on the blurred content will reveal it.",
    settings,
    patches: [
        {
            find: ".VOICE_HANGOUT_INVITE?",
            replacement: {
                match: /(?<=compact:\i}=(\i).+?)(\(0,.+\}\)\]\}\))/,
                replace: "$self.modify($1,$2)"
            }
        }
    ],

    modify(e, child) {
        if (triggerWords.some(word => safeMatchesRegex(e.message.content, word))) {
            return <TriggerContainer child={child} />;
        } else {
            return child;
        }
    },

    async start() {
        triggerWords = await DataStore.get(WORDS_KEY) ?? [""];
    }
});

/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated, camila314, and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, useState, TextInput } from "@webpack/common";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Flex } from "@components/Flex";
import { useForceUpdater } from "@utils/react";

const WORDS_KEY = "ContentWarning_words";

let triggerWords = [""];

function safeMatchesRegex(s: string, r: string) {
	if (r == "") return false;
	try {
		return s.match(new RegExp(r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
			<div style={{ filter: "blur(4px) brightness(70%)"}}>
				{child}
			</div>
		</div>);
	}
}

function FlaggedInput({ index, forceUpdate }) {
	let [value, setValue] = useState(triggerWords[index]);

	if (value != triggerWords[index]) {
		setValue(triggerWords[index]);
	}

	let isLast = index == triggerWords.length - 1;

	const updateValue = (v) => {
		triggerWords[index] = v;
		setValue(v);

		if (isLast) {
			triggerWords.push("");
			forceUpdate();
		}
	};

	const removeSelf = () => {
		if (triggerWords.length == 1) {
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
		    <DeleteIcon/>
		</Button>
	</Flex>);
}

function FlaggedWords() {
	const forceUpdate = useForceUpdater();

	let inputs = triggerWords.map((_, idx) => {
		return (
			<FlaggedInput
				index={idx}
				forceUpdate={forceUpdate}
			/>
		);
	})

	return (<>
		<Forms.FormTitle tag="h4">Flagged Words</Forms.FormTitle>
		{inputs}
	</>);
}

const settings = definePluginSettings({
	flagged: {
		type: OptionType.COMPONENT,
		component: () => <FlaggedWords/>,
	}
});

export default definePlugin({
	name: "ContentWarning",
	authors: [Devs.camila314],
	description: "Allows you to specify certain trigger words",
	settings,
	patches: [
		{
			find: ".VOICE_HANGOUT_INVITE?",
			replacement: {
				match: /(contentRef:\i}=(\i).+?)\(0,(.+]}\)]}\))/,
				replace: "$1 $self.modify($2, (0, $3)"
			}
		}
	],

	beforeSave() {
		console.log(triggerWords);
		DataStore.set(WORDS_KEY, triggerWords);
		return true;
	},

	modify(e, c) {
		if (triggerWords.some(w => safeMatchesRegex(e.message.content, w))) {
			return <TriggerContainer child={c}/>
		} else {
			return c;
		}
	},

	async start() {
		triggerWords = await DataStore.get(WORDS_KEY) ?? [""];
		console.log(triggerWords);
	}
});

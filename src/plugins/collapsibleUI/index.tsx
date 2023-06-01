/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { LazyComponent, useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { findByCode } from "@webpack";
import { useEffect, useState } from "@webpack/common";
import { Dispatch, SetStateAction } from "react";
import "./style.css";

const HeaderBarIcon = LazyComponent(() => findByCode(".HEADER_BAR_BADGE,", ".tooltip"));

let servers = true;
let setServers: Dispatch<SetStateAction<boolean>>;

const settings = definePluginSettings({
	reveal: {
		type: OptionType.BOOLEAN,
		description: "Reveal hidden sidebars",
		default: true
	}
});

function ServersIcon({ width, height, className }: { width: number, height: number, className: string; }) {
	return (
		<svg width={width} height={height} className={className} viewBox="0 0 24 24">
			<g fill={"currentColor"}>
				<circle cx="16.9804" cy="7.01942" r="4.01942"></circle>
				<circle cx="16.9804" cy="16.9805" r="4.01942"></circle>
				<circle cx="7.01942" cy="16.9805" r="4.01942"></circle>
				<rect x="3" y="3" width="8.03884" height="8.03884" rx="2"></rect>
			</g>
		</svg>
	);
}

function ToggleServersButton() {
	const update = useForceUpdater();
	return (
		<HeaderBarIcon
			tooltip={servers ? "Hide Servers" : "Show Servers"}
			icon={ServersIcon}
			selected={servers}
			onClick={() => {
				setServers(servers = !servers);
				update();
			}}
		/>
	);
}

function toolbarButtons() {
	return (
		<ToggleServersButton />
	);
}

function useServers() {
	const result = useState(servers);
	setServers = result[1];
	return result[0];
}

function useReveal(beginThreshold: number, endThreshold: number, side: "left" | "right") {
	const [revealed, setRevealed] = useState(false);
	useEffect(() => {
		const threshold = revealed ? endThreshold : beginThreshold;
		const mouseEvent = (event: MouseEvent) => setRevealed(settings.store.reveal && (side === "left" ? event.x <= threshold : event.x >= threshold));
		document.addEventListener("mousemove", mouseEvent);
		return () => document.removeEventListener("mousemove", mouseEvent);
	});
	return revealed;
}

export default definePlugin({
	name: "CollapsibleUI",
	description: "Remove or shrink parts of the UI",
	authors: [Devs.TheKodeToad],
	settings,
	patches: [
		// add buttons next to member list toggle
		{
			find: ".renderHeaderToolbar=function(){",
			replacement: {
				match: /(\i\.isArchivedThread\(\)\|\|)?(\i)\.push\(\(0,\i\.jsx\)\(\i,{channelId:\i\.id},"members"\)\);/g,
				replace: "$2.push($self.toolbarButtons());$&"
			}
		},
		// add buttons next to user profile toggle
		{
			find: ".renderHeaderToolbar=function(){",
			replacement: {
				match: /(\i).push\(\(0,\i.jsx\)\(\i,{channel:\i,showCall:\i},"profile"\)\);/,
				replace: "$1.push($self.toolbarButtons());$&"
			}
		},
		// TODO: add buttons next to invite in vc
		// {
		// 	find: ".DM_CHANNEL},\"invite-button\"))}",
		// 	replacement: {
		// 		match: /"invite-button"\)\)(?<=(\i)\.push\(\(0.+?)/,
		// 		replace: "$&;$1.push($self.toolbarButtons())"
		// 	}
		// },
		{
			find: "().guilds,themeOverride:",
			replacement: {
				match: /(return\(0,\i\.jsx\)\(\i\.Fragment,{children:\(0,\i.jsxs\)\("div\",{className:\i\(\)\.container,children:\[\i&&\(0,\i\.jsx\)\(\i\.\i,{className:)(\i\(\)\.guilds)/,
				replace: "const serversVisible=$self.useServers();const reveal=$self.useReveal(6,74,\"left\");$1[$2,serversVisible||\"vc-collapsed-guilds\",!serversVisible&&reveal&&\"vc-collapsed-reveal\"]"
			}
		}
	],

	toolbarButtons,
	useServers,
	useReveal
});
/**
* @name ChannelTabs
* @displayName ChannelTabs
* @source https://github.com/samfundev/BetterDiscordStuff/blob/master/Plugins/ChannelTabs/ChannelTabs.plugin.js
* @donate https://paypal.me/samfun123
* @authorId 76052829285916672
* @version 2.6.12
*/
/*@cc_on
@if (@_jscript)
	
	// Offer to self-install for clueless users that try to run this directly.
	var shell = WScript.CreateObject("WScript.Shell");
	var fs = new ActiveXObject("Scripting.FileSystemObject");
	var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\BetterDiscord\plugins");
	var pathSelf = WScript.ScriptFullName;
	// Put the user at ease by addressing them in the first person
	shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
	if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
		shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
	} else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec("explorer " + pathPlugins);
		shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
	}
	WScript.Quit();

@else@*/

module.exports = (() => {
	
	const config = {
		info: {
			name: "ChannelTabs",
			authors: [
				{
					name: "l0c4lh057",
					discord_id: "226677096091484160",
					github_username: "l0c4lh057",
					twitter_username: "l0c4lh057"
				},
				{
					name: "CarJem Generations",
					discord_id: "519397452944769025",
					github_username: "CarJem",
					twitter_username: "carter5467_99"
				},
				{
					name: "samfundev",
					discord_id: "76052829285916672",
					github_username: "samfundev",
				}
			],
			version: "2.6.12",
			description: "Allows you to have multiple tabs and bookmark channels",
			github: "https://github.com/samfundev/BetterDiscordStuff/blob/master/Plugins/ChannelTabs/",
			github_raw: "https://raw.githubusercontent.com/samfundev/BetterDiscordStuff/master/Plugins/ChannelTabs/ChannelTabs.plugin.js"
		},
		changelog: [
			{
				title: "Fixed",
				type: "fixed",
				items: [
					"Fixed the selector used to render top bar",
				]
			}
		]
	};
	
	return !global.ZeresPluginLibrary ? class {
		constructor(){ this._config = config; }
		getName(){ return config.info.name; }
		getAuthor(){ return config.info.authors.map(a => a.name).join(", "); }
		getDescription(){ return config.info.description + " **Install [ZeresPluginLibrary](https://betterdiscord.app/Download?id=9) and restart discord to use this plugin!**"; }
		getVersion(){ return config.info.version; }
		load(){
			BdApi.showConfirmationModal("Library plugin is needed", 
				[`The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`], {
					confirmText: "Download",
					cancelText: "Cancel",
					onConfirm: () => {
						require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (error, response, body) => {
							if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
							await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
						});
					}
				}
			);
		}
		start(){}
		stop(){}
	} : (([Plugin, Api]) => {
		const plugin = (Plugin, Api) => {

			//#region Module/Variable Definitions

			const { PluginUtilities, DiscordModules, ReactComponents, ReactTools, Settings, Modals } = Api;
			const { React, NavigationUtils, SelectedChannelStore, SelectedGuildStore, ChannelStore, GuildStore, UserStore, UserTypingStore, Permissions } = DiscordModules;
			const { ContextMenu, Patcher, Webpack } = new BdApi("ChannelTabs");

			function getModule(filter, options = {}) {
				const foundModule = options.fail ? undefined : Webpack.getModule(filter, options);

				if (!foundModule) {
					missingModule(options);
					if (options.onFail) options.onFail(options);
				}

				return foundModule;
			}

			function getStack() {
				const original = Error.prepareStackTrace;
				Error.prepareStackTrace = (_, stackTraces) => stackTraces;

				const stack = new Error().stack.slice(1);

				Error.prepareStackTrace = original;
				return stack;
			}

			if (this.dismissWarning) this.dismissWarning()
			this.dismissWarning = null;
			let missingFeatures = [];
			function missingModule({ name = "<unnamed>", feature, fatal = false }) {
				const stack = getStack();
				const index = stack.findIndex(site => site.getFunctionName() === "getModule");
				const trace = stack.filter((_, i) => i > index).join("\n");
				console.warn(`Could not find '${name}' module.\n${trace}`);
				if (fatal) throw `Could not find '${name}' module.`;
				if (feature != null) {
					missingFeatures.push(feature);

					if (dismissWarning) dismissWarning()
					const content = BdApi.DOM.parseHTML(`<span style="background: white; color: var(--color); padding: 1px 3px; margin-right: 3px; border-radius: 5px;">ChannelTabs</span> These features are unavailable: ${missingFeatures.join(", ")}`, true);
					dismissWarning = BdApi.UI.showNotice(content, { type: "warning" })
				}
			}

			class FakeUnreadStateStore extends require("events").EventEmitter {
				getUnreadCount() { return 0; }
				getMentionCount() { return 0; }
				isEstimated() { return false; }
				hasUnread() { return false; }
			}

			const { byProps, byStrings } = Webpack.Filters;
			const DiscordConstants = {
				ChannelTypes: getModule(byProps("GUILD_TEXT"), { searchExports: true })
			};
			const Textbox = getModule(m => m.defaultProps && m.defaultProps.type == "text", { searchExports: true }) ?? (props => React.createElement("input", { ...props, onChange: e => props?.onChange(e.target.value) }));
			const UnreadStateStore = getModule(m => m.isEstimated, { feature: "Unread/Mention Indicators" }) ?? new FakeUnreadStateStore();
			const Flux = getModule(byProps("connectStores"), { name: "Flux", fatal: true });
			const MutedStore = getModule(byProps("isMuted", "isChannelMuted"));
			const PermissionUtils = getModule(byProps("can", "canManageUser"));
			const UserStatusStore = DiscordModules.UserStatusStore;
			const Spinner = getModule(m => m.Type?.SPINNING_CIRCLE, { searchExports: true, feature: "Typing Indicators" });
			const Tooltip = BdApi.Components.Tooltip;
			const Slider = getModule(byStrings(`"[UIKit]Slider.handleMouseDown(): assert failed: domNode nodeType !== Element"`), { searchExports: true });
			const NavShortcuts = getModule(byProps("NAVIGATE_BACK", "NAVIGATE_FORWARD"));
			const TopbarSelector = getModule(byProps("app", "layers"), { name: "Topbar Selector", fatal: true });

			const Close = getModule(byStrings("M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z")) ?? (() => React.createElement("div", { style: { width: "16px", "text-align": "center" } }, "⨯"));
			const PlusAlt = getModule(byStrings("15 10 10 10 10 15 8 15 8 10 3 10 3 8 8 8 8 3 10 3 10 8 15 8")) ?? (() => React.createElement("b", null, "＋"));
			const LeftCaret = getModule(byStrings("18.35 4.35 16 2 6 12 16 22 18.35 19.65 10.717 12")) ?? (() => React.createElement("b", null, "<"));
			const RightCaret = getModule(byStrings("8.47 2 6.12 4.35 13.753 12 6.12 19.65 8.47 22 18.47 12")) ?? (() => React.createElement("b", null, ">"));

			const DefaultUserIconGrey = "https://cdn.discordapp.com/embed/avatars/0.png";
			const DefaultUserIconGreen = "https://cdn.discordapp.com/embed/avatars/1.png";
			const DefaultUserIconBlue = "https://cdn.discordapp.com/embed/avatars/2.png";
			const DefaultUserIconRed = "https://cdn.discordapp.com/embed/avatars/3.png";
			const DefaultUserIconYellow = "https://cdn.discordapp.com/embed/avatars/4.png";

			const SettingsMenuIcon = `<svg class="channelTabs-settingsIcon" aria-hidden="false" viewBox="0 0 80 80">
			<rect fill="var(--interactive-normal)" x="20" y="15" width="50" height="10"></rect>
			<rect fill="var(--interactive-normal)" x="20" y="35" width="50" height="10"></rect>
			<rect fill="var(--interactive-normal)" x="20" y="55" width="50" height="10"></rect>
			</svg>`;

			var switching = false;
			var patches = [];

			var currentTabDragIndex = -1;
			var currentTabDragDestinationIndex = -1;

			var currentFavDragIndex = -1;
			var currentFavDragDestinationIndex = -1;

			var currentGroupDragIndex = -1;
			var currentGroupDragDestinationIndex = -1;

			var currentGroupOpened = -1;

			//#endregion
			
			//#region Context Menu Constructors

			function CreateGuildContextMenuChildren(instance, props, channel)
			{
				return ContextMenu.buildMenuChildren([{
					type: "group",
					items: [
						{
							type: "submenu",
							label: "ChannelTabs",
							items: instance.mergeItems([
								{
									label: "Open channel in new tab",
									action: ()=>TopBarRef.current && TopBarRef.current.saveChannel(props.guild.id, channel.id, "#" + channel.name, props.guild.getIconURL() || "")
								},
								{
									label: "Save channel as bookmark",
									action: ()=>TopBarRef.current && TopBarRef.current.addToFavs("#" + channel.name, props.guild.getIconURL() || "", `/channels/${props.guild.id}/${channel.id}`, channel.id)
								}],
								[{
									label: "Save guild as bookmark",
									action: ()=>TopBarRef.current && TopBarRef.current.addToFavs(props.guild.name, props.guild.getIconURL() || "", `/channels/${props.guild.id}`, undefined, props.guild.id)
								}]
							)
						}
					]
				}]);
			};

			function CreateTextChannelContextMenuChildren(instance, props)
			{
				return ContextMenu.buildMenuChildren([{
					type: "group",
					items: [
						{
							type: "submenu",
							label: "ChannelTabs",
							items: instance.mergeItems([
								{
									label: "Open in new tab",
									action: ()=>TopBarRef.current && TopBarRef.current.saveChannel(props.guild.id, props.channel.id, "#" + props.channel.name, props.guild.getIconURL() || "")
								}],
								[{
									label: "Save channel as bookmark",
									action: ()=>TopBarRef.current && TopBarRef.current.addToFavs("#" + props.channel.name, props.guild.getIconURL() || "", `/channels/${props.guild.id}/${props.channel.id}`, props.channel.id)
								}]
							)
						}
					]
				}]);
			};

			function CreateDMContextMenuChildren(instance, props)
			{
				return ContextMenu.buildMenuChildren([{
					type: "group",
					items: [
						{
							type: "submenu",
							label: "ChannelTabs",
							items: instance.mergeItems(
								[{
									label: "Open in new tab",
									action: ()=>TopBarRef.current && TopBarRef.current.saveChannel(props.channel.guild_id, props.channel.id, "@" + (props.channel.name || props.user.username), props.user.getAvatarURL(null, 40, false))
								}],
								[{
									label: "Save DM as bookmark",
									action: ()=>TopBarRef.current && TopBarRef.current.addToFavs("@" + (props.channel.name || props.user.username), props.user.getAvatarURL(null, 40, false), `/channels/@me/${props.channel.id}`, props.channel.id)
								}]
							)
						}
					]
				}])
			};

			function CreateGroupContextMenuChildren(instance, props)
			{
				return ContextMenu.buildMenuChildren([{
					type: "group",
					items: [
						{
							type: "submenu",
							label: "ChannelTabs",
							items: instance.mergeItems(
								[{
									label: "Open in new tab",
									action: ()=>TopBarRef.current && TopBarRef.current.saveChannel(props.channel.guild_id, props.channel.id, "@" + (props.channel.name || props.channel.rawRecipients.map(u=>u.username).join(", ")), ""/*TODO*/)
								}],
								[{
									label: "Save bookmark",
									action: ()=>TopBarRef.current && TopBarRef.current.addToFavs("@" + (props.channel.name || props.channel.rawRecipients.map(u=>u.username).join(", ")), ""/*TODO*/, `/channels/@me/${props.channel.id}`, props.channel.id)
								}]
							)
						}
					]
				}])
			};

			function CreateTabContextMenu(props,e)
			{
				ContextMenu.open(
					e,
					ContextMenu.buildMenu([
						{
							type: "group",
							items: mergeLists(
								{
									values: [
										{
											label: "Duplicate",
											action: props.openInNewTab
										},
										{
											label: "Add to favourites",
											action: ()=>props.addToFavs(props.name, props.iconUrl, props.url, props.channelId)
										},
										{
											label: "Minimize tab",
											type: "toggle",
											checked: () => props.minimized,
											action: ()=> props.minimizeTab(props.tabIndex)
										}
										
									]
								},
								{
									include: props.tabCount > 1,
									values: [
										{
											type : "separator"
										},
										{
											label: "Move left",
											action: props.moveLeft
										},
										{
											label: "Move right",
											action: props.moveRight
										}
									]
								},
								{
									include: props.tabCount > 1,
									values: [
										{
											type : "separator"
										},
										{
											type: "submenu",
											label: "Close...",
											id: "closeMenu",
											color: "danger",
											action: ()=>props.closeTab(props.tabIndex, "single"),
											items: mergeLists(
												{
													values: [
														{
															label: "Close tab",
															action: ()=>props.closeTab(props.tabIndex, "single"),
															color: "danger"
														},
														{
															label: "Close all other tabs",
															action: ()=>props.closeTab(props.tabIndex, "other"),
															color: "danger"
														}
													]
												},
												{
													include: props.tabIndex != props.tabCount - 1,
													values: [
														{
															label: "Close all tabs to right",
															action: ()=>props.closeTab(props.tabIndex, "right"),
															color: "danger"
														}
													]
												},
												{
													include: props.tabIndex != 0,
													values: [
														{
															label: "Close all tabs to left",
															action: ()=>props.closeTab(props.tabIndex, "left"),
															color: "danger"
														}
													]
												}
											)
										}
									]
								}
							)
						}
					]),
					{
						position: "right",
						align: "top"
					}
				);
			};

			function CreateFavContextMenu(props,e)
			{
				ContextMenu.open(
					e,
					ContextMenu.buildMenu([
						{
							type: "group",
							items: mergeLists(
								{
									values: [
										{
											label: "Open in new tab",
											action: props.openInNewTab
										},
										{
											label: "Rename",
											action: props.rename
										},
										{
											label: "Minimize favourite",
											type: "toggle",
											checked: () => props.minimized,
											action: ()=> props.minimizeFav(props.favIndex)
										},
										{
											type : "separator"
										}
									]
								},
								{
									include: props.favCount > 1,
									values: [
										{
											label: "Move left",
											action: props.moveLeft
										},
										{
											label: "Move right",
											action: props.moveRight
										},
										{
											type : "separator"
										}
									]
								},
								{
									values: [
										{
											label: "Move To...",
											id: "groupMoveTo",
											type: "submenu",
											items: mergeLists(
												{
													values: [
														{
															label: "Favorites Bar",
															id: "entryNone",
															color: "danger",
															action: () => props.moveToFavGroup(props.favIndex, -1)
														},
														{
															type: "separator"
														}
													]
												},
												{
													values: FavMoveToGroupList({favIndex: props.favIndex, ...props})
												}
											)
										},
										{
											type : "separator"
										}
									]
								},
								{
									values: [
										{
											label: "Delete",
											action: props.delete,
											color: "danger"
										}
									]
								}
							)
						}
					]),
					{
						position: "right",
						align: "top"
					}
				);
			};

			function CreateFavGroupContextMenu(props,e)
			{
				ContextMenu.open(
					e,
					ContextMenu.buildMenu([
						{
							type: "group",
							items: mergeLists(
								{
									values: [
										{
											label: "Open all",
											action: ()=>props.openFavGroupInNewTab(props.favGroup.groupId)
										},
										{
											type : "separator"
										}
									]
								},
								{
									include: props.groupCount > 1,
									values: [
										{
											label: "Move left",
											action: ()=>props.moveFavGroup(props.groupIndex, (props.groupIndex + props.groupCount - 1) % props.groupCount)
										},
										{
											label: "Move right",
											action: ()=>props.moveFavGroup(props.groupIndex, (props.groupIndex + 1) % props.groupCount)
										},
										{
											type : "separator"
										}
									]
								},
								{
									values: [
										{
											label: "Rename",
											id: "renameGroup",
											action: ()=>props.renameFavGroup(props.favGroup.name, props.favGroup.groupId)
										},
										{
											type : "separator"
										},
										{
											label: "Delete",
											id: "deleteGroup",
											action: ()=>props.removeFavGroup(props.favGroup.groupId),
											color: "danger"
										}
									]
								}
							)
						}
					]),
					{
						position: "right",
						align: "top"
					}
				);
			};

			function CreateFavBarContextMenu(props,e) 
			{
				ContextMenu.open(
					e,
					ContextMenu.buildMenu([
						{
							type: "group",
							items: [
								{
									label: "Add current tab as favourite",
									action: ()=>props.addToFavs(getCurrentName(), getCurrentIconUrl(), location.pathname, SelectedChannelStore.getChannelId())
								},
								{
									label: "Create a new group...",
									action: props.addFavGroup
								},
								{
									type: "separator"
								},
								{
									label: "Hide Favorites",
									action: props.hideFavBar,
									color: "danger"
								}
							]
						}
					]),
					{
						position: "right",
						align: "top"
					}
				);
			};
			
			function CreateSettingsContextMenu(instance, e)
			{
				ContextMenu.open(
					e,
					ContextMenu.buildMenu([
						{
							type: "group",
							items: mergeLists(
								{
									values: [
										{
											label: config.info.name,
											subtext: "Version " + config.info.version,
											action: () => {
												Modals.showChangelogModal(config.info.name, config.info.version, config.changelog);
											}
										},
										{
											type: "separator"
										},
										{											
											id: "shortcutLabel",
											disabled: true,
											label: "Shortcuts:"
										},
										{											
											id: "shortcutLabelKeys",
											disabled: true,
											render: () => {
												return React.createElement("div", {style: { "color": "var(--text-muted)", "padding": "8px", "font-size": "12px",  "white-space": "pre-wrap" }},
												`Ctrl + W - Close Current Tab\n` +
												`Ctrl + PgUp - Navigate to Left Tab\n` +
												`Ctrl + PgDn - Navigate to Right Tab\n`);
											}
										},
										{
											type: "separator"
										},
										{											
											label: "Settings:",
											id: "settingHeader",
											disabled: true
										},
										{
											type: "separator"
										},
										{
											type: "submenu",
											label: "Startup",
											items: [
												{
													label: "Reopen Last Channel on Startup",
													type: "toggle",
													id: "reopenLastChannel",
													checked: () => TopBarRef.current.state.reopenLastChannel,
													action: () => {
														instance.setState({
															reopenLastChannel: !instance.state.reopenLastChannel
														}, ()=>{
															instance.props.plugin.settings.reopenLastChannel = !instance.props.plugin.settings.reopenLastChannel;
															instance.props.plugin.saveSettings();
														});
													}
												}
											]
										},
										{
											type: "submenu",
											label: "Appearance",
											items: [
												{
													label: "Use Compact Appearance",
													type: "toggle",
													id: "useCompactLook",
													checked: () => TopBarRef.current.state.compactStyle,
													action: () => {
														instance.setState({
															compactStyle: !instance.state.compactStyle
														}, ()=>{
															instance.props.plugin.settings.compactStyle = !instance.props.plugin.settings.compactStyle;
															instance.props.plugin.removeStyle();
															instance.props.plugin.applyStyle();
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Privacy Mode",
													type: "toggle",
													id: "privacyMode",
													checked: () => TopBarRef.current.state.privacyMode,
													action: () => {
														instance.setState({
															privacyMode: !instance.state.privacyMode
														}, ()=>{
															instance.props.plugin.settings.privacyMode = !instance.props.plugin.settings.privacyMode;
															instance.props.plugin.removeStyle();
															instance.props.plugin.applyStyle();
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Radial Status Indicators",
													type: "toggle",
													id: "radialStatusMode",
													checked: () => TopBarRef.current.state.radialStatusMode,
													action: () => {
														instance.setState({
															radialStatusMode: !instance.state.radialStatusMode
														}, ()=>{
															instance.props.plugin.settings.radialStatusMode = !instance.props.plugin.settings.radialStatusMode;
															instance.props.plugin.removeStyle();
															instance.props.plugin.applyStyle();
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													type: "separator"
												},
												{
													label: "Minimum Tab Width",
													style: { "pointer-events": "none" }
												},
												{
													id: "tabWidthMin",
													render: () => {
														return React.createElement("div",
															{
																className: "channelTabs-sliderContainer"
															},
															React.createElement(Slider,
																{
																	"aria-label": "Minimum Tab Width",
																	className: "channelTabs-slider",
																	mini: true,
																	orientation: "horizontal",
																	disabled: false,
																	initialValue: instance.props.plugin.settings.tabWidthMin,
																	minValue: 50,
																	maxValue: 220,
																	onValueRender: value => Math.floor(value / 10) * 10 + 'px',
																	onValueChange: value => {
																		value = Math.floor(value / 10) * 10,
																		instance.props.plugin.settings.tabWidthMin = value,
																		instance.props.plugin.saveSettings(),
																		instance.props.plugin.applyStyle("channelTabs-style-constants")
																	}
																}
															)
														)
													}
												},
												{
													type: "separator"
												},
												{
													label: "Show Tab Bar",
													type: "toggle",
													id: "showTabBar",
													color: "danger",
													checked: () => TopBarRef.current.state.showTabBar,
													action: () => {
														instance.setState({
															showTabBar: !instance.state.showTabBar
														}, ()=>{
															instance.props.plugin.settings.showTabBar = !instance.props.plugin.settings.showTabBar;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Fav Bar",
													type: "toggle",
													id: "showFavBar",
													color: "danger",
													checked: () => TopBarRef.current.state.showFavBar,
													action: () => {
														instance.setState({
															showFavBar: !instance.state.showFavBar
														}, ()=>{
															instance.props.plugin.settings.showFavBar = !instance.props.plugin.settings.showFavBar;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Quick Settings",
													type: "toggle",
													id: "showQuickSettings",
													color: "danger",
													checked: () => TopBarRef.current.state.showQuickSettings,
													action: () => {
														instance.setState({
															showQuickSettings: !instance.state.showQuickSettings
														}, ()=>{
															instance.props.plugin.settings.showQuickSettings = !instance.props.plugin.settings.showQuickSettings;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Navigation Buttons",
													type: "toggle",
													id: "showNavButtons",
													checked: () => TopBarRef.current.state.showNavButtons,
													action: () => {
														instance.setState({
															showNavButtons: !instance.state.showNavButtons
														}, ()=>{
															instance.props.plugin.settings.showNavButtons = !instance.props.plugin.settings.showNavButtons;
															instance.props.plugin.removeStyle();
															instance.props.plugin.applyStyle();
															instance.props.plugin.saveSettings();
														});
													}
												}
											]
										},
										{
											type: "submenu",
											label: "Behavior",
											items: [
												{
													label: "Always Focus New Tabs",
													type: "toggle",
													id: "alwaysFocusNewTabs",
													checked: () => TopBarRef.current.state.alwaysFocusNewTabs,
													action: () => {
														instance.setState({
															alwaysFocusNewTabs: !instance.state.alwaysFocusNewTabs
														}, ()=>{
															instance.props.plugin.settings.alwaysFocusNewTabs = !instance.props.plugin.settings.alwaysFocusNewTabs;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Primary Forward/Back Navigation",
													type: "toggle",
													id: "useStandardNav",
													checked: () => TopBarRef.current.state.useStandardNav,
													action: () => {
														instance.setState({
															useStandardNav: !instance.state.useStandardNav
														}, ()=>{
															instance.props.plugin.settings.useStandardNav = !instance.props.plugin.settings.useStandardNav;
															instance.props.plugin.saveSettings();
														});
													}
												}
											]
										},
										{
											type: "submenu",
											label: "Badge Visibility",
											items: [
												{
													type: "separator",
													id: "header1_1"
												},
												{
													label: "Favs:",
													id: "header1_2",
													disabled: true
												},
												{
													type: "separator",
													id: "header1_3"
												},
												{
													label: "Show Mentions",
													type: "toggle",
													id: "favs_Mentions",
													checked: () => TopBarRef.current.state.showFavMentionBadges,
													action: () => {
														instance.setState({
															showFavMentionBadges: !instance.state.showFavMentionBadges
														}, ()=>{
															instance.props.plugin.settings.showFavMentionBadges = !instance.props.plugin.settings.showFavMentionBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Unreads",
													type: "toggle",
													id: "favs_Unreads",
													checked: () => TopBarRef.current.state.showFavUnreadBadges,
													action: () => {
														instance.setState({
															showFavUnreadBadges: !instance.state.showFavUnreadBadges
														}, ()=>{
															instance.props.plugin.settings.showFavUnreadBadges = !instance.props.plugin.settings.showFavUnreadBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Typing",
													type: "toggle",
													id: "favs_Typing",
													checked: () => TopBarRef.current.state.showFavTypingBadge,
													action: () => {
														instance.setState({
															showFavTypingBadge: !instance.state.showFavTypingBadge
														}, ()=>{
															instance.props.plugin.settings.showFavTypingBadge = !instance.props.plugin.settings.showFavTypingBadge;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Empty Mentions/Unreads",
													type: "toggle",
													id: "favs_Empty",
													checked: () => TopBarRef.current.state.showEmptyFavBadges,
													action: () => {
														instance.setState({
															showEmptyFavBadges: !instance.state.showEmptyFavBadges
														}, ()=>{
															instance.props.plugin.settings.showEmptyFavBadges = !instance.props.plugin.settings.showEmptyFavBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													type: "separator",
													id: "header4_1"
												},
												{
													label: "Fav Groups:",
													id: "header4_2",
													disabled: true
												},
												{
													type: "separator",
													id: "header4_3"
												},
												{
													label: "Show Mentions",
													type: "toggle",
													id: "favGroups_Mentions",
													checked: () => TopBarRef.current.state.showFavGroupMentionBadges,
													action: () => {
														instance.setState({
															showFavGroupMentionBadges: !instance.state.showFavGroupMentionBadges
														}, ()=>{
															instance.props.plugin.settings.showFavGroupMentionBadges = !instance.props.plugin.settings.showFavGroupMentionBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Unreads",
													type: "toggle",
													id: "favGroups_Unreads",
													checked: () => TopBarRef.current.state.showFavGroupUnreadBadges,
													action: () => {
														instance.setState({
															showFavGroupUnreadBadges: !instance.state.showFavGroupUnreadBadges
														}, ()=>{
															instance.props.plugin.settings.showFavGroupUnreadBadges = !instance.props.plugin.settings.showFavGroupUnreadBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Typing",
													type: "toggle",
													id: "favGroups_Typing",
													checked: () => TopBarRef.current.state.showFavGroupTypingBadge,
													action: () => {
														instance.setState({
															showFavGroupTypingBadge: !instance.state.showFavGroupTypingBadge
														}, ()=>{
															instance.props.plugin.settings.showFavGroupTypingBadge = !instance.props.plugin.settings.showFavGroupTypingBadge;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Empty Mentions/Unreads",
													type: "toggle",
													id: "favGroups_Empty",
													checked: () => TopBarRef.current.state.showEmptyFavGroupBadges,
													action: () => {
														instance.setState({
															showEmptyFavGroupBadges: !instance.state.showEmptyFavGroupBadges
														}, ()=>{
															instance.props.plugin.settings.showEmptyFavGroupBadges = !instance.props.plugin.settings.showEmptyFavGroupBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													type: "separator",
													id: "header2_1"
												},
												{
													label: "Tabs:",
													id: "header2_2",
													disabled: true
												},
												{
													type: "separator",
													id: "header2_3"
												},
												{
													label: "Show Mentions",
													type: "toggle",
													id: "tabs_Mentions",
													checked: () => TopBarRef.current.state.showTabMentionBadges,
													action: () => {
														instance.setState({
															showTabMentionBadges: !instance.state.showTabMentionBadges
														}, ()=>{
															instance.props.plugin.settings.showTabMentionBadges = !instance.props.plugin.settings.showTabMentionBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Unreads",
													type: "toggle",
													id: "tabs_Unreads",
													checked: () => TopBarRef.current.state.showTabUnreadBadges,
													action: () => {
														instance.setState({
															showTabUnreadBadges: !instance.state.showTabUnreadBadges
														}, ()=>{
															instance.props.plugin.settings.showTabUnreadBadges = !instance.props.plugin.settings.showTabUnreadBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Typing",
													type: "toggle",
													id: "tabs_Typing",
													checked: () => TopBarRef.current.state.showTabTypingBadge,
													action: () => {
														instance.setState({
															showTabTypingBadge: !instance.state.showTabTypingBadge
														}, ()=>{
															instance.props.plugin.settings.showTabTypingBadge = !instance.props.plugin.settings.showTabTypingBadge;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Empty Mentions/Unreads",
													type: "toggle",
													id: "tabs_Empty",
													checked: () => TopBarRef.current.state.showEmptyTabBadges,
													action: () => {
														instance.setState({
															showEmptyTabBadges: !instance.state.showEmptyTabBadges
														}, ()=>{
															instance.props.plugin.settings.showEmptyTabBadges = !instance.props.plugin.settings.showEmptyTabBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													type: "separator",
													id: "header3_1"
												},
												{
													label: "Active Tabs:",
													id: "header3_2",
													disabled: true
												},
												{
													type: "separator",
													id: "header3_3"
												},
												{
													label: "Show Mentions",
													type: "toggle",
													id: "activeTabs_Mentions",
													checked: () => TopBarRef.current.state.showActiveTabMentionBadges,
													action: () => {
														instance.setState({
															showActiveTabMentionBadges: !instance.state.showActiveTabMentionBadges
														}, ()=>{
															instance.props.plugin.settings.showActiveTabMentionBadges = !instance.props.plugin.settings.showActiveTabMentionBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Unreads",
													type: "toggle",
													id: "activeTabs_Unreads",
													checked: () => TopBarRef.current.state.showActiveTabUnreadBadges,
													action: () => {
														instance.setState({
															showActiveTabUnreadBadges: !instance.state.showActiveTabUnreadBadges
														}, ()=>{
															instance.props.plugin.settings.showActiveTabUnreadBadges = !instance.props.plugin.settings.showActiveTabUnreadBadges;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Typing",
													type: "toggle",
													id: "activeTabs_Typing",
													checked: () => TopBarRef.current.state.showActiveTabTypingBadge,
													action: () => {
														instance.setState({
															showActiveTabTypingBadge: !instance.state.showActiveTabTypingBadge
														}, ()=>{
															instance.props.plugin.settings.showActiveTabTypingBadge = !instance.props.plugin.settings.showActiveTabTypingBadge;
															instance.props.plugin.saveSettings();
														});
													}
												},
												{
													label: "Show Empty Mentions/Unreads",
													type: "toggle",
													id: "activeTabs_Empty",
													checked: () => TopBarRef.current.state.showEmptyActiveTabBadges,
													action: () => {
														instance.setState({
															showEmptyActiveTabBadges: !instance.state.showEmptyActiveTabBadges
														}, ()=>{
															instance.props.plugin.settings.showEmptyActiveTabBadges = !instance.props.plugin.settings.showEmptyActiveTabBadges;
															instance.props.plugin.saveSettings();
														});
													}
												}
											]
										},

								
									]
								}
							)
						}
					]),
					{
						position: "right",
						align: "top"
					}
				)
			};

			//#endregion

			//#region Global Common Functions

			const closeAllDropdowns = () =>
			{
				var dropdowns = document.getElementsByClassName("channelTabs-favGroup-content");
				var i;
				for (i = 0; i < dropdowns.length; i++) {
				  var openDropdown = dropdowns[i];
				  if (openDropdown.classList.contains('channelTabs-favGroupShow')) {
					openDropdown.classList.remove('channelTabs-favGroupShow');
				  }
				}
				currentGroupOpened = -1;
			};

			const mergeLists = (...items)=>
			{
				return items.filter(item => item.include===undefined||item.include).flatMap(item => item.values);
			};

			const getGuildChannels = (...guildIds)=>
			{
				const channels = ChannelStore.getGuildChannels ? Object.values(ChannelStore.getGuildChannels()) : ChannelStore.getMutableGuildChannels ? Object.values(ChannelStore.getMutableGuildChannels()) : [];
				return channels.filter(c => guildIds.includes(c.guild_id) && c.type !== DiscordConstants.ChannelTypes.GUILD_VOICE && c.type !== DiscordConstants.ChannelTypes.GUILD_CATEGORY);
			};

			const updateFavEntry = (fav)=>
			{
				if(fav.guildId) 
				{
					const channelIds = getGuildChannels(fav.guildId).filter(channel=>(PermissionUtils.can(Permissions.VIEW_CHANNEL, channel)) && (!MutedStore.isChannelMuted(channel.guild_id, channel.id))).map(channel=>channel.id);
					return {
						unreadCount: channelIds.map(id=>UnreadStateStore.getUnreadCount(id)||UnreadStateStore.getMentionCount(id)||(UnreadStateStore.hasUnread(id)?1:0)).reduce((a,b)=>a+b, 0),
						unreadEstimated: channelIds.some(id=>UnreadStateStore.isEstimated(id)) || channelIds.some(id=>UnreadStateStore.getUnreadCount(id)===0&&UnreadStateStore.hasUnread(id)),
						hasUnread: channelIds.some(id=>UnreadStateStore.hasUnread(id)),
						mentionCount: channelIds.map(id=>UnreadStateStore.getMentionCount(id)||0).reduce((a,b)=>a+b, 0),
						selected: SelectedGuildStore.getGuildId()===fav.guildId,
						isTyping: isChannelTyping(fav.channelId),
						currentStatus: getCurrentUserStatus(fav.url)
					};
				}
				else 
				{
					return {
						unreadCount: UnreadStateStore.getUnreadCount(fav.channelId) || UnreadStateStore.getMentionCount(fav.channelId) || (UnreadStateStore.hasUnread(fav.channelId) ? 1 : 0),
						unreadEstimated: UnreadStateStore.isEstimated(fav.channelId) || (UnreadStateStore.hasUnread(fav.channelId) && UnreadStateStore.getUnreadCount(fav.channelId) === 0),
						hasUnread: UnreadStateStore.hasUnread(fav.channelId),
						mentionCount: UnreadStateStore.getMentionCount(fav.channelId),
						selected: SelectedChannelStore.getChannelId()===fav.channelId,
						isTyping: isChannelTyping(fav.channelId),
						currentStatus: getCurrentUserStatus(fav.url)
					};
				}
			};

			const getCurrentUserStatus = (pathname = location.pathname)=>
			{
				const cId = (pathname.match(/^\/channels\/(\d+|@me|@favorites)\/(\d+)/) || [])[2];
				if(cId)
				{
					const channel = ChannelStore.getChannel(cId);
					if(channel?.guild_id)
					{
						return "none";
					}
					else if(channel?.isDM())
					{
						const user = UserStore.getUser(channel.getRecipientId());
						const status = UserStatusStore.getStatus(user.id);
						return status;
					}
					else if(channel?.isGroupDM())
					{
						return "none";
					}
				}
				return "none";
			};

			const getChannelTypingTooltipText = (userIds) =>
			{				
				if (userIds)
				{
					const usernames = userIds.map(userId => UserStore.getUser(userId)).filter(user => user).map(user => user.tag);
					const remainingUserCount = userIds.length - usernames.length;
					const text = (()=>{
						if(usernames.length === 0){
							return `${remainingUserCount} user${remainingUserCount > 1 ? "s" : ""}`;
						}else if(userIds.length > 2){
							const otherCount = usernames.length - 1 + remainingUserCount;
							return `${usernames[0]} and ${otherCount} other${otherCount > 1 ? "s" : ""}`;
						}else if(remainingUserCount === 0){
							return usernames.join(", ");
						}else{
							return `${usernames.join(", ")} and ${remainingUserCount} other${remainingUserCount > 1 ? "s" : ""}`;
						}
					})();
					return text;
				}
				return "Someone is Typing...";

			};

			const getChannelTypingUsers = (channel_id) => 
			{
				const channel = ChannelStore.getChannel(channel_id);
				const selfId = UserStore.getCurrentUser()?.id;
				if (channel)
				{	
					const userIds = Object.keys(UserTypingStore.getTypingUsers(channel_id)).filter(uId => (uId !== selfId));
					const typingUsers = [...new Set(userIds)];
					return typingUsers;
				}
				return null;
			};	

			const isChannelTyping = (channel_id) => 
			{
				const channel = ChannelStore.getChannel(channel_id);
				const selfId = UserStore.getCurrentUser()?.id;
				if (channel)
				{	
					const userIds = Object.keys(UserTypingStore.getTypingUsers(channel_id)).filter(uId => (uId !== selfId));
					const typingUsers = [...new Set(userIds)];
					if (typingUsers) return typingUsers.length === 0 ? false : true;
				}
				return false;
			};	

			const isChannelDM = (channel_id) =>
			{
				return (()=>{const c=ChannelStore.getChannel(channel_id); return c && (c.isDM()||c.isGroupDM());})()
			};

			const getCurrentName = (pathname = location.pathname)=>
			{
				const cId = (pathname.match(/^\/channels\/(\d+|@me|@favorites)\/(\d+)/) || [])[2];
				if(cId){
					const channel = ChannelStore.getChannel(cId);
					if(channel?.name) return (channel.guildId ? "@" : "#") + channel.name;
					else if(channel?.rawRecipients) return "@" + channel.rawRecipients.map(u=>u.username).join(", ");
					else return pathname;
				}else{
					if(pathname === "/channels/@me") return "Friends";
					else if(pathname.match(/^\/[a-z\-]+$/)) return pathname.substr(1).split("-").map(part => part.substr(0, 1).toUpperCase() + part.substr(1)).join(" ");
					else return pathname;
				}
			};	

			const getCurrentIconUrl = (pathname = location.pathname)=>
			{
				const cId = (pathname.match(/^\/channels\/(\d+|@me|@favorites)\/(\d+)/) || [])[2];
				if(cId){
					const channel = ChannelStore.getChannel(cId);
					if(!channel) return "";
					if(channel.guild_id){
						const guild = GuildStore.getGuild(channel.guild_id);
						return guild.getIconURL(40, false) || DefaultUserIconBlue;
					}else if(channel.isDM()){
						const user = UserStore.getUser(channel.getRecipientId());
						return user.getAvatarURL(null, 40, false);
					}else if(channel.isGroupDM()){
						if(channel.icon) return `https://cdn.discordapp.com/channel-icons/${channel.id}/${channel.icon}.webp`;
						else return DefaultUserIconGreen;
					}
				}
				return DefaultUserIconGrey;
			};

			//#endregion
			
			//#region Tab Definitions

			const GetTabStyles = (viewMode, item)=>
			{
				if (item === "unreadBadge") 
				{
					if (viewMode === "classic") return " channelTabs-classicBadgeAlignment";
					else if (viewMode === "alt") return " channelTabs-badgeAlignLeft";
				}
				else if (item === "mentionBadge")
				{
					if (viewMode === "classic") return " channelTabs-classicBadgeAlignment";
					else if (viewMode === "alt") return " channelTabs-badgeAlignRight";
				}
				else if (item === "typingBadge")
				{
					if (viewMode === "classic") return " channelTabs-classicBadgeAlignment";
					else if (viewMode === "alt") return " channelTabs-typingBadgeAlignment";
				}
				return "";
			};

			const TabIcon = props=>React.createElement(
				"img",
				{
					className: "channelTabs-tabIcon",
					src: !props.iconUrl ? DefaultUserIconGrey :props.iconUrl
				}
			);

			const TabStatus = props=>React.createElement(
				"rect",
				{
						width: 6,
						height: 6,
						x: 14,
						y: 14,
					className: "channelTabs-tabStatus"
					+ (props.currentStatus == "online" ? " channelTabs-onlineIcon" : "")
					+ (props.currentStatus == "idle" ? " channelTabs-idleIcon" : "")
					+ (props.currentStatus == "dnd" ? " channelTabs-doNotDisturbIcon" : "")
					+ (props.currentStatus == "offline" ? " channelTabs-offlineIcon" : "")
					+ (props.currentStatus == "none" ? " channelTabs-noneIcon" : "")
				}
			);

			const TabName = props=>React.createElement(
				"span",
				{
					className: "channelTabs-tabName"
				},
				props.name
			);

			const TabClose = props=>props.tabCount < 2 ? null : React.createElement(
				"div",
				{
					className: "channelTabs-closeTab",
					onClick: e=>{
						e.stopPropagation();
						props.closeTab();
					}
				},
				React.createElement(Close, {})
			);

			const TabUnreadBadge = props=>React.createElement("div", {
				className: "channelTabs-unreadBadge" + (!props.hasUnread ? " channelTabs-noUnread" : "") + GetTabStyles(props.viewMode, "unreadBadge")
			}, props.unreadCount + (props.unreadEstimated ? "+" : ""));

			const TabMentionBadge = props=>React.createElement("div", {
				className: "channelTabs-mentionBadge" + (props.mentionCount === 0 ? " channelTabs-noMention" : "") + GetTabStyles(props.viewMode, "mentionBadge")
			}, props.mentionCount);

			const TabTypingBadge = ({viewMode, isTyping, userIds})=>{
				if (isTyping === false || !Spinner) return null;
				const text = getChannelTypingTooltipText(userIds);
				return React.createElement(
					"div",
					{ 
						className: "channelTabs-TypingContainer" + GetTabStyles(viewMode, "typingBadge")
					},
					React.createElement(
						Tooltip,
						{
							text,
							position: "bottom"
						},
						tooltipProps => React.createElement(Spinner, {
							...tooltipProps,
							type: "pulsingEllipsis",
							className: `channelTabs-typingBadge`,
							animated: isTyping,
							style: {
								opacity: 0.7
							}
						})
					)
				);


			};

			const CozyTab = (props)=>{
				return React.createElement(
					"div",
					{},
					React.createElement("svg", {
							className: "channelTabs-tabIconWrapper",
							width: "20",
							height: "20",
							viewBox: "0 0 20 20"
						},
						props.currentStatus === "none" 
						? React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20 }, React.createElement(TabIcon, { iconUrl: props.iconUrl })) 
						: React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20, mask: "url(#svg-mask-avatar-status-round-20)" }, React.createElement(TabIcon, { iconUrl: props.iconUrl })),
						props.currentStatus === "none" ? null : React.createElement(TabStatus, { currentStatus: props.currentStatus })
					),
					React.createElement(TabName, {name: props.name}),
					React.createElement(
						"div",
						{
							className: "channelTabs-gridContainer",
						},
						React.createElement(
						   "div",
						   {className: "channelTabs-gridItemBR"},
						   !(props.selected ? props.showActiveTabTypingBadge : props.showTabTypingBadge) ?  null : React.createElement(TabTypingBadge, {viewMode: "alt", isTyping: props.hasUsersTyping, userIds: getChannelTypingUsers(props.channelId)})
					   ),
					   React.createElement(
						"div",
						   {className: "channelTabs-gridItemTL"},
						   !(props.selected ? props.showActiveTabUnreadBadges : props.showTabUnreadBadges) ? null : !props.channelId || (ChannelStore.getChannel(props.channelId)?.isPrivate() ?? true) ? null : !(props.selected ? props.showEmptyActiveTabBadges : props.showEmptyTabBadges) && !props.hasUnread  ? null : React.createElement(TabUnreadBadge, {viewMode: "alt", unreadCount: props.unreadCount, unreadEstimated: props.unreadEstimated, hasUnread: props.hasUnread, mentionCount: props.mentionCount})
					   ),
					  React.createElement(
						"div",
						   {className: "channelTabs-gridItemTR"},
						   !(props.selected ? props.showActiveTabMentionBadges : props.showTabMentionBadges) ? null : !(props.selected ? props.showEmptyActiveTabBadges : props.showEmptyTabBadges) && (props.mentionCount === 0) ? null : React.createElement(TabMentionBadge, {viewMode: "alt", mentionCount: props.mentionCount})
					   ),
					   React.createElement("div", {className: "channelTabs-gridItemBL"}))
				)
			};

			const CompactTab = (props)=>{
				return React.createElement(
					"div",
					{},
					React.createElement("svg", {
							className: "channelTabs-tabIconWrapper",
							width: "20",
							height: "20",
							viewBox: "0 0 20 20"
						},
						props.currentStatus === "none" 
						? React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20 }, React.createElement(TabIcon, { iconUrl: props.iconUrl })) 
						: React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20, mask: "url(#svg-mask-avatar-status-round-20)" }, React.createElement(TabIcon, { iconUrl: props.iconUrl })),
						props.currentStatus === "none" ? null : React.createElement(TabStatus, { currentStatus: props.currentStatus })
					),
					React.createElement(TabName, {name: props.name}),
					!(props.selected ? props.showActiveTabTypingBadge : props.showTabTypingBadge) ? null : React.createElement(
					   React.Fragment,
					   {},
					   React.createElement(TabTypingBadge, {viewMode: "classic", isTyping: props.hasUsersTyping, userIds: getChannelTypingUsers(props.channelId)})
				   ),
				   !(props.selected ? props.showActiveTabUnreadBadges : props.showTabUnreadBadges) ? null : React.createElement(
					   React.Fragment,
					   {},
					   !props.channelId || (ChannelStore.getChannel(props.channelId)?.isPrivate() ?? true) ? null : !(props.selected ? props.showEmptyActiveTabBadges : props.showEmptyTabBadges) && !props.hasUnread  ? null : React.createElement(TabUnreadBadge, {viewMode: "classic", unreadCount: props.unreadCount, unreadEstimated: props.unreadEstimated, hasUnread: props.hasUnread, mentionCount: props.mentionCount})
				   ),
				   !(props.selected ? props.showActiveTabMentionBadges : props.showTabMentionBadges) ? null : React.createElement(
					   React.Fragment,
					   {},
					   !(props.selected ? props.showEmptyActiveTabBadges : props.showEmptyTabBadges) && (props.mentionCount === 0) ? null : React.createElement(TabMentionBadge, {viewMode: "classic", mentionCount: props.mentionCount})
				   )
				   )
			};

			const Tab = props=>React.createElement(
				"div",
				{
					className: "channelTabs-tab"
									+ (props.selected ? " channelTabs-selected" : "")
									+ (props.minimized ? " channelTabs-minimized" : "")
									+ (props.hasUnread ? " channelTabs-unread" : "")
									+ (props.mentionCount > 0 ? " channelTabs-mention" : ""),
					"data-mention-count": props.mentionCount,
					"data-unread-count": props.unreadCount,
					"data-unread-estimated": props.unreadEstimated,
					onClick: ()=>{if(!props.selected) props.switchToTab(props.tabIndex);},
					onMouseUp: e=>{
						if(e.button !== 1) return;
						e.preventDefault();
						props.closeTab(props.tabIndex);
					},
					onContextMenu: e=> {CreateTabContextMenu(props,e)},
					onMouseOver: e=> {
						if (currentTabDragIndex == props.tabIndex || currentTabDragIndex == -1) return;
						currentTabDragDestinationIndex = props.tabIndex;
					},
					
					onMouseDown: e => {
						let mouseMove = e2 => {
							if (Math.sqrt((e.pageX - e2.pageX)**2) > 20 || Math.sqrt((e.pageY - e2.pageY)**2) > 20) {
								currentTabDragIndex = props.tabIndex;
								document.removeEventListener("mousemove", mouseMove);
								document.removeEventListener("mouseup", mouseUp);
								let dragging = e3 => {
									if (currentTabDragIndex != currentTabDragDestinationIndex)
									{
										if (currentTabDragDestinationIndex != -1)
										{
											props.moveTab(currentTabDragIndex, currentTabDragDestinationIndex);
											currentTabDragDestinationIndex = currentTabDragDestinationIndex;
											currentTabDragIndex = currentTabDragDestinationIndex;
										}
									}
								};
								let releasing = e3 => {
									document.removeEventListener("mousemove", dragging);
									document.removeEventListener("mouseup", releasing);
									currentTabDragIndex = -1;
									currentTabDragDestinationIndex = -1;
								};
								document.addEventListener("mousemove", dragging);
								document.addEventListener("mouseup", releasing);
							}
						};
						let mouseUp = _ => {
							document.removeEventListener("mousemove", mouseMove);
							document.removeEventListener("mouseup", mouseUp);
						};
						document.addEventListener("mousemove", mouseMove);
						document.addEventListener("mouseup", mouseUp);
					},
				},
				
				props.compactStyle ? CompactTab(props) : CozyTab(props),
				React.createElement(TabClose, {tabCount: props.tabCount, closeTab: ()=>props.closeTab(props.tabIndex)})
			);	

			//#endregion
						
			//#region Fav Definitions

			const FavMoveToGroupList = props => {
				var groups = props.favGroups.map(

					(group, index) => {
		
						var entry = {
							label: group.name,
							id: "entry" + index,
							action: () => props.moveToFavGroup(props.favIndex, group.groupId)
						};

						return entry;
					}
				);

				if (groups.length === 0) {
					return [{
						label: "No groups",
						disabled: true
					}]
				}

				return groups;
			}

			const FavIcon = props=>React.createElement(
				"img",
				{
					className: "channelTabs-favIcon",
					src: !props.iconUrl ? DefaultUserIconGrey :props.iconUrl
				}
			);

			const FavStatus = props=>React.createElement(
				"rect",
				{
						width: 6,
						height: 6,
						x: 14,
						y: 14,
					className: "channelTabs-favStatus"
					+ (props.currentStatus == "online" ? " channelTabs-onlineIcon" : "")
					+ (props.currentStatus == "idle" ? " channelTabs-idleIcon" : "")
					+ (props.currentStatus == "dnd" ? " channelTabs-doNotDisturbIcon" : "")
					+ (props.currentStatus == "offline" ? " channelTabs-offlineIcon" : "")
					+ (props.currentStatus == "none" ? " channelTabs-noneIcon" : "")
				}
			);

			const FavName = props=>React.createElement(
				"span",
				{
					className: "channelTabs-favName"
				},
				props.name
			);

			const FavUnreadBadge = props=>React.createElement("div", {
				className: "channelTabs-unreadBadge" + (!props.hasUnread ? " channelTabs-noUnread" : "")
			}, props.unreadCount + (props.unreadEstimated ? "+" : ""));

			const FavMentionBadge = props=>React.createElement("div", {
				className: "channelTabs-mentionBadge" + (props.mentionCount === 0 ? " channelTabs-noMention" : "")
			}, props.mentionCount);


			const FavTypingBadge = ({isTyping, userIds})=>{
				if (!Spinner) return null;
				const text = getChannelTypingTooltipText(userIds);
				return React.createElement(
					Tooltip,
					{
						text,
						position: "bottom"
					},
					tooltipProps => React.createElement("div", {
						...tooltipProps,
						className: "channelTabs-typingBadge" + (!isTyping ? " channelTabs-noTyping" : "")
					}, React.createElement(Spinner, {
						type: "pulsingEllipsis",
						animated: (!isTyping ? false : true)
					}))
				)
			};

			const Fav = props=>React.createElement(
				"div",
				{
					className: "channelTabs-fav" 
									+ (props.channelId ? " channelTabs-channel" : props.guildId ? " channelTabs-guild" : "")
									+ (props.selected ? " channelTabs-selected" : "")
									+ (props.minimized ? " channelTabs-minimized" : "")
									+ (props.hasUnread ? " channelTabs-unread" : "")
									+ (props.mentionCount > 0 ? " channelTabs-mention" : ""),
					"data-mention-count": props.mentionCount,
					"data-unread-count": props.unreadCount,
					"data-unread-estimated": props.unreadEstimated,
					onClick: ()=>props.guildId ? NavigationUtils.transitionToGuild(props.guildId, SelectedChannelStore.getChannelId(props.guildId)) : NavigationUtils.transitionTo(props.url),
					onMouseUp: e=>{
						if(e.button !== 1) return;
						e.preventDefault();
						props.openInNewTab();
					},
					onContextMenu: e=> {CreateFavContextMenu(props,e)},
					onMouseOver: e=> {
						if (currentFavDragIndex == props.favIndex || currentFavDragIndex == -1) return;
						currentFavDragDestinationIndex = props.favIndex;
					},					
					onMouseDown: e => {
						let mouseMove = e2 => {
							if (Math.sqrt((e.pageX - e2.pageX)**2) > 20 || Math.sqrt((e.pageY - e2.pageY)**2) > 20) {
								currentFavDragIndex = props.favIndex;
								document.removeEventListener("mousemove", mouseMove);
								document.removeEventListener("mouseup", mouseUp);
								let dragging = e3 => {
									if (currentFavDragIndex != currentFavDragDestinationIndex)
									{
										if (currentFavDragDestinationIndex != -1)
										{
											props.moveFav(currentFavDragIndex, currentFavDragDestinationIndex);
											currentFavDragDestinationIndex = currentFavDragDestinationIndex;
											currentFavDragIndex = currentFavDragDestinationIndex;
										}
									}
								};
								let releasing = e3 => {
									document.removeEventListener("mousemove", dragging);
									document.removeEventListener("mouseup", releasing);
									currentFavDragIndex = -1;
									currentFavDragDestinationIndex = -1;
								};
								document.addEventListener("mousemove", dragging);
								document.addEventListener("mouseup", releasing);
							}
						};
						let mouseUp = _ => {
							document.removeEventListener("mousemove", mouseMove);
							document.removeEventListener("mouseup", mouseUp);
						};
						document.addEventListener("mousemove", mouseMove);
						document.addEventListener("mouseup", mouseUp);
					},
				},


				React.createElement("svg", {
						className: "channelTabs-favIconWrapper",
						width: "20",
						height: "20",
						viewBox: "0 0 20 20"
					},
					props.currentStatus === "none" 
					? React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20 }, React.createElement(FavIcon, { iconUrl: props.iconUrl })) 
					: React.createElement("foreignObject", { x: 0, y: 0, width: 20, height: 20, mask: "url(#svg-mask-avatar-status-round-20)" }, React.createElement(FavIcon, { iconUrl: props.iconUrl })),
					props.currentStatus === "none" ? null : React.createElement(FavStatus, { currentStatus: props.currentStatus })
				),

				React.createElement(FavName, {name: props.name}),
				!(props.showFavUnreadBadges && (props.channelId || props.guildId)) ? null : React.createElement(
					React.Fragment,
					{},
					isChannelDM(props.channelId) ? null : !props.showEmptyFavBadges && props.unreadCount === 0 ? null : React.createElement(FavUnreadBadge, {unreadCount: props.unreadCount, unreadEstimated: props.unreadEstimated, hasUnread: props.hasUnread})
				),

				!(props.showFavMentionBadges && (props.channelId || props.guildId)) ? null : React.createElement(
					React.Fragment,
					{},
					!props.showEmptyFavBadges && props.mentionCount === 0 ? null : React.createElement(FavMentionBadge, {mentionCount: props.mentionCount})
				),

				!(props.showFavTypingBadge && (props.channelId || props.guildId)) ? null : React.createElement(
					React.Fragment,
					{},
					React.createElement(FavTypingBadge, {isTyping: props.isTyping, userIds: getChannelTypingUsers(props.channelId)})
				)
			);

			//#endregion

			//#region Misc. Definitions

			const NewTab = props=>React.createElement(
				"div",
				{
					className: "channelTabs-newTab",
					onClick: props.openNewTab
				},
				React.createElement(PlusAlt, {})
			);		

			//#endregion

			//#region FavItems/FavFolders Definitions

			const NoFavItemsPlaceholder = props=>React.createElement("span", {
				className: "channelTabs-noFavNotice"
			}, "You don't have any favs yet. Right click a tab to mark it as favourite. You can disable this bar in the settings."
			);

			const FavItems = props=>{
				var isDefault = (props.group === null);

				return props.favs.filter(item => item).map(
					(fav, favIndex) => 
					{
						var canCreate = (isDefault ? fav.groupId === -1 : fav.groupId === props.group.groupId);
						return canCreate ? React.createElement(
							Flux.connectStores([UnreadStateStore, UserTypingStore, SelectedChannelStore], ()=> updateFavEntry(fav))
							(
								result => React.createElement(
									Fav,
									{
										name: fav.name,
										iconUrl: fav.iconUrl,
										url: fav.url,
										favCount: props.favs.length,
										favGroups: props.favGroups,
										rename: ()=>props.rename(fav.name, favIndex),
										delete: ()=>props.delete(favIndex),
										openInNewTab: ()=>props.openInNewTab(fav),
										moveLeft: ()=>props.move(favIndex, (favIndex + props.favs.length - 1) % props.favs.length),
										moveRight: ()=>props.move(favIndex, (favIndex + 1) % props.favs.length),
										minimizeFav: props.minimizeFav,
										minimized: fav.minimized,
										moveToFavGroup: props.moveToFavGroup,
										moveFav: props.move,
										favIndex,
										channelId: fav.channelId,
										guildId: fav.guildId,
										groupId: fav.groupId,
										showFavUnreadBadges: props.showFavUnreadBadges,
										showFavMentionBadges: props.showFavMentionBadges,
										showFavTypingBadge: props.showFavTypingBadge,
										showEmptyFavBadges: props.showEmptyFavBadges,
										isTyping: isChannelTyping(fav.channelId),
										currentStatus: getCurrentUserStatus(fav.url),
										...result
									}
								)
							)
						) : null;
					}
				);
			};

			const FavFolder = props=>React.createElement(
					"div", 
					{
						className: "channelTabs-favGroup",
						onContextMenu: e=>{CreateFavGroupContextMenu(props,e)},
						onMouseOver: e=> {
							if (currentGroupDragIndex == props.groupIndex || currentGroupDragIndex == -1) return;
							currentGroupDragDestinationIndex = props.groupIndex;
						},					
						onMouseDown: e => {
							let mouseMove = e2 => {
								if (Math.sqrt((e.pageX - e2.pageX)**2) > 20 || Math.sqrt((e.pageY - e2.pageY)**2) > 20) {
									currentGroupDragIndex = props.groupIndex;
									document.removeEventListener("mousemove", mouseMove);
									document.removeEventListener("mouseup", mouseUp);
									let dragging = e3 => {
										if (currentGroupDragIndex != currentGroupDragDestinationIndex)
										{
											if (currentGroupDragDestinationIndex != -1)
											{
												props.moveFavGroup(currentGroupDragIndex, currentGroupDragDestinationIndex);
												currentGroupDragDestinationIndex = currentGroupDragDestinationIndex;
												currentGroupDragIndex = currentGroupDragDestinationIndex;
											}
										}
									};
									let releasing = e3 => {
										document.removeEventListener("mousemove", dragging);
										document.removeEventListener("mouseup", releasing);
										currentGroupDragIndex = -1;
										currentGroupDragDestinationIndex = -1;
									};
									document.addEventListener("mousemove", dragging);
									document.addEventListener("mouseup", releasing);
								}
							};
							let mouseUp = _ => {
								document.removeEventListener("mousemove", mouseMove);
								document.removeEventListener("mouseup", mouseUp);
							};
							document.addEventListener("mousemove", mouseMove);
							document.addEventListener("mouseup", mouseUp);
						}
					}, 
				React.createElement(
					"div", 
					{
						className: "channelTabs-favGroupBtn",
						onClick: () => {
							closeAllDropdowns();
							document.getElementById("favGroup-content-" + props.groupIndex).classList.toggle("channelTabs-favGroupShow");
							currentGroupOpened = props.groupIndex;			
						}
					}, 
					props.favGroup.name,
					props.showFavGroupMentionBadges ? props.mentionCountGroup == 0 && !props.showEmptyFavGroupBadges ? null : React.createElement(FavMentionBadge, {mentionCount: props.mentionCountGroup}) : null,
					props.showFavGroupUnreadBadges ? props.unreadCountGroup == 0 &&  !props.showEmptyFavGroupBadges ? null : React.createElement(FavUnreadBadge, {unreadCount: props.unreadCountGroup, unreadEstimated: props.unreadEstimatedGroup, hasUnread: props.hasUnreadGroup}) : null,
					props.showFavGroupTypingBadge && (props.isTypingGroup) ? React.createElement(FavTypingBadge, {isTyping: props.isTypingGroup, userIds: null}) : null
				), 
				React.createElement(
					"div", 
					{
						className: "channelTabs-favGroup-content" + (currentGroupOpened === props.groupIndex ? " channelTabs-favGroupShow" : ""),
						id: "favGroup-content-" + props.groupIndex
					}, 
					React.createElement(FavItems, {group: props.favGroup, ...props})
				)
			);
			
			const FavFolders = (props)=>{		
				return props.favGroups.map((favGroup, index) =>
					{
						return React.createElement(Flux.connectStores([UnreadStateStore, SelectedChannelStore, UserTypingStore], () => 
						{

							var unreadCount = 0;
							var unreadEstimated = 0;
							var hasUnread = false;
							var mentionCount = 0;
							var isTyping = false;

							props.favs.filter(item => item).forEach((fav, favIndex) => 
								{									
									var canCreate = fav.groupId === favGroup.groupId;
									if (canCreate) 
									{
										var hasUnreads = isChannelDM(fav.channelId);
										var result = updateFavEntry(fav);
										if (!hasUnreads) unreadCount += result.unreadCount;
										mentionCount += result.mentionCount;
										if (!hasUnreads) unreadEstimated += result.unreadEstimated;
										if (!hasUnreads) hasUnread = (result.hasUnread ? true : hasUnread);
										isTyping = (result.isTyping ? true : isTyping);
									} 
								}
							);
							return {
								unreadCount,
								mentionCount,
								unreadEstimated,
								mentionCount,
								hasUnread,
								isTyping
							};
						})
						(
							result => 
							{
								return React.createElement(FavFolder,
								{
									groupIndex: index,
									groupCount: props.favGroups.length,
									favGroup: favGroup,
									unreadCountGroup: result.unreadCount,
									unreadEstimatedGroup: result.unreadEstimated,
									mentionCountGroup: result.mentionCount,
									hasUnreadGroup: result.hasUnread,
									isTypingGroup: result.isTyping,
									showFavGroupUnreadBadges: props.showFavGroupUnreadBadges,
									showFavGroupMentionBadges: props.showFavGroupMentionBadges,
									showFavGroupTypingBadge: props.showFavGroupTypingBadge,
									showEmptyFavGroupBadges: props.showEmptyFavGroupBadges,
									...props
								});
							}
						));
					}
				);
			};

			//#endregion
						
			//#region FavBar/TopBar/TabBar Definitions

			function nextTab(){
				if(TopBarRef.current) TopBarRef.current.switchToTab((TopBarRef.current.state.selectedTabIndex + 1) % TopBarRef.current.state.tabs.length);
			}

			function previousTab(){
				if(TopBarRef.current) TopBarRef.current.switchToTab((TopBarRef.current.state.selectedTabIndex - 1 + TopBarRef.current.state.tabs.length) % TopBarRef.current.state.tabs.length);
			}

			function closeCurrentTab(){
				if(TopBarRef.current) TopBarRef.current.closeTab(TopBarRef.current.state.selectedTabIndex);
			}

			const TabBar = props=>React.createElement(
				"div",
				{
					className: "channelTabs-tabContainer",
					"data-tab-count": props.tabs.length
				},
				React.createElement("div", {
					className: "channelTabs-tabNav"
				},
					React.createElement("div", {
						className: "channelTabs-tabNavLeft",
						onClick: () =>{ TopBarRef.current.state.useStandardNav ? NavShortcuts.NAVIGATE_BACK.action() : previousTab(); },
						onContextMenu: () =>{ !TopBarRef.current.state.useStandardNav ? NavShortcuts.NAVIGATE_BACK.action() : previousTab(); }
					},
					React.createElement(LeftCaret, {})),
					React.createElement("div", {
						className: "channelTabs-tabNavRight",
						onClick: () =>{ TopBarRef.current.state.useStandardNav ? NavShortcuts.NAVIGATE_FORWARD.action() : nextTab(); },
						onContextMenu: () =>{ !TopBarRef.current.state.useStandardNav ? NavShortcuts.NAVIGATE_FORWARD.action() : nextTab(); }
					},
					React.createElement(RightCaret, {})),
					React.createElement("div", {
						className: "channelTabs-tabNavClose",
						onClick: () =>{ closeCurrentTab() },
						onContextMenu: props.openNewTab
					},
					React.createElement(Close, {}))
				),
				props.tabs.map((tab, tabIndex)=>React.createElement(Flux.connectStores([UnreadStateStore, UserTypingStore, UserStatusStore], ()=>({
					unreadCount: UnreadStateStore.getUnreadCount(tab.channelId),
					unreadEstimated: UnreadStateStore.isEstimated(tab.channelId),
					hasUnread: UnreadStateStore.hasUnread(tab.channelId),
					mentionCount: UnreadStateStore.getMentionCount(tab.channelId),
					hasUsersTyping: isChannelTyping(tab.channelId),
					currentStatus: getCurrentUserStatus(tab.url)
				}))(result => React.createElement(
					Tab,
					{
						switchToTab: props.switchToTab,
						closeTab: props.closeTab,
						addToFavs: props.addToFavs,
						minimizeTab: props.minimizeTab,
						moveLeft: ()=>props.move(tabIndex, (tabIndex + props.tabs.length - 1) % props.tabs.length),
						moveRight: ()=>props.move(tabIndex, (tabIndex + 1) % props.tabs.length),
						openInNewTab: ()=>props.openInNewTab(tab),
						moveTab: props.move,
						tabCount: props.tabs.length,
						tabIndex,
						name: tab.name,
						iconUrl: tab.iconUrl,
						currentStatus: result.currentStatus,
						url: tab.url,
						selected: tab.selected,
						minimized: tab.minimized,
						channelId: tab.channelId,
						unreadCount: result.unreadCount,
						unreadEstimated: result.unreadEstimated,
						hasUnread: result.hasUnread,
						mentionCount: result.mentionCount,
						hasUsersTyping: result.hasUsersTyping,
						showTabUnreadBadges: props.showTabUnreadBadges,
						showTabMentionBadges: props.showTabMentionBadges,
						showTabTypingBadge: props.showTabTypingBadge,
						showEmptyTabBadges: props.showEmptyTabBadges,
						showActiveTabUnreadBadges: props.showActiveTabUnreadBadges,
						showActiveTabMentionBadges: props.showActiveTabMentionBadges,
						showActiveTabTypingBadge: props.showActiveTabTypingBadge,
						showEmptyActiveTabBadges: props.showEmptyActiveTabBadges,
						compactStyle: props.compactStyle
					}
				)))),
				React.createElement(NewTab, {
					openNewTab: props.openNewTab
				})
			);
			
			const FavBar = props=>React.createElement(
				"div",
				{
					className: "channelTabs-favContainer" + (props.favs.length == 0 ? " channelTabs-noFavs" : ""),
					"data-fav-count": props.favs.length,
					onContextMenu: e=>{CreateFavBarContextMenu(props, e);}
				},
				React.createElement(FavFolders, props),
				props.favs.length > 0 ? React.createElement(FavItems, {group: null, ...props}) : React.createElement(NoFavItemsPlaceholder, {}),
			);

			const TopBar = class TopBar extends React.Component {

				//#region Constructor

				constructor(props){
					super(props);
					this.state = {
						selectedTabIndex: Math.max(props.tabs.findIndex(tab => tab.selected), 0),
						tabs: props.tabs,
						favs: props.favs,
						favGroups: props.favGroups,
						reopenLastChannel: props.reopenLastChannel,
						showTabBar: props.showTabBar,
						showFavBar: props.showFavBar,
						showFavUnreadBadges: props.showFavUnreadBadges,
						showFavMentionBadges: props.showFavMentionBadges,
						showFavTypingBadge: props.showFavTypingBadge,
						showEmptyFavBadges: props.showEmptyFavBadges,
						showTabUnreadBadges: props.showTabUnreadBadges,
						showTabMentionBadges: props.showTabMentionBadges,
						showTabTypingBadge: props.showTabTypingBadge,
						showEmptyTabBadges: props.showEmptyTabBadges,
						showActiveTabUnreadBadges: props.showActiveTabUnreadBadges,
						showActiveTabMentionBadges: props.showActiveTabMentionBadges,
						showActiveTabTypingBadge: props.showActiveTabTypingBadge,
						showEmptyActiveTabBadges: props.showEmptyActiveTabBadges,
						showFavGroupUnreadBadges: props.showFavGroupUnreadBadges,
						showFavGroupMentionBadges: props.showFavGroupMentionBadges,
						showFavGroupTypingBadge: props.showFavGroupTypingBadge,
						showEmptyFavGroupBadges: props.showEmptyFavGroupBadges,
						addFavGroup: props.addFavGroup,
						compactStyle: props.compactStyle,
						showQuickSettings: props.showQuickSettings,
						showNavButtons: props.showNavButtons,
						alwaysFocusNewTabs: props.alwaysFocusNewTabs,
						useStandardNav: props.useStandardNav,
					};
					this.switchToTab = this.switchToTab.bind(this);
					this.closeTab = this.closeTab.bind(this);
					this.saveChannel = this.saveChannel.bind(this);
					this.renameFav = this.renameFav.bind(this);
					this.deleteFav = this.deleteFav.bind(this);
					this.addToFavs = this.addToFavs.bind(this);
					this.minimizeTab = this.minimizeTab.bind(this);
					this.minimizeFav = this.minimizeFav.bind(this);
					this.moveTab = this.moveTab.bind(this);
					this.moveFav = this.moveFav.bind(this);
					this.addFavGroup = this.addFavGroup.bind(this);
					this.moveToFavGroup = this.moveToFavGroup.bind(this);
					this.renameFavGroup = this.renameFavGroup.bind(this);
					this.removeFavGroup = this.removeFavGroup.bind(this);
					this.moveFavGroup = this.moveFavGroup.bind(this);
					this.openNewTab = this.openNewTab.bind(this);
					this.openTabInNewTab = this.openTabInNewTab.bind(this);
					this.openFavInNewTab = this.openFavInNewTab.bind(this);
					this.openFavGroupInNewTab = this.openFavGroupInNewTab.bind(this);
					this.hideFavBar = this.hideFavBar.bind(this);
				}

				//#endregion

				//#region Tab Functions

				minimizeTab(tabIndex){
					this.setState({
						tabs: this.state.tabs.map((tab, index) => {
							if(index == tabIndex) return Object.assign({}, tab, {minimized: !tab.minimized});
							else return Object.assign({}, tab); // or return tab;
						})
					}, this.props.plugin.saveSettings);
				}

				switchToTab(tabIndex){
					this.setState({
						tabs: this.state.tabs.map((tab, index) => {
							if(index === tabIndex){
								return Object.assign({}, tab, {selected: true});
							}else{
								return Object.assign({}, tab, {selected: false});
							}
						}),
						selectedTabIndex: tabIndex
					}, this.props.plugin.saveSettings);
					switching = true;
					NavigationUtils.transitionTo(this.state.tabs[tabIndex].url);
					switching = false;
				}
				
				closeTab(tabIndex, mode){

					if(this.state.tabs.length === 1) return;
					if (mode === "single" || mode == null)
					{
						this.setState({
							tabs: this.state.tabs.filter((tab, index)=>index !== tabIndex),
							selectedTabIndex: Math.max(0, this.state.selectedTabIndex - (this.state.selectedTabIndex >= tabIndex ? 1 : 0))
						}, ()=>{
							if(!this.state.tabs[this.state.selectedTabIndex].selected){
								this.switchToTab(this.state.selectedTabIndex);
							}
							this.props.plugin.saveSettings();
						});
					}
					else if (mode == "other")
					{
						this.setState({
							tabs: this.state.tabs.filter((tab, index)=>index === tabIndex),
							selectedTabIndex: 0
						}, ()=>{
							if(!this.state.tabs[0].selected){
								this.switchToTab(this.state.selectedTabIndex);
							}
							this.props.plugin.saveSettings();
						});
					}
					else if (mode === "left")
					{
						this.setState({
							tabs: this.state.tabs.filter((tab, index)=>index >= tabIndex),
							selectedTabIndex: 0
						}, ()=>{
							if(!this.state.tabs[this.state.selectedTabIndex].selected){
								this.switchToTab(this.state.selectedTabIndex);
							}
							this.props.plugin.saveSettings();
						});
					}
					else if (mode === "right")
					{
						this.setState({
							tabs: this.state.tabs.filter((tab, index)=>index <= tabIndex),
							selectedTabIndex: tabIndex
						}, ()=>{
							if(!this.state.tabs[this.state.selectedTabIndex].selected){
								this.switchToTab(this.state.selectedTabIndex);
							}
							this.props.plugin.saveSettings();
						});
					}


				}

				moveTab(fromIndex, toIndex){
					if(fromIndex === toIndex) return;
					const tabs = this.state.tabs.filter((tab, index)=>index !== fromIndex);
					tabs.splice(toIndex, 0, this.state.tabs[fromIndex]);
					this.setState({
						tabs,
						selectedTabIndex: tabs.findIndex(tab=>tab.selected)
					}, this.props.plugin.saveSettings);
				}

				//#endregion

				//#region Fav Functions

				hideFavBar(){
					this.setState({
						showFavBar: false
					}, ()=>{
						this.props.plugin.settings.showFavBar = false;
						this.props.plugin.saveSettings();
					});
				}

				renameFav(currentName, favIndex){
					let name = currentName;
					BdApi.showConfirmationModal(
						"What should the new name be?",
						React.createElement(Textbox, {
							onChange: newContent=>name = newContent.trim()
						}),
						{
							onConfirm: ()=>{
								if(!name) return;
								this.setState({
									favs: this.state.favs.map((fav, index)=>{
										if(index === favIndex) return Object.assign({}, fav, {name});
										else return Object.assign({}, fav);
									})
								}, this.props.plugin.saveSettings);
							}
						}
					);
				}

				minimizeFav(favIndex){
					this.setState({
						favs: this.state.favs.map((fav, index) => {
							if(index == favIndex) return Object.assign({}, fav, {minimized: !fav.minimized});
							else return Object.assign({}, fav); // or return tab;
						})
					}, this.props.plugin.saveSettings);
				}

				deleteFav(favIndex){
					this.setState({
						favs: this.state.favs.filter((fav, index)=>index!==favIndex)
					}, this.props.plugin.saveSettings);
				}

				/**
				 * The guildId parameter is only passed when the guild is saved and not the channel alone.
				 * This indicates that the currently selected channel needs to get selected instead of the
				 * provided channel id (which should be empty when a guildId is provided)
				 */
				addToFavs(name, iconUrl, url, channelId, guildId){
					var groupId = -1;
					this.setState({
						favs: [...this.state.favs, {name, iconUrl, url, channelId, guildId, groupId}]
					}, this.props.plugin.saveSettings);
				}

				moveFav(fromIndex, toIndex){
					if(fromIndex === toIndex) return;
					const favs = this.state.favs.filter((fav, index)=>index !== fromIndex);
					favs.splice(toIndex, 0, this.state.favs[fromIndex]);
					this.setState({favs}, this.props.plugin.saveSettings);
				}

				//#endregion

				//#region Fav Group Functions

				createFavGroupId()
				{
					var generatedId = this.state.favGroups.length;
					var isUnique = false;
					var duplicateFound = false;

					while (!isUnique) 
					{
						for (var i = 0; i < this.state.favGroups.length; i++)
						{
							var group = this.state.favGroups[i];
							if (generatedId === group.groupId) duplicateFound = true;
						}
						if (!duplicateFound) isUnique = true;
						else
						{
							generatedId++;
							duplicateFound = false;
						} 		
					}
					return generatedId;
				}

				addFavGroup()
				{
					let name = "New Group";
					BdApi.showConfirmationModal(
						"What should the new name be?",
						React.createElement(Textbox, {
							onChange: newContent=>name = newContent.trim()
						}),
						{
							onConfirm: ()=>{
								if(!name) return;
								this.setState({
									favGroups: [...this.state.favGroups, {name: name, groupId: this.createFavGroupId()}]
								}, this.props.plugin.saveSettings);
							}
						}
					);
				}

				renameFavGroup(currentName, groupId)
				{
					let name = currentName;
					BdApi.showConfirmationModal(
						"What should the new name be?",
						React.createElement(Textbox, {
							onChange: newContent=>name = newContent.trim()
						}),
						{
							onConfirm: ()=>{
								if(!name) return;
								this.setState({
									favGroups: this.state.favGroups.map((group, index)=>{
										if(group.groupId === groupId) return Object.assign({}, group, {name});
										else return Object.assign({}, group);
									})
								}, this.props.plugin.saveSettings);
							}
						}
					);
				}

				removeFavGroup(groupId)
				{
					this.setState({
						favGroups: this.state.favGroups.filter((group, index)=>group.groupId!==groupId)
					}, this.props.plugin.saveSettings);

					this.setState({
						favs: this.state.favs.map((fav, index)=>{
							if(fav.groupId === groupId) return Object.assign({}, fav, {groupId: -1});
							else return Object.assign({}, fav);
						})
					}, this.props.plugin.saveSettings);
				}

				moveToFavGroup(favIndex, groupId)
				{
					this.setState({
						favs: this.state.favs.map((fav, index)=>{
							if (index === favIndex) 
							{
								return Object.assign({}, fav, {groupId: groupId});
							} 
							else 
							{
								return Object.assign({}, fav);
							}
						})
					}, this.props.plugin.saveSettings);
				}

				moveFavGroup(fromIndex, toIndex){
					if(fromIndex === toIndex) return;
					const favGroups = this.state.favGroups.filter((group, index)=>index !== fromIndex);
					favGroups.splice(toIndex, 0, this.state.favGroups[fromIndex]);
					this.setState({favGroups: favGroups}, this.props.plugin.saveSettings);
				}

				//#endregion

				//#region New Tab Functions

				saveChannel(guildId, channelId, name, iconUrl)
				{
					if (this.state.alwaysFocusNewTabs) 
					{
						//Open and Focus New Tab
						const newTabIndex = this.state.tabs.length;
						this.setState({
							tabs: [...this.state.tabs.map(tab=>Object.assign(tab, {selected: false})), {
								url: `/channels/${guildId || "@me"}/${channelId}`,
								name,
								iconUrl,
								channelId,
								minimized: false,
								groupId: -1
							}],
							selectedTabIndex: newTabIndex
						}, ()=>{
							this.props.plugin.saveSettings();
							this.switchToTab(newTabIndex);
						});
					}
					else 
					{
						//Open New Tab
						this.setState({
							tabs: [...this.state.tabs, {
								url: `/channels/${guildId || "@me"}/${channelId}`,
								name,
								iconUrl,
								channelId,
								minimized: false,
								groupId: -1
							}]
						}, this.props.plugin.saveSettings);
					}

				}

				openNewTab() {
					const newTabIndex = this.state.tabs.length;
					this.setState({
						tabs: [...this.state.tabs.map(tab=>Object.assign(tab, {selected: false})), {
							url: "/channels/@me",
							name: "Friends",
							selected: true,
							channelId: undefined
						}],
						selectedTabIndex: newTabIndex
					}, ()=>{
						this.props.plugin.saveSettings();
						this.switchToTab(newTabIndex);
					});
				}

				openTabInNewTab(tab)
				{
					//Used to Duplicate Tabs
					this.setState({
						tabs: [...this.state.tabs, Object.assign({}, tab, {selected: false})]
					}, this.props.plugin.saveSettings);
				}

				openFavInNewTab(fav, isGroup)
				{
					if (this.state.alwaysFocusNewTabs && !isGroup) 
					{
						//Opens and Focuses New Tab
						const newTabIndex = this.state.tabs.length;
						const url = fav.url + (fav.guildId ? `/${fav.guildId}` : "");
						this.setState({
							tabs: [...this.state.tabs.map(tab=>Object.assign(tab, {selected: false})), {
								url,
								name: getCurrentName(url),
								iconUrl: getCurrentIconUrl(url),
								currentStatus: getCurrentUserStatus(url),
								channelId: fav.channelId || SelectedChannelStore.getChannelId(fav.guildId)
							}],
							selectedTabIndex: newTabIndex
						}, ()=>{
							this.props.plugin.saveSettings();
							this.switchToTab(newTabIndex);
						});
					}
					else 
					{
						//Opens New Tab
						const url = fav.url + (fav.guildId ? `/${fav.guildId}` : "");
						this.setState({
							tabs: [...this.state.tabs, {
								url,
								selected: false,
								name: getCurrentName(url),
								iconUrl: getCurrentIconUrl(url),
								currentStatus: getCurrentUserStatus(url),
								channelId: fav.channelId || SelectedChannelStore.getChannelId(fav.guildId)
							}]
						}, this.props.plugin.saveSettings);
					}
				}

				openFavGroupInNewTab(groupId)
				{
					this.state.favs.filter(item => item).map(
						(fav, favIndex) => 
						{
							var canCreate = (fav.groupId === groupId);
							if (canCreate) 
							{
								this.openFavInNewTab(fav, true);
							}
						}
					)
				}

				//#endregion

				//#region Other Functions

				render(){
					return React.createElement(
						"div",
						{
							id: "channelTabs-container"
						},
						!this.state.showQuickSettings ? null : React.createElement('div', 
						{
							id: "channelTabs-settingsMenu",
							dangerouslySetInnerHTML: { __html: SettingsMenuIcon },
							onClick: e=>{CreateSettingsContextMenu(this,e);}
						}),
						!this.state.showTabBar ? null : React.createElement(TabBar, {
							tabs: this.state.tabs,
							showTabUnreadBadges: this.state.showTabUnreadBadges,
							showTabMentionBadges: this.state.showTabMentionBadges,
							showTabTypingBadge: this.state.showTabTypingBadge,
							showEmptyTabBadges: this.state.showEmptyTabBadges,
							showActiveTabUnreadBadges: this.state.showActiveTabUnreadBadges,
							showActiveTabMentionBadges: this.state.showActiveTabMentionBadges,
							showActiveTabTypingBadge: this.state.showActiveTabTypingBadge,
							showEmptyActiveTabBadges: this.state.showEmptyActiveTabBadges,
							compactStyle: this.state.compactStyle,
							privacyMode: this.state.privacyMode,
							radialStatusMode: this.state.radialStatusMode,
							tabWidthMin: this.state.tabWidthMin,
							closeTab: this.closeTab,
							switchToTab: this.switchToTab,
							openNewTab: this.openNewTab,
							openInNewTab: this.openTabInNewTab,
							addToFavs: this.addToFavs,
							minimizeTab: this.minimizeTab,
							move: this.moveTab
						}),
						!this.state.showFavBar ? null : React.createElement(FavBar, {
							favs: this.state.favs,
							favGroups: this.state.favGroups,
							showFavUnreadBadges: this.state.showFavUnreadBadges,
							showFavMentionBadges: this.state.showFavMentionBadges,
							showFavTypingBadge: this.state.showFavTypingBadge,
							showEmptyFavBadges: this.state.showEmptyFavBadges,
							privacyMode: this.state.privacyMode,
							radialStatusMode: this.state.radialStatusMode,
							showFavGroupUnreadBadges: this.state.showFavGroupUnreadBadges,
							showFavGroupMentionBadges: this.state.showFavGroupMentionBadges,
							showFavGroupTypingBadge: this.state.showFavGroupTypingBadge,
							showEmptyFavGroupBadges: this.state.showEmptyFavGroupBadges,
							rename: this.renameFav,
							delete: this.deleteFav,
							addToFavs: this.addToFavs,
							minimizeFav: this.minimizeFav,
							openInNewTab: this.openFavInNewTab,
							move: this.moveFav,
							moveFavGroup: this.moveFavGroup,
							addFavGroup: this.addFavGroup,
							moveToFavGroup: this.moveToFavGroup,
							removeFavGroup: this.removeFavGroup,
							renameFavGroup: this.renameFavGroup,
							openFavGroupInNewTab: this.openFavGroupInNewTab,
							hideFavBar: this.hideFavBar
						})
					);
				}

				//#endregion
			
			};

			const TopBarRef = React.createRef();

			//#endregion

			//#region Plugin Decleration

			return class ChannelTabs extends Plugin 
			{
				//#region Start/Stop Functions

				constructor(){
					super();
				}
				
				onStart(isRetry = false){
					//console.warn("CT Start");
					if(isRetry && !BdApi.Plugins.isEnabled(config.info.name)) return;
					if(!UserStore.getCurrentUser()) return setTimeout(()=>this.onStart(true), 1000);
					//console.warn(UserStore.getCurrentUser());
					patches = [];
					this.loadSettings();
					this.applyStyle();
					this.ifNoTabsExist();
					this.promises = {state:{cancelled: false}, cancel(){this.state.cancelled = true;}};
					this.saveSettings = this.saveSettings.bind(this);
					this.keybindHandler = this.keybindHandler.bind(this);
					this.onSwitch();
					this.patchAppView(this.promises.state);
					this.patchContextMenus();
					this.ifReopenLastChannelDefault();
					document.addEventListener("keydown", this.keybindHandler);
					window.onclick = (event) => this.clickHandler(event);
				}
				
				onStop(){
					this.removeStyle();
					document.removeEventListener("keydown", this.keybindHandler);
					window.onclick = null;
					Patcher.unpatchAll();
					this.promises.cancel();
					patches.forEach(patch=>patch());

				}

				//#endregion
				
				//#region Styles

				applyStyle()
				{
					const CompactVariables = `
						:root {	
							--channelTabs-tabHeight: 22px;
							--channelTabs-favHeight: 22px;
							--channelTabs-tabNameFontSize: 12px;
							--channelTabs-openTabSize: 18px;
						}
					`;

					const CozyVariables = `
						:root {	
							--channelTabs-tabHeight: 32px;
							--channelTabs-favHeight: 28px;
							--channelTabs-tabNameFontSize: 13px;
							--channelTabs-openTabSize: 24px;
						}
					`;

					const ConstantVariables = `
						:root {	
							--channelTabs-tabWidth: 220px;
							--channelTabs-tabWidthMin: ${this.settings.tabWidthMin}px;
						}
					`;

					const PrivacyStyle = `
						#app-mount .channelTabs-favGroupBtn {
							color: transparent !important;
						}

						#app-mount .channelTabs-tabName {
							color: transparent;
							background-color: var(--interactive-normal);
							opacity: 0.5;
						}
						
						#app-mount .channelTabs-selected .channelTabs-tabName {
							background-color: var(--interactive-active);
						}
						
						#app-mount .channelTabs-favName {
							color: transparent;
							background-color: var(--interactive-normal);
							opacity: 0.5;
						}
					`;

					const RadialStatusStyle = `
						.channelTabs-tabIconWrapper,
						.channelTabs-favIconWrapper {
							overflow: visible;
						}

						.channelTabs-tabIconWrapper img[src*="com/avatars/"],
						.channelTabs-favIconWrapper img[src*="com/avatars/"] {
							-webkit-clip-path: inset(1px round 50%);
							clip-path: inset(2px round 50%);
						}
						
						.channelTabs-tabIconWrapper rect,
						.channelTabs-favIconWrapper rect {
							x: 0;
							y: 0;
							rx: 50%;
							ry: 50%;
							-webkit-mask: none;
							mask: none;
							fill: none;
							height: 20px;
							width: 20px;
							stroke-width: 2px;
						}
						
						.channelTabs-onlineIcon {
							stroke: hsl(139, calc(var(--saturation-factor, 1) * 47.3%), 43.9%);
						}
						
						.channelTabs-idleIcon {
							stroke: hsl(38, calc(var(--saturation-factor, 1) * 95.7%), 54.1%);
						}
						
						.channelTabs-doNotDisturbIcon {
							stroke: hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%);
						}
						
						.channelTabs-offlineIcon {
							stroke: hsl(214, calc(var(--saturation-factor, 1) * 9.9%), 50.4%);
						}
					`;

					const tabNavStyle = `
						.channelTabs-tabContainer .channelTabs-tabNav {
							display:flex;
							margin: 0 6px 3px 0;
						}
						
						.channelTabs-tabNavClose svg {
							transform: scale(0.75);
						}
						
						.channelTabs-tabNavLeft svg,
						.channelTabs-tabNavRight svg {
							transform: scale(0.6);
						}
						
						/* if clickable */
						.channelTabs-tabContainer .channelTabs-tabNav>div:hover {
							color: var(--interactive-hover);
							background-color: var(--background-modifier-hover);
						}
						
						.channelTabs-tabContainer .channelTabs-tabNav>div:active {
							color: var(--interactive-active);
							background-color: var(--background-modifier-active);
						}
						
						/* if only 1 tab */
						.channelTabs-tabContainer[data-tab-count="1"] .channelTabs-tabNav>.channelTabs-tabNavClose {
							color: var(--interactive-muted);
							background: none;
						}
						
						.channelTabs-tabNav>div {
							display: flex;
							align-items: center;
							justify-content: center;
							height: var(--channelTabs-tabHeight);
							width: 32px;
							border-radius: 4px;
							margin-right: 3px;
							color: var(--interactive-normal);
						}
					`;
		
					const BaseStyle = `

					/* 
					//#region Tab Base/Container
					*/

					.channelTabs-tabNav {
						display:none;
					}

					/*
					//#macos
					*/

					.platform-osx .typeMacOS-3V4xXE {
						position: relative;
						width: 100%;
						-webkit-app-region: drag;
					}

					.platform-osx .typeMacOS-3V4xXE>*,
					.platform-osx .menu-1QACrS {
						-webkit-app-region: no-drag;
					}

					.platform-osx .wrapper-1_HaEi {
						margin-top: 0;
						padding-top: 0;
					}

					html:not(.platform-win) .sidebar-1tnWFu {
						border-radius: 8px 0 0;
						overflow: hidden;
					}

					/*
					//#endregion
					*/

					#channelTabs-container {
						z-index: 1000;
						padding: 4px 8px 1px 8px;
						background: none;
					}
					
					.channelTabs-tabContainer {
						display: flex;
						align-items: center;
						flex-wrap:wrap;
					}

					#channelTabs-container>:not(#channelTabs-settingsMenu)+div {
						padding-top: 4px;
						border-top: 1px solid var(--background-modifier-accent);
					}

					.channelTabs-tab {
						display: flex;
						align-items: center;
						height: var(--channelTabs-tabHeight);
						background: none;
						border-radius: 4px;
						max-width: var(--channelTabs-tabWidth);
						min-width: var(--channelTabs-tabWidthMin);
						flex: 1 1 var(--channelTabs-tabWidthMin);
						margin-bottom: 3px;
					}
					
					.channelTabs-tab>div:first-child {
						display: flex;
						width: calc(100% - 16px);
						align-items: center;
					}
					
					.channelTabs-tab:not(.channelTabs-selected):hover {
						background: var(--background-modifier-hover);
					}

					.channelTabs-tab:not(.channelTabs-selected):active {
						background: var(--background-modifier-active);
					}
					
					.channelTabs-tab.channelTabs-selected {
						background: var(--background-modifier-selected);
					}

					.channelTabs-tab.channelTabs-unread:not(.channelTabs-selected),
					.channelTabs-tab.channelTabs-unread:not(.channelTabs-selected),
					.channelTabs-tab.channelTabs-mention:not(.channelTabs-selected) {
						color: var(--interactive-hover);
					}
					.channelTabs-tab.channelTabs-unread:not(.channelTabs-selected):hover,
					.channelTabs-tab.channelTabs-mention:not(.channelTabs-selected):hover {
						color: var(--interactive-active);
					}

					/*
					//#endregion
					*/

					/*
					//#region Quick Settings
					*/
					
					html:not(.platform-win) #channelTabs-settingsMenu {
						margin-right: 0;
					}

					#channelTabs-settingsMenu {
						position: absolute;
						right:0;
						width: 20px;
						height: 20px;
						z-index: 1000;
					}

					#channelTabs-settingsMenu:hover {
						background: var(--background-modifier-hover);
					}
					
					.channelTabs-settingsIcon {
						max-width: 40px;
						position: absolute;
						top: 50%;
						left: 50%;
						transform: translate(-50%, -50%);
						max-height: 40px;
					}

					/*
					//#endregion
					*/

					/*
					//#region Tab Name
					*/

					.channelTabs-tab .channelTabs-tabName {
						margin-right: 6px;
						font-size: var(--channelTabs-tabNameFontSize);
						line-height: normal;
						color: var(--interactive-normal);
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}

					.channelTabs-tab:not(.channelTabs-selected):hover .channelTabs-tabName {
						color: var(--interactive-hover);
					}
					
					.channelTabs-tab:not(.channelTabs-selected):active .channelTabs-tabName,
					.channelTabs-tab.channelTabs-selected .channelTabs-tabName {
						color: var(--interactive-active);
					}

					/*
					//#endregion
					*/

					/*
					//#region Tab Icon
					*/

					.channelTabs-tabIcon {
						height: 20px;
						border-radius: 50%;
						-webkit-user-drag: none;
					}

					.channelTabs-tabIconWrapper {
						margin: 0 6px;
						flex-shrink: 0;
					}

					.channelTabs-onlineIcon {
						fill: hsl(139, calc(var(--saturation-factor, 1) * 47.3%), 43.9%);
						mask: url(#svg-mask-status-online);
					}

					.channelTabs-idleIcon {
						fill: hsl(38, calc(var(--saturation-factor, 1) * 95.7%), 54.1%);
						mask: url(#svg-mask-status-idle);
					}

					.channelTabs-doNotDisturbIcon {
						fill: hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%);
						mask: url(#svg-mask-status-dnd);
					}

					.channelTabs-offlineIcon {
						fill: hsl(214, calc(var(--saturation-factor, 1) * 9.9%), 50.4%);
						mask: url(#svg-mask-status-offline);
					}

					/*
					//#endregion
					*/

					/*
					//#region Close Tab / New Tab
					*/

					.channelTabs-closeTab {
						position: relative;
						height: 16px;
						width: 16px;
						flex-shrink: 0;
						right: 6px;
						border-radius: 4px;
						color: var(--interactive-normal);
						cursor: pointer;
					}

					.channelTabs-closeTab svg {
						height: 100%;
						width: 100%;
						transform: scale(0.85);
					}
					
					.channelTabs-newTab {
						display:flex;
						align-items: center;
						justify-content: center;
						flex-shrink: 0;
						height: var(--channelTabs-openTabSize);
						width: 24px;
						margin: 0 6px 3px 6px;
						border-radius: 4px;
						cursor: pointer;
						color: var(--interactive-normal);
					}
					
					.channelTabs-newTab:hover {
						background: var(--background-modifier-hover);
						color: var(--interactive-hover);
					}
					
					.channelTabs-newTab:active {
						background: var(--background-modifier-active);
						color: var(--interactive-active);
					}

					.channelTabs-closeTab:hover {
						background: hsl(359,calc(var(--saturation-factor, 1)*82.6%),59.4%);
						color: white;
					}

					/*
					//#endregion
					*/

					/*
					//#region Badges
					*/

					.channelTabs-gridContainer {
						display: flex;
						margin-right: 6px;
					}

					.channelTabs-mentionBadge,
					.channelTabs-unreadBadge {
						border-radius: 8px;
						padding: 0 4px;
						min-width: 8px;
						width: fit-content;
						height: 16px;
						font-size: 12px;
						line-height: 16px;
						font-weight: 600;
						text-align: center;
						color: #fff;
					}
				
					.channelTabs-typingBadge {
						border-radius: 8px;
						padding-left: 4px;
						padding-right: 4px;
						min-width: 8px;
						width: fit-content;
						height: 16px;
						font-size: 12px;
						line-height: 16px;
						font-weight: 600;
						text-align: center;
						color: #fff;
					}

					.channelTabs-mentionBadge {
						background-color: hsl(359, calc(var(--saturation-factor, 1) * 82.6%), 59.4%);
					}
					.channelTabs-unreadBadge {
						background-color: hsl(235, calc(var(--saturation-factor, 1) * 86%), 65%);
					}

					.channelTabs-classicBadgeAlignment {
						margin-right: 6px;
						display: inline-block;
						float: right;
					}

					.channelTabs-badgeAlignLeft {
						float: left;
					}

					.channelTabs-badgeAlignRight {
						float: right;
					}

					.channelTabs-tab .channelTabs-mentionBadge,
					.channelTabs-tab .channelTabs-unreadBadge,
					.channelTabs-tab .channelTabs-typingBadge {
						height: 16px;
					}

					.channelTabs-tab .channelTabs-noMention,
					.channelTabs-tab .channelTabs-noUnread {
						background-color: var(--background-primary);
						color: var(--text-muted);
					}

					.channelTabs-fav .channelTabs-mentionBadge,
					.channelTabs-fav .channelTabs-unreadBadge {
						display: inline-block;
						vertical-align: bottom;
						float: right;
						margin-left: 2px;
					}

					.channelTabs-fav .channelTabs-typingBadge {
						display: inline-flex;
						vertical-align: bottom;
						float: right;
						margin-left: 2px;
						margin-right: 6px;
					}
				
					.channelTabs-fav .channelTabs-noMention,
					.channelTabs-fav .channelTabs-noUnread {
						background-color: var(--background-primary);
						color: var(--text-muted);
					}
					.channelTabs-fav .channelTabs-noTyping {
						display: none;
					}
					
					.channelTabs-fav .channelTabs-favName + div {
						margin-left: 6px;
					}

					.channelTabs-favGroupBtn .channelTabs-noMention,
					.channelTabs-favGroupBtn .channelTabs-noUnread {
						background-color: var(--background-primary);
						color: var(--text-muted);
					}

					.channelTabs-favGroupBtn .channelTabs-typingBadge {
						display: inline-flex;
						vertical-align: bottom;
						float: right;
						margin-left: 2px;
					}

					.channelTabs-favGroupBtn .channelTabs-mentionBadge,
					.channelTabs-favGroupBtn .channelTabs-unreadBadge {
						display: inline-block;
						vertical-align: bottom;
						float: right;
						margin-left: 2px;
					}

					.channelTabs-favGroupBtn .channelTabs-noTyping {
						display: none;
					}

					/*
					//#endregion
					*/

					/*
					//#region Favs
					*/

					.channelTabs-favContainer {
						display: flex;
						align-items: center;
						flex-wrap:wrap;
					}

					.channelTabs-fav {
						display: flex;
						align-items: center;
						min-width: 0;
						border-radius: 4px;
						height: var(--channelTabs-favHeight);
						background: none;
						flex: 0 0 1;
						max-width: var(--channelTabs-tabWidth);
						margin-bottom: 3px;
						padding-left: 6px;
						padding-right: 6px;
					}

					.channelTabs-fav:hover {
						background: var(--background-modifier-hover);
					}

					.channelTabs-fav:active {
						background: var(--background-modifier-active);
					}

					.channelTabs-favIcon {
						height: 20px;
						border-radius: 50%;
						-webkit-user-drag: none;
					}

					.channelTabs-favName {
						margin-left: 6px;
						font-size: var(--channelTabs-tabNameFontSize);
						line-height: normal;
						color: var(--interactive-normal);
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
					}

					.channelTabs-fav:hover .channelTabs-favName {
						color: var(--interactive-hover);
					}

					.channelTabs-fav:active .channelTabs-favName {
						color: var(--interactive-active);
					}
					
					.channelTabs-noFavNotice {
						color: var(--text-muted);
						font-size: 14px;
						padding: 3px;
					}

					/*
					//#endregion 
					*/

					/*
					//#region Fav Folders
					*/

					.channelTabs-favGroupBtn {
						display: flex;
						align-items: center;
						min-width: 0;
						border-radius: 4px;
						height: var(--channelTabs-favHeight);
						flex: 0 1 1;
						max-width: var(--channelTabs-tabWidth);
						padding: 0 6px;
						font-size: 12px;
						color: var(--interactive-normal);
						overflow: hidden;
						white-space: nowrap;
						text-overflow: ellipsis;
						margin-bottom: 3px;
					}
					
					.channelTabs-favGroupBtn>:first-child {
						margin-left: 6px;
					}

					.channelTabs-favGroup:hover .channelTabs-favGroupBtn {
						background: var(--background-modifier-hover);
					}
		
					.channelTabs-favGroup-content {
						z-index: 1001;
						display: none;
						position: absolute;
						min-width: max-content;
						background-color: var(--background-floating);
						-webkit-box-shadow: var(--elevation-high);
						box-shadow: var(--elevation-high);
						border-radius: 4px;
						padding: 4px;
					}
					
					.channelTabs-favGroup-content>:last-child {
						margin-bottom: 0;
					}

					.channelTabs-favGroupShow {
						display:block;
					}

					.channelTabs-sliderContainer {
						display: flex;
						justify-content: center;
						padding: 4px 8px;
						margin: 2px 6px 12px 6px;
						background: var(--slider-background-normal);
						border-radius: var(--slider-background-radius);
					}
					
					.channelTabs-slider {
						position: relative;
						top: -14px;
					}

					.channelTabs-minimized {
						--channelTabs-tabWidth: fit-content;
						--channelTabs-tabWidthMin: fit-content;
					}
					
					.channelTabs-tab.channelTabs-minimized>div>:first-child~*,
					.channelTabs-fav.channelTabs-minimized>svg:first-child~*,
					.channelTabs-tab.channelTabs-minimized>.channelTabs-closeTab {
						display:none;
					}

					/*
					//#endregion
					*/
					`;

					if (this.settings.compactStyle === true) PluginUtilities.addStyle("channelTabs-style-compact", CompactVariables);
					if (this.settings.compactStyle === false) PluginUtilities.addStyle("channelTabs-style-cozy", CozyVariables);
					if (this.settings.privacyMode === true) PluginUtilities.addStyle("channelTabs-style-private", PrivacyStyle);
					if (this.settings.radialStatusMode === true) PluginUtilities.addStyle("channelTabs-style-radialstatus", RadialStatusStyle);
					if (this.settings.showNavButtons === true) PluginUtilities.addStyle("channelTabs-style-tabnav", tabNavStyle);
					PluginUtilities.addStyle("channelTabs-style-constants", ConstantVariables);
					PluginUtilities.addStyle("channelTabs-style", BaseStyle);
				}

				removeStyle()
				{
					PluginUtilities.removeStyle("channelTabs-style-compact");
					PluginUtilities.removeStyle("channelTabs-style-cozy");
					PluginUtilities.removeStyle("channelTabs-style-private");
					PluginUtilities.removeStyle("channelTabs-style-radialstatus");
					PluginUtilities.removeStyle("channelTabs-style-tabnav");
					PluginUtilities.removeStyle("channelTabs-style-constants");
					PluginUtilities.removeStyle("channelTabs-style");
				}

				//#endregion

				//#region Init/Default Functions

				ifNoTabsExist()
				{
					if(this.settings.tabs.length == 0) this.settings.tabs = [{
						name: getCurrentName(),
						url: location.pathname,
						selected: true,
						iconUrl: getCurrentIconUrl()
					}];
				}


				ifReopenLastChannelDefault()
				{
					if(this.settings.reopenLastChannel)
					{
						switching = true;
						NavigationUtils.transitionTo((this.settings.tabs.find(tab=>tab.selected) || this.settings.tabs[0]).url);
						switching = false;
					}

				}

				//#endregion
				
				//#region Patches
				
				async patchAppView(promiseState)
				{
					const AppView = await ReactComponents.getComponent("Shakeable", `.${TopbarSelector.app}`);
					if(promiseState.cancelled) return;
					Patcher.after(AppView.component.prototype, "render", (thisObject, _, returnValue) => {
						returnValue.props.children = [
							React.createElement(TopBar, {
								reopenLastChannel: this.settings.reopenLastChannel,
								showTabBar: this.settings.showTabBar,
								showFavBar: this.settings.showFavBar,
								showFavUnreadBadges: this.settings.showFavUnreadBadges,
								showFavMentionBadges: this.settings.showFavMentionBadges,
								showFavTypingBadge: this.settings.showFavTypingBadge,
								showEmptyFavBadges: this.settings.showEmptyFavBadges,
								showTabUnreadBadges: this.settings.showTabUnreadBadges,
								showTabMentionBadges: this.settings.showTabMentionBadges,
								showTabTypingBadge: this.settings.showTabTypingBadge,
								showEmptyTabBadges: this.settings.showEmptyTabBadges,
								showActiveTabUnreadBadges: this.settings.showActiveTabUnreadBadges,
								showActiveTabMentionBadges: this.settings.showActiveTabMentionBadges,
								showActiveTabTypingBadge: this.settings.showActiveTabTypingBadge,
								showEmptyActiveTabBadges: this.settings.showEmptyActiveTabBadges,
								showFavGroupUnreadBadges: this.settings.showFavGroupUnreadBadges,
								showFavGroupMentionBadges: this.settings.showFavGroupMentionBadges,
								showFavGroupTypingBadge: this.settings.showFavGroupTypingBadge,
								showEmptyFavGroupBadges: this.settings.showEmptyFavGroupBadges,
								compactStyle: this.settings.compactStyle,
								privacyMode: this.settings.privacyMode,
								radialStatusMode: this.settings.radialStatusMode,
								tabWidthMin: this.settings.tabWidthMin,
								showQuickSettings: this.settings.showQuickSettings,
								showNavButtons: this.settings.showNavButtons,
								alwaysFocusNewTabs: this.settings.alwaysFocusNewTabs,
								useStandardNav: this.settings.useStandardNav,
								tabs: this.settings.tabs,
								favs: this.settings.favs,
								favGroups: this.settings.favGroups,
								ref: TopBarRef,
								plugin: this
							}),
							returnValue.props.children
						].flat();
					});
					const forceUpdate = ()=>{
						const { app } = getModule(byProps("app", "layers")) || {};
						const query = document.querySelector(`.${app}`);
						if(query) ReactTools.getOwnerInstance(query)?.forceUpdate?.();
					};
					forceUpdate();
					patches.push(()=>forceUpdate());
				}
				
				patchContextMenus()
				{
					patches.push(
						ContextMenu.patch("channel-context", (returnValue, props) => {
							if(!this.settings.showTabBar && !this.settings.showFavBar) return;
							returnValue.props.children.push(CreateTextChannelContextMenuChildren(this, props));
						}),

						ContextMenu.patch("user-context", (returnValue, props) => {
							if(!this.settings.showTabBar && !this.settings.showFavBar) return;
							if(!returnValue) return;
							if (!props.channel || props.channel.recipients.length !== 1 || props.channel.recipients[0] !== props.user.id) return;
							returnValue.props.children.push(CreateDMContextMenuChildren(this, props));
						}),

						ContextMenu.patch("gdm-context", (returnValue, props) => {
							if(!this.settings.showTabBar && !this.settings.showFavBar) return;
							if(!returnValue) return;
							returnValue.props.children.push(CreateGroupContextMenuChildren(this, props));
						}),

						ContextMenu.patch("guild-context", (returnValue, props) => {
							if(!this.settings.showTabBar && !this.settings.showFavBar) return;
							const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId(props.guild.id));
							returnValue.props.children.push(CreateGuildContextMenuChildren(this, props, channel));
						})
					);
				}

				//#endregion
				
				//#region Handlers

				clickHandler(e)
				{
					if (!e.target.matches('.channelTabs-favGroupBtn')) {
						closeAllDropdowns();
					}
				}
				
				keybindHandler(e)
				{
					const keybinds = [
						{altKey: false, ctrlKey: true, shiftKey: false, keyCode: 87 /*w*/, action: this.closeCurrentTab},
						{altKey: false, ctrlKey: true, shiftKey: false, keyCode: 33 /*pg_up*/, action: this.previousTab},
						{altKey: false, ctrlKey: true, shiftKey: false, keyCode: 34 /*pg_down*/, action: this.nextTab}
					];
					keybinds.forEach(keybind => {
						if(e.altKey === keybind.altKey && e.ctrlKey === keybind.ctrlKey && e.shiftKey === keybind.shiftKey && e.keyCode === keybind.keyCode) keybind.action();
					})
				}

				//#endregion

				//#region General Functions

				onSwitch(){
					if(switching) return;
					//console.log(this);
					if(TopBarRef.current){
						TopBarRef.current.setState({
							tabs: TopBarRef.current.state.tabs.map(tab => {
								if(tab.selected){
									const channelId = SelectedChannelStore.getChannelId();
									return {
										name: getCurrentName(),
										url: location.pathname,
										selected: true,
										currentStatus: getCurrentUserStatus(location.pathname),
										iconUrl: getCurrentIconUrl(location.pathname),
										channelId: channelId,
										minimized: this.settings.tabs[this.settings.tabs.findIndex(tab=>tab.selected)].minimized
									};
								}else{
									return Object.assign({}, tab);
								}
							})
						}, this.saveSettings);
					}else if(!this.settings.reopenLastChannel){
						const channelId = SelectedChannelStore.getChannelId();
						this.settings.tabs[this.settings.tabs.findIndex(tab=>tab.selected)] = {
							name: getCurrentName(),
							url: location.pathname,
							selected: true,
							currentStatus: getCurrentUserStatus(location.pathname),
							iconUrl: getCurrentIconUrl(location.pathname),
							channelId: channelId,
							minimized: this.settings.tabs[this.settings.tabs.findIndex(tab=>tab.selected)].minimized
						};
					}
				}

				mergeItems(itemsTab, itemsFav){
					const out = [];
					if(this.settings.showTabBar) out.push(...itemsTab);
					if(this.settings.showFavBar) out.push(...itemsFav);
					return out;
				}

				//#endregion
				
				//#region Hotkey Functions

				nextTab(){
					if(TopBarRef.current) TopBarRef.current.switchToTab((TopBarRef.current.state.selectedTabIndex + 1) % TopBarRef.current.state.tabs.length);
				}

				previousTab(){
					if(TopBarRef.current) TopBarRef.current.switchToTab((TopBarRef.current.state.selectedTabIndex - 1 + TopBarRef.current.state.tabs.length) % TopBarRef.current.state.tabs.length);
				}

				closeCurrentTab(){
					if(TopBarRef.current) TopBarRef.current.closeTab(TopBarRef.current.state.selectedTabIndex);
				}

				//#endregion

				//#region Settings
				
				get defaultVariables(){
					return {
						tabs: [],
						favs: [],
						favGroups: [],
						showTabBar: true,
						showFavBar: true,
						reopenLastChannel: false,
						showFavUnreadBadges: true,
						showFavMentionBadges: true,
						showFavTypingBadge: true,
						showEmptyFavBadges: false,
						showTabUnreadBadges: true,
						showTabMentionBadges: true,
						showTabTypingBadge: true,
						showEmptyTabBadges: false,
						showActiveTabUnreadBadges: false,
						showActiveTabMentionBadges: false,
						showActiveTabTypingBadge: false,
						showEmptyActiveTabBadges: false,
						compactStyle: false,
						privacyMode: false,
						radialStatusMode: false,
						tabWidthMin: 100,
						showFavGroupUnreadBadges: true,
						showFavGroupMentionBadges: true,
						showFavGroupTypingBadge: true,
						showEmptyFavGroupBadges: false,
						showQuickSettings: true,
						showNavButtons: true,
						alwaysFocusNewTabs: false,
						useStandardNav: true
					};
				}

				getSettingsPath(useOldLocation)
				{
					if (useOldLocation === true) 
					{
						return this.getName();
					}
					else 
					{
						const user_id = UserStore.getCurrentUser()?.id;
						return this.getName() + "_new" + (user_id != null ? "_" + user_id : "");
					}
				}
				
				loadSettings()
				{					
					if (Object.keys(PluginUtilities.loadSettings(this.getSettingsPath())).length === 0)
					{
						this.settings = PluginUtilities.loadSettings(this.getSettingsPath(true), this.defaultVariables);
					}
					else 
					{
						this.settings = PluginUtilities.loadSettings(this.getSettingsPath(), this.defaultVariables);
					}
					this.settings.favs = this.settings.favs.map(fav => {
						if(fav.channelId === undefined){
							const match = fav.url.match(/^\/channels\/[^\/]+\/(\d+)$/);
							if(match) return Object.assign(fav, {channelId: match[1]});
						}
						if (fav.groupId === undefined)
						{
							return Object.assign(fav, {groupId: -1});
						}
						return fav;
					});
					this.saveSettings();
				}

				saveSettings(){
					if(TopBarRef.current){
						this.settings.tabs = TopBarRef.current.state.tabs;
						this.settings.favs = TopBarRef.current.state.favs;
						this.settings.favGroups = TopBarRef.current.state.favGroups;
					}
					PluginUtilities.saveSettings(this.getSettingsPath(), this.settings);
				}
				
				getSettingsPanel(){
					const panel = document.createElement("div");
					panel.className = "form";
					panel.style = "width:100%;";

					//#region Startup Settings
					new Settings.SettingGroup("Startup Settings", {shown: true}).appendTo(panel)
						.append(new Settings.Switch("Reopen last channel", "When starting the plugin (or discord) the channel will be selected again instead of the friends page", this.settings.reopenLastChannel, checked=>{
							this.settings.reopenLastChannel = checked;
							this.saveSettings();
						}));
					//#endregion

					//#region General Appearance
					new Settings.SettingGroup("General Appearance").appendTo(panel)
						.append(new Settings.Switch("Show Tab Bar", "Allows you to have multiple tabs like in a web browser", this.settings.showTabBar, checked=>{
							this.settings.showTabBar = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showTabBar: checked
							});
							this.saveSettings();
						}))
						.append(new Settings.Switch("Show Fav Bar", "Allows you to add favorites by right clicking a tab or the fav bar", this.settings.showFavBar, checked=>{
							this.settings.showFavBar = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showFavBar: checked
							});
							this.saveSettings();
						}))
						.append(new Settings.Switch("Show Quick Settings", "Allows you to quickly change major settings from a context menu", this.settings.showQuickSettings, checked=>{
							this.settings.showQuickSettings = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showQuickSettings: checked
							});
							this.saveSettings();
						}))
						.append(new Settings.Switch("Show Navigation Buttons", "Click to go the left or right tab, this behavior can be changed in Behavior settings", this.settings.showNavButtons, checked=>{
							this.settings.showNavButtons = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showNavButtons: checked
							});
							this.removeStyle();
							this.applyStyle();
							this.saveSettings();
						}))
						.append(new Settings.Switch("Use Compact Look", "", this.settings.compactStyle, checked=>{
							this.settings.compactStyle = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								compactStyle: checked
							});
							this.removeStyle();
							this.applyStyle();
							this.saveSettings();
						}))
						.append(new Settings.Switch("Enable Privacy Mode", "Obfusicates all the Sensitive Text in ChannelTabs", this.settings.privacyMode, checked=>{
							this.settings.privacyMode = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								privacyMode: checked
							});
							this.removeStyle();
							this.applyStyle();
							this.saveSettings();
						}))
						.append(new Settings.Switch("Use Radial Status Indicators", "Changes the status indicator into a circular border", this.settings.radialStatusMode, checked=>{
							this.settings.radialStatusMode = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								radialStatusMode: checked
							});
							this.removeStyle();
							this.applyStyle();
							this.saveSettings();
						}))
						.append(new Settings.Slider("Minimum Tab Width", "Set the limit on how small a tab can be before overflowing to a new row", 
							58, 220,
							this.settings.tabWidthMin,
							value => (
								this.settings.tabWidthMin = Math.round(value), 
								this.saveSettings(),
								document.documentElement.style.setProperty("--channelTabs-tabWidthMin", this.settings.tabWidthMin + "px")
							),
							{
								defaultValue: 100,
								markers: [60, 85, 100, 125, 150, 175, 200, 220],
								units: 'px'
							}
						));

					//#endregion

					//#region Behavior Settings
					new Settings.SettingGroup("Behavior").appendTo(panel)

						.append(new Settings.Switch("Always Auto Focus New Tabs", "Forces all newly created tabs to bring themselves to focus", this.settings.alwaysFocusNewTabs, checked=>{
							this.settings.alwaysFocusNewTabs = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								alwaysFocusNewTabs: checked
							});
							this.saveSettings();
						}))
						
						.append(new Settings.Switch("Primary Forward/Back Navigation", "Instead of scrolling down the row, use the previous and next buttons to navigate between pages", this.settings.useStandardNav, checked=>{
							this.settings.useStandardNav = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								useStandardNav: checked
							});
							this.saveSettings();
						}));

					//#endregion

					//#region Badge Visibility - Favs

						new Settings.SettingGroup("Badge Visibility - Favorites").appendTo(panel)

							.append(new Settings.Switch("Show Unread", "", this.settings.showFavUnreadBadges, checked=>{
								this.settings.showFavUnreadBadges = checked;
								if(TopBarRef.current) TopBarRef.current.setState({
									showFavUnreadBadges: checked
								});
								this.saveSettings();
							}))

							.append(new Settings.Switch("Show Mentions", "", this.settings.showFavMentionBadges, checked=>{
								this.settings.showFavMentionBadges = checked;
								if(TopBarRef.current) TopBarRef.current.setState({
									showFavMentionBadges: checked
								});
								this.saveSettings();
							}))

							.append(new Settings.Switch("Show Typing", "", this.settings.showFavTypingBadge, checked=>{
								this.settings.showFavTypingBadge = checked;
								if(TopBarRef.current) TopBarRef.current.setState({
									showFavTypingBadge: checked
								});
								this.saveSettings();
							}))

							.append(new Settings.Switch("Show Empty", "", this.settings.showEmptyFavBadges, checked=>{
								this.settings.showEmptyFavBadges = checked;
								if(TopBarRef.current) TopBarRef.current.setState({
									showEmptyFavBadges: checked
								});
								this.saveSettings();
							}));

						

					//#endregion

					//#region Badge Visibility - Fav Groups

					new Settings.SettingGroup("Badge Visibility - Favorite Groups").appendTo(panel)

						.append(new Settings.Switch("Show Unread", "", this.settings.showFavGroupUnreadBadges, checked=>{
							this.settings.showFavGroupUnreadBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showFavGroupUnreadBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Mentions", "", this.settings.showFavGroupMentionBadges, checked=>{
							this.settings.showFavGroupMentionBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showFavGroupMentionBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Typing", "", this.settings.showFavGroupTypingBadge, checked=>{
							this.settings.showFavGroupTypingBadge = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showFavGroupTypingBadge: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Empty", "", this.settings.showEmptyGroupFavBadges, checked=>{
							this.settings.showEmptyGroupFavBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showEmptyGroupFavBadges: checked
							});
							this.saveSettings();
						}));

					//#endregion

					//#region Badge Visibility - Tabs

					new Settings.SettingGroup("Badge Visibility - Tabs").appendTo(panel)

						.append(new Settings.Switch("Show Unread", "", this.settings.showTabUnreadBadges, checked=>{
							this.settings.showTabUnreadBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showTabUnreadBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Mentions", "", this.settings.showTabMentionBadges, checked=>{
							this.settings.showTabMentionBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showTabMentionBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Typing", "", this.settings.showTabTypingBadge, checked=>{
							this.settings.showTabTypingBadge = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showTabTypingBadge: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Empty", "", this.settings.showEmptyTabBadges, checked=>{
							this.settings.showEmptyTabBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showEmptyTabBadges: checked
							});
							this.saveSettings();
						}));

					

					//#endregion

					//#region Badge Visibility - Active Tabs

					new Settings.SettingGroup("Badge Visibility - Active Tabs").appendTo(panel)

						.append(new Settings.Switch("Show Unread", "", this.settings.showActiveTabUnreadBadges, checked=>{
							this.settings.showActiveTabUnreadBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showActiveTabUnreadBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Mentions", "", this.settings.showActiveTabMentionBadges, checked=>{
							this.settings.showActiveTabMentionBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showActiveTabMentionBadges: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Typing", "", this.settings.showActiveTabTypingBadge, checked=>{
							this.settings.showActiveTabTypingBadge = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showActiveTabTypingBadge: checked
							});
							this.saveSettings();
						}))

						.append(new Settings.Switch("Show Empty", "", this.settings.showEmptyActiveTabBadges, checked=>{
							this.settings.showEmptyActiveTabBadges = checked;
							if(TopBarRef.current) TopBarRef.current.setState({
								showEmptyActiveTabBadges: checked
							});
							this.saveSettings();
						}));

					//#endregion
				

					return panel;
				}


				//#endregion 			
			}

			//#endregion

		};
		return plugin(Plugin, Api);
	})(global.ZeresPluginLibrary.buildPlugin(config));
})();

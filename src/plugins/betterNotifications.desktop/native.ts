/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execFile } from "child_process";
import { app, IpcMainInvokeEvent, Notification, shell, WebContents } from "electron";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";

const platform = os.platform();
const isWin = platform === "win32";
const isMac = platform === "darwin";
const isLinux = platform === "linux";

let isMonitorRunning: boolean = false;

const idMap: Map<number, NotificationData> = new Map();
const replyMap: Map<Number, string> = new Map();

interface NotificationData {
    channelId: string;
    messageId: string;
    guildId?: string; // Doesn't exist in DMs
}

interface MessageOptions {
    attachmentFormat: string,
}

interface HeaderOptions {
    channelId: string,
    channelName: string,
}

interface ExtraOptions {
    // properties prefixed with 'w' are windows specific
    messageOptions?: MessageOptions;
    wAttributeText?: string;
    wAvatarCrop?: boolean;
    wHeaderOptions?: HeaderOptions;
    linuxFormattedText?: string,
    attachmentUrl?: string;
    attachmentType?: string;
    quickReactions?: string; // A JSON string, parse before use
    inlineReply?: boolean;
}

interface AssetOptions {
    avatarId?: string,
    avatarUrl?: string,

    attachmentUrl?: string;
    fileType?: string;
}

let webContents: WebContents | undefined;

function safeStringForXML(input: string): string {
    return input
        .replace(/&/g, "&amp;") // Must be first to avoid double-escaping
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}


// Notifications on Windows have a weird inconsistency where the <image> tag sometimes doesn't load the url inside `src`,
// but using a local file works, so we just throw it to %temp%
function saveAssetToDisk(options: AssetOptions) {
    // Returns file path if avatar downloaded
    // Returns an empty string if the request fails

    const baseDir = path.join(os.tmpdir(), "vencordBetterNotifications");
    const avatarDir = path.join(baseDir, "avatars");

    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }

    let url: string;
    let file;
    let targetDir;

    // TODO: avatar decorations
    if (options.avatarUrl) {
        // rounded is the default
        const isData = options.avatarUrl?.startsWith("data:image");
        const targetFilename = `${isData ? "" : "unrounded-"}${options.avatarId}.png`;
        targetDir = path.join(avatarDir, targetFilename);

        if (fs.existsSync(targetDir))
            return Promise.resolve(targetDir);
        console.log("Could not find profile picture in cache...");

        if (isData) {
            options.avatarUrl = options.avatarUrl.replace(/^data:image\/png;base64,/, "");
            return new Promise(resolve => {
                fs.writeFile(targetDir, options.avatarUrl!, "base64", function (error) {
                    if (error) resolve("");
                    else resolve(targetDir);
                });
            });
        }

        // probably should use node URL to be safer
        url = options.avatarUrl.startsWith("/assets")
            ? `https://discord.com${options.avatarUrl}`
            : options.avatarUrl;

        file = fs.createWriteStream(targetDir);

    } else if (options.attachmentUrl) {
        // pathname -> /attachments/123456/789/image.png -> 3: 789, 4: image.png
        const isData = options.attachmentUrl?.startsWith("data:image");
        const fileName = new URL(options.attachmentUrl).pathname.split("/");
        targetDir = path.join(baseDir, `${fileName[3]}-${fileName[4]}`);

        if (isData && options.attachmentUrl) {
            options.avatarUrl = options.attachmentUrl.replace(/^data:image\/png;base64,/, "");
            return new Promise(resolve => {
                fs.writeFile(targetDir, options.avatarUrl!, "base64", function (error) {
                    if (error) resolve("");
                    else resolve(targetDir);
                });
            });
        }

        url = options.attachmentUrl;
        file = fs.createWriteStream(targetDir);
    } else return Promise.resolve("");

    return new Promise(resolve => {
        https.get(url, { timeout: 3000 }, response => {
            response.pipe(file);

            file.on("finish", () => {
                file.close(() => {
                    resolve(targetDir);
                });
            });

        }).on("error", err => {
            fs.unlink(targetDir, () => { });
            console.error(`Downloading avatar with link ${url} failed:  ${err.message}`);
            resolve("");
        });
    });
}

function generateXml(
    type: "notification" | "call",
    titleString: string, bodyString: string,
    avatarLoc: String,
    notificationData: NotificationData,
    extraOptions?: ExtraOptions,
    attachmentLoc?: string,
    quickReactions?: string[]
): string {
    const guildId = notificationData.guildId ?? "@me";

    const notificationClickPath = `discord://-/channels/${guildId}/${notificationData.channelId}/${notificationData.messageId}`;
    const headerClickPath = `discord://-/channels/${guildId}/${notificationData.channelId}`;
    let xml: string;
    if (type === "notification") {
        xml = `
        <toast activationType="protocol" launch="${notificationClickPath}">
             ${extraOptions?.wHeaderOptions ?
                `
         <header
             id="${extraOptions.wHeaderOptions.channelId}"
             title="${extraOptions.wHeaderOptions.channelName}"
             activationType="protocol"
             arguments="${headerClickPath}"
             />
             `
                :
                ""
            }
             <visual>
                 <binding template="ToastGeneric">
                 <text>${safeStringForXML(titleString)}</text>
                 <text>${safeStringForXML(bodyString)}</text>
                 <image src="${avatarLoc}" ${extraOptions?.wAvatarCrop ? "hint-crop='circle'" : ""} placement="appLogoOverride"  />

                 ${extraOptions?.wAttributeText ? `<text placement="attribution">${safeStringForXML(extraOptions.wAttributeText)}</text>` : ""}
                 ${attachmentLoc ? `<image placement="${extraOptions?.messageOptions?.attachmentFormat}" src="${attachmentLoc}" />` : ""}
                 </binding>
             </visual>
             <actions>
            ${quickReactions?.map(emoji =>
                `<action content="${emoji}" arguments="${notificationClickPath}?reaction=${emoji}&amp;messageId=${notificationData.messageId}&amp;channelId=${notificationData.channelId}" activationType="protocol" />`
            )}
             </actions>
         </toast>`;
    } else {
        xml = `
        <toast activationType="protocol" launch="${notificationClickPath}">
            ${extraOptions?.wHeaderOptions ?
                `
            <header
                id="${extraOptions.wHeaderOptions.channelId}"
                title="${extraOptions.wHeaderOptions.channelName}"
                activationType="protocol"
                arguments="${headerClickPath}"
                />
                `
                :
                ""
            }
             <visual>
                 <binding template="ToastGeneric">
                    <text hint-callScenarioCenterAlign="true">${safeStringForXML(titleString)}</text>
                    <text hint-callScenarioCenterAlign="true">${safeStringForXML(bodyString)}</text>
                    <image src="${avatarLoc}" ${extraOptions?.wAvatarCrop ? "hint-crop='circle'" : ""} />

                    ${extraOptions?.wAttributeText ? `<text placement="attribution">${safeStringForXML(extraOptions.wAttributeText)}</text>` : ""}
                 </binding>
             </visual>
         </toast>`;
    }

    console.log("[BN] Generated ToastXML: " + xml);
    return xml;
}

// TODO: ensure notify-send version greater than 0.7.10 for callbacks https://gitlab.gnome.org/GNOME/libnotify/-/blame/master/NEWS#L101
// `notify-send -v` > "notify-send 0.8.6"
// libnotify has a limitation where actions cannot survive past the notification expiring. Meaning notifications in the DE history cannot be clicked. This can be sorta worked around with the replace-id but then that notify-send process will live forever untill clicked, then needs to be recreated.
function notifySend(summary: string,
    body: string | null,
    avatarLocation: string,
    defaultCallback: Function,
    notificationType: "notification" | "call",
    notificationData: NotificationData,
    attachmentFormat: string | undefined,
    attachmentLocation?: string,
    reactions?: string[],
    inlineReply?: boolean,
) {
    console.log(reactions);
    const name = app.getName();
    var args = [summary];
    if (body) args.push(body);

    // default callback
    args.push("--action=default=Open");
    // TODO future: button actions
    // args.push("--action=key=buttontext");

    // TODO future: modify existing notification with --replace-id="id"
    args.push("--print-id");

    args.push(`--app-name=${name[0].toUpperCase() + name.slice(1)}`);
    args.push(`--hint=string:desktop-entry:${name}`);

    if (inlineReply) {
        args.push("--hint=string:x-kde-reply-placeholder-text:\"reply\"");
        args.push("--action=inline-reply=\"send\"");
    }


    // AFAIK KDE & Gnome do not care about these
    if (notificationType === "call") args.push("--category=call.incoming");
    else if (notificationType === "notification") args.push("--category=im.recieved");

    // KDE has an `x-kde-urls` hint which can be used to display the attachment and avatar at the same time.
    if (attachmentLocation) args.push(`--hint=string:${attachmentFormat}:file://${attachmentLocation}`);
    if (!attachmentLocation || attachmentFormat === "x-kde-urls") args.push(`--hint=string:image-path:file://${avatarLocation}`);

    for (const reaction of reactions ?? []) {
        if (reaction === ",") continue;
        args.push(`--action=reaction:${reaction}=${reaction}`);
    }

    console.log("Sending linux attachment");
    console.log(args);

    execFile("notify-send", args, {}, (error, stdout, stderr) => {
        if (error)
            return console.error("Notification error:", error + stderr);

        const text = stdout.trim();

        const id = Number(text);

        if (id) {
            idMap.set(id, notificationData);
            console.log("Setting id..");
            console.log(idMap);

            if (replyMap.has(id)) {
                console.log("Found id in reply map... replyinhg");
                const notificationData = idMap.get(id);

                if (!notificationData) {
                    console.log("NotificationData not defiend in idmap");
                    return;
                }
                webContents?.executeJavaScript(`
                    Vencord.Plugins.plugins.BetterNotifications.NotificationReplyEvent(${replyMap.get(id)},"${notificationData.channelId}", "${notificationData.messageId}")
                `);
            }

        }

        // Will need propper filtering if multiple actions or notification ids are used
        if (text === "default") defaultCallback();
        if (text.startsWith("react:")) {
            const reaction = text.split(":").at(1);
            if (!reaction) {
                console.error("Reaction did not specify emoji");
                return;
            }
            console.log(`Reacting with ${reaction}`);
            webContents?.executeJavaScript(
                `Vencord.Plugins.plugins.BetterNotifications.NotificationReactEvent("${notificationData.channelId}", "${notificationData.messageId}", "${reaction}")`
            );
            defaultCallback();
        }
    });
}

async function startListeningToDbus() {
    console.log("Starting monitoring");
    isMonitorRunning = true;

    let nextIsReply: boolean = false;
    let notificationIdParsed: boolean = false;
    let notificationId: number;

    const monitor = execFile("dbus-monitor", ["interface='org.freedesktop.Notifications',member='NotificationReplied'"]);

    monitor.stdout?.on("data", data => {
        const textData: string = data.trim();

        textData.split("\n").forEach(line => {
            const text = line.trim();
            console.log(`::${text}`);

            if (text.includes("member=NotificationReplied")) {
                console.log("Next data should be uint32");
                nextIsReply = true;
                return;
            }

            if (nextIsReply) {
                if (notificationIdParsed) {
                    if (!text.startsWith("string")) {
                        console.error(`Expected reply, recieved ${text}`);
                        return;
                    }

                    const i = text.indexOf(" ");
                    const reply = text.slice(i + 1); // NOTE: This variable already contains quotes around the string itself

                    replyMap.set(notificationId, reply);
                    nextIsReply = false;
                    notificationIdParsed = false;

                } else {
                    if (!text.startsWith("uint32")) {
                        console.error(`Expected notification id, recieved ${text}`);
                        return;
                    }

                    const targetId = text.split(" ").at(1);
                    if (!targetId || !Number(targetId)) {
                        console.error(`Expected number value (from text ${text})`);
                        return;
                    }

                    notificationIdParsed = true;
                    notificationId = Number(targetId);
                }
            }
        });
    });
}

export function notify(event: IpcMainInvokeEvent,
    type: "notification" | "call",
    titleString: string, bodyString: string,
    avatarId: string, avatarUrl: string,
    notificationData: NotificationData,
    extraOptions?: ExtraOptions
) {
    const promises = [saveAssetToDisk({ avatarUrl, avatarId })];
    const quickReactions: string[] = JSON.parse(extraOptions?.quickReactions ?? "[]");
    console.log(`Reactions: ${quickReactions}`);

    if (extraOptions?.attachmentUrl) {
        promises.push(saveAssetToDisk({ fileType: extraOptions.attachmentType, attachmentUrl: extraOptions.attachmentUrl }));
    }
    // console.log("Creating promise...");

    Promise.all(promises).then(results => {
        // @ts-ignore
        const avatar: string = results.at(0);
        // @ts-ignore
        const attachment: string | undefined = results.at(1);

        // console.log(`[BN] notify notificationData: ${notificationData.channelId}`);

        const unixCallback = () => event.sender.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationClickEvent("${notificationData.channelId}", "${notificationData.messageId}")`);

        if (isLinux) {
            if (!isMonitorRunning && extraOptions?.inlineReply && checkLinuxDE("", "KDE")) {
                startListeningToDbus();
            }
            const linuxFormattedString: string | undefined = extraOptions?.linuxFormattedText;

            console.log("Recieved the following linux formatted string:");
            console.log(linuxFormattedString);

            notifySend(titleString, linuxFormattedString || bodyString,
                avatar, unixCallback, type, notificationData,
                extraOptions?.messageOptions?.attachmentFormat,
                attachment, quickReactions, extraOptions?.inlineReply
            );

            return;
        }

        const notification = new Notification({
            title: titleString,
            body: bodyString,
            timeoutType: "default",

            // toastXml only works on Windows
            // https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
            ...(isWin && { toastXml: generateXml(type, titleString, bodyString, avatar, notificationData, extraOptions, attachment, quickReactions) })
        });

        // Listener for macOS
        notification.addListener("click", () => unixCallback());
        notification.show();
    });
}

export function checkLinuxDE(_, DE: string) {
    return process.env.XDG_CURRENT_DESKTOP === DE;
}

export function openTempFolder(_) {
    const directory = path.join(os.tmpdir(), "vencordBetterNotifications");
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    shell.openPath(directory);
}

export async function deleteTempFolder(_) {
    const directory = path.join(os.tmpdir(), "vencordBetterNotifications");
    try {
        fs.rmSync(directory, { recursive: true, force: true });
    } catch (error) {
        console.error("Failed to delete temporary folder.");
    }
}

app.on("browser-window-created", (_, win) => {
    webContents = win.webContents;
});

// TODO future: app.on("second-instance") with deeplinks on Windows notifications to allow button actions
app.on("second-instance", (event, args) => {
    console.log("[BN] second instance activated");
    console.log(args);
    const stringUrl = args.at(args.length - 1);
    if (!stringUrl || !stringUrl.startsWith("discord://")) {
        console.log(`[BN] url is ${stringUrl}. Skipping`);
        return;
    }

    const url = new URL(stringUrl);
    if (!url.searchParams.get("reaction")) {
        console.log("[BN] Link does not contain a reaction");
    }
    webContents?.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationReactEvent("${url.searchParams.get("channelId")}", "${url.searchParams.get("messageId")}", "${url.searchParams.get("reaction")}")`);
});

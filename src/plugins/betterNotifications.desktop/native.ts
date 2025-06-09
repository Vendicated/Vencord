/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import child_process from "child_process";
import { app, IpcMainInvokeEvent, Notification, shell, WebContents } from "electron";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";

const platform = os.platform();

const isWin = platform === "win32";
const isDarwin = platform === "darwin";
const isLinux = platform === "linux";

interface NotificationData {
    channelId: string;
    messageId: string;
    guildId?: string; // Doesn't exist in DMs
}

interface MessageOptions {
    attachmentType: string,
}

interface HeaderOptions {
    channelId: string,
    channelName: string,
}

interface ExtraOptions {
    // properties prefixed with 'w' are windows specific
    wMessageOptions?: MessageOptions;
    wAttributeText?: string;
    wAvatarCrop?: boolean;
    wHeaderOptions?: HeaderOptions;
    attachmentUrl?: string;
    attachmentType?: string;
}

interface AssetOptions {
    avatarId?: string,
    avatarUrl?: string,

    downloadUrl?: string;
    fileType?: string;
}

let webContents: WebContents | undefined;

// Notifications on Windows have a weird inconsistency where the <image> tag sometimes doesn't load the url inside `src`,
// but using a local file works, so we just throw it to %temp%
function saveAssetToDisk(type: "attachment" | "avatar", options: AssetOptions) {
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

    // TODO: round avatars before saving on linux
    // TODO: avatar decorations
    if (type === "avatar") {
        targetDir = path.join(avatarDir, `${options.avatarId}.png`);

        if (fs.existsSync(targetDir)) {
            return new Promise(resolve => {
                resolve(targetDir);
            });
        }

        console.log("Could not find profile picture in cache...");

        // probably should use node URL to be safer
        url = options.avatarUrl
            ? options.avatarUrl.startsWith("/assets")
                ? `https://discord.com${options.avatarUrl}`
                : options.avatarUrl.replace(/\.\w{1,5}(?=\?|$)/, ".png")
            : "";

        file = fs.createWriteStream(targetDir);

    } else if (type === "attachment") {
        targetDir = path.join(baseDir, `attachment.${options.fileType}`);

        console.log("Could not find attachment in cache...");

        url = options.downloadUrl ?? "";
        file = fs.createWriteStream(targetDir);
    }

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
                 <text>${titleString}</text>
                 <text>${bodyString}</text>
                 <image src="${avatarLoc}" ${extraOptions?.wAvatarCrop ? "hint-crop='circle'" : ""} placement="appLogoOverride"  />

                 ${extraOptions?.wAttributeText ? `<text placement="attribution">${extraOptions.wAttributeText}</text>` : ""}
                 ${attachmentLoc ? `<image placement="${extraOptions?.wMessageOptions?.attachmentType}" src="${attachmentLoc}" />` : ""}
                 </binding>
             </visual>
         </toast>`;
    } else {
        xml = `
        <toast activationType="protocol" launch="${notificationClickPath}">
            ${extraOptions?.wHeaderOptions ?
                `
            <header
                id="${extraOptions.wHeaderOptions.channelId}"
                title="#${extraOptions.wHeaderOptions.channelName}"
                activationType="protocol"
                arguments="${headerClickPath}"
                />
                `
                :
                ""
            }
             <visual>
                 <binding template="ToastGeneric">
                    <text hint-callScenarioCenterAlign="true">${titleString}</text>
                    <text hint-callScenarioCenterAlign="true">${bodyString}</text>
                    <image src="${avatarLoc}" ${extraOptions?.wAvatarCrop ? "hint-crop='circle'" : ""} />

                    ${extraOptions?.wAttributeText ? `<text placement="attribution">${extraOptions.wAttributeText}</text>` : ""}
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
function notifySend(summary: string, body: string | null, avatarLocation: string, defaultCallback: Function, attachmentLocation?: string) {
    const name = app.getName();
    var args = [summary];
    if (body) args.push(body);

    // default callback
    args.push("--action=default=Open");
    // TODO future: button actions
    // args.push("--action=key=buttontext");

    // TODO future: modify existing notification with --replace-id="id"
    // args.push("--print-id");

    args.push(`--app-name=${name[0].toUpperCase() + name.slice(1)}`);
    args.push(`--hint=string:desktop-entry:${name}`);

    // TODO future: KDE has an `x-kde-urls` hint which can be used to display the attachment and avatar at the same time.
    // args.push(--hint=string:x-kde-urls:file://${attachmentLocation})
    if (attachmentLocation) args.push(`-h string:image-path:${attachmentLocation}`);
    else args.push(`-h string:image-path:${avatarLocation}`);

    console.log(args);

    child_process.execFile("notify-send", args, {}, (error, stdout, stderr) => {
        if (error)
            return console.error("Notification error:", error + stderr);

        // Will need propper filtering if multiple actions or notification ids are used
        if (stdout.trim() === "default") defaultCallback();
    });
}

export function notify(event: IpcMainInvokeEvent,
    type: "notification" | "call",
    titleString: string, bodyString: string,
    avatarId: string, avatarUrl: string,
    notificationData: NotificationData,
    extraOptions?: ExtraOptions
) {
    const promises = [saveAssetToDisk("avatar", { avatarUrl, avatarId })];

    if (extraOptions?.attachmentUrl) {
        promises.push(saveAssetToDisk("attachment", { fileType: extraOptions.attachmentType, downloadUrl: extraOptions.attachmentUrl }));
    }
    console.log("Creating promise...");

    Promise.all(promises).then(results => {
        // @ts-ignore
        const avatar: string = results.at(0);
        // @ts-ignore
        const attachment: string | undefined = results.at(1);

        // console.log(`[BN] notify notificationData: ${notificationData.channelId}`);

        const unixCallback = () => event.sender.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationClickEvent("${notificationData.channelId}", "${notificationData.messageId}")`);

        if (isLinux) {
            // TODO: style the body with basic markup https://specifications.freedesktop.org/notification-spec/latest/markup.html
            notifySend(titleString, bodyString, avatar, unixCallback, attachment);
            return;
        }

        const notification = new Notification({
            title: titleString,
            body: bodyString,
            timeoutType: "default",

            // toastXml only works on Windows
            // https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
            ...(isWin && { toastXml: generateXml(type, titleString, bodyString, avatar, notificationData, extraOptions, attachment) })
        });

        // Listener for macOS
        notification.addListener("click", () => unixCallback());
        notification.show();
    });
}

export function checkIsMac(_) {
    return isDarwin;
}

export function openTempFolder(_) {
    const directory = path.join(os.tmpdir(), "vencordBetterNotifications");
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
    shell.openPath(directory);
}

export function deleteTempFolder(_) {
    const directory = path.join(os.tmpdir(), "vencordBetterNotifications");
    try {
        fs.rmSync(directory, { recursive: true, force: true });
    } catch (error) {
        console.error("Failed to delete temporary folder.");
    }
}

// TODO future: app.on("second-instance") with deeplinks on Windows notifications to allow button actions
// app.on("second-instance", (event, arg) => {
//     console.log("[BN] second instance activated");
//     console.log(arg);
//     let params = new URL(arg[arg.length - 1]).searchParams;
//     let channelId = params.get("c");
//     let messageId = params.get("m");
//     if (webContents) {
//         webContents.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationReplyButtonEvent("${channelId}", "${messageId}")`);
//     } else {
//         console.error("[BN] webContents not defined!");
//     }
//     event.preventDefault();
// });

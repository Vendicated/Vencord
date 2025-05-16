import { Notification, IpcMainInvokeEvent, WebContents, app } from "electron";

const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

interface NotificationData {
    channelId: string;
    messageId: string;
    guildId: string;
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
    userId?: string,
    avatarId?: string,

    downloadUrl?: string;
    fileType?: string;
}

let webContents: WebContents | undefined;

// Notifications on Windows have a weird inconsistency where the <image> tag sometimes doesn't load the url inside `src`, 
// but using a local file works, so we just throw it to %temp%
function saveAssetToDisk(type: "attachment" | "avatar", options: AssetOptions) {
    // Returns file path if avatar downloaded
    // Returns an empty string if the request fails

    let baseDir = path.join(os.tmpdir(), "vencordBetterNotifications");
    let avatarDir = path.join(baseDir, "avatars");

    if (!fs.existsSync(avatarDir)) {
        fs.mkdirSync(avatarDir, { recursive: true });
    }

    let url: string;
    let file;
    let targetDir;

    if (type === "avatar") {
        targetDir = path.join(avatarDir, `${options.avatarId}.png`);

        if (fs.existsSync(targetDir)) {
            return new Promise((resolve) => {
                resolve(targetDir);
            });
        }

        console.log("Could not find profile picture in cache...");

        url = `https://cdn.discordapp.com/avatars/${options.userId}/${options.avatarId}.png?size=256`;
        file = fs.createWriteStream(targetDir);

    } else if (type === "attachment") {
        targetDir = path.join(baseDir, `attachment.${options.fileType}`);

        console.log("Could not find profile picture in cache...");

        url = options.downloadUrl ?? "";
        file = fs.createWriteStream(targetDir);
    }

    return new Promise((resolve) => {
        https.get(url, { timeout: 3000 }, (response) => {
            response.pipe(file);

            file.on("finish", () => {
                file.close(() => {
                    resolve(targetDir);
                });
            });

        }).on("error", (err) => {
            fs.unlink(targetDir, () => { });
            console.error(`Downloading avatar with link ${url} failed:  ${err.message}`);
            resolve("");
        });
    });

}

function generateXml(
    titleString: string, bodyString: string,
    avatarLoc: String,
    notificationData: NotificationData,
    extraOptions?: ExtraOptions,
    attachmentLoc?: string,
): string {
    return `     
       <toast activationType="protocol" launch="discord://-/channels/${notificationData.guildId}/${notificationData.channelId}/${notificationData.messageId}">
            ${extraOptions?.wHeaderOptions ?
            `
        <header
            id="${extraOptions.wHeaderOptions.channelId}"
            title="#${extraOptions.wHeaderOptions.channelName}"
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
}


export function notify(event: IpcMainInvokeEvent,
    titleString: string, bodyString: string,
    avatarId: string, userId: string,
    notificationData: NotificationData,
    extraOptions?: ExtraOptions
) {
    let promises = [saveAssetToDisk("avatar", { userId, avatarId })];

    if (extraOptions?.attachmentUrl) {
        promises.push(saveAssetToDisk("attachment", { fileType: extraOptions.attachmentType, downloadUrl: extraOptions.attachmentUrl }));
    }
    console.log("Creating promise...");

    Promise.all(promises).then((results) => {
        console.log("results!");
        console.log(results);

        //@ts-ignore
        let avatar: string = results.at(0);
        //@ts-ignore
        let attachment: string | undefined = results.at(1);

        console.log(`[BN] notify notificationData: ${notificationData.channelId}`);
        let xml = generateXml(titleString, bodyString, avatar, notificationData, extraOptions, attachment);
        console.log("[BN] Generated ToastXML: " + xml);

        const notification = new Notification({
            title: titleString,
            body: bodyString,

            // toastXml only works on Windows
            // https://learn.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/adaptive-interactive-toasts?tabs=xml
            toastXml: xml
        });

        // Listener for macOS and Linux
        notification.addListener("click", () => event.sender.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationClickEvent("${notificationData.channelId}", "${notificationData.messageId}")`));
        notification.show();
    });
}



// TODO future: app.on("second-instance") with deeplinks on Windows notifications to allow button actions
app.on("second-instance", (event, arg) => {
    console.log("[BN] second instance activated");
    console.log(arg);
    let params = new URL(arg[arg.length - 1]).searchParams;
    let channelId = params.get("c");
    let messageId = params.get("m");
    if (webContents) {
        webContents.executeJavaScript(`Vencord.Plugins.plugins.BetterNotifications.NotificationReplyButtonEvent("${channelId}", "${messageId}")`);
    } else {
        console.error("[BN] webContents not defined!");
    }
    event.preventDefault();
});

app.on("browser-window-created", (_, win) => {
    console.log("[BN] Browser window created!");
    webContents = win.webContents;
});
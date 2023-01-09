import { popNotice, showNotice } from "../api/Notices";
import { classes, lazyWebpack } from "../utils";
import definePlugin from "../utils/types";
import { filters } from "../webpack";
import { Tooltip } from "../webpack/common";
const icon = lazyWebpack(filters.byProps(["iconItem"]));

function onClick(channel) {
    if (!IS_WEB) {
        window.window.DiscordNative.clipboard.copy(`<#${channel.id}>`);
        showNotice(`Copied link for #${channel.name}`, "okay!", popNotice);
    }
}

export default definePlugin({
    name: "LinkChannels",
    description:
        "Icon to channels that copys <#channelId>. (channelId is replaced)",
    authors: [{ name: "ugly-patootie", id: 458805348669718559n }],
    target: "DESKTOP",
    patches: [
        {
            find: "resetThreadPopoutTimers=function",
            replacement: {
                match: /isSubscriptionGated:g\}\)\},(.{1,2}).renderInviteButton\(\),/g,
                replace: (m, c) => `${m}Vencord.Plugins.plugins.LinkChannels.linkButton({channel:${c}.props.channel}),`,
            },
        },
    ],
    start() {
        const style = document.createElement("style");
        style.className = "LINKCHANNELS_CSS";
        style.textContent =
            ".linkChannels{display:none;z-index:999;} .iconVisibility-vptxma:hover .linkChannels{display:block;cursor:pointer;}";
        document.head.appendChild(style);
    },
    stop() {
        document.getElementsByClassName("LINKCHANNELS_CSS")[0]?.remove();
    },
    linkButton({ channel }) {
        return <Tooltip text="Copy Channel" color={"black"} position="top" className={icon?.iconItem}>
            {p => <svg {...p} className={classes(icon?.actionIcon, "linkChannels")} width={25} height={25} viewBox={"0 0 25 25"} onClick={() => onClick(channel)}>
                <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z" fill="currentColor" />
            </svg>}
        </Tooltip>;
    }
});

import { Margins } from "@utils/index";
import { Forms } from "@webpack/common";

export function SettingsPanel() {
    return (
        <>
            <Forms.FormTitle tag="h3">How to Use</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom8}>
                Click the grid icon in your server list (above your servers) to open the live message feed.
                New messages from all channels will appear in real-time.
            </Forms.FormText>

            <Forms.FormTitle tag="h3" className={Margins.top16}>Features</Forms.FormTitle>
            <Forms.FormText>
                <ul style={{ margin: "4px 0", paddingLeft: "20px", listStyleType: "disc" }}>
                    <li style={{ listStyleType: "disc" }}>Live message feed from all servers and DMs</li>
                    <li style={{ listStyleType: "disc" }}>Filter by specific channels or servers</li>
                    <li style={{ listStyleType: "disc" }}>Search across all incoming messages</li>
                    <li style={{ listStyleType: "disc" }}>Pause/resume the feed</li>
                    <li style={{ listStyleType: "disc" }}>Click any message to jump to it</li>
                    <li style={{ listStyleType: "disc" }}>Image previews, embeds, and markdown rendering</li>
                </ul>
            </Forms.FormText>
        </>
    );
}

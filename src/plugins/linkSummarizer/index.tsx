/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addButton } from "@api/MessagePopover";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import definePlugin from "@utils/types";
import { waitFor } from "@webpack";
import { ChannelStore, Forms } from "@webpack/common";

import { SparklesIcon } from "./components/icons";
import { OllamaStatusIndicator } from "./components/status";
import { SummaryComponent } from "./components/summary";
import { settings } from "./settings";


function SummaryContainer({ messageId, url }: { messageId: string; url: string; }) {
    return (
        <ErrorBoundary>
            <SummaryComponent url={url} />
        </ErrorBoundary>
    );
}

function renderSummary(messageId: string, url: string) {
    const messageElement = document.querySelector(`[id="message-content-${messageId}"]`);
    if (!messageElement) return;

    const messageContainer = messageElement.parentElement?.parentElement;
    if (!messageContainer) return;

    const existingSummary = messageContainer.querySelector(".link-summary-container");
    if (existingSummary) return;

    const summaryWrapper = document.createElement("div");
    summaryWrapper.className = "link-summary-wrapper";

    const summaryContainer = document.createElement("div");
    summaryContainer.className = "link-summary-container";

    summaryWrapper.appendChild(summaryContainer);
    messageContainer.appendChild(summaryWrapper);

    const style = document.createElement("style");
    style.textContent = `
        .link-summary-wrapper {
            margin-top: 8px;
            width: 100%;
        }

        .link-summary-container {
            background: var(--background-secondary);
            border-radius: 8px;
            padding: 12px;
            font-size: 0.95em;
            line-height: 1.4;
            transition: background-color 0.2s ease;
        }

        .link-summary-container:hover {
            background: var(--background-secondary-alt);
        }
    `;
    document.head.appendChild(style);

    waitFor(
        m => m?.render && m.createRoot,
        ({ createRoot }) => {
            const root = createRoot(summaryContainer);
            root.render(<SummaryContainer messageId={messageId} url={url} />);
        }
    );
}

export default definePlugin({
    name: "LinkSummarizer",
    description: "Summarize links using Ollama AI",
    authors: [Devs.Jawad],
    dependencies: ["MessagePopoverAPI"],
    settings,
    settingsAboutComponent: () => (
        <ErrorBoundary>
            <Forms.FormSection title="Setup Instructions">
                <Forms.FormText>
                    1. Download Ollama from <Link href="https://ollama.ai">ollama.ai</Link>
                </Forms.FormText>
                <Forms.FormText>
                    2. Install and run a model:
                    <code style={{
                        display: "block",
                        margin: "8px 0",
                        padding: "8px",
                        backgroundColor: "var(--background-secondary)",
                        borderRadius: "4px"
                    }}>
                        ollama run {settings.store.ollamaModel}
                    </code>
                </Forms.FormText>
                <Forms.FormDivider className={Margins.top8} />
                <OllamaStatusIndicator />
            </Forms.FormSection>
        </ErrorBoundary>
    ),
    start() {
        addButton("LinkSummarizer", message => {
            const hasUrls = message.content.match(/https?:\/\/[^\s]+/g);
            if (!hasUrls) return null;

            return {
                label: "Summarize Link",
                icon: SparklesIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => {
                    renderSummary(message.id, hasUrls[0]);
                }
            };
        });
    }
});

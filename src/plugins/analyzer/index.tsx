/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { Menu } from "@webpack/common";

import { AnalysisAccessory, handleAnalysis } from "./AnalysisAccesory";
import { AnalyzeIcon } from "./AnalyzeIcon";

const settings = definePluginSettings({
    hybridAnalysisApiKey: {
        type: OptionType.STRING,
        description: "API Key for Hybrid Analysis, https://www.hybrid-analysis.com/docs/api/v2#/",
        default: ""
    },
    virusTotalApiKey: {
        type: OptionType.STRING,
        description: "API Key for VirusTotal, https://www.virustotal.com/gui/my-apikey",
        default: ""
    },
    triageApiKey: {
        type: OptionType.STRING,
        description: "API Key for Triage, https://tria.ge/docs/",
        default: ""
    }
});

const Native = VencordNative.pluginHelpers.Analyze as PluginNative<typeof import("./native")>;

async function analyzeFile(url: string, messageId: string) {
    try {
        const details: Array<{ message: string; type: "safe" | "suspicious" | "malicious" | "neutral"; }> = [];

        const [hybridResponse, vtResponse, triageUploadResponse] = await Promise.all([
            Native.makeHybridAnalysisRequest(settings.store.hybridAnalysisApiKey, url),
            Native.makeVirusTotalRequest(settings.store.virusTotalApiKey, url),
            Native.uploadToTriage(settings.store.triageApiKey, url)
        ]);

        try {
            const result = typeof hybridResponse.data === "string"
                ? JSON.parse(hybridResponse.data)
                : hybridResponse.data;
            console.log("hybridResponse: " + JSON.stringify(hybridResponse, null, 2));
            if (hybridResponse.status === 200) {
                const crowdstrike = result.scanners_v2?.crowdstrike_ml;
                const metadefender = result.scanners_v2?.metadefender;
                const crowdstrikeStatus = crowdstrike?.status?.toLowerCase();
                const metadefenderStatus = metadefender?.status?.toLowerCase();
                const isInQueue = crowdstrikeStatus === "in-queue" || metadefenderStatus === "in-queue";
                let message = "Hybrid Analysis Results:\n";
                if (crowdstrike) {
                    message += `- CrowdStrike: ${crowdstrike.status} (${crowdstrike.percent ?? "N/A"}%)\n`;
                }
                if (metadefender) {
                    message += `- Metadefender: ${metadefender.status} (${metadefender.percent ?? "N/A"}%)\n`;
                }
                let type: "safe" | "suspicious" | "malicious" | "neutral" = "safe";
                if (isInQueue) {
                    type = "neutral";
                } else {
                    if (crowdstrikeStatus === "malicious" || metadefenderStatus === "malicious") {
                        type = "malicious";
                    } else if (crowdstrikeStatus === "suspicious" || metadefenderStatus === "suspicious") {
                        type = "suspicious";
                    }
                }
                details.push({ message, type });
            } else {
                details.push({
                    message: `Hybrid Analysis Error: HTTP ${hybridResponse.status}`,
                    type: "suspicious"
                });
            }
        } catch (error) {
            details.push({
                message: "Hybrid Analysis: Invalid response format",
                type: "neutral"
            });
        }

        try {
            const vtData = typeof vtResponse.data === "string"
                ? JSON.parse(vtResponse.data)
                : vtResponse.data;

            if (vtResponse.status === 200 && vtData?.data?.id) {
                console.log("virustotal data debug: " + vtData);
                const fileReportResponse = await Native.getVirusTotalFileReport(
                    settings.store.virusTotalApiKey,
                    vtData.data.id
                );

                if (fileReportResponse.status === 200) {
                    const fileReport = typeof fileReportResponse.data === "string"
                        ? JSON.parse(fileReportResponse.data)
                        : fileReportResponse.data;

                    const attr = fileReport?.data?.attributes || {};
                    const stats = attr.last_analysis_stats || {};
                    const mainType = stats.malicious > 0 ? "malicious"
                        : stats.suspicious > 0 ? "suspicious"
                            : "safe";

                    const addDetail = (label: string, value: any, forceType?: "neutral" | typeof mainType) => {
                        if (value !== null && value !== undefined && value !== "") {
                            const displayValue = typeof value === "boolean"
                                ? (value ? "Yes" : "No")
                                : value;
                            details.push({
                                message: `${label}: ${displayValue}`,
                                type: forceType || mainType
                            });
                        }
                    };

                    details.push({
                        message: `VirusTotal: Malicious ${stats.malicious || 0}, Suspicious ${stats.suspicious || 0}`,
                        type: mainType
                    });

                    addDetail("SHA-256", attr.sha256, "neutral");
                    addDetail("File Type", attr.type_description, "neutral");
                    addDetail("File Size", attr.size ? `${Math.round(attr.size / 1024)} KB` : null, "neutral");

                    addDetail("First Submission", attr.first_submission_date
                        ? new Date(attr.first_submission_date * 1000).toLocaleDateString()
                        : null, "neutral");

                    addDetail("Sandbox Verdict", attr.sandbox_verdicts?.category, mainType);
                    addDetail("Malware Families", attr.malware_names?.join(", "), mainType);

                    addDetail("Community Reputation", attr.reputation, "neutral");
                    addDetail("User Votes", `👍 ${attr.total_votes?.harmless || 0} 👎 ${attr.total_votes?.malicious || 0}`, "neutral");

                    addDetail("AI Analysis", attr.crowdsourced_ai_results?.threat_verdict?.replace("VERDICT_", ""), mainType);
                    addDetail("Exploitable", attr.threat_severity_data?.has_vulnerabilities, "neutral");
                    addDetail("Network Connections", [
                        attr.threat_severity_data?.has_contacted_ips_with_detections ? "IPs" : null,
                        attr.threat_severity_data?.has_contacted_domains_with_detections ? "Domains" : null,
                        attr.threat_severity_data?.has_contacted_urls_with_detections ? "URLs" : null
                    ].filter(Boolean).join(", ") || "None", mainType);

                } else {
                    details.push({
                        message: "VirusTotal: Failed to get detailed report",
                        type: "suspicious"
                    });
                }
            } else {
                details.push({
                    message: `VirusTotal Error: HTTP ${vtResponse.status}`,
                    type: "suspicious"
                });
            }
        } catch (vtError) {
            details.push({
                message: "VirusTotal: Processing error",
                type: "suspicious"
            });
        }

        try {
            if (triageUploadResponse?.status === 200 && triageUploadResponse.reportID) {
                await new Promise(resolve => setTimeout(resolve, 2500));
                const triageResults = await Native.getTriageResults(settings.store.triageApiKey, triageUploadResponse.reportID);
                if (triageResults?.status === 200) {
                    const triageData = triageResults.data;
                    const verdict = triageData.verdict?.toLowerCase() || "pending";
                    let type: "safe" | "suspicious" | "malicious" | "neutral" = "neutral";
                    if (verdict === "malicious") type = "malicious";
                    else if (verdict === "suspicious") type = "suspicious";
                    else if (verdict === "clean") type = "safe";

                    details.push({
                        message: `Triage Verdict: ${verdict.toUpperCase()}`,
                        type: type
                    });

                    if (triageData.signatures?.length > 0) {
                        details.push({
                            message: `Detected Signatures: ${triageData.signatures.join(", ")}`,
                            type: type
                        });
                    }
                } else {
                    details.push({
                        message: `Triage Error: ${triageResults?.data || "Failed to get results"}`,
                        type: "neutral"
                    });
                }
            } else {
                details.push({
                    message: `Triage Upload Failed: ${triageUploadResponse?.data || "No report ID"}`,
                    type: "neutral"
                });
            }
        } catch (e) {
            details.push({
                message: `Triage Error: ${String(e)}`,
                type: "neutral"
            });
        }

        handleAnalysis(messageId, {
            details: details.filter(d => d.message && d.type),
            timestamp: Date.now()
        });

        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        handleAnalysis(messageId, {
            details: [{
                message: `Critical Error: ${message}`,
                type: "malicious"
            }],
            timestamp: Date.now()
        });
        return false;
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }) => {
    if (!message.content && !message.attachments.length) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (!group) return;

    group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
        <Menu.MenuItem
            id="vc-analyze"
            label="Analyze message"
            icon={AnalyzeIcon}
            action={async () => {
                if (message.attachments.length) {
                    for (const attachment of message.attachments) {
                        await analyzeFile(attachment.url, message.id);
                    }
                }
            }}
        />
    ));
};

export default definePlugin({
    name: "Analyze",
    description: "Analyze messages using Hybrid Analysis and VirusTotal",
    authors: [Devs.Nay, Devs.Marco],
    settings,
    contextMenus: {
        "message": messageCtxPatch
    },
    renderMessageAccessory: props => <AnalysisAccessory message={props.message} />,

    patches: [{
        find: ".accessories,childrenMessageContent",
        replacement: {
            match: /(function \w+\(\w+\)\{)(\w+=\w+\.message)/,
            replace: "$1$2;return $self.renderMessageAccessory(arguments[0])||null;"
        }
    }]
});

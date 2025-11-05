/**
 * Vencord Plugin: Bulk Channel Delete
 * 
 * @name BulkChannelDelete
 * @description Multi-select and delete multiple Discord channels at once with Shift + Right Click
 * @author YourName
 * @version 1.0.1
 * 
 * ⚠️ WARNING: This plugin can permanently delete channels. Use with extreme caution!
 * - Deleted channels CANNOT be recovered
 * - This may violate Discord's Terms of Service
 * - Use only in servers where you have proper authorization
 * - The author is not responsible for any consequences of using this plugin
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findLazy } from "@webpack";
import { FluxDispatcher, RestAPI, ChannelStore, UserStore } from "@webpack/common";

// State management
let selectedChannels = new Set<string>();
let isDeleting = false;
let deleteButtonElement: HTMLDivElement | null = null;

// Plugin settings
const settings = definePluginSettings({
    deletionDelay: {
        type: OptionType.NUMBER,
        description: "Delay between deletions in milliseconds (recommended: 1000+)",
        default: 1000,
        onChange: () => console.log("[BulkChannelDelete] Settings updated")
    },
    showWarnings: {
        type: OptionType.BOOLEAN,
        description: "Show warning dialogs before deletion",
        default: true
    },
    exportBeforeDelete: {
        type: OptionType.BOOLEAN,
        description: "Auto-export channel list to JSON before deletion",
        default: false
    }
});

// Utility: Show toast notification
function showToast(message: string, type: number = 0) {
    try {
        const { showToast } = findByPropsLazy("showToast");
        showToast(showToast.createToast(message, type));
    } catch {
        console.log(`[BulkChannelDelete] ${message}`);
    }
}

// Utility: Export channels to JSON
function exportChannelsToJSON(channels: any[]) {
    const exportData = channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
        parentId: ch.parent_id,
        topic: ch.topic || null,
        nsfw: ch.nsfw || false,
        guildId: ch.guild_id
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `discord-channels-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast("✅ Channel list exported successfully", 1);
}

// Utility: Show confirmation dialog
function showConfirmDialog(channelCount: number, onConfirm: () => void) {
    const dialog = document.createElement("div");
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    `;
    
    dialog.innerHTML = `
        <div style="
            background: #2b2d31;
            padding: 24px;
            border-radius: 8px;
            max-width: 500px;
            color: #dbdee1;
        ">
            <h2 style="color: #ed4245; margin: 0 0 16px 0; font-size: 20px; font-weight: 600;">
                ⚠️ PERMANENT DELETION WARNING
            </h2>
            <div style="margin-bottom: 16px; line-height: 1.5;">
                <p style="margin: 0 0 12px 0; font-weight: 600;">
                    You are about to permanently delete <span style="color: #ed4245;">${channelCount} channel(s)</span>.
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                    <li>All messages, files, and history will be lost forever</li>
                    <li>This action CANNOT be undone</li>
                    <li>This may violate Discord's Terms of Service</li>
                    <li>You must have proper authorization</li>
                </ul>
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="bulk-delete-cancel" style="
                    background: #4e5058;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                ">Cancel</button>
                <button id="bulk-delete-confirm" style="
                    background: #ed4245;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                ">I Understand - Delete Channels</button>
            </div>
            <div style="margin-top: 16px; font-size: 11px; opacity: 0.6; text-align: center;">
                The plugin author is not responsible for any consequences
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    const cancelBtn = dialog.querySelector("#bulk-delete-cancel");
    const confirmBtn = dialog.querySelector("#bulk-delete-confirm");
    
    cancelBtn?.addEventListener("click", () => {
        document.body.removeChild(dialog);
    });
    
    confirmBtn?.addEventListener("click", () => {
        document.body.removeChild(dialog);
        onConfirm();
    });
    
    dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
            document.body.removeChild(dialog);
        }
    });
}

// Delete channels function
async function deleteChannels(channelIds: string[]) {
    if (isDeleting) {
        showToast("⚠️ Deletion already in progress", 2);
        return;
    }
    
    isDeleting = true;
    const delay = settings.store.deletionDelay;
    const channels = channelIds.map(id => ChannelStore.getChannel(id)).filter(Boolean);
    
    if (channels.length === 0) {
        showToast("⚠️ No valid channels found", 2);
        isDeleting = false;
        return;
    }
    
    // Export before delete (only if enabled)
    if (settings.store.exportBeforeDelete) {
        exportChannelsToJSON(channels);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('[BulkChannelDelete] Starting deletion of', channels.length, 'channels');
    
    for (let i = 0; i < channels.length; i++) {
        const channel = channels[i];
        
        try {
            showToast(`🗑️ Deleting ${i + 1}/${channels.length}: #${channel.name}`, 0);
            console.log(`[BulkChannelDelete] Deleting channel:`, channel.id, channel.name);
            
            let deleted = false;
            
            // Method 1: Try RestAPI.del
            try {
                await RestAPI.del({
                    url: `/channels/${channel.id}`
                });
                deleted = true;
                console.log(`[BulkChannelDelete] ✅ Deleted via RestAPI.del`);
            } catch (e: any) {
                console.log(`[BulkChannelDelete] RestAPI.del failed:`, e.message);
            }
            
            // Method 2: Try direct fetch if RestAPI failed
            if (!deleted) {
                try {
                    // Get token from webpack
                    const tokenModule = (window as any).webpackChunkdiscord_app
                        ?.push([[Math.random()], {}, (req: any) => {
                            for (const id in req.c) {
                                const mod = req.c[id]?.exports;
                                if (mod?.default?.getToken) {
                                    return mod.default;
                                }
                            }
                        }]);
                    
                    const token = tokenModule?.getToken?.();
                    
                    if (!token) {
                        throw new Error('Could not retrieve auth token');
                    }
                    
                    console.log(`[BulkChannelDelete] Attempting fetch with token`);
                    
                    const response = await fetch(`https://discord.com/api/v9/channels/${channel.id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': token,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok || response.status === 204) {
                        deleted = true;
                        console.log(`[BulkChannelDelete] ✅ Deleted via fetch`);
                    } else {
                        const errorText = await response.text();
                        console.log(`[BulkChannelDelete] Fetch response:`, response.status, errorText);
                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }
                } catch (e: any) {
                    console.error(`[BulkChannelDelete] Fetch failed:`, e.message);
                }
            }
            
            if (!deleted) {
                throw new Error('All deletion methods failed - check console for details');
            }
            
            successCount++;
            selectedChannels.delete(channel.id);
            
            // Dispatch delete event to update UI
            FluxDispatcher.dispatch({
                type: "CHANNEL_DELETE",
                channel: { id: channel.id, guild_id: channel.guild_id }
            });
            
            // Wait before next deletion
            if (i < channels.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        } catch (error: any) {
            console.error(`[BulkChannelDelete] ❌ Failed to delete channel:`, error);
            failCount++;
            showToast(`❌ Failed: #${channel.name}`, 2);
        }
    }
    
    isDeleting = false;
    selectedChannels.clear();
    updateUI();
    
    console.log(`[BulkChannelDelete] Complete: ${successCount} succeeded, ${failCount} failed`);
    showToast(`✅ ${successCount} deleted${failCount > 0 ? `, ${failCount} failed` : ""}`, failCount > 0 ? 2 : 1);
}

// Create floating button UI
function createDeleteButton() {
    if (deleteButtonElement) {
        deleteButtonElement.remove();
    }
    
    if (selectedChannels.size === 0) return;
    
    const container = document.createElement("div");
    container.style.cssText = `
        position: fixed;
        top: 60px;
        left: 20px;
        z-index: 9999;
        background: #2b2d31;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
        display: flex;
        gap: 8px;
        align-items: center;
        border: 1px solid #1e1f22;
        font-family: 'gg sans', 'Noto Sans', sans-serif;
    `;
    
    container.innerHTML = `
        <span style="font-size: 14px; margin-right: 8px; color: #dbdee1; font-weight: 500;">
            ${selectedChannels.size} selected
        </span>
        <button id="bulk-delete-btn" style="
            background: #ed4245;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        ">🗑️ Delete Selected</button>
        <button id="bulk-export-btn" style="
            background: #4e5058;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        ">📥 Export</button>
        <button id="bulk-clear-btn" style="
            background: #4e5058;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        ">✖️ Clear</button>
    `;
    
    document.body.appendChild(container);
    deleteButtonElement = container;
    
    // Event listeners
    const deleteBtn = container.querySelector("#bulk-delete-btn");
    const exportBtn = container.querySelector("#bulk-export-btn");
    const clearBtn = container.querySelector("#bulk-clear-btn");
    
    deleteBtn?.addEventListener("mouseenter", (e) => {
        (e.target as HTMLElement).style.background = "#c03537";
    });
    deleteBtn?.addEventListener("mouseleave", (e) => {
        (e.target as HTMLElement).style.background = "#ed4245";
    });
    
    deleteBtn?.addEventListener("click", () => {
        if (settings.store.showWarnings) {
            showConfirmDialog(selectedChannels.size, () => {
                deleteChannels([...selectedChannels]);
            });
        } else {
            deleteChannels([...selectedChannels]);
        }
    });
    
    exportBtn?.addEventListener("click", () => {
        const channels = [...selectedChannels].map(id => ChannelStore.getChannel(id)).filter(Boolean);
        exportChannelsToJSON(channels);
    });
    
    clearBtn?.addEventListener("click", () => {
        selectedChannels.clear();
        updateUI();
    });
}

// Update checkboxes on selected channels
function updateCheckboxes() {
    // Remove all existing checkboxes
    document.querySelectorAll(".bulk-delete-checkbox").forEach(el => el.remove());
    
    // Update CSS based on selection state
    const style = document.getElementById("bulk-channel-delete-style");
    if (style) {
        if (selectedChannels.size > 0) {
            style.textContent = `
                [class*="containerDefault"],
                [class*="wrapper"] > [class*="content"] > div > div {
                    position: relative;
                    padding-left: 32px !important;
                }
            `;
        } else {
            style.textContent = `/* No padding when nothing selected */`;
        }
    }
    
    // Add checkboxes to selected channels
    selectedChannels.forEach(channelId => {
        const channelElement = document.querySelector(`[data-list-item-id="channels___${channelId}"]`);
        if (channelElement && !channelElement.querySelector(".bulk-delete-checkbox")) {
            const checkbox = document.createElement("div");
            checkbox.className = "bulk-delete-checkbox";
            checkbox.style.cssText = `
                position: absolute;
                left: 8px;
                top: 50%;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                background: #5865f2;
                border: 2px solid #5865f2;
                border-radius: 3px;
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10;
                pointer-events: none;
            `;
            checkbox.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
            `;
            channelElement.insertBefore(checkbox, channelElement.firstChild);
        }
    });
}

// Update all UI elements
function updateUI() {
    createDeleteButton();
    updateCheckboxes();
}

// Handle Shift + Right Click on channels
function handleContextMenu(e: MouseEvent) {
    if (!e.shiftKey) return;
    
    const target = e.target as HTMLElement;
    const channelLink = target.closest('[data-list-item-id^="channels___"]');
    
    if (!channelLink) return;
    
    const channelId = channelLink.getAttribute("data-list-item-id")?.replace("channels___", "");
    if (!channelId) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Toggle selection
    if (selectedChannels.has(channelId)) {
        selectedChannels.delete(channelId);
        showToast(`Channel deselected (${selectedChannels.size} total)`, 0);
    } else {
        selectedChannels.add(channelId);
        showToast(`Channel selected (${selectedChannels.size} total)`, 0);
    }
    
    updateUI();
}

// Main plugin export
export default definePlugin({
    name: "BulkChannelDelete",
    description: "Multi-select and bulk delete Discord channels with Shift + Right Click",
    authors: [Devs.Nobody],
    settings,
    
    start() {
        console.log("[BulkChannelDelete] Plugin started");
        
        // Inject CSS for channel padding (only when channels are selected)
        const style = document.createElement("style");
        style.id = "bulk-channel-delete-style";
        style.textContent = `
            /* No padding by default */
        `;
        document.head.appendChild(style);
        
        // Add event listener
        document.addEventListener("contextmenu", handleContextMenu, true);
        
        showToast("✅ Bulk Channel Delete enabled - Hold Shift + Right Click to select channels", 1);
    },
    
    stop() {
        console.log("[BulkChannelDelete] Plugin stopped");
        
        // Clear state
        selectedChannels.clear();
        isDeleting = false;
        
        // Remove UI
        if (deleteButtonElement) {
            deleteButtonElement.remove();
            deleteButtonElement = null;
        }
        document.querySelectorAll(".bulk-delete-checkbox").forEach(el => el.remove());
        
        // Remove CSS
        const style = document.getElementById("bulk-channel-delete-style");
        if (style) style.remove();
        
        // Remove event listener
        document.removeEventListener("contextmenu", handleContextMenu, true);
        
        showToast("Bulk Channel Delete disabled", 0);
    }
});
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default {
    name: "SaveCheckboxSettings",
    description: "Saves the states of checkboxes in Discord settings and restores them on restart.",
    authors: [Devs.holybananapants],  
    version: "1.0.0",

    start() {
        console.log("[SaveCheckboxSettings] Plugin started!");

        // Observe DOM changes until all checkboxes are found
        const observer = new MutationObserver(() => {
            // Select the relevant checkboxes
            const participantCheckbox = document.querySelector('.checkbox_d90b3d:nth-of-type(1)') as HTMLInputElement | null;
            const ownVideoCheckbox = document.querySelector('.checkbox_d90b3d:nth-of-type(2)') as HTMLInputElement | null;
            const messagePreviewCheckbox = document.querySelector('.checkbox_d90b3d:nth-of-type(3)') as HTMLInputElement | null;

            // Ensure all checkboxes are available
            if (!participantCheckbox || !ownVideoCheckbox || !messagePreviewCheckbox) return;

            // Load saved settings from local storage
            const savedSettings = JSON.parse(localStorage.getItem("SaveCheckboxSettings") || "{}");

            // Apply saved values
            if (savedSettings.showParticipants !== undefined) {
                participantCheckbox.checked = savedSettings.showParticipants;
            }
            if (savedSettings.hideOwnVideo !== undefined) {
                ownVideoCheckbox.checked = savedSettings.hideOwnVideo;
            }
            if (savedSettings.showMessagePreview !== undefined) {
                messagePreviewCheckbox.checked = savedSettings.showMessagePreview;
            }

            // Save changes when the checkboxes are updated
            participantCheckbox.addEventListener("change", () => {
                savedSettings.showParticipants = participantCheckbox.checked;
                localStorage.setItem("SaveCheckboxSettings", JSON.stringify(savedSettings));
            });

            ownVideoCheckbox.addEventListener("change", () => {
                savedSettings.hideOwnVideo = ownVideoCheckbox.checked;
                localStorage.setItem("SaveCheckboxSettings", JSON.stringify(savedSettings));
            });

            messagePreviewCheckbox.addEventListener("change", () => {
                savedSettings.showMessagePreview = messagePreviewCheckbox.checked;
                localStorage.setItem("SaveCheckboxSettings", JSON.stringify(savedSettings));
            });

            console.log("[SaveCheckboxSettings] All checkboxes initialized!");

            // Stop observing once checkboxes are found and initialized
            observer.disconnect();
        });

        // Start observing the entire DOM
        observer.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        console.log("[SaveCheckboxSettings] Plugin stopped!");
    },
};

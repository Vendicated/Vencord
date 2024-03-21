import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import './styles.css';

const closeButtonSelector = '.closeButton__8f1fd';

let observer: MutationObserver;

function observeMutations() {
    observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node instanceof Element) {
                        disableCloseButtonsInElement(node);
                    }
                });
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
function stopObservingMutations() {
    observer.disconnect();
}

function enableCloseButtonsInElement(element: Element) {
    const closeButtonElements = element.querySelectorAll(closeButtonSelector);
    closeButtonElements.forEach(button => {
        button.setAttribute('aria-disabled', 'false');
        button.classList.remove('disabledCloseButton');
    });
}
function disableCloseButtonsInElement(element: Element) {
    const closeButtonElements = element.querySelectorAll(closeButtonSelector);
    closeButtonElements.forEach(button => {
        button.setAttribute('aria-disabled', 'true');
        button.classList.add('disabledCloseButton');
    });
}



export default definePlugin({
    name: "NoDMCloseButtons",
    description: "Removes the annoying close button that appears whenever you hover a DM",
    authors: [Devs.AntoKek],
    tags: ["direct messages", "quality of life"],
    start() {
        observeMutations();
        disableCloseButtonsInElement(document.body);
    },
    stop() {
        enableCloseButtonsInElement(document.body);
        stopObservingMutations();
    }
});

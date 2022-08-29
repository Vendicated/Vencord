type Listener = (message, channel, event) => void;

const listeners = new Set<Listener>();

export function _handleClick(message, channel, event) {
    for (const listener of listeners) {
        listener(message, channel, event);
    }
}

export function addListener(listener: Listener) {
    listeners.add(listener);
}

export function removeListener(listener: Listener) {
    return listeners.delete(listener);
}
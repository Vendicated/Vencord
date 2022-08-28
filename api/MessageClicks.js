const listeners = new Set();

function _handleClick(message, channel, event) {
    for (const listener of listeners) {
        try {
            listener(message, channel, event);
        } catch (e) { console.error(`MessageClick: Listener encoutered an unknown error. (${e.message})`) }
    }
}

function addListener(listener) {
    listeners.add(listener);
}

function removeListener(listener) {
    return listeners.delete(listener);
}

module.exports = {
    _handleClick,
    addListener,
    removeListener
};

const listeners = new Set();

function _handleClick(message, channel, event) {
    console.log("CLICK!", message, channel, event);
    for (const listener of listeners) {
        listener(message, channel, event);
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

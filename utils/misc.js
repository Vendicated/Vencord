module.exports.assert = function (bool, message) {
    if (!bool)
        throw new Error(message);
};

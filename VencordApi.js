module.exports = class VencordApi {
    Webpack = require("./utils/webpack");
    Api = require("./api");
    Constants = require("./constants");
    patches = require("./patches").patches;

    get d() {
        console.log("8==>");
        return void 0;
    }
};

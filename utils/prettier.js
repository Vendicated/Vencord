const prettier = require("prettier");
const electron = require("electron");

// cry
Function.prototype.prettier = function () {
    return prettier.format(this.toString(), { filepath: "index.js" });
};

electron.webFrame.top.context.Function.prototype.prettier = Function.prototype.prettier;

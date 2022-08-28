const prettier = require("prettier");
const electron = require("electron");

// cry
Function.prototype.prettier = function () {
    return prettier.format("var _$_ =\n// This var above is there to make anonymous functions work. Actual code below\n//\n" + this.toString(), { filepath: "index.js" });
};

electron.webFrame.top.context.Function.prototype.prettier = Function.prototype.prettier;

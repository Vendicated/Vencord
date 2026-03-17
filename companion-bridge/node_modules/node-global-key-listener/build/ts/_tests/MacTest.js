"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//Change directory to make sure ./ is working correctly
const process_1 = __importDefault(require("process"));
process_1.default.chdir("../../..");
const MacKeyServer_1 = require("../MacKeyServer");
var v = new MacKeyServer_1.MacKeyServer(function (e) {
    console.log(e);
    if (e.name == "B")
        v.stop(); //Quit on B press
    return e.name == "A"; //Capture only A keys
});
v.start();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFjVGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90cy9fdGVzdHMvTWFjVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHVEQUF1RDtBQUN2RCxzREFBNkI7QUFDN0IsaUJBQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUE7QUFHekIsa0RBQStDO0FBRS9DLElBQUksQ0FBQyxHQUFHLElBQUksMkJBQVksQ0FBQyxVQUFTLENBQUM7SUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNmLElBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHO1FBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsaUJBQWlCO0lBQzdDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxxQkFBcUI7QUFDL0MsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMifQ==
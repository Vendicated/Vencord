var Module = typeof Module !== "undefined" ? Module : {};

var moduleOverrides = {};

var key;

for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}

var arguments_ = [];

var thisProgram = "./this.program";

var quit_ = function(status, toThrow) {
 throw toThrow;
};

var ENVIRONMENT_IS_WEB = false;

var ENVIRONMENT_IS_WORKER = false;

var ENVIRONMENT_IS_NODE = false;

var ENVIRONMENT_IS_SHELL = false;

ENVIRONMENT_IS_WEB = typeof window === "object";

ENVIRONMENT_IS_WORKER = typeof importScripts === "function";

ENVIRONMENT_IS_NODE = typeof process === "object" && typeof process.versions === "object" && typeof process.versions.node === "string";

ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

var scriptDirectory = "";

function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 }
 return scriptDirectory + path;
}

var read_, readAsync, readBinary, setWindowTitle;

var nodeFS;

var nodePath;

if (ENVIRONMENT_IS_NODE) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = require("path").dirname(scriptDirectory) + "/";
 } else {
  scriptDirectory = __dirname + "/";
 }
 read_ = function shell_read(filename, binary) {
  if (!nodeFS) nodeFS = require("fs");
  if (!nodePath) nodePath = require("path");
  filename = nodePath["normalize"](filename);
  return nodeFS["readFileSync"](filename, binary ? null : "utf8");
 };
 readBinary = function readBinary(filename) {
  var ret = read_(filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  thisProgram = process["argv"][1].replace(/\\/g, "/");
 }
 arguments_ = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 });
 process["on"]("unhandledRejection", abort);
 quit_ = function(status) {
  process["exit"](status);
 };
 Module["inspect"] = function() {
  return "[Emscripten Module object]";
 };
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  read_ = function shell_read(f) {
   return read(f);
  };
 }
 readBinary = function readBinary(f) {
  var data;
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  arguments_ = scriptArgs;
 } else if (typeof arguments != "undefined") {
  arguments_ = arguments;
 }
 if (typeof quit === "function") {
  quit_ = function(status) {
   quit(status);
  };
 }
 if (typeof print !== "undefined") {
  if (typeof console === "undefined") console = {};
  console.log = print;
  console.warn = console.error = typeof printErr !== "undefined" ? printErr : print;
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (typeof document !== "undefined" && document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 {
  read_ = function(url) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  };
  if (ENVIRONMENT_IS_WORKER) {
   readBinary = function(url) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(xhr.response);
   };
  }
  readAsync = function(url, onload, onerror) {
   var xhr = new XMLHttpRequest();
   xhr.open("GET", url, true);
   xhr.responseType = "arraybuffer";
   xhr.onload = function() {
    if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
     onload(xhr.response);
     return;
    }
    onerror();
   };
   xhr.onerror = onerror;
   xhr.send(null);
  };
 }
 setWindowTitle = function(title) {
  document.title = title;
 };
} else {}

var out = Module["print"] || console.log.bind(console);

var err = Module["printErr"] || console.warn.bind(console);

for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}

moduleOverrides = null;

if (Module["arguments"]) arguments_ = Module["arguments"];

if (Module["thisProgram"]) thisProgram = Module["thisProgram"];

if (Module["quit"]) quit_ = Module["quit"];

var STACK_ALIGN = 16;

function alignMemory(size, factor) {
 if (!factor) factor = STACK_ALIGN;
 return Math.ceil(size / factor) * factor;
}

function getNativeTypeSize(type) {
 switch (type) {
 case "i1":
 case "i8":
  return 1;

 case "i16":
  return 2;

 case "i32":
  return 4;

 case "i64":
  return 8;

 case "float":
  return 4;

 case "double":
  return 8;

 default:
  {
   if (type[type.length - 1] === "*") {
    return 4;
   } else if (type[0] === "i") {
    var bits = Number(type.substr(1));
    assert(bits % 8 === 0, "getNativeTypeSize invalid bits " + bits + ", type " + type);
    return bits / 8;
   } else {
    return 0;
   }
  }
 }
}

function warnOnce(text) {
 if (!warnOnce.shown) warnOnce.shown = {};
 if (!warnOnce.shown[text]) {
  warnOnce.shown[text] = 1;
  err(text);
 }
}

function convertJsFunctionToWasm(func, sig) {
 if (typeof WebAssembly.Function === "function") {
  var typeNames = {
   "i": "i32",
   "j": "i64",
   "f": "f32",
   "d": "f64"
  };
  var type = {
   parameters: [],
   results: sig[0] == "v" ? [] : [ typeNames[sig[0]] ]
  };
  for (var i = 1; i < sig.length; ++i) {
   type.parameters.push(typeNames[sig[i]]);
  }
  return new WebAssembly.Function(type, func);
 }
 var typeSection = [ 1, 0, 1, 96 ];
 var sigRet = sig.slice(0, 1);
 var sigParam = sig.slice(1);
 var typeCodes = {
  "i": 127,
  "j": 126,
  "f": 125,
  "d": 124
 };
 typeSection.push(sigParam.length);
 for (var i = 0; i < sigParam.length; ++i) {
  typeSection.push(typeCodes[sigParam[i]]);
 }
 if (sigRet == "v") {
  typeSection.push(0);
 } else {
  typeSection = typeSection.concat([ 1, typeCodes[sigRet] ]);
 }
 typeSection[1] = typeSection.length - 2;
 var bytes = new Uint8Array([ 0, 97, 115, 109, 1, 0, 0, 0 ].concat(typeSection, [ 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0 ]));
 var module = new WebAssembly.Module(bytes);
 var instance = new WebAssembly.Instance(module, {
  "e": {
   "f": func
  }
 });
 var wrappedFunc = instance.exports["f"];
 return wrappedFunc;
}

var freeTableIndexes = [];

var functionsInTableMap;

function getEmptyTableSlot() {
 if (freeTableIndexes.length) {
  return freeTableIndexes.pop();
 }
 try {
  wasmTable.grow(1);
 } catch (err) {
  if (!(err instanceof RangeError)) {
   throw err;
  }
  throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
 }
 return wasmTable.length - 1;
}

function addFunctionWasm(func, sig) {
 if (!functionsInTableMap) {
  functionsInTableMap = new WeakMap();
  for (var i = 0; i < wasmTable.length; i++) {
   var item = wasmTable.get(i);
   if (item) {
    functionsInTableMap.set(item, i);
   }
  }
 }
 if (functionsInTableMap.has(func)) {
  return functionsInTableMap.get(func);
 }
 var ret = getEmptyTableSlot();
 try {
  wasmTable.set(ret, func);
 } catch (err) {
  if (!(err instanceof TypeError)) {
   throw err;
  }
  var wrapped = convertJsFunctionToWasm(func, sig);
  wasmTable.set(ret, wrapped);
 }
 functionsInTableMap.set(func, ret);
 return ret;
}

function removeFunction(index) {
 functionsInTableMap.delete(wasmTable.get(index));
 freeTableIndexes.push(index);
}

function addFunction(func, sig) {
 return addFunctionWasm(func, sig);
}

function makeBigInt(low, high, unsigned) {
 return unsigned ? +(low >>> 0) + +(high >>> 0) * 4294967296 : +(low >>> 0) + +(high | 0) * 4294967296;
}

var tempRet0 = 0;

var setTempRet0 = function(value) {
 tempRet0 = value;
};

var getTempRet0 = function() {
 return tempRet0;
};

var wasmBinary;

if (Module["wasmBinary"]) wasmBinary = Module["wasmBinary"];

var noExitRuntime = Module["noExitRuntime"] || false;

if (typeof WebAssembly !== "object") {
 abort("no native wasm support detected");
}

function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 if (noSafe) {
  switch (type) {
  case "i1":
   HEAP8[ptr >> 0] = value;
   break;

  case "i8":
   HEAP8[ptr >> 0] = value;
   break;

  case "i16":
   HEAP16[ptr >> 1] = value;
   break;

  case "i32":
   HEAP32[ptr >> 2] = value;
   break;

  case "i64":
   tempI64 = [ value >>> 0, (tempDouble = value, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
   HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
   break;

  case "float":
   HEAPF32[ptr >> 2] = value;
   break;

  case "double":
   HEAPF64[ptr >> 3] = value;
   break;

  default:
   abort("invalid type for setValue: " + type);
  }
 } else {
  switch (type) {
  case "i1":
   SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
   break;

  case "i8":
   SAFE_HEAP_STORE(ptr | 0, value | 0, 1);
   break;

  case "i16":
   SAFE_HEAP_STORE(ptr | 0, value | 0, 2);
   break;

  case "i32":
   SAFE_HEAP_STORE(ptr | 0, value | 0, 4);
   break;

  case "i64":
   tempI64 = [ value >>> 0, (tempDouble = value, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
   SAFE_HEAP_STORE(ptr | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(ptr + 4 | 0, tempI64[1] | 0, 4);
   break;

  case "float":
   SAFE_HEAP_STORE_D(ptr | 0, Math.fround(value), 4);
   break;

  case "double":
   SAFE_HEAP_STORE_D(ptr | 0, +value, 8);
   break;

  default:
   abort("invalid type for setValue: " + type);
  }
 }
}

function getValue(ptr, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 if (noSafe) {
  switch (type) {
  case "i1":
   return HEAP8[ptr >> 0];

  case "i8":
   return HEAP8[ptr >> 0];

  case "i16":
   return HEAP16[ptr >> 1];

  case "i32":
   return HEAP32[ptr >> 2];

  case "i64":
   return HEAP32[ptr >> 2];

  case "float":
   return HEAPF32[ptr >> 2];

  case "double":
   return HEAPF64[ptr >> 3];

  default:
   abort("invalid type for getValue: " + type);
  }
 } else {
  switch (type) {
  case "i1":
   return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

  case "i8":
   return SAFE_HEAP_LOAD(ptr | 0, 1, 0) | 0;

  case "i16":
   return SAFE_HEAP_LOAD(ptr | 0, 2, 0) | 0;

  case "i32":
   return SAFE_HEAP_LOAD(ptr | 0, 4, 0) | 0;

  case "i64":
   return SAFE_HEAP_LOAD(ptr | 0, 8, 0) | 0;

  case "float":
   return Math.fround(SAFE_HEAP_LOAD_D(ptr | 0, 4, 0));

  case "double":
   return +SAFE_HEAP_LOAD_D(ptr | 0, 8, 0);

  default:
   abort("invalid type for getValue: " + type);
  }
 }
 return null;
}

function getSafeHeapType(bytes, isFloat) {
 switch (bytes) {
 case 1:
  return "i8";

 case 2:
  return "i16";

 case 4:
  return isFloat ? "float" : "i32";

 case 8:
  return "double";

 default:
  assert(0);
 }
}

function SAFE_HEAP_STORE(dest, value, bytes, isFloat) {
 if (dest <= 0) abort("segmentation fault storing " + bytes + " bytes to address " + dest);
 if (dest % bytes !== 0) abort("alignment error storing to address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
 if (runtimeInitialized) {
  var brk = _sbrk() >>> 0;
  if (dest + bytes > brk) abort("segmentation fault, exceeded the top of the available dynamic heap when storing " + bytes + " bytes to address " + dest + ". DYNAMICTOP=" + brk);
  assert(brk >= _emscripten_stack_get_base());
  assert(brk <= HEAP8.length);
 }
 setValue(dest, value, getSafeHeapType(bytes, isFloat), 1);
 return value;
}

function SAFE_HEAP_STORE_D(dest, value, bytes) {
 return SAFE_HEAP_STORE(dest, value, bytes, true);
}

function SAFE_HEAP_LOAD(dest, bytes, unsigned, isFloat) {
 if (dest <= 0) abort("segmentation fault loading " + bytes + " bytes from address " + dest);
 if (dest % bytes !== 0) abort("alignment error loading from address " + dest + ", which was expected to be aligned to a multiple of " + bytes);
 if (runtimeInitialized) {
  var brk = _sbrk() >>> 0;
  if (dest + bytes > brk) abort("segmentation fault, exceeded the top of the available dynamic heap when loading " + bytes + " bytes from address " + dest + ". DYNAMICTOP=" + brk);
  assert(brk >= _emscripten_stack_get_base());
  assert(brk <= HEAP8.length);
 }
 var type = getSafeHeapType(bytes, isFloat);
 var ret = getValue(dest, type, 1);
 if (unsigned) ret = unSign(ret, parseInt(type.substr(1), 10));
 return ret;
}

function SAFE_HEAP_LOAD_D(dest, bytes, unsigned) {
 return SAFE_HEAP_LOAD(dest, bytes, unsigned, true);
}

function SAFE_FT_MASK(value, mask) {
 var ret = value & mask;
 if (ret !== value) {
  abort("Function table mask error: function pointer is " + value + " which is masked by " + mask + ", the likely cause of this is that the function pointer is being called by the wrong type.");
 }
 return ret;
}

function segfault() {
 abort("segmentation fault");
}

function alignfault() {
 abort("alignment fault");
}

function ftfault() {
 abort("Function table mask error");
}

var wasmMemory;

var ABORT = false;

var EXITSTATUS;

function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}

function getCFunc(ident) {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
}

function ccall(ident, returnType, argTypes, args, opts) {
 var toC = {
  "string": function(str) {
   var ret = 0;
   if (str !== null && str !== undefined && str !== 0) {
    var len = (str.length << 2) + 1;
    ret = stackAlloc(len);
    stringToUTF8(str, ret, len);
   }
   return ret;
  },
  "array": function(arr) {
   var ret = stackAlloc(arr.length);
   writeArrayToMemory(arr, ret);
   return ret;
  }
 };
 function convertReturnValue(ret) {
  if (returnType === "string") return UTF8ToString(ret);
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func.apply(null, cArgs);
 var asyncMode = opts && opts.async;
 var runningAsync = typeof Asyncify === "object" && Asyncify.currData;
 var prevRunningAsync = typeof Asyncify === "object" && Asyncify.asyncFinalizers.length > 0;
 if (runningAsync && !prevRunningAsync) {
  return new Promise(function(resolve) {
   Asyncify.asyncFinalizers.push(function(ret) {
    if (stack !== 0) stackRestore(stack);
    resolve(convertReturnValue(ret));
   });
  });
 }
 ret = convertReturnValue(ret);
 if (stack !== 0) stackRestore(stack);
 if (opts && opts.async) return Promise.resolve(ret);
 return ret;
}

function cwrap(ident, returnType, argTypes, opts) {
 argTypes = argTypes || [];
 var numericArgs = argTypes.every(function(type) {
  return type === "number";
 });
 var numericRet = returnType !== "string";
 if (numericRet && numericArgs && !opts) {
  return getCFunc(ident);
 }
 return function() {
  return ccall(ident, returnType, argTypes, arguments, opts);
 };
}

var ALLOC_NORMAL = 0;

var ALLOC_STACK = 1;

function allocate(slab, allocator) {
 var ret;
 if (allocator == ALLOC_STACK) {
  ret = stackAlloc(slab.length);
 } else {
  ret = _malloc(slab.length);
 }
 if (slab.subarray || slab.slice) {
  HEAPU8.set(slab, ret);
 } else {
  HEAPU8.set(new Uint8Array(slab), ret);
 }
 return ret;
}

var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

function UTF8ArrayToString(heap, idx, maxBytesToRead) {
 var endIdx = idx + maxBytesToRead;
 var endPtr = idx;
 while (heap[endPtr] && !(endPtr >= endIdx)) ++endPtr;
 if (endPtr - idx > 16 && heap.subarray && UTF8Decoder) {
  return UTF8Decoder.decode(heap.subarray(idx, endPtr));
 } else {
  var str = "";
  while (idx < endPtr) {
   var u0 = heap[idx++];
   if (!(u0 & 128)) {
    str += String.fromCharCode(u0);
    continue;
   }
   var u1 = heap[idx++] & 63;
   if ((u0 & 224) == 192) {
    str += String.fromCharCode((u0 & 31) << 6 | u1);
    continue;
   }
   var u2 = heap[idx++] & 63;
   if ((u0 & 240) == 224) {
    u0 = (u0 & 15) << 12 | u1 << 6 | u2;
   } else {
    u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heap[idx++] & 63;
   }
   if (u0 < 65536) {
    str += String.fromCharCode(u0);
   } else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
   }
  }
 }
 return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
 return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : "";
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   heap[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   heap[outIdx++] = 192 | u >> 6;
   heap[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   heap[outIdx++] = 224 | u >> 12;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 3 >= endIdx) break;
   heap[outIdx++] = 240 | u >> 18;
   heap[outIdx++] = 128 | u >> 12 & 63;
   heap[outIdx++] = 128 | u >> 6 & 63;
   heap[outIdx++] = 128 | u & 63;
  }
 }
 heap[outIdx] = 0;
 return outIdx - startIdx;
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}

function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) ++len; else if (u <= 2047) len += 2; else if (u <= 65535) len += 3; else len += 4;
 }
 return len;
}

function AsciiToString(ptr) {
 var str = "";
 while (1) {
  var ch = SAFE_HEAP_LOAD(ptr++ | 0, 1, 1) >>> 0;
  if (!ch) return str;
  str += String.fromCharCode(ch);
 }
}

function stringToAscii(str, outPtr) {
 return writeAsciiToMemory(str, outPtr, false);
}

var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

function UTF16ToString(ptr, maxBytesToRead) {
 var endPtr = ptr;
 var idx = endPtr >> 1;
 var maxIdx = idx + maxBytesToRead / 2;
 while (!(idx >= maxIdx) && SAFE_HEAP_LOAD(idx * 2, 2, 1)) ++idx;
 endPtr = idx << 1;
 if (endPtr - ptr > 32 && UTF16Decoder) {
  return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
 } else {
  var str = "";
  for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
   var codeUnit = SAFE_HEAP_LOAD(ptr + i * 2 | 0, 2, 0) | 0;
   if (codeUnit == 0) break;
   str += String.fromCharCode(codeUnit);
  }
  return str;
 }
}

function stringToUTF16(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 2) return 0;
 maxBytesToWrite -= 2;
 var startPtr = outPtr;
 var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
 for (var i = 0; i < numCharsToWrite; ++i) {
  var codeUnit = str.charCodeAt(i);
  SAFE_HEAP_STORE(outPtr | 0, codeUnit | 0, 2);
  outPtr += 2;
 }
 SAFE_HEAP_STORE(outPtr | 0, 0 | 0, 2);
 return outPtr - startPtr;
}

function lengthBytesUTF16(str) {
 return str.length * 2;
}

function UTF32ToString(ptr, maxBytesToRead) {
 var i = 0;
 var str = "";
 while (!(i >= maxBytesToRead / 4)) {
  var utf32 = SAFE_HEAP_LOAD(ptr + i * 4 | 0, 4, 0) | 0;
  if (utf32 == 0) break;
  ++i;
  if (utf32 >= 65536) {
   var ch = utf32 - 65536;
   str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
  } else {
   str += String.fromCharCode(utf32);
  }
 }
 return str;
}

function stringToUTF32(str, outPtr, maxBytesToWrite) {
 if (maxBytesToWrite === undefined) {
  maxBytesToWrite = 2147483647;
 }
 if (maxBytesToWrite < 4) return 0;
 var startPtr = outPtr;
 var endPtr = startPtr + maxBytesToWrite - 4;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) {
   var trailSurrogate = str.charCodeAt(++i);
   codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023;
  }
  SAFE_HEAP_STORE(outPtr | 0, codeUnit | 0, 4);
  outPtr += 4;
  if (outPtr + 4 > endPtr) break;
 }
 SAFE_HEAP_STORE(outPtr | 0, 0 | 0, 4);
 return outPtr - startPtr;
}

function lengthBytesUTF32(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var codeUnit = str.charCodeAt(i);
  if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
  len += 4;
 }
 return len;
}

function allocateUTF8(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = _malloc(size);
 if (ret) stringToUTF8Array(str, HEAP8, ret, size);
 return ret;
}

function allocateUTF8OnStack(str) {
 var size = lengthBytesUTF8(str) + 1;
 var ret = stackAlloc(size);
 stringToUTF8Array(str, HEAP8, ret, size);
 return ret;
}

function writeStringToMemory(string, buffer, dontAddNull) {
 warnOnce("writeStringToMemory is deprecated and should not be called! Use stringToUTF8() instead!");
 var lastChar, end;
 if (dontAddNull) {
  end = buffer + lengthBytesUTF8(string);
  lastChar = SAFE_HEAP_LOAD(end, 1, 0);
 }
 stringToUTF8(string, buffer, Infinity);
 if (dontAddNull) SAFE_HEAP_STORE(end, lastChar, 1);
}

function writeArrayToMemory(array, buffer) {
 HEAP8.set(array, buffer);
}

function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  SAFE_HEAP_STORE(buffer++ | 0, str.charCodeAt(i) | 0, 1);
 }
 if (!dontAddNull) SAFE_HEAP_STORE(buffer | 0, 0 | 0, 1);
}

function alignUp(x, multiple) {
 if (x % multiple > 0) {
  x += multiple - x % multiple;
 }
 return x;
}

var HEAP, buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

function updateGlobalBufferAndViews(buf) {
 buffer = buf;
 Module["HEAP8"] = HEAP8 = new Int8Array(buf);
 Module["HEAP16"] = HEAP16 = new Int16Array(buf);
 Module["HEAP32"] = HEAP32 = new Int32Array(buf);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buf);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buf);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buf);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buf);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buf);
}

var TOTAL_STACK = 5242880;

var INITIAL_MEMORY = Module["INITIAL_MEMORY"] || 67108864;

var wasmTable;

function writeStackCookie() {
 var max = _emscripten_stack_get_end();
 SAFE_HEAP_STORE(((max >> 2) + 1) * 4, 34821223, 4);
 SAFE_HEAP_STORE(((max >> 2) + 2) * 4, 2310721022, 4);
}

function checkStackCookie() {
 if (ABORT) return;
 var max = _emscripten_stack_get_end();
 var cookie1 = SAFE_HEAP_LOAD(((max >> 2) + 1) * 4, 4, 1);
 var cookie2 = SAFE_HEAP_LOAD(((max >> 2) + 2) * 4, 4, 1);
 if (cookie1 != 34821223 || cookie2 != 2310721022) {
  abort("Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x2135467, but received 0x" + cookie2.toString(16) + " " + cookie1.toString(16));
 }
}

var __ATPRERUN__ = [];

var __ATINIT__ = [];

var __ATMAIN__ = [];

var __ATEXIT__ = [];

var __ATPOSTRUN__ = [];

var runtimeInitialized = false;

var runtimeExited = false;

function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}

function initRuntime() {
 checkStackCookie();
 runtimeInitialized = true;
 if (!Module["noFSInit"] && !FS.init.initialized) FS.init();
 TTY.init();
 callRuntimeCallbacks(__ATINIT__);
}

function preMain() {
 checkStackCookie();
 FS.ignorePermissions = false;
 callRuntimeCallbacks(__ATMAIN__);
}

function exitRuntime() {
 checkStackCookie();
 callRuntimeCallbacks(__ATEXIT__);
 FS.quit();
 TTY.shutdown();
 runtimeExited = true;
}

function postRun() {
 checkStackCookie();
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}

function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}

function addOnInit(cb) {
 __ATINIT__.unshift(cb);
}

function addOnPreMain(cb) {
 __ATMAIN__.unshift(cb);
}

function addOnExit(cb) {
 __ATEXIT__.unshift(cb);
}

function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}

var runDependencies = 0;

var runDependencyWatcher = null;

var dependenciesFulfilled = null;

function getUniqueRunDependency(id) {
 return id;
}

function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}

function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}

Module["preloadedImages"] = {};

Module["preloadedAudios"] = {};

function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 what += "";
 err(what);
 ABORT = true;
 EXITSTATUS = 1;
 what = "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
 var e = new WebAssembly.RuntimeError(what);
 throw e;
}

function hasPrefix(str, prefix) {
 return String.prototype.startsWith ? str.startsWith(prefix) : str.indexOf(prefix) === 0;
}

var dataURIPrefix = "data:application/octet-stream;base64,";

function isDataURI(filename) {
 return hasPrefix(filename, dataURIPrefix);
}

var fileURIPrefix = "file://";

function isFileURI(filename) {
 return hasPrefix(filename, fileURIPrefix);
}

var wasmBinaryFile = "websockets-doom.wasm";

if (!isDataURI(wasmBinaryFile)) {
 wasmBinaryFile = locateFile(wasmBinaryFile);
}

function getBinary(file) {
 try {
  if (file == wasmBinaryFile && wasmBinary) {
   return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
   return readBinary(file);
  } else {
   throw "both async and sync fetching of the wasm failed";
  }
 } catch (err) {
  abort(err);
 }
}

function getBinaryPromise() {
 if (!wasmBinary && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER)) {
  if (typeof fetch === "function" && !isFileURI(wasmBinaryFile)) {
   return fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then(function(response) {
    if (!response["ok"]) {
     throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
    }
    return response["arrayBuffer"]();
   }).catch(function() {
    return getBinary(wasmBinaryFile);
   });
  } else {
   if (readAsync) {
    return new Promise(function(resolve, reject) {
     readAsync(wasmBinaryFile, function(response) {
      resolve(new Uint8Array(response));
     }, reject);
    });
   }
  }
 }
 return Promise.resolve().then(function() {
  return getBinary(wasmBinaryFile);
 });
}

function createWasm() {
 var info = {
  "env": asmLibraryArg,
  "wasi_snapshot_preview1": asmLibraryArg
 };
 function receiveInstance(instance, module) {
  var exports = instance.exports;
  exports = Asyncify.instrumentWasmExports(exports);
  Module["asm"] = exports;
  wasmMemory = Module["asm"]["memory"];
  updateGlobalBufferAndViews(wasmMemory.buffer);
  wasmTable = Module["asm"]["__indirect_function_table"];
  addOnInit(Module["asm"]["__wasm_call_ctors"]);
  removeRunDependency("wasm-instantiate");
 }
 addRunDependency("wasm-instantiate");
 function receiveInstantiatedSource(output) {
  receiveInstance(output["instance"]);
 }
 function instantiateArrayBuffer(receiver) {
  return getBinaryPromise().then(function(binary) {
   var result = WebAssembly.instantiate(binary, info);
   return result;
  }).then(receiver, function(reason) {
   err("failed to asynchronously prepare wasm: " + reason);
   abort(reason);
  });
 }
 function instantiateAsync() {
  if (!wasmBinary && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && !isFileURI(wasmBinaryFile) && typeof fetch === "function") {
   return fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then(function(response) {
    var result = WebAssembly.instantiateStreaming(response, info);
    return result.then(receiveInstantiatedSource, function(reason) {
     err("wasm streaming compile failed: " + reason);
     err("falling back to ArrayBuffer instantiation");
     return instantiateArrayBuffer(receiveInstantiatedSource);
    });
   });
  } else {
   return instantiateArrayBuffer(receiveInstantiatedSource);
  }
 }
 if (Module["instantiateWasm"]) {
  try {
   var exports = Module["instantiateWasm"](info, receiveInstance);
   exports = Asyncify.instrumentWasmExports(exports);
   return exports;
  } catch (e) {
   err("Module.instantiateWasm callback failed with error: " + e);
   return false;
  }
 }
 instantiateAsync();
 return {};
}

var tempDouble;

var tempI64;

var ASM_CONSTS = {
 424916: function($0) {
  var str = UTF8ToString($0) + "\n\n" + "Abort/Retry/Ignore/AlwaysIgnore? [ariA] :";
  var reply = window.prompt(str, "i");
  if (reply === null) {
   reply = "i";
  }
  return allocate(intArrayFromString(reply), "i8", ALLOC_NORMAL);
 },
 425141: function($0, $1) {
  alert(UTF8ToString($0) + "\n\n" + UTF8ToString($1));
 },
 425198: function($0, $1, $2) {
  var w = $0;
  var h = $1;
  var pixels = $2;
  if (!Module["SDL2"]) Module["SDL2"] = {};
  var SDL2 = Module["SDL2"];
  if (SDL2.ctxCanvas !== Module["canvas"]) {
   SDL2.ctx = Module["createContext"](Module["canvas"], false, true);
   SDL2.ctxCanvas = Module["canvas"];
  }
  if (SDL2.w !== w || SDL2.h !== h || SDL2.imageCtx !== SDL2.ctx) {
   SDL2.image = SDL2.ctx.createImageData(w, h);
   SDL2.w = w;
   SDL2.h = h;
   SDL2.imageCtx = SDL2.ctx;
  }
  var data = SDL2.image.data;
  var src = pixels >> 2;
  var dst = 0;
  var num;
  if (typeof CanvasPixelArray !== "undefined" && data instanceof CanvasPixelArray) {
   num = data.length;
   while (dst < num) {
    var val = SAFE_HEAP_LOAD(src * 4, 4, 0);
    data[dst] = val & 255;
    data[dst + 1] = val >> 8 & 255;
    data[dst + 2] = val >> 16 & 255;
    data[dst + 3] = 255;
    src++;
    dst += 4;
   }
  } else {
   if (SDL2.data32Data !== data) {
    SDL2.data32 = new Int32Array(data.buffer);
    SDL2.data8 = new Uint8Array(data.buffer);
   }
   var data32 = SDL2.data32;
   num = data32.length;
   data32.set(HEAP32.subarray(src, src + num));
   var data8 = SDL2.data8;
   var i = 3;
   var j = i + 4 * num;
   if (num % 8 == 0) {
    while (i < j) {
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
     data8[i] = 255;
     i = i + 4 | 0;
    }
   } else {
    while (i < j) {
     data8[i] = 255;
     i = i + 4 | 0;
    }
   }
  }
  SDL2.ctx.putImageData(SDL2.image, 0, 0);
  return 0;
 },
 426653: function($0, $1, $2, $3, $4) {
  var w = $0;
  var h = $1;
  var hot_x = $2;
  var hot_y = $3;
  var pixels = $4;
  var canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  var ctx = canvas.getContext("2d");
  var image = ctx.createImageData(w, h);
  var data = image.data;
  var src = pixels >> 2;
  var dst = 0;
  var num;
  if (typeof CanvasPixelArray !== "undefined" && data instanceof CanvasPixelArray) {
   num = data.length;
   while (dst < num) {
    var val = SAFE_HEAP_LOAD(src * 4, 4, 0);
    data[dst] = val & 255;
    data[dst + 1] = val >> 8 & 255;
    data[dst + 2] = val >> 16 & 255;
    data[dst + 3] = val >> 24 & 255;
    src++;
    dst += 4;
   }
  } else {
   var data32 = new Int32Array(data.buffer);
   num = data32.length;
   data32.set(HEAP32.subarray(src, src + num));
  }
  ctx.putImageData(image, 0, 0);
  var url = hot_x === 0 && hot_y === 0 ? "url(" + canvas.toDataURL() + "), auto" : "url(" + canvas.toDataURL() + ") " + hot_x + " " + hot_y + ", auto";
  var urlBuf = _malloc(url.length + 1);
  stringToUTF8(url, urlBuf, url.length + 1);
  return urlBuf;
 },
 427642: function($0) {
  if (Module["canvas"]) {
   Module["canvas"].style["cursor"] = UTF8ToString($0);
  }
  return 0;
 },
 427735: function() {
  if (Module["canvas"]) {
   Module["canvas"].style["cursor"] = "none";
  }
 },
 427804: function() {
  return screen.width;
 },
 427829: function() {
  return screen.height;
 },
 427855: function() {
  return window.innerWidth;
 },
 427885: function() {
  return window.innerHeight;
 },
 427916: function($0) {
  if (typeof setWindowTitle !== "undefined") {
   setWindowTitle(UTF8ToString($0));
  }
  return 0;
 },
 428011: function() {
  if (typeof AudioContext !== "undefined") {
   return 1;
  } else if (typeof webkitAudioContext !== "undefined") {
   return 1;
  }
  return 0;
 },
 428148: function() {
  if (typeof navigator.mediaDevices !== "undefined" && typeof navigator.mediaDevices.getUserMedia !== "undefined") {
   return 1;
  } else if (typeof navigator.webkitGetUserMedia !== "undefined") {
   return 1;
  }
  return 0;
 },
 428372: function($0) {
  if (typeof Module["SDL2"] === "undefined") {
   Module["SDL2"] = {};
  }
  var SDL2 = Module["SDL2"];
  if (!$0) {
   SDL2.audio = {};
  } else {
   SDL2.capture = {};
  }
  if (!SDL2.audioContext) {
   if (typeof AudioContext !== "undefined") {
    SDL2.audioContext = new AudioContext();
   } else if (typeof webkitAudioContext !== "undefined") {
    SDL2.audioContext = new webkitAudioContext();
   }
   if (SDL2.audioContext) {
    autoResumeAudioContext(SDL2.audioContext);
   }
  }
  return SDL2.audioContext === undefined ? -1 : 0;
 },
 428865: function() {
  var SDL2 = Module["SDL2"];
  return SDL2.audioContext.sampleRate;
 },
 428933: function($0, $1, $2, $3) {
  var SDL2 = Module["SDL2"];
  var have_microphone = function(stream) {
   if (SDL2.capture.silenceTimer !== undefined) {
    clearTimeout(SDL2.capture.silenceTimer);
    SDL2.capture.silenceTimer = undefined;
   }
   SDL2.capture.mediaStreamNode = SDL2.audioContext.createMediaStreamSource(stream);
   SDL2.capture.scriptProcessorNode = SDL2.audioContext.createScriptProcessor($1, $0, 1);
   SDL2.capture.scriptProcessorNode.onaudioprocess = function(audioProcessingEvent) {
    if (SDL2 === undefined || SDL2.capture === undefined) {
     return;
    }
    audioProcessingEvent.outputBuffer.getChannelData(0).fill(0);
    SDL2.capture.currentCaptureBuffer = audioProcessingEvent.inputBuffer;
    dynCall("vi", $2, [ $3 ]);
   };
   SDL2.capture.mediaStreamNode.connect(SDL2.capture.scriptProcessorNode);
   SDL2.capture.scriptProcessorNode.connect(SDL2.audioContext.destination);
   SDL2.capture.stream = stream;
  };
  var no_microphone = function(error) {};
  SDL2.capture.silenceBuffer = SDL2.audioContext.createBuffer($0, $1, SDL2.audioContext.sampleRate);
  SDL2.capture.silenceBuffer.getChannelData(0).fill(0);
  var silence_callback = function() {
   SDL2.capture.currentCaptureBuffer = SDL2.capture.silenceBuffer;
   dynCall("vi", $2, [ $3 ]);
  };
  SDL2.capture.silenceTimer = setTimeout(silence_callback, $1 / SDL2.audioContext.sampleRate * 1e3);
  if (navigator.mediaDevices !== undefined && navigator.mediaDevices.getUserMedia !== undefined) {
   navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
   }).then(have_microphone).catch(no_microphone);
  } else if (navigator.webkitGetUserMedia !== undefined) {
   navigator.webkitGetUserMedia({
    audio: true,
    video: false
   }, have_microphone, no_microphone);
  }
 },
 430585: function($0, $1, $2, $3) {
  var SDL2 = Module["SDL2"];
  SDL2.audio.scriptProcessorNode = SDL2.audioContext["createScriptProcessor"]($1, 0, $0);
  SDL2.audio.scriptProcessorNode["onaudioprocess"] = function(e) {
   if (SDL2 === undefined || SDL2.audio === undefined) {
    return;
   }
   SDL2.audio.currentOutputBuffer = e["outputBuffer"];
   dynCall("vi", $2, [ $3 ]);
  };
  SDL2.audio.scriptProcessorNode["connect"](SDL2.audioContext["destination"]);
 },
 430995: function($0, $1) {
  var SDL2 = Module["SDL2"];
  var numChannels = SDL2.capture.currentCaptureBuffer.numberOfChannels;
  for (var c = 0; c < numChannels; ++c) {
   var channelData = SDL2.capture.currentCaptureBuffer.getChannelData(c);
   if (channelData.length != $1) {
    throw "Web Audio capture buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + $1 + " samples!";
   }
   if (numChannels == 1) {
    for (var j = 0; j < $1; ++j) {
     setValue($0 + j * 4, channelData[j], "float");
    }
   } else {
    for (var j = 0; j < $1; ++j) {
     setValue($0 + (j * numChannels + c) * 4, channelData[j], "float");
    }
   }
  }
 },
 431600: function($0, $1) {
  var SDL2 = Module["SDL2"];
  var numChannels = SDL2.audio.currentOutputBuffer["numberOfChannels"];
  for (var c = 0; c < numChannels; ++c) {
   var channelData = SDL2.audio.currentOutputBuffer["getChannelData"](c);
   if (channelData.length != $1) {
    throw "Web Audio output buffer length mismatch! Destination size: " + channelData.length + " samples vs expected " + $1 + " samples!";
   }
   for (var j = 0; j < $1; ++j) {
    channelData[j] = SAFE_HEAP_LOAD_D(($0 + (j * numChannels + c << 2) >> 2) * 4, 4, 0);
   }
  }
 },
 432080: function($0) {
  var SDL2 = Module["SDL2"];
  if ($0) {
   if (SDL2.capture.silenceTimer !== undefined) {
    clearTimeout(SDL2.capture.silenceTimer);
   }
   if (SDL2.capture.stream !== undefined) {
    var tracks = SDL2.capture.stream.getAudioTracks();
    for (var i = 0; i < tracks.length; i++) {
     SDL2.capture.stream.removeTrack(tracks[i]);
    }
    SDL2.capture.stream = undefined;
   }
   if (SDL2.capture.scriptProcessorNode !== undefined) {
    SDL2.capture.scriptProcessorNode.onaudioprocess = function(audioProcessingEvent) {};
    SDL2.capture.scriptProcessorNode.disconnect();
    SDL2.capture.scriptProcessorNode = undefined;
   }
   if (SDL2.capture.mediaStreamNode !== undefined) {
    SDL2.capture.mediaStreamNode.disconnect();
    SDL2.capture.mediaStreamNode = undefined;
   }
   if (SDL2.capture.silenceBuffer !== undefined) {
    SDL2.capture.silenceBuffer = undefined;
   }
   SDL2.capture = undefined;
  } else {
   if (SDL2.audio.scriptProcessorNode != undefined) {
    SDL2.audio.scriptProcessorNode.disconnect();
    SDL2.audio.scriptProcessorNode = undefined;
   }
   SDL2.audio = undefined;
  }
  if (SDL2.audioContext !== undefined && SDL2.audio === undefined && SDL2.capture === undefined) {
   SDL2.audioContext.close();
   SDL2.audioContext = undefined;
  }
 }
};

function listenOnce(object, event, func) {
 object.addEventListener(event, func, {
  "once": true
 });
}

function autoResumeAudioContext(ctx, elements) {
 if (!elements) {
  elements = [ document, document.getElementById("canvas") ];
 }
 [ "keydown", "mousedown", "touchstart" ].forEach(function(event) {
  elements.forEach(function(element) {
   if (element) {
    listenOnce(element, event, function() {
     if (ctx.state === "suspended") ctx.resume();
    });
   }
  });
 });
}

function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback(Module);
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    (function() {
     dynCall_v.call(null, func);
    })();
   } else {
    (function(a1) {
     dynCall_vi.apply(null, [ func, a1 ]);
    })(callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}

function demangle(func) {
 return func;
}

function demangleAll(text) {
 var regex = /\b_Z[\w\d_]+/g;
 return text.replace(regex, function(x) {
  var y = demangle(x);
  return x === y ? x : y + " [" + x + "]";
 });
}

function dynCallLegacy(sig, ptr, args) {
 var f = Module["dynCall_" + sig];
 return args && args.length ? f.apply(null, [ ptr ].concat(args)) : f.call(null, ptr);
}

function dynCall(sig, ptr, args) {
 return dynCallLegacy(sig, ptr, args);
}

function jsStackTrace() {
 var error = new Error();
 if (!error.stack) {
  try {
   throw new Error();
  } catch (e) {
   error = e;
  }
  if (!error.stack) {
   return "(no stack trace available)";
  }
 }
 return error.stack.toString();
}

var runtimeKeepaliveCounter = 0;

function keepRuntimeAlive() {
 return noExitRuntime || runtimeKeepaliveCounter > 0;
}

function stackTrace() {
 var js = jsStackTrace();
 if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
 return demangleAll(js);
}

function unSign(value, bits) {
 if (value >= 0) {
  return value;
 }
 return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value;
}

function ___assert_fail(condition, filename, line, func) {
 abort("Assertion failed: " + UTF8ToString(condition) + ", at: " + [ filename ? UTF8ToString(filename) : "unknown filename", line, func ? UTF8ToString(func) : "unknown function" ]);
}

function setErrNo(value) {
 SAFE_HEAP_STORE(___errno_location() | 0, value | 0, 4);
 return value;
}

var PATH = {
 splitPath: function(filename) {
  var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
  return splitPathRe.exec(filename).slice(1);
 },
 normalizeArray: function(parts, allowAboveRoot) {
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
   var last = parts[i];
   if (last === ".") {
    parts.splice(i, 1);
   } else if (last === "..") {
    parts.splice(i, 1);
    up++;
   } else if (up) {
    parts.splice(i, 1);
    up--;
   }
  }
  if (allowAboveRoot) {
   for (;up; up--) {
    parts.unshift("..");
   }
  }
  return parts;
 },
 normalize: function(path) {
  var isAbsolute = path.charAt(0) === "/", trailingSlash = path.substr(-1) === "/";
  path = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), !isAbsolute).join("/");
  if (!path && !isAbsolute) {
   path = ".";
  }
  if (path && trailingSlash) {
   path += "/";
  }
  return (isAbsolute ? "/" : "") + path;
 },
 dirname: function(path) {
  var result = PATH.splitPath(path), root = result[0], dir = result[1];
  if (!root && !dir) {
   return ".";
  }
  if (dir) {
   dir = dir.substr(0, dir.length - 1);
  }
  return root + dir;
 },
 basename: function(path) {
  if (path === "/") return "/";
  path = PATH.normalize(path);
  path = path.replace(/\/$/, "");
  var lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return path;
  return path.substr(lastSlash + 1);
 },
 extname: function(path) {
  return PATH.splitPath(path)[3];
 },
 join: function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return PATH.normalize(paths.join("/"));
 },
 join2: function(l, r) {
  return PATH.normalize(l + "/" + r);
 }
};

function getRandomDevice() {
 if (typeof crypto === "object" && typeof crypto["getRandomValues"] === "function") {
  var randomBuffer = new Uint8Array(1);
  return function() {
   crypto.getRandomValues(randomBuffer);
   return randomBuffer[0];
  };
 } else if (ENVIRONMENT_IS_NODE) {
  try {
   var crypto_module = require("crypto");
   return function() {
    return crypto_module["randomBytes"](1)[0];
   };
  } catch (e) {}
 }
 return function() {
  abort("randomDevice");
 };
}

var PATH_FS = {
 resolve: function() {
  var resolvedPath = "", resolvedAbsolute = false;
  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
   var path = i >= 0 ? arguments[i] : FS.cwd();
   if (typeof path !== "string") {
    throw new TypeError("Arguments to path.resolve must be strings");
   } else if (!path) {
    return "";
   }
   resolvedPath = path + "/" + resolvedPath;
   resolvedAbsolute = path.charAt(0) === "/";
  }
  resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter(function(p) {
   return !!p;
  }), !resolvedAbsolute).join("/");
  return (resolvedAbsolute ? "/" : "") + resolvedPath || ".";
 },
 relative: function(from, to) {
  from = PATH_FS.resolve(from).substr(1);
  to = PATH_FS.resolve(to).substr(1);
  function trim(arr) {
   var start = 0;
   for (;start < arr.length; start++) {
    if (arr[start] !== "") break;
   }
   var end = arr.length - 1;
   for (;end >= 0; end--) {
    if (arr[end] !== "") break;
   }
   if (start > end) return [];
   return arr.slice(start, end - start + 1);
  }
  var fromParts = trim(from.split("/"));
  var toParts = trim(to.split("/"));
  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
   if (fromParts[i] !== toParts[i]) {
    samePartsLength = i;
    break;
   }
  }
  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
   outputParts.push("..");
  }
  outputParts = outputParts.concat(toParts.slice(samePartsLength));
  return outputParts.join("/");
 }
};

var TTY = {
 ttys: [],
 init: function() {},
 shutdown: function() {},
 register: function(dev, ops) {
  TTY.ttys[dev] = {
   input: [],
   output: [],
   ops: ops
  };
  FS.registerDevice(dev, TTY.stream_ops);
 },
 stream_ops: {
  open: function(stream) {
   var tty = TTY.ttys[stream.node.rdev];
   if (!tty) {
    throw new FS.ErrnoError(43);
   }
   stream.tty = tty;
   stream.seekable = false;
  },
  close: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  flush: function(stream) {
   stream.tty.ops.flush(stream.tty);
  },
  read: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.get_char) {
    throw new FS.ErrnoError(60);
   }
   var bytesRead = 0;
   for (var i = 0; i < length; i++) {
    var result;
    try {
     result = stream.tty.ops.get_char(stream.tty);
    } catch (e) {
     throw new FS.ErrnoError(29);
    }
    if (result === undefined && bytesRead === 0) {
     throw new FS.ErrnoError(6);
    }
    if (result === null || result === undefined) break;
    bytesRead++;
    buffer[offset + i] = result;
   }
   if (bytesRead) {
    stream.node.timestamp = Date.now();
   }
   return bytesRead;
  },
  write: function(stream, buffer, offset, length, pos) {
   if (!stream.tty || !stream.tty.ops.put_char) {
    throw new FS.ErrnoError(60);
   }
   try {
    for (var i = 0; i < length; i++) {
     stream.tty.ops.put_char(stream.tty, buffer[offset + i]);
    }
   } catch (e) {
    throw new FS.ErrnoError(29);
   }
   if (length) {
    stream.node.timestamp = Date.now();
   }
   return i;
  }
 },
 default_tty_ops: {
  get_char: function(tty) {
   if (!tty.input.length) {
    var result = null;
    if (ENVIRONMENT_IS_NODE) {
     var BUFSIZE = 256;
     var buf = Buffer.alloc ? Buffer.alloc(BUFSIZE) : new Buffer(BUFSIZE);
     var bytesRead = 0;
     try {
      bytesRead = nodeFS.readSync(process.stdin.fd, buf, 0, BUFSIZE, null);
     } catch (e) {
      if (e.toString().indexOf("EOF") != -1) bytesRead = 0; else throw e;
     }
     if (bytesRead > 0) {
      result = buf.slice(0, bytesRead).toString("utf-8");
     } else {
      result = null;
     }
    } else if (typeof window != "undefined" && typeof window.prompt == "function") {
     result = window.prompt("Input: ");
     if (result !== null) {
      result += "\n";
     }
    } else if (typeof readline == "function") {
     result = readline();
     if (result !== null) {
      result += "\n";
     }
    }
    if (!result) {
     return null;
    }
    tty.input = intArrayFromString(result, true);
   }
   return tty.input.shift();
  },
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    out(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 },
 default_tty1_ops: {
  put_char: function(tty, val) {
   if (val === null || val === 10) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   } else {
    if (val != 0) tty.output.push(val);
   }
  },
  flush: function(tty) {
   if (tty.output && tty.output.length > 0) {
    err(UTF8ArrayToString(tty.output, 0));
    tty.output = [];
   }
  }
 }
};

function mmapAlloc(size) {
 var alignedSize = alignMemory(size, 16384);
 var ptr = _malloc(alignedSize);
 while (size < alignedSize) SAFE_HEAP_STORE(ptr + size++, 0, 1);
 return ptr;
}

var MEMFS = {
 ops_table: null,
 mount: function(mount) {
  return MEMFS.createNode(null, "/", 16384 | 511, 0);
 },
 createNode: function(parent, name, mode, dev) {
  if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
   throw new FS.ErrnoError(63);
  }
  if (!MEMFS.ops_table) {
   MEMFS.ops_table = {
    dir: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      lookup: MEMFS.node_ops.lookup,
      mknod: MEMFS.node_ops.mknod,
      rename: MEMFS.node_ops.rename,
      unlink: MEMFS.node_ops.unlink,
      rmdir: MEMFS.node_ops.rmdir,
      readdir: MEMFS.node_ops.readdir,
      symlink: MEMFS.node_ops.symlink
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek
     }
    },
    file: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: {
      llseek: MEMFS.stream_ops.llseek,
      read: MEMFS.stream_ops.read,
      write: MEMFS.stream_ops.write,
      allocate: MEMFS.stream_ops.allocate,
      mmap: MEMFS.stream_ops.mmap,
      msync: MEMFS.stream_ops.msync
     }
    },
    link: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr,
      readlink: MEMFS.node_ops.readlink
     },
     stream: {}
    },
    chrdev: {
     node: {
      getattr: MEMFS.node_ops.getattr,
      setattr: MEMFS.node_ops.setattr
     },
     stream: FS.chrdev_stream_ops
    }
   };
  }
  var node = FS.createNode(parent, name, mode, dev);
  if (FS.isDir(node.mode)) {
   node.node_ops = MEMFS.ops_table.dir.node;
   node.stream_ops = MEMFS.ops_table.dir.stream;
   node.contents = {};
  } else if (FS.isFile(node.mode)) {
   node.node_ops = MEMFS.ops_table.file.node;
   node.stream_ops = MEMFS.ops_table.file.stream;
   node.usedBytes = 0;
   node.contents = null;
  } else if (FS.isLink(node.mode)) {
   node.node_ops = MEMFS.ops_table.link.node;
   node.stream_ops = MEMFS.ops_table.link.stream;
  } else if (FS.isChrdev(node.mode)) {
   node.node_ops = MEMFS.ops_table.chrdev.node;
   node.stream_ops = MEMFS.ops_table.chrdev.stream;
  }
  node.timestamp = Date.now();
  if (parent) {
   parent.contents[name] = node;
   parent.timestamp = node.timestamp;
  }
  return node;
 },
 getFileDataAsTypedArray: function(node) {
  if (!node.contents) return new Uint8Array(0);
  if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
  return new Uint8Array(node.contents);
 },
 expandFileStorage: function(node, newCapacity) {
  var prevCapacity = node.contents ? node.contents.length : 0;
  if (prevCapacity >= newCapacity) return;
  var CAPACITY_DOUBLING_MAX = 1024 * 1024;
  newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) >>> 0);
  if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
  var oldContents = node.contents;
  node.contents = new Uint8Array(newCapacity);
  if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
 },
 resizeFileStorage: function(node, newSize) {
  if (node.usedBytes == newSize) return;
  if (newSize == 0) {
   node.contents = null;
   node.usedBytes = 0;
  } else {
   var oldContents = node.contents;
   node.contents = new Uint8Array(newSize);
   if (oldContents) {
    node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)));
   }
   node.usedBytes = newSize;
  }
 },
 node_ops: {
  getattr: function(node) {
   var attr = {};
   attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
   attr.ino = node.id;
   attr.mode = node.mode;
   attr.nlink = 1;
   attr.uid = 0;
   attr.gid = 0;
   attr.rdev = node.rdev;
   if (FS.isDir(node.mode)) {
    attr.size = 4096;
   } else if (FS.isFile(node.mode)) {
    attr.size = node.usedBytes;
   } else if (FS.isLink(node.mode)) {
    attr.size = node.link.length;
   } else {
    attr.size = 0;
   }
   attr.atime = new Date(node.timestamp);
   attr.mtime = new Date(node.timestamp);
   attr.ctime = new Date(node.timestamp);
   attr.blksize = 4096;
   attr.blocks = Math.ceil(attr.size / attr.blksize);
   return attr;
  },
  setattr: function(node, attr) {
   if (attr.mode !== undefined) {
    node.mode = attr.mode;
   }
   if (attr.timestamp !== undefined) {
    node.timestamp = attr.timestamp;
   }
   if (attr.size !== undefined) {
    MEMFS.resizeFileStorage(node, attr.size);
   }
  },
  lookup: function(parent, name) {
   throw FS.genericErrors[44];
  },
  mknod: function(parent, name, mode, dev) {
   return MEMFS.createNode(parent, name, mode, dev);
  },
  rename: function(old_node, new_dir, new_name) {
   if (FS.isDir(old_node.mode)) {
    var new_node;
    try {
     new_node = FS.lookupNode(new_dir, new_name);
    } catch (e) {}
    if (new_node) {
     for (var i in new_node.contents) {
      throw new FS.ErrnoError(55);
     }
    }
   }
   delete old_node.parent.contents[old_node.name];
   old_node.parent.timestamp = Date.now();
   old_node.name = new_name;
   new_dir.contents[new_name] = old_node;
   new_dir.timestamp = old_node.parent.timestamp;
   old_node.parent = new_dir;
  },
  unlink: function(parent, name) {
   delete parent.contents[name];
   parent.timestamp = Date.now();
  },
  rmdir: function(parent, name) {
   var node = FS.lookupNode(parent, name);
   for (var i in node.contents) {
    throw new FS.ErrnoError(55);
   }
   delete parent.contents[name];
   parent.timestamp = Date.now();
  },
  readdir: function(node) {
   var entries = [ ".", ".." ];
   for (var key in node.contents) {
    if (!node.contents.hasOwnProperty(key)) {
     continue;
    }
    entries.push(key);
   }
   return entries;
  },
  symlink: function(parent, newname, oldpath) {
   var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
   node.link = oldpath;
   return node;
  },
  readlink: function(node) {
   if (!FS.isLink(node.mode)) {
    throw new FS.ErrnoError(28);
   }
   return node.link;
  }
 },
 stream_ops: {
  read: function(stream, buffer, offset, length, position) {
   var contents = stream.node.contents;
   if (position >= stream.node.usedBytes) return 0;
   var size = Math.min(stream.node.usedBytes - position, length);
   if (size > 8 && contents.subarray) {
    buffer.set(contents.subarray(position, position + size), offset);
   } else {
    for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i];
   }
   return size;
  },
  write: function(stream, buffer, offset, length, position, canOwn) {
   if (!length) return 0;
   var node = stream.node;
   node.timestamp = Date.now();
   if (buffer.subarray && (!node.contents || node.contents.subarray)) {
    if (canOwn) {
     node.contents = buffer.subarray(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (node.usedBytes === 0 && position === 0) {
     node.contents = buffer.slice(offset, offset + length);
     node.usedBytes = length;
     return length;
    } else if (position + length <= node.usedBytes) {
     node.contents.set(buffer.subarray(offset, offset + length), position);
     return length;
    }
   }
   MEMFS.expandFileStorage(node, position + length);
   if (node.contents.subarray && buffer.subarray) {
    node.contents.set(buffer.subarray(offset, offset + length), position);
   } else {
    for (var i = 0; i < length; i++) {
     node.contents[position + i] = buffer[offset + i];
    }
   }
   node.usedBytes = Math.max(node.usedBytes, position + length);
   return length;
  },
  llseek: function(stream, offset, whence) {
   var position = offset;
   if (whence === 1) {
    position += stream.position;
   } else if (whence === 2) {
    if (FS.isFile(stream.node.mode)) {
     position += stream.node.usedBytes;
    }
   }
   if (position < 0) {
    throw new FS.ErrnoError(28);
   }
   return position;
  },
  allocate: function(stream, offset, length) {
   MEMFS.expandFileStorage(stream.node, offset + length);
   stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length);
  },
  mmap: function(stream, address, length, position, prot, flags) {
   if (address !== 0) {
    throw new FS.ErrnoError(28);
   }
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(43);
   }
   var ptr;
   var allocated;
   var contents = stream.node.contents;
   if (!(flags & 2) && contents.buffer === buffer) {
    allocated = false;
    ptr = contents.byteOffset;
   } else {
    if (position > 0 || position + length < contents.length) {
     if (contents.subarray) {
      contents = contents.subarray(position, position + length);
     } else {
      contents = Array.prototype.slice.call(contents, position, position + length);
     }
    }
    allocated = true;
    ptr = mmapAlloc(length);
    if (!ptr) {
     throw new FS.ErrnoError(48);
    }
    HEAP8.set(contents, ptr);
   }
   return {
    ptr: ptr,
    allocated: allocated
   };
  },
  msync: function(stream, buffer, offset, length, mmapFlags) {
   if (!FS.isFile(stream.node.mode)) {
    throw new FS.ErrnoError(43);
   }
   if (mmapFlags & 2) {
    return 0;
   }
   var bytesWritten = MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
   return 0;
  }
 }
};

var FS = {
 root: null,
 mounts: [],
 devices: {},
 streams: [],
 nextInode: 1,
 nameTable: null,
 currentPath: "/",
 initialized: false,
 ignorePermissions: true,
 trackingDelegate: {},
 tracking: {
  openFlags: {
   READ: 1,
   WRITE: 2
  }
 },
 ErrnoError: null,
 genericErrors: {},
 filesystems: null,
 syncFSRequests: 0,
 lookupPath: function(path, opts) {
  path = PATH_FS.resolve(FS.cwd(), path);
  opts = opts || {};
  if (!path) return {
   path: "",
   node: null
  };
  var defaults = {
   follow_mount: true,
   recurse_count: 0
  };
  for (var key in defaults) {
   if (opts[key] === undefined) {
    opts[key] = defaults[key];
   }
  }
  if (opts.recurse_count > 8) {
   throw new FS.ErrnoError(32);
  }
  var parts = PATH.normalizeArray(path.split("/").filter(function(p) {
   return !!p;
  }), false);
  var current = FS.root;
  var current_path = "/";
  for (var i = 0; i < parts.length; i++) {
   var islast = i === parts.length - 1;
   if (islast && opts.parent) {
    break;
   }
   current = FS.lookupNode(current, parts[i]);
   current_path = PATH.join2(current_path, parts[i]);
   if (FS.isMountpoint(current)) {
    if (!islast || islast && opts.follow_mount) {
     current = current.mounted.root;
    }
   }
   if (!islast || opts.follow) {
    var count = 0;
    while (FS.isLink(current.mode)) {
     var link = FS.readlink(current_path);
     current_path = PATH_FS.resolve(PATH.dirname(current_path), link);
     var lookup = FS.lookupPath(current_path, {
      recurse_count: opts.recurse_count
     });
     current = lookup.node;
     if (count++ > 40) {
      throw new FS.ErrnoError(32);
     }
    }
   }
  }
  return {
   path: current_path,
   node: current
  };
 },
 getPath: function(node) {
  var path;
  while (true) {
   if (FS.isRoot(node)) {
    var mount = node.mount.mountpoint;
    if (!path) return mount;
    return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path;
   }
   path = path ? node.name + "/" + path : node.name;
   node = node.parent;
  }
 },
 hashName: function(parentid, name) {
  var hash = 0;
  for (var i = 0; i < name.length; i++) {
   hash = (hash << 5) - hash + name.charCodeAt(i) | 0;
  }
  return (parentid + hash >>> 0) % FS.nameTable.length;
 },
 hashAddNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  node.name_next = FS.nameTable[hash];
  FS.nameTable[hash] = node;
 },
 hashRemoveNode: function(node) {
  var hash = FS.hashName(node.parent.id, node.name);
  if (FS.nameTable[hash] === node) {
   FS.nameTable[hash] = node.name_next;
  } else {
   var current = FS.nameTable[hash];
   while (current) {
    if (current.name_next === node) {
     current.name_next = node.name_next;
     break;
    }
    current = current.name_next;
   }
  }
 },
 lookupNode: function(parent, name) {
  var errCode = FS.mayLookup(parent);
  if (errCode) {
   throw new FS.ErrnoError(errCode, parent);
  }
  var hash = FS.hashName(parent.id, name);
  for (var node = FS.nameTable[hash]; node; node = node.name_next) {
   var nodeName = node.name;
   if (node.parent.id === parent.id && nodeName === name) {
    return node;
   }
  }
  return FS.lookup(parent, name);
 },
 createNode: function(parent, name, mode, rdev) {
  var node = new FS.FSNode(parent, name, mode, rdev);
  FS.hashAddNode(node);
  return node;
 },
 destroyNode: function(node) {
  FS.hashRemoveNode(node);
 },
 isRoot: function(node) {
  return node === node.parent;
 },
 isMountpoint: function(node) {
  return !!node.mounted;
 },
 isFile: function(mode) {
  return (mode & 61440) === 32768;
 },
 isDir: function(mode) {
  return (mode & 61440) === 16384;
 },
 isLink: function(mode) {
  return (mode & 61440) === 40960;
 },
 isChrdev: function(mode) {
  return (mode & 61440) === 8192;
 },
 isBlkdev: function(mode) {
  return (mode & 61440) === 24576;
 },
 isFIFO: function(mode) {
  return (mode & 61440) === 4096;
 },
 isSocket: function(mode) {
  return (mode & 49152) === 49152;
 },
 flagModes: {
  "r": 0,
  "r+": 2,
  "w": 577,
  "w+": 578,
  "a": 1089,
  "a+": 1090
 },
 modeStringToFlags: function(str) {
  var flags = FS.flagModes[str];
  if (typeof flags === "undefined") {
   throw new Error("Unknown file open mode: " + str);
  }
  return flags;
 },
 flagsToPermissionString: function(flag) {
  var perms = [ "r", "w", "rw" ][flag & 3];
  if (flag & 512) {
   perms += "w";
  }
  return perms;
 },
 nodePermissions: function(node, perms) {
  if (FS.ignorePermissions) {
   return 0;
  }
  if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
   return 2;
  } else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
   return 2;
  } else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
   return 2;
  }
  return 0;
 },
 mayLookup: function(dir) {
  var errCode = FS.nodePermissions(dir, "x");
  if (errCode) return errCode;
  if (!dir.node_ops.lookup) return 2;
  return 0;
 },
 mayCreate: function(dir, name) {
  try {
   var node = FS.lookupNode(dir, name);
   return 20;
  } catch (e) {}
  return FS.nodePermissions(dir, "wx");
 },
 mayDelete: function(dir, name, isdir) {
  var node;
  try {
   node = FS.lookupNode(dir, name);
  } catch (e) {
   return e.errno;
  }
  var errCode = FS.nodePermissions(dir, "wx");
  if (errCode) {
   return errCode;
  }
  if (isdir) {
   if (!FS.isDir(node.mode)) {
    return 54;
   }
   if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
    return 10;
   }
  } else {
   if (FS.isDir(node.mode)) {
    return 31;
   }
  }
  return 0;
 },
 mayOpen: function(node, flags) {
  if (!node) {
   return 44;
  }
  if (FS.isLink(node.mode)) {
   return 32;
  } else if (FS.isDir(node.mode)) {
   if (FS.flagsToPermissionString(flags) !== "r" || flags & 512) {
    return 31;
   }
  }
  return FS.nodePermissions(node, FS.flagsToPermissionString(flags));
 },
 MAX_OPEN_FDS: 4096,
 nextfd: function(fd_start, fd_end) {
  fd_start = fd_start || 0;
  fd_end = fd_end || FS.MAX_OPEN_FDS;
  for (var fd = fd_start; fd <= fd_end; fd++) {
   if (!FS.streams[fd]) {
    return fd;
   }
  }
  throw new FS.ErrnoError(33);
 },
 getStream: function(fd) {
  return FS.streams[fd];
 },
 createStream: function(stream, fd_start, fd_end) {
  if (!FS.FSStream) {
   FS.FSStream = function() {};
   FS.FSStream.prototype = {
    object: {
     get: function() {
      return this.node;
     },
     set: function(val) {
      this.node = val;
     }
    },
    isRead: {
     get: function() {
      return (this.flags & 2097155) !== 1;
     }
    },
    isWrite: {
     get: function() {
      return (this.flags & 2097155) !== 0;
     }
    },
    isAppend: {
     get: function() {
      return this.flags & 1024;
     }
    }
   };
  }
  var newStream = new FS.FSStream();
  for (var p in stream) {
   newStream[p] = stream[p];
  }
  stream = newStream;
  var fd = FS.nextfd(fd_start, fd_end);
  stream.fd = fd;
  FS.streams[fd] = stream;
  return stream;
 },
 closeStream: function(fd) {
  FS.streams[fd] = null;
 },
 chrdev_stream_ops: {
  open: function(stream) {
   var device = FS.getDevice(stream.node.rdev);
   stream.stream_ops = device.stream_ops;
   if (stream.stream_ops.open) {
    stream.stream_ops.open(stream);
   }
  },
  llseek: function() {
   throw new FS.ErrnoError(70);
  }
 },
 major: function(dev) {
  return dev >> 8;
 },
 minor: function(dev) {
  return dev & 255;
 },
 makedev: function(ma, mi) {
  return ma << 8 | mi;
 },
 registerDevice: function(dev, ops) {
  FS.devices[dev] = {
   stream_ops: ops
  };
 },
 getDevice: function(dev) {
  return FS.devices[dev];
 },
 getMounts: function(mount) {
  var mounts = [];
  var check = [ mount ];
  while (check.length) {
   var m = check.pop();
   mounts.push(m);
   check.push.apply(check, m.mounts);
  }
  return mounts;
 },
 syncfs: function(populate, callback) {
  if (typeof populate === "function") {
   callback = populate;
   populate = false;
  }
  FS.syncFSRequests++;
  if (FS.syncFSRequests > 1) {
   err("warning: " + FS.syncFSRequests + " FS.syncfs operations in flight at once, probably just doing extra work");
  }
  var mounts = FS.getMounts(FS.root.mount);
  var completed = 0;
  function doCallback(errCode) {
   FS.syncFSRequests--;
   return callback(errCode);
  }
  function done(errCode) {
   if (errCode) {
    if (!done.errored) {
     done.errored = true;
     return doCallback(errCode);
    }
    return;
   }
   if (++completed >= mounts.length) {
    doCallback(null);
   }
  }
  mounts.forEach(function(mount) {
   if (!mount.type.syncfs) {
    return done(null);
   }
   mount.type.syncfs(mount, populate, done);
  });
 },
 mount: function(type, opts, mountpoint) {
  var root = mountpoint === "/";
  var pseudo = !mountpoint;
  var node;
  if (root && FS.root) {
   throw new FS.ErrnoError(10);
  } else if (!root && !pseudo) {
   var lookup = FS.lookupPath(mountpoint, {
    follow_mount: false
   });
   mountpoint = lookup.path;
   node = lookup.node;
   if (FS.isMountpoint(node)) {
    throw new FS.ErrnoError(10);
   }
   if (!FS.isDir(node.mode)) {
    throw new FS.ErrnoError(54);
   }
  }
  var mount = {
   type: type,
   opts: opts,
   mountpoint: mountpoint,
   mounts: []
  };
  var mountRoot = type.mount(mount);
  mountRoot.mount = mount;
  mount.root = mountRoot;
  if (root) {
   FS.root = mountRoot;
  } else if (node) {
   node.mounted = mount;
   if (node.mount) {
    node.mount.mounts.push(mount);
   }
  }
  return mountRoot;
 },
 unmount: function(mountpoint) {
  var lookup = FS.lookupPath(mountpoint, {
   follow_mount: false
  });
  if (!FS.isMountpoint(lookup.node)) {
   throw new FS.ErrnoError(28);
  }
  var node = lookup.node;
  var mount = node.mounted;
  var mounts = FS.getMounts(mount);
  Object.keys(FS.nameTable).forEach(function(hash) {
   var current = FS.nameTable[hash];
   while (current) {
    var next = current.name_next;
    if (mounts.indexOf(current.mount) !== -1) {
     FS.destroyNode(current);
    }
    current = next;
   }
  });
  node.mounted = null;
  var idx = node.mount.mounts.indexOf(mount);
  node.mount.mounts.splice(idx, 1);
 },
 lookup: function(parent, name) {
  return parent.node_ops.lookup(parent, name);
 },
 mknod: function(path, mode, dev) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  if (!name || name === "." || name === "..") {
   throw new FS.ErrnoError(28);
  }
  var errCode = FS.mayCreate(parent, name);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.mknod) {
   throw new FS.ErrnoError(63);
  }
  return parent.node_ops.mknod(parent, name, mode, dev);
 },
 create: function(path, mode) {
  mode = mode !== undefined ? mode : 438;
  mode &= 4095;
  mode |= 32768;
  return FS.mknod(path, mode, 0);
 },
 mkdir: function(path, mode) {
  mode = mode !== undefined ? mode : 511;
  mode &= 511 | 512;
  mode |= 16384;
  return FS.mknod(path, mode, 0);
 },
 mkdirTree: function(path, mode) {
  var dirs = path.split("/");
  var d = "";
  for (var i = 0; i < dirs.length; ++i) {
   if (!dirs[i]) continue;
   d += "/" + dirs[i];
   try {
    FS.mkdir(d, mode);
   } catch (e) {
    if (e.errno != 20) throw e;
   }
  }
 },
 mkdev: function(path, mode, dev) {
  if (typeof dev === "undefined") {
   dev = mode;
   mode = 438;
  }
  mode |= 8192;
  return FS.mknod(path, mode, dev);
 },
 symlink: function(oldpath, newpath) {
  if (!PATH_FS.resolve(oldpath)) {
   throw new FS.ErrnoError(44);
  }
  var lookup = FS.lookupPath(newpath, {
   parent: true
  });
  var parent = lookup.node;
  if (!parent) {
   throw new FS.ErrnoError(44);
  }
  var newname = PATH.basename(newpath);
  var errCode = FS.mayCreate(parent, newname);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.symlink) {
   throw new FS.ErrnoError(63);
  }
  return parent.node_ops.symlink(parent, newname, oldpath);
 },
 rename: function(old_path, new_path) {
  var old_dirname = PATH.dirname(old_path);
  var new_dirname = PATH.dirname(new_path);
  var old_name = PATH.basename(old_path);
  var new_name = PATH.basename(new_path);
  var lookup, old_dir, new_dir;
  lookup = FS.lookupPath(old_path, {
   parent: true
  });
  old_dir = lookup.node;
  lookup = FS.lookupPath(new_path, {
   parent: true
  });
  new_dir = lookup.node;
  if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
  if (old_dir.mount !== new_dir.mount) {
   throw new FS.ErrnoError(75);
  }
  var old_node = FS.lookupNode(old_dir, old_name);
  var relative = PATH_FS.relative(old_path, new_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(28);
  }
  relative = PATH_FS.relative(new_path, old_dirname);
  if (relative.charAt(0) !== ".") {
   throw new FS.ErrnoError(55);
  }
  var new_node;
  try {
   new_node = FS.lookupNode(new_dir, new_name);
  } catch (e) {}
  if (old_node === new_node) {
   return;
  }
  var isdir = FS.isDir(old_node.mode);
  var errCode = FS.mayDelete(old_dir, old_name, isdir);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  errCode = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!old_dir.node_ops.rename) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
   throw new FS.ErrnoError(10);
  }
  if (new_dir !== old_dir) {
   errCode = FS.nodePermissions(old_dir, "w");
   if (errCode) {
    throw new FS.ErrnoError(errCode);
   }
  }
  try {
   if (FS.trackingDelegate["willMovePath"]) {
    FS.trackingDelegate["willMovePath"](old_path, new_path);
   }
  } catch (e) {
   err("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
  FS.hashRemoveNode(old_node);
  try {
   old_dir.node_ops.rename(old_node, new_dir, new_name);
  } catch (e) {
   throw e;
  } finally {
   FS.hashAddNode(old_node);
  }
  try {
   if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path);
  } catch (e) {
   err("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message);
  }
 },
 rmdir: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var errCode = FS.mayDelete(parent, name, true);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.rmdir) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(10);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.rmdir(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  if (!node.node_ops.readdir) {
   throw new FS.ErrnoError(54);
  }
  return node.node_ops.readdir(node);
 },
 unlink: function(path) {
  var lookup = FS.lookupPath(path, {
   parent: true
  });
  var parent = lookup.node;
  var name = PATH.basename(path);
  var node = FS.lookupNode(parent, name);
  var errCode = FS.mayDelete(parent, name, false);
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  if (!parent.node_ops.unlink) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isMountpoint(node)) {
   throw new FS.ErrnoError(10);
  }
  try {
   if (FS.trackingDelegate["willDeletePath"]) {
    FS.trackingDelegate["willDeletePath"](path);
   }
  } catch (e) {
   err("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message);
  }
  parent.node_ops.unlink(parent, name);
  FS.destroyNode(node);
  try {
   if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path);
  } catch (e) {
   err("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message);
  }
 },
 readlink: function(path) {
  var lookup = FS.lookupPath(path);
  var link = lookup.node;
  if (!link) {
   throw new FS.ErrnoError(44);
  }
  if (!link.node_ops.readlink) {
   throw new FS.ErrnoError(28);
  }
  return PATH_FS.resolve(FS.getPath(link.parent), link.node_ops.readlink(link));
 },
 stat: function(path, dontFollow) {
  var lookup = FS.lookupPath(path, {
   follow: !dontFollow
  });
  var node = lookup.node;
  if (!node) {
   throw new FS.ErrnoError(44);
  }
  if (!node.node_ops.getattr) {
   throw new FS.ErrnoError(63);
  }
  return node.node_ops.getattr(node);
 },
 lstat: function(path) {
  return FS.stat(path, true);
 },
 chmod: function(path, mode, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  node.node_ops.setattr(node, {
   mode: mode & 4095 | node.mode & ~4095,
   timestamp: Date.now()
  });
 },
 lchmod: function(path, mode) {
  FS.chmod(path, mode, true);
 },
 fchmod: function(fd, mode) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(8);
  }
  FS.chmod(stream.node, mode);
 },
 chown: function(path, uid, gid, dontFollow) {
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: !dontFollow
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  node.node_ops.setattr(node, {
   timestamp: Date.now()
  });
 },
 lchown: function(path, uid, gid) {
  FS.chown(path, uid, gid, true);
 },
 fchown: function(fd, uid, gid) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(8);
  }
  FS.chown(stream.node, uid, gid);
 },
 truncate: function(path, len) {
  if (len < 0) {
   throw new FS.ErrnoError(28);
  }
  var node;
  if (typeof path === "string") {
   var lookup = FS.lookupPath(path, {
    follow: true
   });
   node = lookup.node;
  } else {
   node = path;
  }
  if (!node.node_ops.setattr) {
   throw new FS.ErrnoError(63);
  }
  if (FS.isDir(node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!FS.isFile(node.mode)) {
   throw new FS.ErrnoError(28);
  }
  var errCode = FS.nodePermissions(node, "w");
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  node.node_ops.setattr(node, {
   size: len,
   timestamp: Date.now()
  });
 },
 ftruncate: function(fd, len) {
  var stream = FS.getStream(fd);
  if (!stream) {
   throw new FS.ErrnoError(8);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(28);
  }
  FS.truncate(stream.node, len);
 },
 utime: function(path, atime, mtime) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  var node = lookup.node;
  node.node_ops.setattr(node, {
   timestamp: Math.max(atime, mtime)
  });
 },
 open: function(path, flags, mode, fd_start, fd_end) {
  if (path === "") {
   throw new FS.ErrnoError(44);
  }
  flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
  mode = typeof mode === "undefined" ? 438 : mode;
  if (flags & 64) {
   mode = mode & 4095 | 32768;
  } else {
   mode = 0;
  }
  var node;
  if (typeof path === "object") {
   node = path;
  } else {
   path = PATH.normalize(path);
   try {
    var lookup = FS.lookupPath(path, {
     follow: !(flags & 131072)
    });
    node = lookup.node;
   } catch (e) {}
  }
  var created = false;
  if (flags & 64) {
   if (node) {
    if (flags & 128) {
     throw new FS.ErrnoError(20);
    }
   } else {
    node = FS.mknod(path, mode, 0);
    created = true;
   }
  }
  if (!node) {
   throw new FS.ErrnoError(44);
  }
  if (FS.isChrdev(node.mode)) {
   flags &= ~512;
  }
  if (flags & 65536 && !FS.isDir(node.mode)) {
   throw new FS.ErrnoError(54);
  }
  if (!created) {
   var errCode = FS.mayOpen(node, flags);
   if (errCode) {
    throw new FS.ErrnoError(errCode);
   }
  }
  if (flags & 512) {
   FS.truncate(node, 0);
  }
  flags &= ~(128 | 512 | 131072);
  var stream = FS.createStream({
   node: node,
   path: FS.getPath(node),
   flags: flags,
   seekable: true,
   position: 0,
   stream_ops: node.stream_ops,
   ungotten: [],
   error: false
  }, fd_start, fd_end);
  if (stream.stream_ops.open) {
   stream.stream_ops.open(stream);
  }
  if (Module["logReadFiles"] && !(flags & 1)) {
   if (!FS.readFiles) FS.readFiles = {};
   if (!(path in FS.readFiles)) {
    FS.readFiles[path] = 1;
    err("FS.trackingDelegate error on read file: " + path);
   }
  }
  try {
   if (FS.trackingDelegate["onOpenFile"]) {
    var trackingFlags = 0;
    if ((flags & 2097155) !== 1) {
     trackingFlags |= FS.tracking.openFlags.READ;
    }
    if ((flags & 2097155) !== 0) {
     trackingFlags |= FS.tracking.openFlags.WRITE;
    }
    FS.trackingDelegate["onOpenFile"](path, trackingFlags);
   }
  } catch (e) {
   err("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message);
  }
  return stream;
 },
 close: function(stream) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (stream.getdents) stream.getdents = null;
  try {
   if (stream.stream_ops.close) {
    stream.stream_ops.close(stream);
   }
  } catch (e) {
   throw e;
  } finally {
   FS.closeStream(stream.fd);
  }
  stream.fd = null;
 },
 isClosed: function(stream) {
  return stream.fd === null;
 },
 llseek: function(stream, offset, whence) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (!stream.seekable || !stream.stream_ops.llseek) {
   throw new FS.ErrnoError(70);
  }
  if (whence != 0 && whence != 1 && whence != 2) {
   throw new FS.ErrnoError(28);
  }
  stream.position = stream.stream_ops.llseek(stream, offset, whence);
  stream.ungotten = [];
  return stream.position;
 },
 read: function(stream, buffer, offset, length, position) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(28);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(8);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!stream.stream_ops.read) {
   throw new FS.ErrnoError(28);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(70);
  }
  var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
  if (!seeking) stream.position += bytesRead;
  return bytesRead;
 },
 write: function(stream, buffer, offset, length, position, canOwn) {
  if (length < 0 || position < 0) {
   throw new FS.ErrnoError(28);
  }
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(8);
  }
  if (FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(31);
  }
  if (!stream.stream_ops.write) {
   throw new FS.ErrnoError(28);
  }
  if (stream.seekable && stream.flags & 1024) {
   FS.llseek(stream, 0, 2);
  }
  var seeking = typeof position !== "undefined";
  if (!seeking) {
   position = stream.position;
  } else if (!stream.seekable) {
   throw new FS.ErrnoError(70);
  }
  var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
  if (!seeking) stream.position += bytesWritten;
  try {
   if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path);
  } catch (e) {
   err("FS.trackingDelegate['onWriteToFile']('" + stream.path + "') threw an exception: " + e.message);
  }
  return bytesWritten;
 },
 allocate: function(stream, offset, length) {
  if (FS.isClosed(stream)) {
   throw new FS.ErrnoError(8);
  }
  if (offset < 0 || length <= 0) {
   throw new FS.ErrnoError(28);
  }
  if ((stream.flags & 2097155) === 0) {
   throw new FS.ErrnoError(8);
  }
  if (!FS.isFile(stream.node.mode) && !FS.isDir(stream.node.mode)) {
   throw new FS.ErrnoError(43);
  }
  if (!stream.stream_ops.allocate) {
   throw new FS.ErrnoError(138);
  }
  stream.stream_ops.allocate(stream, offset, length);
 },
 mmap: function(stream, address, length, position, prot, flags) {
  if ((prot & 2) !== 0 && (flags & 2) === 0 && (stream.flags & 2097155) !== 2) {
   throw new FS.ErrnoError(2);
  }
  if ((stream.flags & 2097155) === 1) {
   throw new FS.ErrnoError(2);
  }
  if (!stream.stream_ops.mmap) {
   throw new FS.ErrnoError(43);
  }
  return stream.stream_ops.mmap(stream, address, length, position, prot, flags);
 },
 msync: function(stream, buffer, offset, length, mmapFlags) {
  if (!stream || !stream.stream_ops.msync) {
   return 0;
  }
  return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
 },
 munmap: function(stream) {
  return 0;
 },
 ioctl: function(stream, cmd, arg) {
  if (!stream.stream_ops.ioctl) {
   throw new FS.ErrnoError(59);
  }
  return stream.stream_ops.ioctl(stream, cmd, arg);
 },
 readFile: function(path, opts) {
  opts = opts || {};
  opts.flags = opts.flags || 0;
  opts.encoding = opts.encoding || "binary";
  if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
   throw new Error('Invalid encoding type "' + opts.encoding + '"');
  }
  var ret;
  var stream = FS.open(path, opts.flags);
  var stat = FS.stat(path);
  var length = stat.size;
  var buf = new Uint8Array(length);
  FS.read(stream, buf, 0, length, 0);
  if (opts.encoding === "utf8") {
   ret = UTF8ArrayToString(buf, 0);
  } else if (opts.encoding === "binary") {
   ret = buf;
  }
  FS.close(stream);
  return ret;
 },
 writeFile: function(path, data, opts) {
  opts = opts || {};
  opts.flags = opts.flags || 577;
  var stream = FS.open(path, opts.flags, opts.mode);
  if (typeof data === "string") {
   var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
   var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
   FS.write(stream, buf, 0, actualNumBytes, undefined, opts.canOwn);
  } else if (ArrayBuffer.isView(data)) {
   FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
  } else {
   throw new Error("Unsupported data type");
  }
  FS.close(stream);
 },
 cwd: function() {
  return FS.currentPath;
 },
 chdir: function(path) {
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  if (lookup.node === null) {
   throw new FS.ErrnoError(44);
  }
  if (!FS.isDir(lookup.node.mode)) {
   throw new FS.ErrnoError(54);
  }
  var errCode = FS.nodePermissions(lookup.node, "x");
  if (errCode) {
   throw new FS.ErrnoError(errCode);
  }
  FS.currentPath = lookup.path;
 },
 createDefaultDirectories: function() {
  FS.mkdir("/tmp");
  FS.mkdir("/home");
  FS.mkdir("/home/web_user");
 },
 createDefaultDevices: function() {
  FS.mkdir("/dev");
  FS.registerDevice(FS.makedev(1, 3), {
   read: function() {
    return 0;
   },
   write: function(stream, buffer, offset, length, pos) {
    return length;
   }
  });
  FS.mkdev("/dev/null", FS.makedev(1, 3));
  TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
  TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
  FS.mkdev("/dev/tty", FS.makedev(5, 0));
  FS.mkdev("/dev/tty1", FS.makedev(6, 0));
  var random_device = getRandomDevice();
  FS.createDevice("/dev", "random", random_device);
  FS.createDevice("/dev", "urandom", random_device);
  FS.mkdir("/dev/shm");
  FS.mkdir("/dev/shm/tmp");
 },
 createSpecialDirectories: function() {
  FS.mkdir("/proc");
  var proc_self = FS.mkdir("/proc/self");
  FS.mkdir("/proc/self/fd");
  FS.mount({
   mount: function() {
    var node = FS.createNode(proc_self, "fd", 16384 | 511, 73);
    node.node_ops = {
     lookup: function(parent, name) {
      var fd = +name;
      var stream = FS.getStream(fd);
      if (!stream) throw new FS.ErrnoError(8);
      var ret = {
       parent: null,
       mount: {
        mountpoint: "fake"
       },
       node_ops: {
        readlink: function() {
         return stream.path;
        }
       }
      };
      ret.parent = ret;
      return ret;
     }
    };
    return node;
   }
  }, {}, "/proc/self/fd");
 },
 createStandardStreams: function() {
  if (Module["stdin"]) {
   FS.createDevice("/dev", "stdin", Module["stdin"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdin");
  }
  if (Module["stdout"]) {
   FS.createDevice("/dev", "stdout", null, Module["stdout"]);
  } else {
   FS.symlink("/dev/tty", "/dev/stdout");
  }
  if (Module["stderr"]) {
   FS.createDevice("/dev", "stderr", null, Module["stderr"]);
  } else {
   FS.symlink("/dev/tty1", "/dev/stderr");
  }
  var stdin = FS.open("/dev/stdin", 0);
  var stdout = FS.open("/dev/stdout", 1);
  var stderr = FS.open("/dev/stderr", 1);
 },
 ensureErrnoError: function() {
  if (FS.ErrnoError) return;
  FS.ErrnoError = function ErrnoError(errno, node) {
   this.node = node;
   this.setErrno = function(errno) {
    this.errno = errno;
   };
   this.setErrno(errno);
   this.message = "FS error";
  };
  FS.ErrnoError.prototype = new Error();
  FS.ErrnoError.prototype.constructor = FS.ErrnoError;
  [ 44 ].forEach(function(code) {
   FS.genericErrors[code] = new FS.ErrnoError(code);
   FS.genericErrors[code].stack = "<generic error, no stack>";
  });
 },
 staticInit: function() {
  FS.ensureErrnoError();
  FS.nameTable = new Array(4096);
  FS.mount(MEMFS, {}, "/");
  FS.createDefaultDirectories();
  FS.createDefaultDevices();
  FS.createSpecialDirectories();
  FS.filesystems = {
   "MEMFS": MEMFS
  };
 },
 init: function(input, output, error) {
  FS.init.initialized = true;
  FS.ensureErrnoError();
  Module["stdin"] = input || Module["stdin"];
  Module["stdout"] = output || Module["stdout"];
  Module["stderr"] = error || Module["stderr"];
  FS.createStandardStreams();
 },
 quit: function() {
  FS.init.initialized = false;
  var fflush = Module["_fflush"];
  if (fflush) fflush(0);
  for (var i = 0; i < FS.streams.length; i++) {
   var stream = FS.streams[i];
   if (!stream) {
    continue;
   }
   FS.close(stream);
  }
 },
 getMode: function(canRead, canWrite) {
  var mode = 0;
  if (canRead) mode |= 292 | 73;
  if (canWrite) mode |= 146;
  return mode;
 },
 findObject: function(path, dontResolveLastLink) {
  var ret = FS.analyzePath(path, dontResolveLastLink);
  if (ret.exists) {
   return ret.object;
  } else {
   return null;
  }
 },
 analyzePath: function(path, dontResolveLastLink) {
  try {
   var lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   path = lookup.path;
  } catch (e) {}
  var ret = {
   isRoot: false,
   exists: false,
   error: 0,
   name: null,
   path: null,
   object: null,
   parentExists: false,
   parentPath: null,
   parentObject: null
  };
  try {
   var lookup = FS.lookupPath(path, {
    parent: true
   });
   ret.parentExists = true;
   ret.parentPath = lookup.path;
   ret.parentObject = lookup.node;
   ret.name = PATH.basename(path);
   lookup = FS.lookupPath(path, {
    follow: !dontResolveLastLink
   });
   ret.exists = true;
   ret.path = lookup.path;
   ret.object = lookup.node;
   ret.name = lookup.node.name;
   ret.isRoot = lookup.path === "/";
  } catch (e) {
   ret.error = e.errno;
  }
  return ret;
 },
 createPath: function(parent, path, canRead, canWrite) {
  parent = typeof parent === "string" ? parent : FS.getPath(parent);
  var parts = path.split("/").reverse();
  while (parts.length) {
   var part = parts.pop();
   if (!part) continue;
   var current = PATH.join2(parent, part);
   try {
    FS.mkdir(current);
   } catch (e) {}
   parent = current;
  }
  return current;
 },
 createFile: function(parent, name, properties, canRead, canWrite) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(canRead, canWrite);
  return FS.create(path, mode);
 },
 createDataFile: function(parent, name, data, canRead, canWrite, canOwn) {
  var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
  var mode = FS.getMode(canRead, canWrite);
  var node = FS.create(path, mode);
  if (data) {
   if (typeof data === "string") {
    var arr = new Array(data.length);
    for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
    data = arr;
   }
   FS.chmod(node, mode | 146);
   var stream = FS.open(node, 577);
   FS.write(stream, data, 0, data.length, 0, canOwn);
   FS.close(stream);
   FS.chmod(node, mode);
  }
  return node;
 },
 createDevice: function(parent, name, input, output) {
  var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
  var mode = FS.getMode(!!input, !!output);
  if (!FS.createDevice.major) FS.createDevice.major = 64;
  var dev = FS.makedev(FS.createDevice.major++, 0);
  FS.registerDevice(dev, {
   open: function(stream) {
    stream.seekable = false;
   },
   close: function(stream) {
    if (output && output.buffer && output.buffer.length) {
     output(10);
    }
   },
   read: function(stream, buffer, offset, length, pos) {
    var bytesRead = 0;
    for (var i = 0; i < length; i++) {
     var result;
     try {
      result = input();
     } catch (e) {
      throw new FS.ErrnoError(29);
     }
     if (result === undefined && bytesRead === 0) {
      throw new FS.ErrnoError(6);
     }
     if (result === null || result === undefined) break;
     bytesRead++;
     buffer[offset + i] = result;
    }
    if (bytesRead) {
     stream.node.timestamp = Date.now();
    }
    return bytesRead;
   },
   write: function(stream, buffer, offset, length, pos) {
    for (var i = 0; i < length; i++) {
     try {
      output(buffer[offset + i]);
     } catch (e) {
      throw new FS.ErrnoError(29);
     }
    }
    if (length) {
     stream.node.timestamp = Date.now();
    }
    return i;
   }
  });
  return FS.mkdev(path, mode, dev);
 },
 forceLoadFile: function(obj) {
  if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
  if (typeof XMLHttpRequest !== "undefined") {
   throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
  } else if (read_) {
   try {
    obj.contents = intArrayFromString(read_(obj.url), true);
    obj.usedBytes = obj.contents.length;
   } catch (e) {
    throw new FS.ErrnoError(29);
   }
  } else {
   throw new Error("Cannot load without read() or XMLHttpRequest.");
  }
 },
 createLazyFile: function(parent, name, url, canRead, canWrite) {
  function LazyUint8Array() {
   this.lengthKnown = false;
   this.chunks = [];
  }
  LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
   if (idx > this.length - 1 || idx < 0) {
    return undefined;
   }
   var chunkOffset = idx % this.chunkSize;
   var chunkNum = idx / this.chunkSize | 0;
   return this.getter(chunkNum)[chunkOffset];
  };
  LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
   this.getter = getter;
  };
  LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
   var xhr = new XMLHttpRequest();
   xhr.open("HEAD", url, false);
   xhr.send(null);
   if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
   var datalength = Number(xhr.getResponseHeader("Content-length"));
   var header;
   var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
   var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
   var chunkSize = 1024 * 1024;
   if (!hasByteServing) chunkSize = datalength;
   var doXHR = function(from, to) {
    if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
    if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
    if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
    if (xhr.overrideMimeType) {
     xhr.overrideMimeType("text/plain; charset=x-user-defined");
    }
    xhr.send(null);
    if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
    if (xhr.response !== undefined) {
     return new Uint8Array(xhr.response || []);
    } else {
     return intArrayFromString(xhr.responseText || "", true);
    }
   };
   var lazyArray = this;
   lazyArray.setDataGetter(function(chunkNum) {
    var start = chunkNum * chunkSize;
    var end = (chunkNum + 1) * chunkSize - 1;
    end = Math.min(end, datalength - 1);
    if (typeof lazyArray.chunks[chunkNum] === "undefined") {
     lazyArray.chunks[chunkNum] = doXHR(start, end);
    }
    if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
    return lazyArray.chunks[chunkNum];
   });
   if (usesGzip || !datalength) {
    chunkSize = datalength = 1;
    datalength = this.getter(0).length;
    chunkSize = datalength;
    out("LazyFiles on gzip forces download of the whole file when length is accessed");
   }
   this._length = datalength;
   this._chunkSize = chunkSize;
   this.lengthKnown = true;
  };
  if (typeof XMLHttpRequest !== "undefined") {
   if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
   var lazyArray = new LazyUint8Array();
   Object.defineProperties(lazyArray, {
    length: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._length;
     }
    },
    chunkSize: {
     get: function() {
      if (!this.lengthKnown) {
       this.cacheLength();
      }
      return this._chunkSize;
     }
    }
   });
   var properties = {
    isDevice: false,
    contents: lazyArray
   };
  } else {
   var properties = {
    isDevice: false,
    url: url
   };
  }
  var node = FS.createFile(parent, name, properties, canRead, canWrite);
  if (properties.contents) {
   node.contents = properties.contents;
  } else if (properties.url) {
   node.contents = null;
   node.url = properties.url;
  }
  Object.defineProperties(node, {
   usedBytes: {
    get: function() {
     return this.contents.length;
    }
   }
  });
  var stream_ops = {};
  var keys = Object.keys(node.stream_ops);
  keys.forEach(function(key) {
   var fn = node.stream_ops[key];
   stream_ops[key] = function forceLoadLazyFile() {
    FS.forceLoadFile(node);
    return fn.apply(null, arguments);
   };
  });
  stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
   FS.forceLoadFile(node);
   var contents = stream.node.contents;
   if (position >= contents.length) return 0;
   var size = Math.min(contents.length - position, length);
   if (contents.slice) {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents[position + i];
    }
   } else {
    for (var i = 0; i < size; i++) {
     buffer[offset + i] = contents.get(position + i);
    }
   }
   return size;
  };
  node.stream_ops = stream_ops;
  return node;
 },
 createPreloadedFile: function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) {
  Browser.init();
  var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
  var dep = getUniqueRunDependency("cp " + fullname);
  function processData(byteArray) {
   function finish(byteArray) {
    if (preFinish) preFinish();
    if (!dontCreateFile) {
     FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
    }
    if (onload) onload();
    removeRunDependency(dep);
   }
   var handled = false;
   Module["preloadPlugins"].forEach(function(plugin) {
    if (handled) return;
    if (plugin["canHandle"](fullname)) {
     plugin["handle"](byteArray, fullname, finish, function() {
      if (onerror) onerror();
      removeRunDependency(dep);
     });
     handled = true;
    }
   });
   if (!handled) finish(byteArray);
  }
  addRunDependency(dep);
  if (typeof url == "string") {
   Browser.asyncLoad(url, function(byteArray) {
    processData(byteArray);
   }, onerror);
  } else {
   processData(url);
  }
 },
 indexedDB: function() {
  return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
 },
 DB_NAME: function() {
  return "EM_FS_" + window.location.pathname;
 },
 DB_VERSION: 20,
 DB_STORE_NAME: "FILE_DATA",
 saveFilesToDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
   out("creating db");
   var db = openRequest.result;
   db.createObjectStore(FS.DB_STORE_NAME);
  };
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   var transaction = db.transaction([ FS.DB_STORE_NAME ], "readwrite");
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var putRequest = files.put(FS.analyzePath(path).object.contents, path);
    putRequest.onsuccess = function putRequest_onsuccess() {
     ok++;
     if (ok + fail == total) finish();
    };
    putRequest.onerror = function putRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 },
 loadFilesFromDB: function(paths, onload, onerror) {
  onload = onload || function() {};
  onerror = onerror || function() {};
  var indexedDB = FS.indexedDB();
  try {
   var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION);
  } catch (e) {
   return onerror(e);
  }
  openRequest.onupgradeneeded = onerror;
  openRequest.onsuccess = function openRequest_onsuccess() {
   var db = openRequest.result;
   try {
    var transaction = db.transaction([ FS.DB_STORE_NAME ], "readonly");
   } catch (e) {
    onerror(e);
    return;
   }
   var files = transaction.objectStore(FS.DB_STORE_NAME);
   var ok = 0, fail = 0, total = paths.length;
   function finish() {
    if (fail == 0) onload(); else onerror();
   }
   paths.forEach(function(path) {
    var getRequest = files.get(path);
    getRequest.onsuccess = function getRequest_onsuccess() {
     if (FS.analyzePath(path).exists) {
      FS.unlink(path);
     }
     FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
     ok++;
     if (ok + fail == total) finish();
    };
    getRequest.onerror = function getRequest_onerror() {
     fail++;
     if (ok + fail == total) finish();
    };
   });
   transaction.onerror = onerror;
  };
  openRequest.onerror = onerror;
 }
};

var SYSCALLS = {
 mappings: {},
 DEFAULT_POLLMASK: 5,
 umask: 511,
 calculateAt: function(dirfd, path, allowEmpty) {
  if (path[0] === "/") {
   return path;
  }
  var dir;
  if (dirfd === -100) {
   dir = FS.cwd();
  } else {
   var dirstream = FS.getStream(dirfd);
   if (!dirstream) throw new FS.ErrnoError(8);
   dir = dirstream.path;
  }
  if (path.length == 0) {
   if (!allowEmpty) {
    throw new FS.ErrnoError(44);
   }
   return dir;
  }
  return PATH.join2(dir, path);
 },
 doStat: function(func, path, buf) {
  try {
   var stat = func(path);
  } catch (e) {
   if (e && e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
    return -54;
   }
   throw e;
  }
  SAFE_HEAP_STORE(buf | 0, stat.dev | 0, 4);
  SAFE_HEAP_STORE(buf + 4 | 0, 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 8 | 0, stat.ino | 0, 4);
  SAFE_HEAP_STORE(buf + 12 | 0, stat.mode | 0, 4);
  SAFE_HEAP_STORE(buf + 16 | 0, stat.nlink | 0, 4);
  SAFE_HEAP_STORE(buf + 20 | 0, stat.uid | 0, 4);
  SAFE_HEAP_STORE(buf + 24 | 0, stat.gid | 0, 4);
  SAFE_HEAP_STORE(buf + 28 | 0, stat.rdev | 0, 4);
  SAFE_HEAP_STORE(buf + 32 | 0, 0 | 0, 4);
  tempI64 = [ stat.size >>> 0, (tempDouble = stat.size, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  SAFE_HEAP_STORE(buf + 40 | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(buf + 44 | 0, tempI64[1] | 0, 4);
  SAFE_HEAP_STORE(buf + 48 | 0, 4096 | 0, 4);
  SAFE_HEAP_STORE(buf + 52 | 0, stat.blocks | 0, 4);
  SAFE_HEAP_STORE(buf + 56 | 0, stat.atime.getTime() / 1e3 | 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 60 | 0, 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 64 | 0, stat.mtime.getTime() / 1e3 | 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 68 | 0, 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 72 | 0, stat.ctime.getTime() / 1e3 | 0 | 0, 4);
  SAFE_HEAP_STORE(buf + 76 | 0, 0 | 0, 4);
  tempI64 = [ stat.ino >>> 0, (tempDouble = stat.ino, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  SAFE_HEAP_STORE(buf + 80 | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(buf + 84 | 0, tempI64[1] | 0, 4);
  return 0;
 },
 doMsync: function(addr, stream, len, flags, offset) {
  var buffer = HEAPU8.slice(addr, addr + len);
  FS.msync(stream, buffer, offset, len, flags);
 },
 doMkdir: function(path, mode) {
  path = PATH.normalize(path);
  if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
  FS.mkdir(path, mode, 0);
  return 0;
 },
 doMknod: function(path, mode, dev) {
  switch (mode & 61440) {
  case 32768:
  case 8192:
  case 24576:
  case 4096:
  case 49152:
   break;

  default:
   return -28;
  }
  FS.mknod(path, mode, dev);
  return 0;
 },
 doReadlink: function(path, buf, bufsize) {
  if (bufsize <= 0) return -28;
  var ret = FS.readlink(path);
  var len = Math.min(bufsize, lengthBytesUTF8(ret));
  var endChar = SAFE_HEAP_LOAD(buf + len, 1, 0);
  stringToUTF8(ret, buf, bufsize + 1);
  SAFE_HEAP_STORE(buf + len, endChar, 1);
  return len;
 },
 doAccess: function(path, amode) {
  if (amode & ~7) {
   return -28;
  }
  var node;
  var lookup = FS.lookupPath(path, {
   follow: true
  });
  node = lookup.node;
  if (!node) {
   return -44;
  }
  var perms = "";
  if (amode & 4) perms += "r";
  if (amode & 2) perms += "w";
  if (amode & 1) perms += "x";
  if (perms && FS.nodePermissions(node, perms)) {
   return -2;
  }
  return 0;
 },
 doDup: function(path, flags, suggestFD) {
  var suggest = FS.getStream(suggestFD);
  if (suggest) FS.close(suggest);
  return FS.open(path, flags, 0, suggestFD, suggestFD).fd;
 },
 doReadv: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = SAFE_HEAP_LOAD(iov + i * 8 | 0, 4, 0) | 0;
   var len = SAFE_HEAP_LOAD(iov + (i * 8 + 4) | 0, 4, 0) | 0;
   var curr = FS.read(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
   if (curr < len) break;
  }
  return ret;
 },
 doWritev: function(stream, iov, iovcnt, offset) {
  var ret = 0;
  for (var i = 0; i < iovcnt; i++) {
   var ptr = SAFE_HEAP_LOAD(iov + i * 8 | 0, 4, 0) | 0;
   var len = SAFE_HEAP_LOAD(iov + (i * 8 + 4) | 0, 4, 0) | 0;
   var curr = FS.write(stream, HEAP8, ptr, len, offset);
   if (curr < 0) return -1;
   ret += curr;
  }
  return ret;
 },
 varargs: undefined,
 get: function() {
  SYSCALLS.varargs += 4;
  var ret = SAFE_HEAP_LOAD(SYSCALLS.varargs - 4 | 0, 4, 0) | 0;
  return ret;
 },
 getStr: function(ptr) {
  var ret = UTF8ToString(ptr);
  return ret;
 },
 getStreamFromFD: function(fd) {
  var stream = FS.getStream(fd);
  if (!stream) throw new FS.ErrnoError(8);
  return stream;
 },
 get64: function(low, high) {
  return low;
 }
};

function ___sys_fcntl64(fd, cmd, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  switch (cmd) {
  case 0:
   {
    var arg = SYSCALLS.get();
    if (arg < 0) {
     return -28;
    }
    var newStream;
    newStream = FS.open(stream.path, stream.flags, 0, arg);
    return newStream.fd;
   }

  case 1:
  case 2:
   return 0;

  case 3:
   return stream.flags;

  case 4:
   {
    var arg = SYSCALLS.get();
    stream.flags |= arg;
    return 0;
   }

  case 12:
   {
    var arg = SYSCALLS.get();
    var offset = 0;
    SAFE_HEAP_STORE(arg + offset | 0, 2 | 0, 2);
    return 0;
   }

  case 13:
  case 14:
   return 0;

  case 16:
  case 8:
   return -28;

  case 9:
   setErrNo(28);
   return -1;

  default:
   {
    return -28;
   }
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_getdents64(fd, dirp, count) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  if (!stream.getdents) {
   stream.getdents = FS.readdir(stream.path);
  }
  var struct_size = 280;
  var pos = 0;
  var off = FS.llseek(stream, 0, 1);
  var idx = Math.floor(off / struct_size);
  while (idx < stream.getdents.length && pos + struct_size <= count) {
   var id;
   var type;
   var name = stream.getdents[idx];
   if (name[0] === ".") {
    id = 1;
    type = 4;
   } else {
    var child = FS.lookupNode(stream.node, name);
    id = child.id;
    type = FS.isChrdev(child.mode) ? 2 : FS.isDir(child.mode) ? 4 : FS.isLink(child.mode) ? 10 : 8;
   }
   tempI64 = [ id >>> 0, (tempDouble = id, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
   SAFE_HEAP_STORE(dirp + pos | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(dirp + pos + 4 | 0, tempI64[1] | 0, 4);
   tempI64 = [ (idx + 1) * struct_size >>> 0, (tempDouble = (idx + 1) * struct_size, 
   +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
   SAFE_HEAP_STORE(dirp + pos + 8 | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(dirp + pos + 12 | 0, tempI64[1] | 0, 4);
   SAFE_HEAP_STORE(dirp + pos + 16 | 0, 280 | 0, 2);
   SAFE_HEAP_STORE(dirp + pos + 18 | 0, type | 0, 1);
   stringToUTF8(name, dirp + pos + 19, 256);
   pos += struct_size;
   idx += 1;
  }
  FS.llseek(stream, idx * struct_size, 0);
  return pos;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_ioctl(fd, op, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  switch (op) {
  case 21509:
  case 21505:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21510:
  case 21511:
  case 21512:
  case 21506:
  case 21507:
  case 21508:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21519:
   {
    if (!stream.tty) return -59;
    var argp = SYSCALLS.get();
    SAFE_HEAP_STORE(argp | 0, 0 | 0, 4);
    return 0;
   }

  case 21520:
   {
    if (!stream.tty) return -59;
    return -28;
   }

  case 21531:
   {
    var argp = SYSCALLS.get();
    return FS.ioctl(stream, op, argp);
   }

  case 21523:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  case 21524:
   {
    if (!stream.tty) return -59;
    return 0;
   }

  default:
   abort("bad ioctl syscall " + op);
  }
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_mkdir(path, mode) {
 try {
  path = SYSCALLS.getStr(path);
  return SYSCALLS.doMkdir(path, mode);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function syscallMmap2(addr, len, prot, flags, fd, off) {
 off <<= 12;
 var ptr;
 var allocated = false;
 if ((flags & 16) !== 0 && addr % 16384 !== 0) {
  return -28;
 }
 if ((flags & 32) !== 0) {
  ptr = _memalign(16384, len);
  if (!ptr) return -48;
  _memset(ptr, 0, len);
  allocated = true;
 } else {
  var info = FS.getStream(fd);
  if (!info) return -8;
  var res = FS.mmap(info, addr, len, off, prot, flags);
  ptr = res.ptr;
  allocated = res.allocated;
 }
 SYSCALLS.mappings[ptr] = {
  malloc: ptr,
  len: len,
  allocated: allocated,
  fd: fd,
  prot: prot,
  flags: flags,
  offset: off
 };
 return ptr;
}

function ___sys_mmap2(addr, len, prot, flags, fd, off) {
 try {
  return syscallMmap2(addr, len, prot, flags, fd, off);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function syscallMunmap(addr, len) {
 if ((addr | 0) === -1 || len === 0) {
  return -28;
 }
 var info = SYSCALLS.mappings[addr];
 if (!info) return 0;
 if (len === info.len) {
  var stream = FS.getStream(info.fd);
  if (stream) {
   if (info.prot & 2) {
    SYSCALLS.doMsync(addr, stream, len, info.flags, info.offset);
   }
   FS.munmap(stream);
  }
  SYSCALLS.mappings[addr] = null;
  if (info.allocated) {
   _free(info.malloc);
  }
 }
 return 0;
}

function ___sys_munmap(addr, len) {
 try {
  return syscallMunmap(addr, len);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_open(path, flags, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var pathname = SYSCALLS.getStr(path);
  var mode = varargs ? SYSCALLS.get() : 0;
  var stream = FS.open(pathname, flags, mode);
  return stream.fd;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_rename(old_path, new_path) {
 try {
  old_path = SYSCALLS.getStr(old_path);
  new_path = SYSCALLS.getStr(new_path);
  FS.rename(old_path, new_path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_rmdir(path) {
 try {
  path = SYSCALLS.getStr(path);
  FS.rmdir(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_stat64(path, buf) {
 try {
  path = SYSCALLS.getStr(path);
  return SYSCALLS.doStat(FS.stat, path, buf);
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

function ___sys_unlink(path) {
 try {
  path = SYSCALLS.getStr(path);
  FS.unlink(path);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}

var _emscripten_get_now;

if (ENVIRONMENT_IS_NODE) {
 _emscripten_get_now = function() {
  var t = process["hrtime"]();
  return t[0] * 1e3 + t[1] / 1e6;
 };
} else if (typeof dateNow !== "undefined") {
 _emscripten_get_now = dateNow;
} else _emscripten_get_now = function() {
 return performance.now();
};

var _emscripten_get_now_is_monotonic = true;

function _clock_gettime(clk_id, tp) {
 var now;
 if (clk_id === 0) {
  now = Date.now();
 } else if ((clk_id === 1 || clk_id === 4) && _emscripten_get_now_is_monotonic) {
  now = _emscripten_get_now();
 } else {
  setErrNo(28);
  return -1;
 }
 SAFE_HEAP_STORE(tp | 0, now / 1e3 | 0 | 0, 4);
 SAFE_HEAP_STORE(tp + 4 | 0, now % 1e3 * 1e3 * 1e3 | 0 | 0, 4);
 return 0;
}

function _dlclose(handle) {
 abort("To use dlopen, you need to use Emscripten's linking support, see https://github.com/emscripten-core/emscripten/wiki/Linking");
}

function _emscripten_set_main_loop_timing(mode, value) {
 Browser.mainLoop.timingMode = mode;
 Browser.mainLoop.timingValue = value;
 if (!Browser.mainLoop.func) {
  return 1;
 }
 if (!Browser.mainLoop.running) {
  runtimeKeepalivePush();
  Browser.mainLoop.running = true;
 }
 if (mode == 0) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setTimeout() {
   var timeUntilNextTick = Math.max(0, Browser.mainLoop.tickStartTime + value - _emscripten_get_now()) | 0;
   setTimeout(Browser.mainLoop.runner, timeUntilNextTick);
  };
  Browser.mainLoop.method = "timeout";
 } else if (mode == 1) {
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_rAF() {
   Browser.requestAnimationFrame(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "rAF";
 } else if (mode == 2) {
  if (typeof setImmediate === "undefined") {
   var setImmediates = [];
   var emscriptenMainLoopMessageId = "setimmediate";
   var Browser_setImmediate_messageHandler = function(event) {
    if (event.data === emscriptenMainLoopMessageId || event.data.target === emscriptenMainLoopMessageId) {
     event.stopPropagation();
     setImmediates.shift()();
    }
   };
   addEventListener("message", Browser_setImmediate_messageHandler, true);
   setImmediate = function Browser_emulated_setImmediate(func) {
    setImmediates.push(func);
    if (ENVIRONMENT_IS_WORKER) {
     if (Module["setImmediates"] === undefined) Module["setImmediates"] = [];
     Module["setImmediates"].push(func);
     postMessage({
      target: emscriptenMainLoopMessageId
     });
    } else postMessage(emscriptenMainLoopMessageId, "*");
   };
  }
  Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler_setImmediate() {
   setImmediate(Browser.mainLoop.runner);
  };
  Browser.mainLoop.method = "immediate";
 }
 return 0;
}

function runtimeKeepalivePush() {
 runtimeKeepaliveCounter += 1;
}

function _exit(status) {
 exit(status);
}

function maybeExit() {
 if (!keepRuntimeAlive()) {
  try {
   _exit(EXITSTATUS);
  } catch (e) {
   if (e instanceof ExitStatus) {
    return;
   }
   throw e;
  }
 }
}

function setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop, arg, noSetTiming) {
 assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
 Browser.mainLoop.func = browserIterationFunc;
 Browser.mainLoop.arg = arg;
 var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
 function checkIsRunning() {
  if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) {
   runtimeKeepalivePop();
   maybeExit();
   return false;
  }
  return true;
 }
 Browser.mainLoop.running = false;
 Browser.mainLoop.runner = function Browser_mainLoop_runner() {
  if (ABORT) return;
  if (Browser.mainLoop.queue.length > 0) {
   var start = Date.now();
   var blocker = Browser.mainLoop.queue.shift();
   blocker.func(blocker.arg);
   if (Browser.mainLoop.remainingBlockers) {
    var remaining = Browser.mainLoop.remainingBlockers;
    var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
    if (blocker.counted) {
     Browser.mainLoop.remainingBlockers = next;
    } else {
     next = next + .5;
     Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9;
    }
   }
   console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
   Browser.mainLoop.updateStatus();
   if (!checkIsRunning()) return;
   setTimeout(Browser.mainLoop.runner, 0);
   return;
  }
  if (!checkIsRunning()) return;
  Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
  if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
   Browser.mainLoop.scheduler();
   return;
  } else if (Browser.mainLoop.timingMode == 0) {
   Browser.mainLoop.tickStartTime = _emscripten_get_now();
  }
  Browser.mainLoop.runIter(browserIterationFunc);
  checkStackCookie();
  if (!checkIsRunning()) return;
  if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
  Browser.mainLoop.scheduler();
 };
 if (!noSetTiming) {
  if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps); else _emscripten_set_main_loop_timing(1, 1);
  Browser.mainLoop.scheduler();
 }
 if (simulateInfiniteLoop) {
  throw "unwind";
 }
}

function callUserCallback(func) {
 if (ABORT) {}
 try {
  func();
 } catch (e) {
  if (e instanceof ExitStatus) {
   return;
  } else if (e !== "unwind") {
   if (e && typeof e === "object" && e.stack) err("exception thrown: " + [ e, e.stack ]);
   throw e;
  }
 }
 maybeExit();
}

function runtimeKeepalivePop() {
 runtimeKeepaliveCounter -= 1;
}

var Browser = {
 mainLoop: {
  running: false,
  scheduler: null,
  method: "",
  currentlyRunningMainloop: 0,
  func: null,
  arg: 0,
  timingMode: 0,
  timingValue: 0,
  currentFrameNumber: 0,
  queue: [],
  pause: function() {
   Browser.mainLoop.scheduler = null;
   Browser.mainLoop.currentlyRunningMainloop++;
  },
  resume: function() {
   Browser.mainLoop.currentlyRunningMainloop++;
   var timingMode = Browser.mainLoop.timingMode;
   var timingValue = Browser.mainLoop.timingValue;
   var func = Browser.mainLoop.func;
   Browser.mainLoop.func = null;
   setMainLoop(func, 0, false, Browser.mainLoop.arg, true);
   _emscripten_set_main_loop_timing(timingMode, timingValue);
   Browser.mainLoop.scheduler();
  },
  updateStatus: function() {
   if (Module["setStatus"]) {
    var message = Module["statusMessage"] || "Please wait...";
    var remaining = Browser.mainLoop.remainingBlockers;
    var expected = Browser.mainLoop.expectedBlockers;
    if (remaining) {
     if (remaining < expected) {
      Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")");
     } else {
      Module["setStatus"](message);
     }
    } else {
     Module["setStatus"]("");
    }
   }
  },
  runIter: function(func) {
   if (ABORT) return;
   if (Module["preMainLoop"]) {
    var preRet = Module["preMainLoop"]();
    if (preRet === false) {
     return;
    }
   }
   callUserCallback(func);
   if (Module["postMainLoop"]) Module["postMainLoop"]();
  }
 },
 isFullscreen: false,
 pointerLock: false,
 moduleContextCreatedCallbacks: [],
 workers: [],
 init: function() {
  if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
  if (Browser.initted) return;
  Browser.initted = true;
  try {
   new Blob();
   Browser.hasBlobConstructor = true;
  } catch (e) {
   Browser.hasBlobConstructor = false;
   console.log("warning: no blob constructor, cannot create blobs with mimetypes");
  }
  Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
  Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
  if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
   console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
   Module.noImageDecoding = true;
  }
  var imagePlugin = {};
  imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
   return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name);
  };
  imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
   var b = null;
   if (Browser.hasBlobConstructor) {
    try {
     b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
     if (b.size !== byteArray.length) {
      b = new Blob([ new Uint8Array(byteArray).buffer ], {
       type: Browser.getMimetype(name)
      });
     }
    } catch (e) {
     warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder");
    }
   }
   if (!b) {
    var bb = new Browser.BlobBuilder();
    bb.append(new Uint8Array(byteArray).buffer);
    b = bb.getBlob();
   }
   var url = Browser.URLObject.createObjectURL(b);
   var img = new Image();
   img.onload = function img_onload() {
    assert(img.complete, "Image " + name + " could not be decoded");
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    Module["preloadedImages"][name] = canvas;
    Browser.URLObject.revokeObjectURL(url);
    if (onload) onload(byteArray);
   };
   img.onerror = function img_onerror(event) {
    console.log("Image " + url + " could not be decoded");
    if (onerror) onerror();
   };
   img.src = url;
  };
  Module["preloadPlugins"].push(imagePlugin);
  var audioPlugin = {};
  audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
   return !Module.noAudioDecoding && name.substr(-4) in {
    ".ogg": 1,
    ".wav": 1,
    ".mp3": 1
   };
  };
  audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
   var done = false;
   function finish(audio) {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = audio;
    if (onload) onload(byteArray);
   }
   function fail() {
    if (done) return;
    done = true;
    Module["preloadedAudios"][name] = new Audio();
    if (onerror) onerror();
   }
   if (Browser.hasBlobConstructor) {
    try {
     var b = new Blob([ byteArray ], {
      type: Browser.getMimetype(name)
     });
    } catch (e) {
     return fail();
    }
    var url = Browser.URLObject.createObjectURL(b);
    var audio = new Audio();
    audio.addEventListener("canplaythrough", function() {
     finish(audio);
    }, false);
    audio.onerror = function audio_onerror(event) {
     if (done) return;
     console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");
     function encode64(data) {
      var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      var PAD = "=";
      var ret = "";
      var leftchar = 0;
      var leftbits = 0;
      for (var i = 0; i < data.length; i++) {
       leftchar = leftchar << 8 | data[i];
       leftbits += 8;
       while (leftbits >= 6) {
        var curr = leftchar >> leftbits - 6 & 63;
        leftbits -= 6;
        ret += BASE[curr];
       }
      }
      if (leftbits == 2) {
       ret += BASE[(leftchar & 3) << 4];
       ret += PAD + PAD;
      } else if (leftbits == 4) {
       ret += BASE[(leftchar & 15) << 2];
       ret += PAD;
      }
      return ret;
     }
     audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
     finish(audio);
    };
    audio.src = url;
    Browser.safeSetTimeout(function() {
     finish(audio);
    }, 1e4);
   } else {
    return fail();
   }
  };
  Module["preloadPlugins"].push(audioPlugin);
  function pointerLockChange() {
   Browser.pointerLock = document["pointerLockElement"] === Module["canvas"] || document["mozPointerLockElement"] === Module["canvas"] || document["webkitPointerLockElement"] === Module["canvas"] || document["msPointerLockElement"] === Module["canvas"];
  }
  var canvas = Module["canvas"];
  if (canvas) {
   canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || function() {};
   canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || function() {};
   canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
   document.addEventListener("pointerlockchange", pointerLockChange, false);
   document.addEventListener("mozpointerlockchange", pointerLockChange, false);
   document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
   document.addEventListener("mspointerlockchange", pointerLockChange, false);
   if (Module["elementPointerLock"]) {
    canvas.addEventListener("click", function(ev) {
     if (!Browser.pointerLock && Module["canvas"].requestPointerLock) {
      Module["canvas"].requestPointerLock();
      ev.preventDefault();
     }
    }, false);
   }
  }
 },
 createContext: function(canvas, useWebGL, setInModule, webGLContextAttributes) {
  if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
  var ctx;
  var contextHandle;
  if (useWebGL) {
   var contextAttributes = {
    antialias: false,
    alpha: false,
    majorVersion: 1
   };
   if (webGLContextAttributes) {
    for (var attribute in webGLContextAttributes) {
     contextAttributes[attribute] = webGLContextAttributes[attribute];
    }
   }
   if (typeof GL !== "undefined") {
    contextHandle = GL.createContext(canvas, contextAttributes);
    if (contextHandle) {
     ctx = GL.getContext(contextHandle).GLctx;
    }
   }
  } else {
   ctx = canvas.getContext("2d");
  }
  if (!ctx) return null;
  if (setInModule) {
   if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
   Module.ctx = ctx;
   if (useWebGL) GL.makeContextCurrent(contextHandle);
   Module.useWebGL = useWebGL;
   Browser.moduleContextCreatedCallbacks.forEach(function(callback) {
    callback();
   });
   Browser.init();
  }
  return ctx;
 },
 destroyContext: function(canvas, useWebGL, setInModule) {},
 fullscreenHandlersInstalled: false,
 lockPointer: undefined,
 resizeCanvas: undefined,
 requestFullscreen: function(lockPointer, resizeCanvas) {
  Browser.lockPointer = lockPointer;
  Browser.resizeCanvas = resizeCanvas;
  if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
  if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
  var canvas = Module["canvas"];
  function fullscreenChange() {
   Browser.isFullscreen = false;
   var canvasContainer = canvas.parentNode;
   if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
    canvas.exitFullscreen = Browser.exitFullscreen;
    if (Browser.lockPointer) canvas.requestPointerLock();
    Browser.isFullscreen = true;
    if (Browser.resizeCanvas) {
     Browser.setFullscreenCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
    }
   } else {
    canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
    canvasContainer.parentNode.removeChild(canvasContainer);
    if (Browser.resizeCanvas) {
     Browser.setWindowedCanvasSize();
    } else {
     Browser.updateCanvasDimensions(canvas);
    }
   }
   if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullscreen);
   if (Module["onFullscreen"]) Module["onFullscreen"](Browser.isFullscreen);
  }
  if (!Browser.fullscreenHandlersInstalled) {
   Browser.fullscreenHandlersInstalled = true;
   document.addEventListener("fullscreenchange", fullscreenChange, false);
   document.addEventListener("mozfullscreenchange", fullscreenChange, false);
   document.addEventListener("webkitfullscreenchange", fullscreenChange, false);
   document.addEventListener("MSFullscreenChange", fullscreenChange, false);
  }
  var canvasContainer = document.createElement("div");
  canvas.parentNode.insertBefore(canvasContainer, canvas);
  canvasContainer.appendChild(canvas);
  canvasContainer.requestFullscreen = canvasContainer["requestFullscreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullscreen"] ? function() {
   canvasContainer["webkitRequestFullscreen"](Element["ALLOW_KEYBOARD_INPUT"]);
  } : null) || (canvasContainer["webkitRequestFullScreen"] ? function() {
   canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"]);
  } : null);
  canvasContainer.requestFullscreen();
 },
 exitFullscreen: function() {
  if (!Browser.isFullscreen) {
   return false;
  }
  var CFS = document["exitFullscreen"] || document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["msExitFullscreen"] || document["webkitCancelFullScreen"] || function() {};
  CFS.apply(document, []);
  return true;
 },
 nextRAF: 0,
 fakeRequestAnimationFrame: function(func) {
  var now = Date.now();
  if (Browser.nextRAF === 0) {
   Browser.nextRAF = now + 1e3 / 60;
  } else {
   while (now + 2 >= Browser.nextRAF) {
    Browser.nextRAF += 1e3 / 60;
   }
  }
  var delay = Math.max(Browser.nextRAF - now, 0);
  setTimeout(func, delay);
 },
 requestAnimationFrame: function(func) {
  if (typeof requestAnimationFrame === "function") {
   requestAnimationFrame(func);
   return;
  }
  var RAF = Browser.fakeRequestAnimationFrame;
  RAF(func);
 },
 safeRequestAnimationFrame: function(func) {
  runtimeKeepalivePush();
  return Browser.requestAnimationFrame(function() {
   runtimeKeepalivePop();
   callUserCallback(func);
  });
 },
 safeSetTimeout: function(func, timeout) {
  runtimeKeepalivePush();
  return setTimeout(function() {
   runtimeKeepalivePop();
   callUserCallback(func);
  }, timeout);
 },
 getMimetype: function(name) {
  return {
   "jpg": "image/jpeg",
   "jpeg": "image/jpeg",
   "png": "image/png",
   "bmp": "image/bmp",
   "ogg": "audio/ogg",
   "wav": "audio/wav",
   "mp3": "audio/mpeg"
  }[name.substr(name.lastIndexOf(".") + 1)];
 },
 getUserMedia: function(func) {
  if (!window.getUserMedia) {
   window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"];
  }
  window.getUserMedia(func);
 },
 getMovementX: function(event) {
  return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0;
 },
 getMovementY: function(event) {
  return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0;
 },
 getMouseWheelDelta: function(event) {
  var delta = 0;
  switch (event.type) {
  case "DOMMouseScroll":
   delta = event.detail / 3;
   break;

  case "mousewheel":
   delta = event.wheelDelta / 120;
   break;

  case "wheel":
   delta = event.deltaY;
   switch (event.deltaMode) {
   case 0:
    delta /= 100;
    break;

   case 1:
    delta /= 3;
    break;

   case 2:
    delta *= 80;
    break;

   default:
    throw "unrecognized mouse wheel delta mode: " + event.deltaMode;
   }
   break;

  default:
   throw "unrecognized mouse wheel event: " + event.type;
  }
  return delta;
 },
 mouseX: 0,
 mouseY: 0,
 mouseMovementX: 0,
 mouseMovementY: 0,
 touches: {},
 lastTouches: {},
 calculateMouseEvent: function(event) {
  if (Browser.pointerLock) {
   if (event.type != "mousemove" && "mozMovementX" in event) {
    Browser.mouseMovementX = Browser.mouseMovementY = 0;
   } else {
    Browser.mouseMovementX = Browser.getMovementX(event);
    Browser.mouseMovementY = Browser.getMovementY(event);
   }
   if (typeof SDL != "undefined") {
    Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
    Browser.mouseY = SDL.mouseY + Browser.mouseMovementY;
   } else {
    Browser.mouseX += Browser.mouseMovementX;
    Browser.mouseY += Browser.mouseMovementY;
   }
  } else {
   var rect = Module["canvas"].getBoundingClientRect();
   var cw = Module["canvas"].width;
   var ch = Module["canvas"].height;
   var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
   var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
   if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
    var touch = event.touch;
    if (touch === undefined) {
     return;
    }
    var adjustedX = touch.pageX - (scrollX + rect.left);
    var adjustedY = touch.pageY - (scrollY + rect.top);
    adjustedX = adjustedX * (cw / rect.width);
    adjustedY = adjustedY * (ch / rect.height);
    var coords = {
     x: adjustedX,
     y: adjustedY
    };
    if (event.type === "touchstart") {
     Browser.lastTouches[touch.identifier] = coords;
     Browser.touches[touch.identifier] = coords;
    } else if (event.type === "touchend" || event.type === "touchmove") {
     var last = Browser.touches[touch.identifier];
     if (!last) last = coords;
     Browser.lastTouches[touch.identifier] = last;
     Browser.touches[touch.identifier] = coords;
    }
    return;
   }
   var x = event.pageX - (scrollX + rect.left);
   var y = event.pageY - (scrollY + rect.top);
   x = x * (cw / rect.width);
   y = y * (ch / rect.height);
   Browser.mouseMovementX = x - Browser.mouseX;
   Browser.mouseMovementY = y - Browser.mouseY;
   Browser.mouseX = x;
   Browser.mouseY = y;
  }
 },
 asyncLoad: function(url, onload, onerror, noRunDep) {
  var dep = !noRunDep ? getUniqueRunDependency("al " + url) : "";
  readAsync(url, function(arrayBuffer) {
   assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
   onload(new Uint8Array(arrayBuffer));
   if (dep) removeRunDependency(dep);
  }, function(event) {
   if (onerror) {
    onerror();
   } else {
    throw 'Loading data file "' + url + '" failed.';
   }
  });
  if (dep) addRunDependency(dep);
 },
 resizeListeners: [],
 updateResizeListeners: function() {
  var canvas = Module["canvas"];
  Browser.resizeListeners.forEach(function(listener) {
   listener(canvas.width, canvas.height);
  });
 },
 setCanvasSize: function(width, height, noUpdates) {
  var canvas = Module["canvas"];
  Browser.updateCanvasDimensions(canvas, width, height);
  if (!noUpdates) Browser.updateResizeListeners();
 },
 windowedWidth: 0,
 windowedHeight: 0,
 setFullscreenCanvasSize: function() {
  if (typeof SDL != "undefined") {
   var flags = SAFE_HEAP_LOAD(SDL.screen | 0, 4, 1) >>> 0;
   flags = flags | 8388608;
   SAFE_HEAP_STORE(SDL.screen | 0, flags | 0, 4);
  }
  Browser.updateCanvasDimensions(Module["canvas"]);
  Browser.updateResizeListeners();
 },
 setWindowedCanvasSize: function() {
  if (typeof SDL != "undefined") {
   var flags = SAFE_HEAP_LOAD(SDL.screen | 0, 4, 1) >>> 0;
   flags = flags & ~8388608;
   SAFE_HEAP_STORE(SDL.screen | 0, flags | 0, 4);
  }
  Browser.updateCanvasDimensions(Module["canvas"]);
  Browser.updateResizeListeners();
 },
 updateCanvasDimensions: function(canvas, wNative, hNative) {
  if (wNative && hNative) {
   canvas.widthNative = wNative;
   canvas.heightNative = hNative;
  } else {
   wNative = canvas.widthNative;
   hNative = canvas.heightNative;
  }
  var w = wNative;
  var h = hNative;
  if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
   if (w / h < Module["forcedAspectRatio"]) {
    w = Math.round(h * Module["forcedAspectRatio"]);
   } else {
    h = Math.round(w / Module["forcedAspectRatio"]);
   }
  }
  if ((document["fullscreenElement"] || document["mozFullScreenElement"] || document["msFullscreenElement"] || document["webkitFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
   var factor = Math.min(screen.width / w, screen.height / h);
   w = Math.round(w * factor);
   h = Math.round(h * factor);
  }
  if (Browser.resizeCanvas) {
   if (canvas.width != w) canvas.width = w;
   if (canvas.height != h) canvas.height = h;
   if (typeof canvas.style != "undefined") {
    canvas.style.removeProperty("width");
    canvas.style.removeProperty("height");
   }
  } else {
   if (canvas.width != wNative) canvas.width = wNative;
   if (canvas.height != hNative) canvas.height = hNative;
   if (typeof canvas.style != "undefined") {
    if (w != wNative || h != hNative) {
     canvas.style.setProperty("width", w + "px", "important");
     canvas.style.setProperty("height", h + "px", "important");
    } else {
     canvas.style.removeProperty("width");
     canvas.style.removeProperty("height");
    }
   }
  }
 },
 wgetRequests: {},
 nextWgetRequestHandle: 0,
 getNextWgetRequestHandle: function() {
  var handle = Browser.nextWgetRequestHandle;
  Browser.nextWgetRequestHandle++;
  return handle;
 }
};

var EGL = {
 errorCode: 12288,
 defaultDisplayInitialized: false,
 currentContext: 0,
 currentReadSurface: 0,
 currentDrawSurface: 0,
 contextAttributes: {
  alpha: false,
  depth: false,
  stencil: false,
  antialias: false
 },
 stringCache: {},
 setErrorCode: function(code) {
  EGL.errorCode = code;
 },
 chooseConfig: function(display, attribList, config, config_size, numConfigs) {
  if (display != 62e3) {
   EGL.setErrorCode(12296);
   return 0;
  }
  if (attribList) {
   for (;;) {
    var param = SAFE_HEAP_LOAD(attribList | 0, 4, 0) | 0;
    if (param == 12321) {
     var alphaSize = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.alpha = alphaSize > 0;
    } else if (param == 12325) {
     var depthSize = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.depth = depthSize > 0;
    } else if (param == 12326) {
     var stencilSize = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.stencil = stencilSize > 0;
    } else if (param == 12337) {
     var samples = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.antialias = samples > 0;
    } else if (param == 12338) {
     var samples = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.antialias = samples == 1;
    } else if (param == 12544) {
     var requestedPriority = SAFE_HEAP_LOAD(attribList + 4 | 0, 4, 0) | 0;
     EGL.contextAttributes.lowLatency = requestedPriority != 12547;
    } else if (param == 12344) {
     break;
    }
    attribList += 8;
   }
  }
  if ((!config || !config_size) && !numConfigs) {
   EGL.setErrorCode(12300);
   return 0;
  }
  if (numConfigs) {
   SAFE_HEAP_STORE(numConfigs | 0, 1 | 0, 4);
  }
  if (config && config_size > 0) {
   SAFE_HEAP_STORE(config | 0, 62002 | 0, 4);
  }
  EGL.setErrorCode(12288);
  return 1;
 }
};

function _eglBindAPI(api) {
 if (api == 12448) {
  EGL.setErrorCode(12288);
  return 1;
 } else {
  EGL.setErrorCode(12300);
  return 0;
 }
}

function _eglChooseConfig(display, attrib_list, configs, config_size, numConfigs) {
 return EGL.chooseConfig(display, attrib_list, configs, config_size, numConfigs);
}

function __webgl_enable_ANGLE_instanced_arrays(ctx) {
 var ext = ctx.getExtension("ANGLE_instanced_arrays");
 if (ext) {
  ctx["vertexAttribDivisor"] = function(index, divisor) {
   ext["vertexAttribDivisorANGLE"](index, divisor);
  };
  ctx["drawArraysInstanced"] = function(mode, first, count, primcount) {
   ext["drawArraysInstancedANGLE"](mode, first, count, primcount);
  };
  ctx["drawElementsInstanced"] = function(mode, count, type, indices, primcount) {
   ext["drawElementsInstancedANGLE"](mode, count, type, indices, primcount);
  };
  return 1;
 }
}

function __webgl_enable_OES_vertex_array_object(ctx) {
 var ext = ctx.getExtension("OES_vertex_array_object");
 if (ext) {
  ctx["createVertexArray"] = function() {
   return ext["createVertexArrayOES"]();
  };
  ctx["deleteVertexArray"] = function(vao) {
   ext["deleteVertexArrayOES"](vao);
  };
  ctx["bindVertexArray"] = function(vao) {
   ext["bindVertexArrayOES"](vao);
  };
  ctx["isVertexArray"] = function(vao) {
   return ext["isVertexArrayOES"](vao);
  };
  return 1;
 }
}

function __webgl_enable_WEBGL_draw_buffers(ctx) {
 var ext = ctx.getExtension("WEBGL_draw_buffers");
 if (ext) {
  ctx["drawBuffers"] = function(n, bufs) {
   ext["drawBuffersWEBGL"](n, bufs);
  };
  return 1;
 }
}

function __webgl_enable_WEBGL_multi_draw(ctx) {
 return !!(ctx.multiDrawWebgl = ctx.getExtension("WEBGL_multi_draw"));
}

var GL = {
 counter: 1,
 buffers: [],
 programs: [],
 framebuffers: [],
 renderbuffers: [],
 textures: [],
 shaders: [],
 vaos: [],
 contexts: [],
 offscreenCanvases: {},
 queries: [],
 stringCache: {},
 unpackAlignment: 4,
 recordError: function recordError(errorCode) {
  if (!GL.lastError) {
   GL.lastError = errorCode;
  }
 },
 getNewId: function(table) {
  var ret = GL.counter++;
  for (var i = table.length; i < ret; i++) {
   table[i] = null;
  }
  return ret;
 },
 getSource: function(shader, count, string, length) {
  var source = "";
  for (var i = 0; i < count; ++i) {
   var len = length ? SAFE_HEAP_LOAD(length + i * 4 | 0, 4, 0) | 0 : -1;
   source += UTF8ToString(SAFE_HEAP_LOAD(string + i * 4 | 0, 4, 0) | 0, len < 0 ? undefined : len);
  }
  return source;
 },
 createContext: function(canvas, webGLContextAttributes) {
  if (!canvas.getContextSafariWebGL2Fixed) {
   canvas.getContextSafariWebGL2Fixed = canvas.getContext;
   canvas.getContext = function(ver, attrs) {
    var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
    return ver == "webgl" == gl instanceof WebGLRenderingContext ? gl : null;
   };
  }
  var ctx = canvas.getContext("webgl", webGLContextAttributes);
  if (!ctx) return 0;
  var handle = GL.registerContext(ctx, webGLContextAttributes);
  return handle;
 },
 registerContext: function(ctx, webGLContextAttributes) {
  var handle = GL.getNewId(GL.contexts);
  var context = {
   handle: handle,
   attributes: webGLContextAttributes,
   version: webGLContextAttributes.majorVersion,
   GLctx: ctx
  };
  if (ctx.canvas) ctx.canvas.GLctxObject = context;
  GL.contexts[handle] = context;
  if (typeof webGLContextAttributes.enableExtensionsByDefault === "undefined" || webGLContextAttributes.enableExtensionsByDefault) {
   GL.initExtensions(context);
  }
  return handle;
 },
 makeContextCurrent: function(contextHandle) {
  GL.currentContext = GL.contexts[contextHandle];
  Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx;
  return !(contextHandle && !GLctx);
 },
 getContext: function(contextHandle) {
  return GL.contexts[contextHandle];
 },
 deleteContext: function(contextHandle) {
  if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
  if (typeof JSEvents === "object") JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas);
  if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined;
  GL.contexts[contextHandle] = null;
 },
 initExtensions: function(context) {
  if (!context) context = GL.currentContext;
  if (context.initExtensionsDone) return;
  context.initExtensionsDone = true;
  var GLctx = context.GLctx;
  __webgl_enable_ANGLE_instanced_arrays(GLctx);
  __webgl_enable_OES_vertex_array_object(GLctx);
  __webgl_enable_WEBGL_draw_buffers(GLctx);
  {
   GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
  }
  __webgl_enable_WEBGL_multi_draw(GLctx);
  var exts = GLctx.getSupportedExtensions() || [];
  exts.forEach(function(ext) {
   if (ext.indexOf("lose_context") < 0 && ext.indexOf("debug") < 0) {
    GLctx.getExtension(ext);
   }
  });
 }
};

function _eglCreateContext(display, config, hmm, contextAttribs) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 var glesContextVersion = 1;
 for (;;) {
  var param = SAFE_HEAP_LOAD(contextAttribs | 0, 4, 0) | 0;
  if (param == 12440) {
   glesContextVersion = SAFE_HEAP_LOAD(contextAttribs + 4 | 0, 4, 0) | 0;
  } else if (param == 12344) {
   break;
  } else {
   EGL.setErrorCode(12292);
   return 0;
  }
  contextAttribs += 8;
 }
 if (glesContextVersion != 2) {
  EGL.setErrorCode(12293);
  return 0;
 }
 EGL.contextAttributes.majorVersion = glesContextVersion - 1;
 EGL.contextAttributes.minorVersion = 0;
 EGL.context = GL.createContext(Module["canvas"], EGL.contextAttributes);
 if (EGL.context != 0) {
  EGL.setErrorCode(12288);
  GL.makeContextCurrent(EGL.context);
  Module.useWebGL = true;
  Browser.moduleContextCreatedCallbacks.forEach(function(callback) {
   callback();
  });
  GL.makeContextCurrent(null);
  return 62004;
 } else {
  EGL.setErrorCode(12297);
  return 0;
 }
}

function _eglCreateWindowSurface(display, config, win, attrib_list) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (config != 62002) {
  EGL.setErrorCode(12293);
  return 0;
 }
 EGL.setErrorCode(12288);
 return 62006;
}

function _eglDestroyContext(display, context) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (context != 62004) {
  EGL.setErrorCode(12294);
  return 0;
 }
 GL.deleteContext(EGL.context);
 EGL.setErrorCode(12288);
 if (EGL.currentContext == context) {
  EGL.currentContext = 0;
 }
 return 1;
}

function _eglDestroySurface(display, surface) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (surface != 62006) {
  EGL.setErrorCode(12301);
  return 1;
 }
 if (EGL.currentReadSurface == surface) {
  EGL.currentReadSurface = 0;
 }
 if (EGL.currentDrawSurface == surface) {
  EGL.currentDrawSurface = 0;
 }
 EGL.setErrorCode(12288);
 return 1;
}

function _eglGetConfigAttrib(display, config, attribute, value) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (config != 62002) {
  EGL.setErrorCode(12293);
  return 0;
 }
 if (!value) {
  EGL.setErrorCode(12300);
  return 0;
 }
 EGL.setErrorCode(12288);
 switch (attribute) {
 case 12320:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.alpha ? 32 : 24) | 0, 4);
  return 1;

 case 12321:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.alpha ? 8 : 0) | 0, 4);
  return 1;

 case 12322:
  SAFE_HEAP_STORE(value | 0, 8 | 0, 4);
  return 1;

 case 12323:
  SAFE_HEAP_STORE(value | 0, 8 | 0, 4);
  return 1;

 case 12324:
  SAFE_HEAP_STORE(value | 0, 8 | 0, 4);
  return 1;

 case 12325:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.depth ? 24 : 0) | 0, 4);
  return 1;

 case 12326:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.stencil ? 8 : 0) | 0, 4);
  return 1;

 case 12327:
  SAFE_HEAP_STORE(value | 0, 12344 | 0, 4);
  return 1;

 case 12328:
  SAFE_HEAP_STORE(value | 0, 62002 | 0, 4);
  return 1;

 case 12329:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12330:
  SAFE_HEAP_STORE(value | 0, 4096 | 0, 4);
  return 1;

 case 12331:
  SAFE_HEAP_STORE(value | 0, 16777216 | 0, 4);
  return 1;

 case 12332:
  SAFE_HEAP_STORE(value | 0, 4096 | 0, 4);
  return 1;

 case 12333:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12334:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12335:
  SAFE_HEAP_STORE(value | 0, 12344 | 0, 4);
  return 1;

 case 12337:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.antialias ? 4 : 0) | 0, 4);
  return 1;

 case 12338:
  SAFE_HEAP_STORE(value | 0, (EGL.contextAttributes.antialias ? 1 : 0) | 0, 4);
  return 1;

 case 12339:
  SAFE_HEAP_STORE(value | 0, 4 | 0, 4);
  return 1;

 case 12340:
  SAFE_HEAP_STORE(value | 0, 12344 | 0, 4);
  return 1;

 case 12341:
 case 12342:
 case 12343:
  SAFE_HEAP_STORE(value | 0, -1 | 0, 4);
  return 1;

 case 12345:
 case 12346:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12347:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12348:
  SAFE_HEAP_STORE(value | 0, 1 | 0, 4);
  return 1;

 case 12349:
 case 12350:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 case 12351:
  SAFE_HEAP_STORE(value | 0, 12430 | 0, 4);
  return 1;

 case 12352:
  SAFE_HEAP_STORE(value | 0, 4 | 0, 4);
  return 1;

 case 12354:
  SAFE_HEAP_STORE(value | 0, 0 | 0, 4);
  return 1;

 default:
  EGL.setErrorCode(12292);
  return 0;
 }
}

function _eglGetDisplay(nativeDisplayType) {
 EGL.setErrorCode(12288);
 return 62e3;
}

function _eglGetError() {
 return EGL.errorCode;
}

function _eglInitialize(display, majorVersion, minorVersion) {
 if (display == 62e3) {
  if (majorVersion) {
   SAFE_HEAP_STORE(majorVersion | 0, 1 | 0, 4);
  }
  if (minorVersion) {
   SAFE_HEAP_STORE(minorVersion | 0, 4 | 0, 4);
  }
  EGL.defaultDisplayInitialized = true;
  EGL.setErrorCode(12288);
  return 1;
 } else {
  EGL.setErrorCode(12296);
  return 0;
 }
}

function _eglMakeCurrent(display, draw, read, context) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (context != 0 && context != 62004) {
  EGL.setErrorCode(12294);
  return 0;
 }
 if (read != 0 && read != 62006 || draw != 0 && draw != 62006) {
  EGL.setErrorCode(12301);
  return 0;
 }
 GL.makeContextCurrent(context ? EGL.context : null);
 EGL.currentContext = context;
 EGL.currentDrawSurface = draw;
 EGL.currentReadSurface = read;
 EGL.setErrorCode(12288);
 return 1;
}

function _eglQueryString(display, name) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 EGL.setErrorCode(12288);
 if (EGL.stringCache[name]) return EGL.stringCache[name];
 var ret;
 switch (name) {
 case 12371:
  ret = allocateUTF8("Emscripten");
  break;

 case 12372:
  ret = allocateUTF8("1.4 Emscripten EGL");
  break;

 case 12373:
  ret = allocateUTF8("");
  break;

 case 12429:
  ret = allocateUTF8("OpenGL_ES");
  break;

 default:
  EGL.setErrorCode(12300);
  return 0;
 }
 EGL.stringCache[name] = ret;
 return ret;
}

function _eglSwapBuffers() {
 if (!EGL.defaultDisplayInitialized) {
  EGL.setErrorCode(12289);
 } else if (!Module.ctx) {
  EGL.setErrorCode(12290);
 } else if (Module.ctx.isContextLost()) {
  EGL.setErrorCode(12302);
 } else {
  EGL.setErrorCode(12288);
  return 1;
 }
 return 0;
}

function _eglSwapInterval(display, interval) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 if (interval == 0) _emscripten_set_main_loop_timing(0, 0); else _emscripten_set_main_loop_timing(1, interval);
 EGL.setErrorCode(12288);
 return 1;
}

function _eglTerminate(display) {
 if (display != 62e3) {
  EGL.setErrorCode(12296);
  return 0;
 }
 EGL.currentContext = 0;
 EGL.currentReadSurface = 0;
 EGL.currentDrawSurface = 0;
 EGL.defaultDisplayInitialized = false;
 EGL.setErrorCode(12288);
 return 1;
}

function _eglWaitClient() {
 EGL.setErrorCode(12288);
 return 1;
}

function _eglWaitGL() {
 return _eglWaitClient();
}

function _eglWaitNative(nativeEngineId) {
 EGL.setErrorCode(12288);
 return 1;
}

var readAsmConstArgsArray = [];

function readAsmConstArgs(sigPtr, buf) {
 readAsmConstArgsArray.length = 0;
 var ch;
 buf >>= 2;
 while (ch = SAFE_HEAP_LOAD(sigPtr++, 1, 1)) {
  var double = ch < 105;
  if (double && buf & 1) buf++;
  readAsmConstArgsArray.push(double ? SAFE_HEAP_LOAD_D((buf++ >> 1) * 8, 8, 0) : SAFE_HEAP_LOAD(buf * 4, 4, 0));
  ++buf;
 }
 return readAsmConstArgsArray;
}

function _emscripten_asm_const_int(code, sigPtr, argbuf) {
 var args = readAsmConstArgs(sigPtr, argbuf);
 return ASM_CONSTS[code].apply(null, args);
}

function _emscripten_cancel_main_loop() {
 Browser.mainLoop.pause();
 Browser.mainLoop.func = null;
}

var JSEvents = {
 inEventHandler: 0,
 removeAllEventListeners: function() {
  for (var i = JSEvents.eventHandlers.length - 1; i >= 0; --i) {
   JSEvents._removeHandler(i);
  }
  JSEvents.eventHandlers = [];
  JSEvents.deferredCalls = [];
 },
 registerRemoveEventListeners: function() {
  if (!JSEvents.removeEventListenersRegistered) {
   __ATEXIT__.push(JSEvents.removeAllEventListeners);
   JSEvents.removeEventListenersRegistered = true;
  }
 },
 deferredCalls: [],
 deferCall: function(targetFunction, precedence, argsList) {
  function arraysHaveEqualContent(arrA, arrB) {
   if (arrA.length != arrB.length) return false;
   for (var i in arrA) {
    if (arrA[i] != arrB[i]) return false;
   }
   return true;
  }
  for (var i in JSEvents.deferredCalls) {
   var call = JSEvents.deferredCalls[i];
   if (call.targetFunction == targetFunction && arraysHaveEqualContent(call.argsList, argsList)) {
    return;
   }
  }
  JSEvents.deferredCalls.push({
   targetFunction: targetFunction,
   precedence: precedence,
   argsList: argsList
  });
  JSEvents.deferredCalls.sort(function(x, y) {
   return x.precedence < y.precedence;
  });
 },
 removeDeferredCalls: function(targetFunction) {
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   if (JSEvents.deferredCalls[i].targetFunction == targetFunction) {
    JSEvents.deferredCalls.splice(i, 1);
    --i;
   }
  }
 },
 canPerformEventHandlerRequests: function() {
  return JSEvents.inEventHandler && JSEvents.currentEventHandler.allowsDeferredCalls;
 },
 runDeferredCalls: function() {
  if (!JSEvents.canPerformEventHandlerRequests()) {
   return;
  }
  for (var i = 0; i < JSEvents.deferredCalls.length; ++i) {
   var call = JSEvents.deferredCalls[i];
   JSEvents.deferredCalls.splice(i, 1);
   --i;
   call.targetFunction.apply(null, call.argsList);
  }
 },
 eventHandlers: [],
 removeAllHandlersOnTarget: function(target, eventTypeString) {
  for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
   if (JSEvents.eventHandlers[i].target == target && (!eventTypeString || eventTypeString == JSEvents.eventHandlers[i].eventTypeString)) {
    JSEvents._removeHandler(i--);
   }
  }
 },
 _removeHandler: function(i) {
  var h = JSEvents.eventHandlers[i];
  h.target.removeEventListener(h.eventTypeString, h.eventListenerFunc, h.useCapture);
  JSEvents.eventHandlers.splice(i, 1);
 },
 registerOrRemoveHandler: function(eventHandler) {
  var jsEventHandler = function jsEventHandler(event) {
   ++JSEvents.inEventHandler;
   JSEvents.currentEventHandler = eventHandler;
   JSEvents.runDeferredCalls();
   eventHandler.handlerFunc(event);
   JSEvents.runDeferredCalls();
   --JSEvents.inEventHandler;
  };
  if (eventHandler.callbackfunc) {
   eventHandler.eventListenerFunc = jsEventHandler;
   eventHandler.target.addEventListener(eventHandler.eventTypeString, jsEventHandler, eventHandler.useCapture);
   JSEvents.eventHandlers.push(eventHandler);
   JSEvents.registerRemoveEventListeners();
  } else {
   for (var i = 0; i < JSEvents.eventHandlers.length; ++i) {
    if (JSEvents.eventHandlers[i].target == eventHandler.target && JSEvents.eventHandlers[i].eventTypeString == eventHandler.eventTypeString) {
     JSEvents._removeHandler(i--);
    }
   }
  }
 },
 getNodeNameForTarget: function(target) {
  if (!target) return "";
  if (target == window) return "#window";
  if (target == screen) return "#screen";
  return target && target.nodeName ? target.nodeName : "";
 },
 fullscreenEnabled: function() {
  return document.fullscreenEnabled || document.webkitFullscreenEnabled;
 }
};

var currentFullscreenStrategy = {};

function maybeCStringToJsString(cString) {
 return cString > 2 ? UTF8ToString(cString) : cString;
}

var specialHTMLTargets = [ 0, typeof document !== "undefined" ? document : 0, typeof window !== "undefined" ? window : 0 ];

function findEventTarget(target) {
 target = maybeCStringToJsString(target);
 var domElement = specialHTMLTargets[target] || (typeof document !== "undefined" ? document.querySelector(target) : undefined);
 return domElement;
}

function findCanvasEventTarget(target) {
 return findEventTarget(target);
}

function _emscripten_get_canvas_element_size(target, width, height) {
 var canvas = findCanvasEventTarget(target);
 if (!canvas) return -4;
 SAFE_HEAP_STORE(width | 0, canvas.width | 0, 4);
 SAFE_HEAP_STORE(height | 0, canvas.height | 0, 4);
}

function getCanvasElementSize(target) {
 var stackTop = stackSave();
 var w = stackAlloc(8);
 var h = w + 4;
 var targetInt = stackAlloc(target.id.length + 1);
 stringToUTF8(target.id, targetInt, target.id.length + 1);
 var ret = _emscripten_get_canvas_element_size(targetInt, w, h);
 var size = [ SAFE_HEAP_LOAD(w | 0, 4, 0) | 0, SAFE_HEAP_LOAD(h | 0, 4, 0) | 0 ];
 stackRestore(stackTop);
 return size;
}

function _emscripten_set_canvas_element_size(target, width, height) {
 var canvas = findCanvasEventTarget(target);
 if (!canvas) return -4;
 canvas.width = width;
 canvas.height = height;
 return 0;
}

function setCanvasElementSize(target, width, height) {
 if (!target.controlTransferredOffscreen) {
  target.width = width;
  target.height = height;
 } else {
  var stackTop = stackSave();
  var targetInt = stackAlloc(target.id.length + 1);
  stringToUTF8(target.id, targetInt, target.id.length + 1);
  _emscripten_set_canvas_element_size(targetInt, width, height);
  stackRestore(stackTop);
 }
}

function registerRestoreOldStyle(canvas) {
 var canvasSize = getCanvasElementSize(canvas);
 var oldWidth = canvasSize[0];
 var oldHeight = canvasSize[1];
 var oldCssWidth = canvas.style.width;
 var oldCssHeight = canvas.style.height;
 var oldBackgroundColor = canvas.style.backgroundColor;
 var oldDocumentBackgroundColor = document.body.style.backgroundColor;
 var oldPaddingLeft = canvas.style.paddingLeft;
 var oldPaddingRight = canvas.style.paddingRight;
 var oldPaddingTop = canvas.style.paddingTop;
 var oldPaddingBottom = canvas.style.paddingBottom;
 var oldMarginLeft = canvas.style.marginLeft;
 var oldMarginRight = canvas.style.marginRight;
 var oldMarginTop = canvas.style.marginTop;
 var oldMarginBottom = canvas.style.marginBottom;
 var oldDocumentBodyMargin = document.body.style.margin;
 var oldDocumentOverflow = document.documentElement.style.overflow;
 var oldDocumentScroll = document.body.scroll;
 var oldImageRendering = canvas.style.imageRendering;
 function restoreOldStyle() {
  var fullscreenElement = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  if (!fullscreenElement) {
   document.removeEventListener("fullscreenchange", restoreOldStyle);
   document.removeEventListener("webkitfullscreenchange", restoreOldStyle);
   setCanvasElementSize(canvas, oldWidth, oldHeight);
   canvas.style.width = oldCssWidth;
   canvas.style.height = oldCssHeight;
   canvas.style.backgroundColor = oldBackgroundColor;
   if (!oldDocumentBackgroundColor) document.body.style.backgroundColor = "white";
   document.body.style.backgroundColor = oldDocumentBackgroundColor;
   canvas.style.paddingLeft = oldPaddingLeft;
   canvas.style.paddingRight = oldPaddingRight;
   canvas.style.paddingTop = oldPaddingTop;
   canvas.style.paddingBottom = oldPaddingBottom;
   canvas.style.marginLeft = oldMarginLeft;
   canvas.style.marginRight = oldMarginRight;
   canvas.style.marginTop = oldMarginTop;
   canvas.style.marginBottom = oldMarginBottom;
   document.body.style.margin = oldDocumentBodyMargin;
   document.documentElement.style.overflow = oldDocumentOverflow;
   document.body.scroll = oldDocumentScroll;
   canvas.style.imageRendering = oldImageRendering;
   if (canvas.GLctxObject) canvas.GLctxObject.GLctx.viewport(0, 0, oldWidth, oldHeight);
   if (currentFullscreenStrategy.canvasResizedCallback) {
    (function(a1, a2, a3) {
     return dynCall_iiii.apply(null, [ currentFullscreenStrategy.canvasResizedCallback, a1, a2, a3 ]);
    })(37, 0, currentFullscreenStrategy.canvasResizedCallbackUserData);
   }
  }
 }
 document.addEventListener("fullscreenchange", restoreOldStyle);
 document.addEventListener("webkitfullscreenchange", restoreOldStyle);
 return restoreOldStyle;
}

function setLetterbox(element, topBottom, leftRight) {
 element.style.paddingLeft = element.style.paddingRight = leftRight + "px";
 element.style.paddingTop = element.style.paddingBottom = topBottom + "px";
}

function getBoundingClientRect(e) {
 return specialHTMLTargets.indexOf(e) < 0 ? e.getBoundingClientRect() : {
  "left": 0,
  "top": 0
 };
}

function _JSEvents_resizeCanvasForFullscreen(target, strategy) {
 var restoreOldStyle = registerRestoreOldStyle(target);
 var cssWidth = strategy.softFullscreen ? innerWidth : screen.width;
 var cssHeight = strategy.softFullscreen ? innerHeight : screen.height;
 var rect = getBoundingClientRect(target);
 var windowedCssWidth = rect.width;
 var windowedCssHeight = rect.height;
 var canvasSize = getCanvasElementSize(target);
 var windowedRttWidth = canvasSize[0];
 var windowedRttHeight = canvasSize[1];
 if (strategy.scaleMode == 3) {
  setLetterbox(target, (cssHeight - windowedCssHeight) / 2, (cssWidth - windowedCssWidth) / 2);
  cssWidth = windowedCssWidth;
  cssHeight = windowedCssHeight;
 } else if (strategy.scaleMode == 2) {
  if (cssWidth * windowedRttHeight < windowedRttWidth * cssHeight) {
   var desiredCssHeight = windowedRttHeight * cssWidth / windowedRttWidth;
   setLetterbox(target, (cssHeight - desiredCssHeight) / 2, 0);
   cssHeight = desiredCssHeight;
  } else {
   var desiredCssWidth = windowedRttWidth * cssHeight / windowedRttHeight;
   setLetterbox(target, 0, (cssWidth - desiredCssWidth) / 2);
   cssWidth = desiredCssWidth;
  }
 }
 if (!target.style.backgroundColor) target.style.backgroundColor = "black";
 if (!document.body.style.backgroundColor) document.body.style.backgroundColor = "black";
 target.style.width = cssWidth + "px";
 target.style.height = cssHeight + "px";
 if (strategy.filteringMode == 1) {
  target.style.imageRendering = "optimizeSpeed";
  target.style.imageRendering = "-moz-crisp-edges";
  target.style.imageRendering = "-o-crisp-edges";
  target.style.imageRendering = "-webkit-optimize-contrast";
  target.style.imageRendering = "optimize-contrast";
  target.style.imageRendering = "crisp-edges";
  target.style.imageRendering = "pixelated";
 }
 var dpiScale = strategy.canvasResolutionScaleMode == 2 ? devicePixelRatio : 1;
 if (strategy.canvasResolutionScaleMode != 0) {
  var newWidth = cssWidth * dpiScale | 0;
  var newHeight = cssHeight * dpiScale | 0;
  setCanvasElementSize(target, newWidth, newHeight);
  if (target.GLctxObject) target.GLctxObject.GLctx.viewport(0, 0, newWidth, newHeight);
 }
 return restoreOldStyle;
}

function _JSEvents_requestFullscreen(target, strategy) {
 if (strategy.scaleMode != 0 || strategy.canvasResolutionScaleMode != 0) {
  _JSEvents_resizeCanvasForFullscreen(target, strategy);
 }
 if (target.requestFullscreen) {
  target.requestFullscreen();
 } else if (target.webkitRequestFullscreen) {
  target.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
 } else {
  return JSEvents.fullscreenEnabled() ? -3 : -1;
 }
 currentFullscreenStrategy = strategy;
 if (strategy.canvasResizedCallback) {
  (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ strategy.canvasResizedCallback, a1, a2, a3 ]);
  })(37, 0, strategy.canvasResizedCallbackUserData);
 }
 return 0;
}

function _emscripten_exit_fullscreen() {
 if (!JSEvents.fullscreenEnabled()) return -1;
 JSEvents.removeDeferredCalls(_JSEvents_requestFullscreen);
 var d = specialHTMLTargets[1];
 if (d.exitFullscreen) {
  d.fullscreenElement && d.exitFullscreen();
 } else if (d.webkitExitFullscreen) {
  d.webkitFullscreenElement && d.webkitExitFullscreen();
 } else {
  return -1;
 }
 return 0;
}

function requestPointerLock(target) {
 if (target.requestPointerLock) {
  target.requestPointerLock();
 } else if (target.msRequestPointerLock) {
  target.msRequestPointerLock();
 } else {
  if (document.body.requestPointerLock || document.body.msRequestPointerLock) {
   return -3;
  } else {
   return -1;
  }
 }
 return 0;
}

function _emscripten_exit_pointerlock() {
 JSEvents.removeDeferredCalls(requestPointerLock);
 if (document.exitPointerLock) {
  document.exitPointerLock();
 } else if (document.msExitPointerLock) {
  document.msExitPointerLock();
 } else {
  return -1;
 }
 return 0;
}

function _emscripten_force_exit(status) {
 noExitRuntime = false;
 runtimeKeepaliveCounter = 0;
 exit(status);
}

function _emscripten_get_device_pixel_ratio() {
 return typeof devicePixelRatio === "number" && devicePixelRatio || 1;
}

function _emscripten_get_element_css_size(target, width, height) {
 target = findEventTarget(target);
 if (!target) return -4;
 var rect = getBoundingClientRect(target);
 SAFE_HEAP_STORE_D(width | 0, +rect.width, 8);
 SAFE_HEAP_STORE_D(height | 0, +rect.height, 8);
 return 0;
}

function fillFullscreenChangeEventData(eventStruct) {
 var fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
 var isFullscreen = !!fullscreenElement;
 SAFE_HEAP_STORE(eventStruct | 0, isFullscreen | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 4 | 0, JSEvents.fullscreenEnabled() | 0, 4);
 var reportedElement = isFullscreen ? fullscreenElement : JSEvents.previousFullscreenElement;
 var nodeName = JSEvents.getNodeNameForTarget(reportedElement);
 var id = reportedElement && reportedElement.id ? reportedElement.id : "";
 stringToUTF8(nodeName, eventStruct + 8, 128);
 stringToUTF8(id, eventStruct + 136, 128);
 SAFE_HEAP_STORE(eventStruct + 264 | 0, (reportedElement ? reportedElement.clientWidth : 0) | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 268 | 0, (reportedElement ? reportedElement.clientHeight : 0) | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 272 | 0, screen.width | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 276 | 0, screen.height | 0, 4);
 if (isFullscreen) {
  JSEvents.previousFullscreenElement = fullscreenElement;
 }
}

function _emscripten_get_fullscreen_status(fullscreenStatus) {
 if (!JSEvents.fullscreenEnabled()) return -1;
 fillFullscreenChangeEventData(fullscreenStatus);
 return 0;
}

function fillGamepadEventData(eventStruct, e) {
 SAFE_HEAP_STORE_D(eventStruct | 0, +e.timestamp, 8);
 for (var i = 0; i < e.axes.length; ++i) {
  SAFE_HEAP_STORE_D(eventStruct + i * 8 + 16 | 0, +e.axes[i], 8);
 }
 for (var i = 0; i < e.buttons.length; ++i) {
  if (typeof e.buttons[i] === "object") {
   SAFE_HEAP_STORE_D(eventStruct + i * 8 + 528 | 0, +e.buttons[i].value, 8);
  } else {
   SAFE_HEAP_STORE_D(eventStruct + i * 8 + 528 | 0, +e.buttons[i], 8);
  }
 }
 for (var i = 0; i < e.buttons.length; ++i) {
  if (typeof e.buttons[i] === "object") {
   SAFE_HEAP_STORE(eventStruct + i * 4 + 1040 | 0, e.buttons[i].pressed | 0, 4);
  } else {
   SAFE_HEAP_STORE(eventStruct + i * 4 + 1040 | 0, e.buttons[i] == 1 | 0, 4);
  }
 }
 SAFE_HEAP_STORE(eventStruct + 1296 | 0, e.connected | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 1300 | 0, e.index | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 8 | 0, e.axes.length | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 12 | 0, e.buttons.length | 0, 4);
 stringToUTF8(e.id, eventStruct + 1304, 64);
 stringToUTF8(e.mapping, eventStruct + 1368, 64);
}

function _emscripten_get_gamepad_status(index, gamepadState) {
 if (index < 0 || index >= JSEvents.lastGamepadState.length) return -5;
 if (!JSEvents.lastGamepadState[index]) return -7;
 fillGamepadEventData(gamepadState, JSEvents.lastGamepadState[index]);
 return 0;
}

function _emscripten_get_num_gamepads() {
 return JSEvents.lastGamepadState.length;
}

function _emscripten_glActiveTexture(x0) {
 GLctx["activeTexture"](x0);
}

function _emscripten_glAttachShader(program, shader) {
 GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
}

function _emscripten_glBeginQueryEXT(target, id) {
 GLctx.disjointTimerQueryExt["beginQueryEXT"](target, GL.queries[id]);
}

function _emscripten_glBindAttribLocation(program, index, name) {
 GLctx.bindAttribLocation(GL.programs[program], index, UTF8ToString(name));
}

function _emscripten_glBindBuffer(target, buffer) {
 GLctx.bindBuffer(target, GL.buffers[buffer]);
}

function _emscripten_glBindFramebuffer(target, framebuffer) {
 GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);
}

function _emscripten_glBindRenderbuffer(target, renderbuffer) {
 GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
}

function _emscripten_glBindTexture(target, texture) {
 GLctx.bindTexture(target, GL.textures[texture]);
}

function _emscripten_glBindVertexArrayOES(vao) {
 GLctx["bindVertexArray"](GL.vaos[vao]);
}

function _emscripten_glBlendColor(x0, x1, x2, x3) {
 GLctx["blendColor"](x0, x1, x2, x3);
}

function _emscripten_glBlendEquation(x0) {
 GLctx["blendEquation"](x0);
}

function _emscripten_glBlendEquationSeparate(x0, x1) {
 GLctx["blendEquationSeparate"](x0, x1);
}

function _emscripten_glBlendFunc(x0, x1) {
 GLctx["blendFunc"](x0, x1);
}

function _emscripten_glBlendFuncSeparate(x0, x1, x2, x3) {
 GLctx["blendFuncSeparate"](x0, x1, x2, x3);
}

function _emscripten_glBufferData(target, size, data, usage) {
 GLctx.bufferData(target, data ? HEAPU8.subarray(data, data + size) : size, usage);
}

function _emscripten_glBufferSubData(target, offset, size, data) {
 GLctx.bufferSubData(target, offset, HEAPU8.subarray(data, data + size));
}

function _emscripten_glCheckFramebufferStatus(x0) {
 return GLctx["checkFramebufferStatus"](x0);
}

function _emscripten_glClear(x0) {
 GLctx["clear"](x0);
}

function _emscripten_glClearColor(x0, x1, x2, x3) {
 GLctx["clearColor"](x0, x1, x2, x3);
}

function _emscripten_glClearDepthf(x0) {
 GLctx["clearDepth"](x0);
}

function _emscripten_glClearStencil(x0) {
 GLctx["clearStencil"](x0);
}

function _emscripten_glColorMask(red, green, blue, alpha) {
 GLctx.colorMask(!!red, !!green, !!blue, !!alpha);
}

function _emscripten_glCompileShader(shader) {
 GLctx.compileShader(GL.shaders[shader]);
}

function _emscripten_glCompressedTexImage2D(target, level, internalFormat, width, height, border, imageSize, data) {
 GLctx["compressedTexImage2D"](target, level, internalFormat, width, height, border, data ? HEAPU8.subarray(data, data + imageSize) : null);
}

function _emscripten_glCompressedTexSubImage2D(target, level, xoffset, yoffset, width, height, format, imageSize, data) {
 GLctx["compressedTexSubImage2D"](target, level, xoffset, yoffset, width, height, format, data ? HEAPU8.subarray(data, data + imageSize) : null);
}

function _emscripten_glCopyTexImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
 GLctx["copyTexImage2D"](x0, x1, x2, x3, x4, x5, x6, x7);
}

function _emscripten_glCopyTexSubImage2D(x0, x1, x2, x3, x4, x5, x6, x7) {
 GLctx["copyTexSubImage2D"](x0, x1, x2, x3, x4, x5, x6, x7);
}

function _emscripten_glCreateProgram() {
 var id = GL.getNewId(GL.programs);
 var program = GLctx.createProgram();
 program.name = id;
 program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
 program.uniformIdCounter = 1;
 GL.programs[id] = program;
 return id;
}

function _emscripten_glCreateShader(shaderType) {
 var id = GL.getNewId(GL.shaders);
 GL.shaders[id] = GLctx.createShader(shaderType);
 return id;
}

function _emscripten_glCullFace(x0) {
 GLctx["cullFace"](x0);
}

function _emscripten_glDeleteBuffers(n, buffers) {
 for (var i = 0; i < n; i++) {
  var id = SAFE_HEAP_LOAD(buffers + i * 4 | 0, 4, 0) | 0;
  var buffer = GL.buffers[id];
  if (!buffer) continue;
  GLctx.deleteBuffer(buffer);
  buffer.name = 0;
  GL.buffers[id] = null;
 }
}

function _emscripten_glDeleteFramebuffers(n, framebuffers) {
 for (var i = 0; i < n; ++i) {
  var id = SAFE_HEAP_LOAD(framebuffers + i * 4 | 0, 4, 0) | 0;
  var framebuffer = GL.framebuffers[id];
  if (!framebuffer) continue;
  GLctx.deleteFramebuffer(framebuffer);
  framebuffer.name = 0;
  GL.framebuffers[id] = null;
 }
}

function _emscripten_glDeleteProgram(id) {
 if (!id) return;
 var program = GL.programs[id];
 if (!program) {
  GL.recordError(1281);
  return;
 }
 GLctx.deleteProgram(program);
 program.name = 0;
 GL.programs[id] = null;
}

function _emscripten_glDeleteQueriesEXT(n, ids) {
 for (var i = 0; i < n; i++) {
  var id = SAFE_HEAP_LOAD(ids + i * 4 | 0, 4, 0) | 0;
  var query = GL.queries[id];
  if (!query) continue;
  GLctx.disjointTimerQueryExt["deleteQueryEXT"](query);
  GL.queries[id] = null;
 }
}

function _emscripten_glDeleteRenderbuffers(n, renderbuffers) {
 for (var i = 0; i < n; i++) {
  var id = SAFE_HEAP_LOAD(renderbuffers + i * 4 | 0, 4, 0) | 0;
  var renderbuffer = GL.renderbuffers[id];
  if (!renderbuffer) continue;
  GLctx.deleteRenderbuffer(renderbuffer);
  renderbuffer.name = 0;
  GL.renderbuffers[id] = null;
 }
}

function _emscripten_glDeleteShader(id) {
 if (!id) return;
 var shader = GL.shaders[id];
 if (!shader) {
  GL.recordError(1281);
  return;
 }
 GLctx.deleteShader(shader);
 GL.shaders[id] = null;
}

function _emscripten_glDeleteTextures(n, textures) {
 for (var i = 0; i < n; i++) {
  var id = SAFE_HEAP_LOAD(textures + i * 4 | 0, 4, 0) | 0;
  var texture = GL.textures[id];
  if (!texture) continue;
  GLctx.deleteTexture(texture);
  texture.name = 0;
  GL.textures[id] = null;
 }
}

function _emscripten_glDeleteVertexArraysOES(n, vaos) {
 for (var i = 0; i < n; i++) {
  var id = SAFE_HEAP_LOAD(vaos + i * 4 | 0, 4, 0) | 0;
  GLctx["deleteVertexArray"](GL.vaos[id]);
  GL.vaos[id] = null;
 }
}

function _emscripten_glDepthFunc(x0) {
 GLctx["depthFunc"](x0);
}

function _emscripten_glDepthMask(flag) {
 GLctx.depthMask(!!flag);
}

function _emscripten_glDepthRangef(x0, x1) {
 GLctx["depthRange"](x0, x1);
}

function _emscripten_glDetachShader(program, shader) {
 GLctx.detachShader(GL.programs[program], GL.shaders[shader]);
}

function _emscripten_glDisable(x0) {
 GLctx["disable"](x0);
}

function _emscripten_glDisableVertexAttribArray(index) {
 GLctx.disableVertexAttribArray(index);
}

function _emscripten_glDrawArrays(mode, first, count) {
 GLctx.drawArrays(mode, first, count);
}

function _emscripten_glDrawArraysInstancedANGLE(mode, first, count, primcount) {
 GLctx["drawArraysInstanced"](mode, first, count, primcount);
}

var tempFixedLengthArray = [];

function _emscripten_glDrawBuffersWEBGL(n, bufs) {
 var bufArray = tempFixedLengthArray[n];
 for (var i = 0; i < n; i++) {
  bufArray[i] = SAFE_HEAP_LOAD(bufs + i * 4 | 0, 4, 0) | 0;
 }
 GLctx["drawBuffers"](bufArray);
}

function _emscripten_glDrawElements(mode, count, type, indices) {
 GLctx.drawElements(mode, count, type, indices);
}

function _emscripten_glDrawElementsInstancedANGLE(mode, count, type, indices, primcount) {
 GLctx["drawElementsInstanced"](mode, count, type, indices, primcount);
}

function _emscripten_glEnable(x0) {
 GLctx["enable"](x0);
}

function _emscripten_glEnableVertexAttribArray(index) {
 GLctx.enableVertexAttribArray(index);
}

function _emscripten_glEndQueryEXT(target) {
 GLctx.disjointTimerQueryExt["endQueryEXT"](target);
}

function _emscripten_glFinish() {
 GLctx["finish"]();
}

function _emscripten_glFlush() {
 GLctx["flush"]();
}

function _emscripten_glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
 GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget, GL.renderbuffers[renderbuffer]);
}

function _emscripten_glFramebufferTexture2D(target, attachment, textarget, texture, level) {
 GLctx.framebufferTexture2D(target, attachment, textarget, GL.textures[texture], level);
}

function _emscripten_glFrontFace(x0) {
 GLctx["frontFace"](x0);
}

function __glGenObject(n, buffers, createFunction, objectTable) {
 for (var i = 0; i < n; i++) {
  var buffer = GLctx[createFunction]();
  var id = buffer && GL.getNewId(objectTable);
  if (buffer) {
   buffer.name = id;
   objectTable[id] = buffer;
  } else {
   GL.recordError(1282);
  }
  SAFE_HEAP_STORE(buffers + i * 4 | 0, id | 0, 4);
 }
}

function _emscripten_glGenBuffers(n, buffers) {
 __glGenObject(n, buffers, "createBuffer", GL.buffers);
}

function _emscripten_glGenFramebuffers(n, ids) {
 __glGenObject(n, ids, "createFramebuffer", GL.framebuffers);
}

function _emscripten_glGenQueriesEXT(n, ids) {
 for (var i = 0; i < n; i++) {
  var query = GLctx.disjointTimerQueryExt["createQueryEXT"]();
  if (!query) {
   GL.recordError(1282);
   while (i < n) SAFE_HEAP_STORE(ids + i++ * 4 | 0, 0 | 0, 4);
   return;
  }
  var id = GL.getNewId(GL.queries);
  query.name = id;
  GL.queries[id] = query;
  SAFE_HEAP_STORE(ids + i * 4 | 0, id | 0, 4);
 }
}

function _emscripten_glGenRenderbuffers(n, renderbuffers) {
 __glGenObject(n, renderbuffers, "createRenderbuffer", GL.renderbuffers);
}

function _emscripten_glGenTextures(n, textures) {
 __glGenObject(n, textures, "createTexture", GL.textures);
}

function _emscripten_glGenVertexArraysOES(n, arrays) {
 __glGenObject(n, arrays, "createVertexArray", GL.vaos);
}

function _emscripten_glGenerateMipmap(x0) {
 GLctx["generateMipmap"](x0);
}

function __glGetActiveAttribOrUniform(funcName, program, index, bufSize, length, size, type, name) {
 program = GL.programs[program];
 var info = GLctx[funcName](program, index);
 if (info) {
  var numBytesWrittenExclNull = name && stringToUTF8(info.name, name, bufSize);
  if (length) SAFE_HEAP_STORE(length | 0, numBytesWrittenExclNull | 0, 4);
  if (size) SAFE_HEAP_STORE(size | 0, info.size | 0, 4);
  if (type) SAFE_HEAP_STORE(type | 0, info.type | 0, 4);
 }
}

function _emscripten_glGetActiveAttrib(program, index, bufSize, length, size, type, name) {
 __glGetActiveAttribOrUniform("getActiveAttrib", program, index, bufSize, length, size, type, name);
}

function _emscripten_glGetActiveUniform(program, index, bufSize, length, size, type, name) {
 __glGetActiveAttribOrUniform("getActiveUniform", program, index, bufSize, length, size, type, name);
}

function _emscripten_glGetAttachedShaders(program, maxCount, count, shaders) {
 var result = GLctx.getAttachedShaders(GL.programs[program]);
 var len = result.length;
 if (len > maxCount) {
  len = maxCount;
 }
 SAFE_HEAP_STORE(count | 0, len | 0, 4);
 for (var i = 0; i < len; ++i) {
  var id = GL.shaders.indexOf(result[i]);
  SAFE_HEAP_STORE(shaders + i * 4 | 0, id | 0, 4);
 }
}

function _emscripten_glGetAttribLocation(program, name) {
 return GLctx.getAttribLocation(GL.programs[program], UTF8ToString(name));
}

function writeI53ToI64(ptr, num) {
 SAFE_HEAP_STORE((ptr >> 2) * 4, num, 4);
 SAFE_HEAP_STORE((ptr + 4 >> 2) * 4, (num - SAFE_HEAP_LOAD((ptr >> 2) * 4, 4, 1)) / 4294967296, 4);
}

function emscriptenWebGLGet(name_, p, type) {
 if (!p) {
  GL.recordError(1281);
  return;
 }
 var ret = undefined;
 switch (name_) {
 case 36346:
  ret = 1;
  break;

 case 36344:
  if (type != 0 && type != 1) {
   GL.recordError(1280);
  }
  return;

 case 36345:
  ret = 0;
  break;

 case 34466:
  var formats = GLctx.getParameter(34467);
  ret = formats ? formats.length : 0;
  break;
 }
 if (ret === undefined) {
  var result = GLctx.getParameter(name_);
  switch (typeof result) {
  case "number":
   ret = result;
   break;

  case "boolean":
   ret = result ? 1 : 0;
   break;

  case "string":
   GL.recordError(1280);
   return;

  case "object":
   if (result === null) {
    switch (name_) {
    case 34964:
    case 35725:
    case 34965:
    case 36006:
    case 36007:
    case 32873:
    case 34229:
    case 34068:
     {
      ret = 0;
      break;
     }

    default:
     {
      GL.recordError(1280);
      return;
     }
    }
   } else if (result instanceof Float32Array || result instanceof Uint32Array || result instanceof Int32Array || result instanceof Array) {
    for (var i = 0; i < result.length; ++i) {
     switch (type) {
     case 0:
      SAFE_HEAP_STORE(p + i * 4 | 0, result[i] | 0, 4);
      break;

     case 2:
      SAFE_HEAP_STORE_D(p + i * 4 | 0, Math.fround(result[i]), 4);
      break;

     case 4:
      SAFE_HEAP_STORE(p + i | 0, (result[i] ? 1 : 0) | 0, 1);
      break;
     }
    }
    return;
   } else {
    try {
     ret = result.name | 0;
    } catch (e) {
     GL.recordError(1280);
     err("GL_INVALID_ENUM in glGet" + type + "v: Unknown object returned from WebGL getParameter(" + name_ + ")! (error: " + e + ")");
     return;
    }
   }
   break;

  default:
   GL.recordError(1280);
   err("GL_INVALID_ENUM in glGet" + type + "v: Native code calling glGet" + type + "v(" + name_ + ") and it returns " + result + " of type " + typeof result + "!");
   return;
  }
 }
 switch (type) {
 case 1:
  writeI53ToI64(p, ret);
  break;

 case 0:
  SAFE_HEAP_STORE(p | 0, ret | 0, 4);
  break;

 case 2:
  SAFE_HEAP_STORE_D(p | 0, Math.fround(ret), 4);
  break;

 case 4:
  SAFE_HEAP_STORE(p | 0, (ret ? 1 : 0) | 0, 1);
  break;
 }
}

function _emscripten_glGetBooleanv(name_, p) {
 emscriptenWebGLGet(name_, p, 4);
}

function _emscripten_glGetBufferParameteriv(target, value, data) {
 if (!data) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE(data | 0, GLctx.getBufferParameter(target, value) | 0, 4);
}

function _emscripten_glGetError() {
 var error = GLctx.getError() || GL.lastError;
 GL.lastError = 0;
 return error;
}

function _emscripten_glGetFloatv(name_, p) {
 emscriptenWebGLGet(name_, p, 2);
}

function _emscripten_glGetFramebufferAttachmentParameteriv(target, attachment, pname, params) {
 var result = GLctx.getFramebufferAttachmentParameter(target, attachment, pname);
 if (result instanceof WebGLRenderbuffer || result instanceof WebGLTexture) {
  result = result.name | 0;
 }
 SAFE_HEAP_STORE(params | 0, result | 0, 4);
}

function _emscripten_glGetIntegerv(name_, p) {
 emscriptenWebGLGet(name_, p, 0);
}

function _emscripten_glGetProgramInfoLog(program, maxLength, length, infoLog) {
 var log = GLctx.getProgramInfoLog(GL.programs[program]);
 if (log === null) log = "(unknown error)";
 var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
 if (length) SAFE_HEAP_STORE(length | 0, numBytesWrittenExclNull | 0, 4);
}

function _emscripten_glGetProgramiv(program, pname, p) {
 if (!p) {
  GL.recordError(1281);
  return;
 }
 if (program >= GL.counter) {
  GL.recordError(1281);
  return;
 }
 program = GL.programs[program];
 if (pname == 35716) {
  var log = GLctx.getProgramInfoLog(program);
  if (log === null) log = "(unknown error)";
  SAFE_HEAP_STORE(p | 0, log.length + 1 | 0, 4);
 } else if (pname == 35719) {
  if (!program.maxUniformLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
    program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
   }
  }
  SAFE_HEAP_STORE(p | 0, program.maxUniformLength | 0, 4);
 } else if (pname == 35722) {
  if (!program.maxAttributeLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35721); ++i) {
    program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
   }
  }
  SAFE_HEAP_STORE(p | 0, program.maxAttributeLength | 0, 4);
 } else if (pname == 35381) {
  if (!program.maxUniformBlockNameLength) {
   for (var i = 0; i < GLctx.getProgramParameter(program, 35382); ++i) {
    program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
   }
  }
  SAFE_HEAP_STORE(p | 0, program.maxUniformBlockNameLength | 0, 4);
 } else {
  SAFE_HEAP_STORE(p | 0, GLctx.getProgramParameter(program, pname) | 0, 4);
 }
}

function _emscripten_glGetQueryObjecti64vEXT(id, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 var query = GL.queries[id];
 var param;
 {
  param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 }
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 writeI53ToI64(params, ret);
}

function _emscripten_glGetQueryObjectivEXT(id, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 var query = GL.queries[id];
 var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 SAFE_HEAP_STORE(params | 0, ret | 0, 4);
}

function _emscripten_glGetQueryObjectui64vEXT(id, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 var query = GL.queries[id];
 var param;
 {
  param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 }
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 writeI53ToI64(params, ret);
}

function _emscripten_glGetQueryObjectuivEXT(id, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 var query = GL.queries[id];
 var param = GLctx.disjointTimerQueryExt["getQueryObjectEXT"](query, pname);
 var ret;
 if (typeof param == "boolean") {
  ret = param ? 1 : 0;
 } else {
  ret = param;
 }
 SAFE_HEAP_STORE(params | 0, ret | 0, 4);
}

function _emscripten_glGetQueryivEXT(target, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE(params | 0, GLctx.disjointTimerQueryExt["getQueryEXT"](target, pname) | 0, 4);
}

function _emscripten_glGetRenderbufferParameteriv(target, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE(params | 0, GLctx.getRenderbufferParameter(target, pname) | 0, 4);
}

function _emscripten_glGetShaderInfoLog(shader, maxLength, length, infoLog) {
 var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
 if (log === null) log = "(unknown error)";
 var numBytesWrittenExclNull = maxLength > 0 && infoLog ? stringToUTF8(log, infoLog, maxLength) : 0;
 if (length) SAFE_HEAP_STORE(length | 0, numBytesWrittenExclNull | 0, 4);
}

function _emscripten_glGetShaderPrecisionFormat(shaderType, precisionType, range, precision) {
 var result = GLctx.getShaderPrecisionFormat(shaderType, precisionType);
 SAFE_HEAP_STORE(range | 0, result.rangeMin | 0, 4);
 SAFE_HEAP_STORE(range + 4 | 0, result.rangeMax | 0, 4);
 SAFE_HEAP_STORE(precision | 0, result.precision | 0, 4);
}

function _emscripten_glGetShaderSource(shader, bufSize, length, source) {
 var result = GLctx.getShaderSource(GL.shaders[shader]);
 if (!result) return;
 var numBytesWrittenExclNull = bufSize > 0 && source ? stringToUTF8(result, source, bufSize) : 0;
 if (length) SAFE_HEAP_STORE(length | 0, numBytesWrittenExclNull | 0, 4);
}

function _emscripten_glGetShaderiv(shader, pname, p) {
 if (!p) {
  GL.recordError(1281);
  return;
 }
 if (pname == 35716) {
  var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
  if (log === null) log = "(unknown error)";
  var logLength = log ? log.length + 1 : 0;
  SAFE_HEAP_STORE(p | 0, logLength | 0, 4);
 } else if (pname == 35720) {
  var source = GLctx.getShaderSource(GL.shaders[shader]);
  var sourceLength = source ? source.length + 1 : 0;
  SAFE_HEAP_STORE(p | 0, sourceLength | 0, 4);
 } else {
  SAFE_HEAP_STORE(p | 0, GLctx.getShaderParameter(GL.shaders[shader], pname) | 0, 4);
 }
}

function stringToNewUTF8(jsString) {
 var length = lengthBytesUTF8(jsString) + 1;
 var cString = _malloc(length);
 stringToUTF8(jsString, cString, length);
 return cString;
}

function _emscripten_glGetString(name_) {
 var ret = GL.stringCache[name_];
 if (!ret) {
  switch (name_) {
  case 7939:
   var exts = GLctx.getSupportedExtensions() || [];
   exts = exts.concat(exts.map(function(e) {
    return "GL_" + e;
   }));
   ret = stringToNewUTF8(exts.join(" "));
   break;

  case 7936:
  case 7937:
  case 37445:
  case 37446:
   var s = GLctx.getParameter(name_);
   if (!s) {
    GL.recordError(1280);
   }
   ret = s && stringToNewUTF8(s);
   break;

  case 7938:
   var glVersion = GLctx.getParameter(7938);
   {
    glVersion = "OpenGL ES 2.0 (" + glVersion + ")";
   }
   ret = stringToNewUTF8(glVersion);
   break;

  case 35724:
   var glslVersion = GLctx.getParameter(35724);
   var ver_re = /^WebGL GLSL ES ([0-9]\.[0-9][0-9]?)(?:$| .*)/;
   var ver_num = glslVersion.match(ver_re);
   if (ver_num !== null) {
    if (ver_num[1].length == 3) ver_num[1] = ver_num[1] + "0";
    glslVersion = "OpenGL ES GLSL ES " + ver_num[1] + " (" + glslVersion + ")";
   }
   ret = stringToNewUTF8(glslVersion);
   break;

  default:
   GL.recordError(1280);
  }
  GL.stringCache[name_] = ret;
 }
 return ret;
}

function _emscripten_glGetTexParameterfv(target, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE_D(params | 0, Math.fround(GLctx.getTexParameter(target, pname)), 4);
}

function _emscripten_glGetTexParameteriv(target, pname, params) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE(params | 0, GLctx.getTexParameter(target, pname) | 0, 4);
}

function jstoi_q(str) {
 return parseInt(str);
}

function _emscripten_glGetUniformLocation(program, name) {
 function getLeftBracePos(name) {
  return name.slice(-1) == "]" && name.lastIndexOf("[");
 }
 name = UTF8ToString(name);
 program = GL.programs[program];
 var uniformLocsById = program.uniformLocsById;
 var uniformSizeAndIdsByName = program.uniformSizeAndIdsByName;
 var i, j;
 var arrayIndex = 0;
 var uniformBaseName = name;
 var leftBrace = getLeftBracePos(name);
 if (!uniformLocsById) {
  program.uniformLocsById = uniformLocsById = {};
  program.uniformArrayNamesById = {};
  for (i = 0; i < GLctx.getProgramParameter(program, 35718); ++i) {
   var u = GLctx.getActiveUniform(program, i);
   var nm = u.name;
   var sz = u.size;
   var lb = getLeftBracePos(nm);
   var arrayName = lb > 0 ? nm.slice(0, lb) : nm;
   var id = program.uniformIdCounter;
   program.uniformIdCounter += sz;
   uniformSizeAndIdsByName[arrayName] = [ sz, id ];
   for (j = 0; j < sz; ++j) {
    uniformLocsById[id] = j;
    program.uniformArrayNamesById[id++] = arrayName;
   }
  }
 }
 if (leftBrace > 0) {
  arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0;
  uniformBaseName = name.slice(0, leftBrace);
 }
 var sizeAndId = uniformSizeAndIdsByName[uniformBaseName];
 if (sizeAndId && arrayIndex < sizeAndId[0]) {
  arrayIndex += sizeAndId[1];
  if (uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name)) {
   return arrayIndex;
  }
 }
 return -1;
}

function emscriptenWebGLGetUniform(program, location, params, type) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 program = GL.programs[program];
 var data = GLctx.getUniform(program, program.uniformLocsById[location]);
 if (typeof data == "number" || typeof data == "boolean") {
  switch (type) {
  case 0:
   SAFE_HEAP_STORE(params | 0, data | 0, 4);
   break;

  case 2:
   SAFE_HEAP_STORE_D(params | 0, Math.fround(data), 4);
   break;
  }
 } else {
  for (var i = 0; i < data.length; i++) {
   switch (type) {
   case 0:
    SAFE_HEAP_STORE(params + i * 4 | 0, data[i] | 0, 4);
    break;

   case 2:
    SAFE_HEAP_STORE_D(params + i * 4 | 0, Math.fround(data[i]), 4);
    break;
   }
  }
 }
}

function _emscripten_glGetUniformfv(program, location, params) {
 emscriptenWebGLGetUniform(program, location, params, 2);
}

function _emscripten_glGetUniformiv(program, location, params) {
 emscriptenWebGLGetUniform(program, location, params, 0);
}

function _emscripten_glGetVertexAttribPointerv(index, pname, pointer) {
 if (!pointer) {
  GL.recordError(1281);
  return;
 }
 SAFE_HEAP_STORE(pointer | 0, GLctx.getVertexAttribOffset(index, pname) | 0, 4);
}

function emscriptenWebGLGetVertexAttrib(index, pname, params, type) {
 if (!params) {
  GL.recordError(1281);
  return;
 }
 var data = GLctx.getVertexAttrib(index, pname);
 if (pname == 34975) {
  SAFE_HEAP_STORE(params | 0, (data && data["name"]) | 0, 4);
 } else if (typeof data == "number" || typeof data == "boolean") {
  switch (type) {
  case 0:
   SAFE_HEAP_STORE(params | 0, data | 0, 4);
   break;

  case 2:
   SAFE_HEAP_STORE_D(params | 0, Math.fround(data), 4);
   break;

  case 5:
   SAFE_HEAP_STORE(params | 0, Math.fround(data) | 0, 4);
   break;
  }
 } else {
  for (var i = 0; i < data.length; i++) {
   switch (type) {
   case 0:
    SAFE_HEAP_STORE(params + i * 4 | 0, data[i] | 0, 4);
    break;

   case 2:
    SAFE_HEAP_STORE_D(params + i * 4 | 0, Math.fround(data[i]), 4);
    break;

   case 5:
    SAFE_HEAP_STORE(params + i * 4 | 0, Math.fround(data[i]) | 0, 4);
    break;
   }
  }
 }
}

function _emscripten_glGetVertexAttribfv(index, pname, params) {
 emscriptenWebGLGetVertexAttrib(index, pname, params, 2);
}

function _emscripten_glGetVertexAttribiv(index, pname, params) {
 emscriptenWebGLGetVertexAttrib(index, pname, params, 5);
}

function _emscripten_glHint(x0, x1) {
 GLctx["hint"](x0, x1);
}

function _emscripten_glIsBuffer(buffer) {
 var b = GL.buffers[buffer];
 if (!b) return 0;
 return GLctx.isBuffer(b);
}

function _emscripten_glIsEnabled(x0) {
 return GLctx["isEnabled"](x0);
}

function _emscripten_glIsFramebuffer(framebuffer) {
 var fb = GL.framebuffers[framebuffer];
 if (!fb) return 0;
 return GLctx.isFramebuffer(fb);
}

function _emscripten_glIsProgram(program) {
 program = GL.programs[program];
 if (!program) return 0;
 return GLctx.isProgram(program);
}

function _emscripten_glIsQueryEXT(id) {
 var query = GL.queries[id];
 if (!query) return 0;
 return GLctx.disjointTimerQueryExt["isQueryEXT"](query);
}

function _emscripten_glIsRenderbuffer(renderbuffer) {
 var rb = GL.renderbuffers[renderbuffer];
 if (!rb) return 0;
 return GLctx.isRenderbuffer(rb);
}

function _emscripten_glIsShader(shader) {
 var s = GL.shaders[shader];
 if (!s) return 0;
 return GLctx.isShader(s);
}

function _emscripten_glIsTexture(id) {
 var texture = GL.textures[id];
 if (!texture) return 0;
 return GLctx.isTexture(texture);
}

function _emscripten_glIsVertexArrayOES(array) {
 var vao = GL.vaos[array];
 if (!vao) return 0;
 return GLctx["isVertexArray"](vao);
}

function _emscripten_glLineWidth(x0) {
 GLctx["lineWidth"](x0);
}

function _emscripten_glLinkProgram(program) {
 program = GL.programs[program];
 GLctx.linkProgram(program);
 program.uniformLocsById = 0;
 program.uniformSizeAndIdsByName = {};
}

function _emscripten_glPixelStorei(pname, param) {
 if (pname == 3317) {
  GL.unpackAlignment = param;
 }
 GLctx.pixelStorei(pname, param);
}

function _emscripten_glPolygonOffset(x0, x1) {
 GLctx["polygonOffset"](x0, x1);
}

function _emscripten_glQueryCounterEXT(id, target) {
 GLctx.disjointTimerQueryExt["queryCounterEXT"](GL.queries[id], target);
}

function computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
 function roundedToNextMultipleOf(x, y) {
  return x + y - 1 & -y;
 }
 var plainRowSize = width * sizePerPixel;
 var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
 return height * alignedRowSize;
}

function __colorChannelsInGlTextureFormat(format) {
 var colorChannels = {
  5: 3,
  6: 4,
  8: 2,
  29502: 3,
  29504: 4
 };
 return colorChannels[format - 6402] || 1;
}

function heapObjectForWebGLType(type) {
 type -= 5120;
 if (type == 1) return HEAPU8;
 if (type == 4) return HEAP32;
 if (type == 6) return HEAPF32;
 if (type == 5 || type == 28922) return HEAPU32;
 return HEAPU16;
}

function heapAccessShiftForWebGLHeap(heap) {
 return 31 - Math.clz32(heap.BYTES_PER_ELEMENT);
}

function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
 var heap = heapObjectForWebGLType(type);
 var shift = heapAccessShiftForWebGLHeap(heap);
 var byteSize = 1 << shift;
 var sizePerPixel = __colorChannelsInGlTextureFormat(format) * byteSize;
 var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
 return heap.subarray(pixels >> shift, pixels + bytes >> shift);
}

function _emscripten_glReadPixels(x, y, width, height, format, type, pixels) {
 var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
 if (!pixelData) {
  GL.recordError(1280);
  return;
 }
 GLctx.readPixels(x, y, width, height, format, type, pixelData);
}

function _emscripten_glReleaseShaderCompiler() {}

function _emscripten_glRenderbufferStorage(x0, x1, x2, x3) {
 GLctx["renderbufferStorage"](x0, x1, x2, x3);
}

function _emscripten_glSampleCoverage(value, invert) {
 GLctx.sampleCoverage(value, !!invert);
}

function _emscripten_glScissor(x0, x1, x2, x3) {
 GLctx["scissor"](x0, x1, x2, x3);
}

function _emscripten_glShaderBinary() {
 GL.recordError(1280);
}

function _emscripten_glShaderSource(shader, count, string, length) {
 var source = GL.getSource(shader, count, string, length);
 GLctx.shaderSource(GL.shaders[shader], source);
}

function _emscripten_glStencilFunc(x0, x1, x2) {
 GLctx["stencilFunc"](x0, x1, x2);
}

function _emscripten_glStencilFuncSeparate(x0, x1, x2, x3) {
 GLctx["stencilFuncSeparate"](x0, x1, x2, x3);
}

function _emscripten_glStencilMask(x0) {
 GLctx["stencilMask"](x0);
}

function _emscripten_glStencilMaskSeparate(x0, x1) {
 GLctx["stencilMaskSeparate"](x0, x1);
}

function _emscripten_glStencilOp(x0, x1, x2) {
 GLctx["stencilOp"](x0, x1, x2);
}

function _emscripten_glStencilOpSeparate(x0, x1, x2, x3) {
 GLctx["stencilOpSeparate"](x0, x1, x2, x3);
}

function _emscripten_glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
 GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null);
}

function _emscripten_glTexParameterf(x0, x1, x2) {
 GLctx["texParameterf"](x0, x1, x2);
}

function _emscripten_glTexParameterfv(target, pname, params) {
 var param = Math.fround(SAFE_HEAP_LOAD_D(params | 0, 4, 0));
 GLctx.texParameterf(target, pname, param);
}

function _emscripten_glTexParameteri(x0, x1, x2) {
 GLctx["texParameteri"](x0, x1, x2);
}

function _emscripten_glTexParameteriv(target, pname, params) {
 var param = SAFE_HEAP_LOAD(params | 0, 4, 0) | 0;
 GLctx.texParameteri(target, pname, param);
}

function _emscripten_glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels) {
 var pixelData = null;
 if (pixels) pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, 0);
 GLctx.texSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixelData);
}

function webglGetUniformLocation(location) {
 var p = GLctx.currentProgram;
 var webglLoc = p.uniformLocsById[location];
 if (webglLoc >= 0) {
  p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? "[" + webglLoc + "]" : ""));
 }
 return webglLoc;
}

function _emscripten_glUniform1f(location, v0) {
 GLctx.uniform1f(webglGetUniformLocation(location), v0);
}

var miniTempWebGLFloatBuffers = [];

function _emscripten_glUniform1fv(location, count, value) {
 if (count <= 288) {
  var view = miniTempWebGLFloatBuffers[count - 1];
  for (var i = 0; i < count; ++i) {
   view[i] = Math.fround(SAFE_HEAP_LOAD_D(value + 4 * i | 0, 4, 0));
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 4 >> 2);
 }
 GLctx.uniform1fv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform1i(location, v0) {
 GLctx.uniform1i(webglGetUniformLocation(location), v0);
}

var __miniTempWebGLIntBuffers = [];

function _emscripten_glUniform1iv(location, count, value) {
 if (count <= 288) {
  var view = __miniTempWebGLIntBuffers[count - 1];
  for (var i = 0; i < count; ++i) {
   view[i] = SAFE_HEAP_LOAD(value + 4 * i | 0, 4, 0) | 0;
  }
 } else {
  var view = HEAP32.subarray(value >> 2, value + count * 4 >> 2);
 }
 GLctx.uniform1iv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform2f(location, v0, v1) {
 GLctx.uniform2f(webglGetUniformLocation(location), v0, v1);
}

function _emscripten_glUniform2fv(location, count, value) {
 if (count <= 144) {
  var view = miniTempWebGLFloatBuffers[2 * count - 1];
  for (var i = 0; i < 2 * count; i += 2) {
   view[i] = Math.fround(SAFE_HEAP_LOAD_D(value + 4 * i | 0, 4, 0));
   view[i + 1] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 4) | 0, 4, 0));
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 8 >> 2);
 }
 GLctx.uniform2fv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform2i(location, v0, v1) {
 GLctx.uniform2i(webglGetUniformLocation(location), v0, v1);
}

function _emscripten_glUniform2iv(location, count, value) {
 if (count <= 144) {
  var view = __miniTempWebGLIntBuffers[2 * count - 1];
  for (var i = 0; i < 2 * count; i += 2) {
   view[i] = SAFE_HEAP_LOAD(value + 4 * i | 0, 4, 0) | 0;
   view[i + 1] = SAFE_HEAP_LOAD(value + (4 * i + 4) | 0, 4, 0) | 0;
  }
 } else {
  var view = HEAP32.subarray(value >> 2, value + count * 8 >> 2);
 }
 GLctx.uniform2iv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform3f(location, v0, v1, v2) {
 GLctx.uniform3f(webglGetUniformLocation(location), v0, v1, v2);
}

function _emscripten_glUniform3fv(location, count, value) {
 if (count <= 96) {
  var view = miniTempWebGLFloatBuffers[3 * count - 1];
  for (var i = 0; i < 3 * count; i += 3) {
   view[i] = Math.fround(SAFE_HEAP_LOAD_D(value + 4 * i | 0, 4, 0));
   view[i + 1] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 4) | 0, 4, 0));
   view[i + 2] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 8) | 0, 4, 0));
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 12 >> 2);
 }
 GLctx.uniform3fv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform3i(location, v0, v1, v2) {
 GLctx.uniform3i(webglGetUniformLocation(location), v0, v1, v2);
}

function _emscripten_glUniform3iv(location, count, value) {
 if (count <= 96) {
  var view = __miniTempWebGLIntBuffers[3 * count - 1];
  for (var i = 0; i < 3 * count; i += 3) {
   view[i] = SAFE_HEAP_LOAD(value + 4 * i | 0, 4, 0) | 0;
   view[i + 1] = SAFE_HEAP_LOAD(value + (4 * i + 4) | 0, 4, 0) | 0;
   view[i + 2] = SAFE_HEAP_LOAD(value + (4 * i + 8) | 0, 4, 0) | 0;
  }
 } else {
  var view = HEAP32.subarray(value >> 2, value + count * 12 >> 2);
 }
 GLctx.uniform3iv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform4f(location, v0, v1, v2, v3) {
 GLctx.uniform4f(webglGetUniformLocation(location), v0, v1, v2, v3);
}

function _emscripten_glUniform4fv(location, count, value) {
 if (count <= 72) {
  var view = miniTempWebGLFloatBuffers[4 * count - 1];
  var heap = HEAPF32;
  value >>= 2;
  for (var i = 0; i < 4 * count; i += 4) {
   var dst = value + i;
   view[i] = heap[dst];
   view[i + 1] = heap[dst + 1];
   view[i + 2] = heap[dst + 2];
   view[i + 3] = heap[dst + 3];
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 16 >> 2);
 }
 GLctx.uniform4fv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniform4i(location, v0, v1, v2, v3) {
 GLctx.uniform4i(webglGetUniformLocation(location), v0, v1, v2, v3);
}

function _emscripten_glUniform4iv(location, count, value) {
 if (count <= 72) {
  var view = __miniTempWebGLIntBuffers[4 * count - 1];
  for (var i = 0; i < 4 * count; i += 4) {
   view[i] = SAFE_HEAP_LOAD(value + 4 * i | 0, 4, 0) | 0;
   view[i + 1] = SAFE_HEAP_LOAD(value + (4 * i + 4) | 0, 4, 0) | 0;
   view[i + 2] = SAFE_HEAP_LOAD(value + (4 * i + 8) | 0, 4, 0) | 0;
   view[i + 3] = SAFE_HEAP_LOAD(value + (4 * i + 12) | 0, 4, 0) | 0;
  }
 } else {
  var view = HEAP32.subarray(value >> 2, value + count * 16 >> 2);
 }
 GLctx.uniform4iv(webglGetUniformLocation(location), view);
}

function _emscripten_glUniformMatrix2fv(location, count, transpose, value) {
 if (count <= 72) {
  var view = miniTempWebGLFloatBuffers[4 * count - 1];
  for (var i = 0; i < 4 * count; i += 4) {
   view[i] = Math.fround(SAFE_HEAP_LOAD_D(value + 4 * i | 0, 4, 0));
   view[i + 1] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 4) | 0, 4, 0));
   view[i + 2] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 8) | 0, 4, 0));
   view[i + 3] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 12) | 0, 4, 0));
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 16 >> 2);
 }
 GLctx.uniformMatrix2fv(webglGetUniformLocation(location), !!transpose, view);
}

function _emscripten_glUniformMatrix3fv(location, count, transpose, value) {
 if (count <= 32) {
  var view = miniTempWebGLFloatBuffers[9 * count - 1];
  for (var i = 0; i < 9 * count; i += 9) {
   view[i] = Math.fround(SAFE_HEAP_LOAD_D(value + 4 * i | 0, 4, 0));
   view[i + 1] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 4) | 0, 4, 0));
   view[i + 2] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 8) | 0, 4, 0));
   view[i + 3] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 12) | 0, 4, 0));
   view[i + 4] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 16) | 0, 4, 0));
   view[i + 5] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 20) | 0, 4, 0));
   view[i + 6] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 24) | 0, 4, 0));
   view[i + 7] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 28) | 0, 4, 0));
   view[i + 8] = Math.fround(SAFE_HEAP_LOAD_D(value + (4 * i + 32) | 0, 4, 0));
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 36 >> 2);
 }
 GLctx.uniformMatrix3fv(webglGetUniformLocation(location), !!transpose, view);
}

function _emscripten_glUniformMatrix4fv(location, count, transpose, value) {
 if (count <= 18) {
  var view = miniTempWebGLFloatBuffers[16 * count - 1];
  var heap = HEAPF32;
  value >>= 2;
  for (var i = 0; i < 16 * count; i += 16) {
   var dst = value + i;
   view[i] = heap[dst];
   view[i + 1] = heap[dst + 1];
   view[i + 2] = heap[dst + 2];
   view[i + 3] = heap[dst + 3];
   view[i + 4] = heap[dst + 4];
   view[i + 5] = heap[dst + 5];
   view[i + 6] = heap[dst + 6];
   view[i + 7] = heap[dst + 7];
   view[i + 8] = heap[dst + 8];
   view[i + 9] = heap[dst + 9];
   view[i + 10] = heap[dst + 10];
   view[i + 11] = heap[dst + 11];
   view[i + 12] = heap[dst + 12];
   view[i + 13] = heap[dst + 13];
   view[i + 14] = heap[dst + 14];
   view[i + 15] = heap[dst + 15];
  }
 } else {
  var view = HEAPF32.subarray(value >> 2, value + count * 64 >> 2);
 }
 GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
}

function _emscripten_glUseProgram(program) {
 program = GL.programs[program];
 GLctx.useProgram(program);
 GLctx.currentProgram = program;
}

function _emscripten_glValidateProgram(program) {
 GLctx.validateProgram(GL.programs[program]);
}

function _emscripten_glVertexAttrib1f(x0, x1) {
 GLctx["vertexAttrib1f"](x0, x1);
}

function _emscripten_glVertexAttrib1fv(index, v) {
 GLctx.vertexAttrib1f(index, SAFE_HEAP_LOAD_D((v >> 2) * 4, 4, 0));
}

function _emscripten_glVertexAttrib2f(x0, x1, x2) {
 GLctx["vertexAttrib2f"](x0, x1, x2);
}

function _emscripten_glVertexAttrib2fv(index, v) {
 GLctx.vertexAttrib2f(index, SAFE_HEAP_LOAD_D((v >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 4 >> 2) * 4, 4, 0));
}

function _emscripten_glVertexAttrib3f(x0, x1, x2, x3) {
 GLctx["vertexAttrib3f"](x0, x1, x2, x3);
}

function _emscripten_glVertexAttrib3fv(index, v) {
 GLctx.vertexAttrib3f(index, SAFE_HEAP_LOAD_D((v >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 4 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 8 >> 2) * 4, 4, 0));
}

function _emscripten_glVertexAttrib4f(x0, x1, x2, x3, x4) {
 GLctx["vertexAttrib4f"](x0, x1, x2, x3, x4);
}

function _emscripten_glVertexAttrib4fv(index, v) {
 GLctx.vertexAttrib4f(index, SAFE_HEAP_LOAD_D((v >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 4 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 8 >> 2) * 4, 4, 0), SAFE_HEAP_LOAD_D((v + 12 >> 2) * 4, 4, 0));
}

function _emscripten_glVertexAttribDivisorANGLE(index, divisor) {
 GLctx["vertexAttribDivisor"](index, divisor);
}

function _emscripten_glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
 GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
}

function _emscripten_glViewport(x0, x1, x2, x3) {
 GLctx["viewport"](x0, x1, x2, x3);
}

function _emscripten_has_asyncify() {
 return 1;
}

function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.copyWithin(dest, src, src + num);
}

function doRequestFullscreen(target, strategy) {
 if (!JSEvents.fullscreenEnabled()) return -1;
 target = findEventTarget(target);
 if (!target) return -4;
 if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
  return -3;
 }
 var canPerformRequests = JSEvents.canPerformEventHandlerRequests();
 if (!canPerformRequests) {
  if (strategy.deferUntilInEventHandler) {
   JSEvents.deferCall(_JSEvents_requestFullscreen, 1, [ target, strategy ]);
   return 1;
  } else {
   return -2;
  }
 }
 return _JSEvents_requestFullscreen(target, strategy);
}

function _emscripten_request_fullscreen(target, deferUntilInEventHandler) {
 var strategy = {
  scaleMode: 0,
  canvasResolutionScaleMode: 0,
  filteringMode: 0,
  deferUntilInEventHandler: deferUntilInEventHandler,
  canvasResizedCallbackTargetThread: 2
 };
 return doRequestFullscreen(target, strategy);
}

function _emscripten_request_fullscreen_strategy(target, deferUntilInEventHandler, fullscreenStrategy) {
 var strategy = {
  scaleMode: SAFE_HEAP_LOAD(fullscreenStrategy | 0, 4, 0) | 0,
  canvasResolutionScaleMode: SAFE_HEAP_LOAD(fullscreenStrategy + 4 | 0, 4, 0) | 0,
  filteringMode: SAFE_HEAP_LOAD(fullscreenStrategy + 8 | 0, 4, 0) | 0,
  deferUntilInEventHandler: deferUntilInEventHandler,
  canvasResizedCallback: SAFE_HEAP_LOAD(fullscreenStrategy + 12 | 0, 4, 0) | 0,
  canvasResizedCallbackUserData: SAFE_HEAP_LOAD(fullscreenStrategy + 16 | 0, 4, 0) | 0
 };
 return doRequestFullscreen(target, strategy);
}

function _emscripten_request_pointerlock(target, deferUntilInEventHandler) {
 target = findEventTarget(target);
 if (!target) return -4;
 if (!target.requestPointerLock && !target.msRequestPointerLock) {
  return -1;
 }
 var canPerformRequests = JSEvents.canPerformEventHandlerRequests();
 if (!canPerformRequests) {
  if (deferUntilInEventHandler) {
   JSEvents.deferCall(requestPointerLock, 2, [ target ]);
   return 1;
  } else {
   return -2;
  }
 }
 return requestPointerLock(target);
}

function abortOnCannotGrowMemory(requestedSize) {
 abort("OOM");
}

function _emscripten_resize_heap(requestedSize) {
 var oldSize = HEAPU8.length;
 requestedSize = requestedSize >>> 0;
 abortOnCannotGrowMemory(requestedSize);
}

function _emscripten_sample_gamepad_data() {
 return (JSEvents.lastGamepadState = navigator.getGamepads ? navigator.getGamepads() : navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : null) ? 0 : -1;
}

function registerBeforeUnloadEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString) {
 var beforeUnloadEventHandlerFunc = function(ev) {
  var e = ev || event;
  var confirmationMessage = function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, 0, userData);
  if (confirmationMessage) {
   confirmationMessage = UTF8ToString(confirmationMessage);
  }
  if (confirmationMessage) {
   e.preventDefault();
   e.returnValue = confirmationMessage;
   return confirmationMessage;
  }
 };
 var eventHandler = {
  target: findEventTarget(target),
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: beforeUnloadEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_beforeunload_callback_on_thread(userData, callbackfunc, targetThread) {
 if (typeof onbeforeunload === "undefined") return -1;
 if (targetThread !== 1) return -5;
 registerBeforeUnloadEventCallback(2, userData, true, callbackfunc, 28, "beforeunload");
 return 0;
}

function registerFocusEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.focusEvent) JSEvents.focusEvent = _malloc(256);
 var focusEventHandlerFunc = function(ev) {
  var e = ev || event;
  var nodeName = JSEvents.getNodeNameForTarget(e.target);
  var id = e.target.id ? e.target.id : "";
  var focusEvent = JSEvents.focusEvent;
  stringToUTF8(nodeName, focusEvent + 0, 128);
  stringToUTF8(id, focusEvent + 128, 128);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, focusEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: findEventTarget(target),
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: focusEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_blur_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerFocusEventCallback(target, userData, useCapture, callbackfunc, 12, "blur", targetThread);
 return 0;
}

function _emscripten_set_element_css_size(target, width, height) {
 target = findEventTarget(target);
 if (!target) return -4;
 target.style.width = width + "px";
 target.style.height = height + "px";
 return 0;
}

function _emscripten_set_focus_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerFocusEventCallback(target, userData, useCapture, callbackfunc, 13, "focus", targetThread);
 return 0;
}

function registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.fullscreenChangeEvent) JSEvents.fullscreenChangeEvent = _malloc(280);
 var fullscreenChangeEventhandlerFunc = function(ev) {
  var e = ev || event;
  var fullscreenChangeEvent = JSEvents.fullscreenChangeEvent;
  fillFullscreenChangeEventData(fullscreenChangeEvent);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, fullscreenChangeEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: fullscreenChangeEventhandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_fullscreenchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 if (!JSEvents.fullscreenEnabled()) return -1;
 target = findEventTarget(target);
 if (!target) return -4;
 registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "fullscreenchange", targetThread);
 registerFullscreenChangeEventCallback(target, userData, useCapture, callbackfunc, 19, "webkitfullscreenchange", targetThread);
 return 0;
}

function registerGamepadEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.gamepadEvent) JSEvents.gamepadEvent = _malloc(1432);
 var gamepadEventHandlerFunc = function(ev) {
  var e = ev || event;
  var gamepadEvent = JSEvents.gamepadEvent;
  fillGamepadEventData(gamepadEvent, e["gamepad"]);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, gamepadEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: findEventTarget(target),
  allowsDeferredCalls: true,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: gamepadEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_gamepadconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
 if (!navigator.getGamepads && !navigator.webkitGetGamepads) return -1;
 registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 26, "gamepadconnected", targetThread);
 return 0;
}

function _emscripten_set_gamepaddisconnected_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
 if (!navigator.getGamepads && !navigator.webkitGetGamepads) return -1;
 registerGamepadEventCallback(2, userData, useCapture, callbackfunc, 27, "gamepaddisconnected", targetThread);
 return 0;
}

function registerKeyEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.keyEvent) JSEvents.keyEvent = _malloc(164);
 var keyEventHandlerFunc = function(e) {
  var keyEventData = JSEvents.keyEvent;
  var idx = keyEventData >> 2;
  SAFE_HEAP_STORE((idx + 0) * 4, e.location, 4);
  SAFE_HEAP_STORE((idx + 1) * 4, e.ctrlKey, 4);
  SAFE_HEAP_STORE((idx + 2) * 4, e.shiftKey, 4);
  SAFE_HEAP_STORE((idx + 3) * 4, e.altKey, 4);
  SAFE_HEAP_STORE((idx + 4) * 4, e.metaKey, 4);
  SAFE_HEAP_STORE((idx + 5) * 4, e.repeat, 4);
  SAFE_HEAP_STORE((idx + 6) * 4, e.charCode, 4);
  SAFE_HEAP_STORE((idx + 7) * 4, e.keyCode, 4);
  SAFE_HEAP_STORE((idx + 8) * 4, e.which, 4);
  stringToUTF8(e.key || "", keyEventData + 36, 32);
  stringToUTF8(e.code || "", keyEventData + 68, 32);
  stringToUTF8(e.char || "", keyEventData + 100, 32);
  stringToUTF8(e.locale || "", keyEventData + 132, 32);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, keyEventData, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: findEventTarget(target),
  allowsDeferredCalls: true,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: keyEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_keydown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerKeyEventCallback(target, userData, useCapture, callbackfunc, 2, "keydown", targetThread);
 return 0;
}

function _emscripten_set_keypress_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerKeyEventCallback(target, userData, useCapture, callbackfunc, 1, "keypress", targetThread);
 return 0;
}

function _emscripten_set_keyup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerKeyEventCallback(target, userData, useCapture, callbackfunc, 3, "keyup", targetThread);
 return 0;
}

function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop) {
 var browserIterationFunc = function() {
  dynCall_v.call(null, func);
 };
 setMainLoop(browserIterationFunc, fps, simulateInfiniteLoop);
}

function fillMouseEventData(eventStruct, e, target) {
 var idx = eventStruct >> 2;
 SAFE_HEAP_STORE((idx + 0) * 4, e.screenX, 4);
 SAFE_HEAP_STORE((idx + 1) * 4, e.screenY, 4);
 SAFE_HEAP_STORE((idx + 2) * 4, e.clientX, 4);
 SAFE_HEAP_STORE((idx + 3) * 4, e.clientY, 4);
 SAFE_HEAP_STORE((idx + 4) * 4, e.ctrlKey, 4);
 SAFE_HEAP_STORE((idx + 5) * 4, e.shiftKey, 4);
 SAFE_HEAP_STORE((idx + 6) * 4, e.altKey, 4);
 SAFE_HEAP_STORE((idx + 7) * 4, e.metaKey, 4);
 SAFE_HEAP_STORE((idx * 2 + 16) * 2, e.button, 2);
 SAFE_HEAP_STORE((idx * 2 + 17) * 2, e.buttons, 2);
 SAFE_HEAP_STORE((idx + 9) * 4, e["movementX"], 4);
 SAFE_HEAP_STORE((idx + 10) * 4, e["movementY"], 4);
 var rect = getBoundingClientRect(target);
 SAFE_HEAP_STORE((idx + 11) * 4, e.clientX - rect.left, 4);
 SAFE_HEAP_STORE((idx + 12) * 4, e.clientY - rect.top, 4);
}

function registerMouseEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.mouseEvent) JSEvents.mouseEvent = _malloc(64);
 target = findEventTarget(target);
 var mouseEventHandlerFunc = function(ev) {
  var e = ev || event;
  fillMouseEventData(JSEvents.mouseEvent, e, target);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, JSEvents.mouseEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  allowsDeferredCalls: eventTypeString != "mousemove" && eventTypeString != "mouseenter" && eventTypeString != "mouseleave",
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: mouseEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_mousedown_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerMouseEventCallback(target, userData, useCapture, callbackfunc, 5, "mousedown", targetThread);
 return 0;
}

function _emscripten_set_mouseenter_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerMouseEventCallback(target, userData, useCapture, callbackfunc, 33, "mouseenter", targetThread);
 return 0;
}

function _emscripten_set_mouseleave_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerMouseEventCallback(target, userData, useCapture, callbackfunc, 34, "mouseleave", targetThread);
 return 0;
}

function _emscripten_set_mousemove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerMouseEventCallback(target, userData, useCapture, callbackfunc, 8, "mousemove", targetThread);
 return 0;
}

function _emscripten_set_mouseup_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerMouseEventCallback(target, userData, useCapture, callbackfunc, 6, "mouseup", targetThread);
 return 0;
}

function fillPointerlockChangeEventData(eventStruct) {
 var pointerLockElement = document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement || document.msPointerLockElement;
 var isPointerlocked = !!pointerLockElement;
 SAFE_HEAP_STORE(eventStruct | 0, isPointerlocked | 0, 4);
 var nodeName = JSEvents.getNodeNameForTarget(pointerLockElement);
 var id = pointerLockElement && pointerLockElement.id ? pointerLockElement.id : "";
 stringToUTF8(nodeName, eventStruct + 4, 128);
 stringToUTF8(id, eventStruct + 132, 128);
}

function registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.pointerlockChangeEvent) JSEvents.pointerlockChangeEvent = _malloc(260);
 var pointerlockChangeEventHandlerFunc = function(ev) {
  var e = ev || event;
  var pointerlockChangeEvent = JSEvents.pointerlockChangeEvent;
  fillPointerlockChangeEventData(pointerlockChangeEvent);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, pointerlockChangeEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: pointerlockChangeEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_pointerlockchange_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 if (!document || !document.body || !document.body.requestPointerLock && !document.body.mozRequestPointerLock && !document.body.webkitRequestPointerLock && !document.body.msRequestPointerLock) {
  return -1;
 }
 target = findEventTarget(target);
 if (!target) return -4;
 registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "pointerlockchange", targetThread);
 registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "mozpointerlockchange", targetThread);
 registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "webkitpointerlockchange", targetThread);
 registerPointerlockChangeEventCallback(target, userData, useCapture, callbackfunc, 20, "mspointerlockchange", targetThread);
 return 0;
}

function registerUiEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.uiEvent) JSEvents.uiEvent = _malloc(36);
 target = findEventTarget(target);
 var uiEventHandlerFunc = function(ev) {
  var e = ev || event;
  if (e.target != target) {
   return;
  }
  var b = document.body;
  if (!b) {
   return;
  }
  var uiEvent = JSEvents.uiEvent;
  SAFE_HEAP_STORE(uiEvent | 0, e.detail | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 4 | 0, b.clientWidth | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 8 | 0, b.clientHeight | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 12 | 0, innerWidth | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 16 | 0, innerHeight | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 20 | 0, outerWidth | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 24 | 0, outerHeight | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 28 | 0, pageXOffset | 0, 4);
  SAFE_HEAP_STORE(uiEvent + 32 | 0, pageYOffset | 0, 4);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, uiEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: uiEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_resize_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerUiEventCallback(target, userData, useCapture, callbackfunc, 10, "resize", targetThread);
 return 0;
}

function registerTouchEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.touchEvent) JSEvents.touchEvent = _malloc(1684);
 target = findEventTarget(target);
 var touchEventHandlerFunc = function(e) {
  var touches = {};
  var et = e.touches;
  for (var i = 0; i < et.length; ++i) {
   var touch = et[i];
   touches[touch.identifier] = touch;
  }
  et = e.changedTouches;
  for (var i = 0; i < et.length; ++i) {
   var touch = et[i];
   touch.isChanged = 1;
   touches[touch.identifier] = touch;
  }
  et = e.targetTouches;
  for (var i = 0; i < et.length; ++i) {
   touches[et[i].identifier].onTarget = 1;
  }
  var touchEvent = JSEvents.touchEvent;
  var idx = touchEvent >> 2;
  SAFE_HEAP_STORE((idx + 1) * 4, e.ctrlKey, 4);
  SAFE_HEAP_STORE((idx + 2) * 4, e.shiftKey, 4);
  SAFE_HEAP_STORE((idx + 3) * 4, e.altKey, 4);
  SAFE_HEAP_STORE((idx + 4) * 4, e.metaKey, 4);
  idx += 5;
  var targetRect = getBoundingClientRect(target);
  var numTouches = 0;
  for (var i in touches) {
   var t = touches[i];
   SAFE_HEAP_STORE((idx + 0) * 4, t.identifier, 4);
   SAFE_HEAP_STORE((idx + 1) * 4, t.screenX, 4);
   SAFE_HEAP_STORE((idx + 2) * 4, t.screenY, 4);
   SAFE_HEAP_STORE((idx + 3) * 4, t.clientX, 4);
   SAFE_HEAP_STORE((idx + 4) * 4, t.clientY, 4);
   SAFE_HEAP_STORE((idx + 5) * 4, t.pageX, 4);
   SAFE_HEAP_STORE((idx + 6) * 4, t.pageY, 4);
   SAFE_HEAP_STORE((idx + 7) * 4, t.isChanged, 4);
   SAFE_HEAP_STORE((idx + 8) * 4, t.onTarget, 4);
   SAFE_HEAP_STORE((idx + 9) * 4, t.clientX - targetRect.left, 4);
   SAFE_HEAP_STORE((idx + 10) * 4, t.clientY - targetRect.top, 4);
   idx += 13;
   if (++numTouches > 31) {
    break;
   }
  }
  SAFE_HEAP_STORE(touchEvent | 0, numTouches | 0, 4);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, touchEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  allowsDeferredCalls: eventTypeString == "touchstart" || eventTypeString == "touchend",
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: touchEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_touchcancel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerTouchEventCallback(target, userData, useCapture, callbackfunc, 25, "touchcancel", targetThread);
 return 0;
}

function _emscripten_set_touchend_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerTouchEventCallback(target, userData, useCapture, callbackfunc, 23, "touchend", targetThread);
 return 0;
}

function _emscripten_set_touchmove_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerTouchEventCallback(target, userData, useCapture, callbackfunc, 24, "touchmove", targetThread);
 return 0;
}

function _emscripten_set_touchstart_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 registerTouchEventCallback(target, userData, useCapture, callbackfunc, 22, "touchstart", targetThread);
 return 0;
}

function fillVisibilityChangeEventData(eventStruct) {
 var visibilityStates = [ "hidden", "visible", "prerender", "unloaded" ];
 var visibilityState = visibilityStates.indexOf(document.visibilityState);
 SAFE_HEAP_STORE(eventStruct | 0, document.hidden | 0, 4);
 SAFE_HEAP_STORE(eventStruct + 4 | 0, visibilityState | 0, 4);
}

function registerVisibilityChangeEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.visibilityChangeEvent) JSEvents.visibilityChangeEvent = _malloc(8);
 var visibilityChangeEventHandlerFunc = function(ev) {
  var e = ev || event;
  var visibilityChangeEvent = JSEvents.visibilityChangeEvent;
  fillVisibilityChangeEventData(visibilityChangeEvent);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, visibilityChangeEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: visibilityChangeEventHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_visibilitychange_callback_on_thread(userData, useCapture, callbackfunc, targetThread) {
 if (!specialHTMLTargets[1]) {
  return -4;
 }
 registerVisibilityChangeEventCallback(specialHTMLTargets[1], userData, useCapture, callbackfunc, 21, "visibilitychange", targetThread);
 return 0;
}

function registerWheelEventCallback(target, userData, useCapture, callbackfunc, eventTypeId, eventTypeString, targetThread) {
 if (!JSEvents.wheelEvent) JSEvents.wheelEvent = _malloc(96);
 var wheelHandlerFunc = function(ev) {
  var e = ev || event;
  var wheelEvent = JSEvents.wheelEvent;
  fillMouseEventData(wheelEvent, e, target);
  SAFE_HEAP_STORE_D(wheelEvent + 64 | 0, +e["deltaX"], 8);
  SAFE_HEAP_STORE_D(wheelEvent + 72 | 0, +e["deltaY"], 8);
  SAFE_HEAP_STORE_D(wheelEvent + 80 | 0, +e["deltaZ"], 8);
  SAFE_HEAP_STORE(wheelEvent + 88 | 0, e["deltaMode"] | 0, 4);
  if (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackfunc, a1, a2, a3 ]);
  }(eventTypeId, wheelEvent, userData)) e.preventDefault();
 };
 var eventHandler = {
  target: target,
  allowsDeferredCalls: true,
  eventTypeString: eventTypeString,
  callbackfunc: callbackfunc,
  handlerFunc: wheelHandlerFunc,
  useCapture: useCapture
 };
 JSEvents.registerOrRemoveHandler(eventHandler);
}

function _emscripten_set_wheel_callback_on_thread(target, userData, useCapture, callbackfunc, targetThread) {
 target = findEventTarget(target);
 if (typeof target.onwheel !== "undefined") {
  registerWheelEventCallback(target, userData, useCapture, callbackfunc, 9, "wheel", targetThread);
  return 0;
 } else {
  return -1;
 }
}

function _emscripten_sleep(ms) {
 Asyncify.handleSleep(function(wakeUp) {
  Browser.safeSetTimeout(wakeUp, ms);
 });
}

function _emscripten_thread_sleep(msecs) {
 var start = _emscripten_get_now();
 while (_emscripten_get_now() - start < msecs) {}
}

var WS = {
 sockets: [ null ],
 socketEvent: null
};

function _emscripten_websocket_get_ready_state(socketId, readyState) {
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 SAFE_HEAP_STORE(readyState | 0, socket.readyState | 0, 2);
 return 0;
}

function _emscripten_websocket_new(createAttributes) {
 if (typeof WebSocket === "undefined") {
  return -1;
 }
 if (!createAttributes) {
  return -5;
 }
 var createAttrs = createAttributes >> 2;
 var url = UTF8ToString(SAFE_HEAP_LOAD(createAttrs * 4, 4, 0));
 var protocols = SAFE_HEAP_LOAD((createAttrs + 1) * 4, 4, 0);
 var socket = protocols ? new WebSocket(url, UTF8ToString(protocols).split(",")) : new WebSocket(url);
 socket.binaryType = "arraybuffer";
 var socketId = WS.sockets.length;
 WS.sockets[socketId] = socket;
 return socketId;
}

function _emscripten_websocket_send_binary(socketId, binaryData, dataLength) {
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 socket.send(HEAPU8.subarray(binaryData, binaryData + dataLength));
 return 0;
}

function _emscripten_websocket_set_onclose_callback_on_thread(socketId, userData, callbackFunc, thread) {
 if (!WS.socketEvent) WS.socketEvent = _malloc(1024);
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 socket.onclose = function(e) {
  SAFE_HEAP_STORE((WS.socketEvent >> 2) * 4, socketId, 4);
  SAFE_HEAP_STORE((WS.socketEvent + 4 >> 2) * 4, e.wasClean, 4);
  SAFE_HEAP_STORE((WS.socketEvent + 8 >> 2) * 4, e.code, 4);
  stringToUTF8(e.reason, SAFE_HEAP_LOAD((WS.socketEvent + 10 >> 2) * 4, 4, 1), 512);
  (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackFunc, a1, a2, a3 ]);
  })(0, WS.socketEvent, userData);
 };
 return 0;
}

function _emscripten_websocket_set_onerror_callback_on_thread(socketId, userData, callbackFunc, thread) {
 if (!WS.socketEvent) WS.socketEvent = _malloc(1024);
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 socket.onerror = function(e) {
  SAFE_HEAP_STORE((WS.socketEvent >> 2) * 4, socketId, 4);
  (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackFunc, a1, a2, a3 ]);
  })(0, WS.socketEvent, userData);
 };
 return 0;
}

function _emscripten_websocket_set_onmessage_callback_on_thread(socketId, userData, callbackFunc, thread) {
 if (!WS.socketEvent) WS.socketEvent = _malloc(1024);
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 socket.onmessage = function(e) {
  SAFE_HEAP_STORE((WS.socketEvent >> 2) * 4, socketId, 4);
  if (typeof e.data === "string") {
   var len = lengthBytesUTF8(e.data) + 1;
   var buf = _malloc(len);
   stringToUTF8(e.data, buf, len);
   SAFE_HEAP_STORE((WS.socketEvent + 12 >> 2) * 4, 1, 4);
  } else {
   var len = e.data.byteLength;
   var buf = _malloc(len);
   HEAP8.set(new Uint8Array(e.data), buf);
   SAFE_HEAP_STORE((WS.socketEvent + 12 >> 2) * 4, 0, 4);
  }
  SAFE_HEAP_STORE((WS.socketEvent + 4 >> 2) * 4, buf, 4);
  SAFE_HEAP_STORE((WS.socketEvent + 8 >> 2) * 4, len, 4);
  (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackFunc, a1, a2, a3 ]);
  })(0, WS.socketEvent, userData);
  _free(buf);
 };
 return 0;
}

function _emscripten_websocket_set_onopen_callback_on_thread(socketId, userData, callbackFunc, thread) {
 if (!WS.socketEvent) WS.socketEvent = _malloc(1024);
 var socket = WS.sockets[socketId];
 if (!socket) {
  return -3;
 }
 socket.onopen = function(e) {
  SAFE_HEAP_STORE((WS.socketEvent >> 2) * 4, socketId, 4);
  (function(a1, a2, a3) {
   return dynCall_iiii.apply(null, [ callbackFunc, a1, a2, a3 ]);
  })(0, WS.socketEvent, userData);
 };
 return 0;
}

var ENV = {};

function getExecutableName() {
 return thisProgram || "./this.program";
}

function getEnvStrings() {
 if (!getEnvStrings.strings) {
  var lang = (typeof navigator === "object" && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8";
  var env = {
   "USER": "web_user",
   "LOGNAME": "web_user",
   "PATH": "/",
   "PWD": "/",
   "HOME": "/home/web_user",
   "LANG": lang,
   "_": getExecutableName()
  };
  for (var x in ENV) {
   env[x] = ENV[x];
  }
  var strings = [];
  for (var x in env) {
   strings.push(x + "=" + env[x]);
  }
  getEnvStrings.strings = strings;
 }
 return getEnvStrings.strings;
}

function _environ_get(__environ, environ_buf) {
 try {
  var bufSize = 0;
  getEnvStrings().forEach(function(string, i) {
   var ptr = environ_buf + bufSize;
   SAFE_HEAP_STORE(__environ + i * 4 | 0, ptr | 0, 4);
   writeAsciiToMemory(string, ptr);
   bufSize += string.length + 1;
  });
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _environ_sizes_get(penviron_count, penviron_buf_size) {
 try {
  var strings = getEnvStrings();
  SAFE_HEAP_STORE(penviron_count | 0, strings.length | 0, 4);
  var bufSize = 0;
  strings.forEach(function(string) {
   bufSize += string.length + 1;
  });
  SAFE_HEAP_STORE(penviron_buf_size | 0, bufSize | 0, 4);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _fd_close(fd) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  FS.close(stream);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _fd_fdstat_get(fd, pbuf) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var type = stream.tty ? 2 : FS.isDir(stream.mode) ? 3 : FS.isLink(stream.mode) ? 7 : 4;
  SAFE_HEAP_STORE(pbuf | 0, type | 0, 1);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _fd_read(fd, iov, iovcnt, pnum) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = SYSCALLS.doReadv(stream, iov, iovcnt);
  SAFE_HEAP_STORE(pnum | 0, num | 0, 4);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var HIGH_OFFSET = 4294967296;
  var offset = offset_high * HIGH_OFFSET + (offset_low >>> 0);
  var DOUBLE_LIMIT = 9007199254740992;
  if (offset <= -DOUBLE_LIMIT || offset >= DOUBLE_LIMIT) {
   return -61;
  }
  FS.llseek(stream, offset, whence);
  tempI64 = [ stream.position >>> 0, (tempDouble = stream.position, +Math.abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math.min(+Math.floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math.ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0) ], 
  SAFE_HEAP_STORE(newOffset | 0, tempI64[0] | 0, 4), SAFE_HEAP_STORE(newOffset + 4 | 0, tempI64[1] | 0, 4);
  if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _fd_write(fd, iov, iovcnt, pnum) {
 try {
  var stream = SYSCALLS.getStreamFromFD(fd);
  var num = SYSCALLS.doWritev(stream, iov, iovcnt);
  SAFE_HEAP_STORE(pnum | 0, num | 0, 4);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return e.errno;
 }
}

function _gettimeofday(ptr) {
 var now = Date.now();
 SAFE_HEAP_STORE(ptr | 0, now / 1e3 | 0 | 0, 4);
 SAFE_HEAP_STORE(ptr + 4 | 0, now % 1e3 * 1e3 | 0 | 0, 4);
 return 0;
}

function _setTempRet0($i) {
 setTempRet0($i | 0);
}

function _sigaction(signum, act, oldact) {
 return 0;
}

var __sigalrm_handler = 0;

function _signal(sig, func) {
 if (sig == 14) {
  __sigalrm_handler = func;
 } else {}
 return 0;
}

function _system(command) {
 if (ENVIRONMENT_IS_NODE) {
  if (!command) return 1;
  var cmdstr = UTF8ToString(command);
  if (!cmdstr.length) return 0;
  var cp = require("child_process");
  var ret = cp.spawnSync(cmdstr, [], {
   shell: true,
   stdio: "inherit"
  });
  var _W_EXITCODE = function(ret, sig) {
   return ret << 8 | sig;
  };
  if (ret.status === null) {
   var signalToNumber = function(sig) {
    switch (sig) {
    case "SIGHUP":
     return 1;

    case "SIGINT":
     return 2;

    case "SIGQUIT":
     return 3;

    case "SIGFPE":
     return 8;

    case "SIGKILL":
     return 9;

    case "SIGALRM":
     return 14;

    case "SIGTERM":
     return 15;
    }
    return 2;
   };
   return _W_EXITCODE(0, signalToNumber(ret.signal));
  }
  return _W_EXITCODE(ret.status, 0);
 }
 if (!command) return 0;
 setErrNo(6);
 return -1;
}

function _time(ptr) {
 var ret = Date.now() / 1e3 | 0;
 if (ptr) {
  SAFE_HEAP_STORE(ptr | 0, ret | 0, 4);
 }
 return ret;
}

function runAndAbortIfError(func) {
 try {
  return func();
 } catch (e) {
  abort(e);
 }
}

var Asyncify = {
 State: {
  Normal: 0,
  Unwinding: 1,
  Rewinding: 2
 },
 state: 0,
 StackSize: 4096,
 currData: null,
 handleSleepReturnValue: 0,
 exportCallStack: [],
 callStackNameToId: {},
 callStackIdToName: {},
 callStackId: 0,
 afterUnwind: null,
 asyncFinalizers: [],
 sleepCallbacks: [],
 getCallStackId: function(funcName) {
  var id = Asyncify.callStackNameToId[funcName];
  if (id === undefined) {
   id = Asyncify.callStackId++;
   Asyncify.callStackNameToId[funcName] = id;
   Asyncify.callStackIdToName[id] = funcName;
  }
  return id;
 },
 instrumentWasmExports: function(exports) {
  var ret = {};
  for (var x in exports) {
   (function(x) {
    var original = exports[x];
    if (typeof original === "function") {
     ret[x] = function() {
      Asyncify.exportCallStack.push(x);
      try {
       return original.apply(null, arguments);
      } finally {
       if (ABORT) return;
       var y = Asyncify.exportCallStack.pop();
       assert(y === x);
       Asyncify.maybeStopUnwind();
      }
     };
    } else {
     ret[x] = original;
    }
   })(x);
  }
  return ret;
 },
 maybeStopUnwind: function() {
  if (Asyncify.currData && Asyncify.state === Asyncify.State.Unwinding && Asyncify.exportCallStack.length === 0) {
   Asyncify.state = Asyncify.State.Normal;
   runAndAbortIfError(Module["_asyncify_stop_unwind"]);
   if (typeof Fibers !== "undefined") {
    Fibers.trampoline();
   }
   if (Asyncify.afterUnwind) {
    Asyncify.afterUnwind();
    Asyncify.afterUnwind = null;
   }
  }
 },
 allocateData: function() {
  var ptr = _malloc(12 + Asyncify.StackSize);
  Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
  Asyncify.setDataRewindFunc(ptr);
  return ptr;
 },
 setDataHeader: function(ptr, stack, stackSize) {
  SAFE_HEAP_STORE(ptr | 0, stack | 0, 4);
  SAFE_HEAP_STORE(ptr + 4 | 0, stack + stackSize | 0, 4);
 },
 setDataRewindFunc: function(ptr) {
  var bottomOfCallStack = Asyncify.exportCallStack[0];
  var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
  SAFE_HEAP_STORE(ptr + 8 | 0, rewindId | 0, 4);
 },
 getDataRewindFunc: function(ptr) {
  var id = SAFE_HEAP_LOAD(ptr + 8 | 0, 4, 0) | 0;
  var name = Asyncify.callStackIdToName[id];
  var func = Module["asm"][name];
  return func;
 },
 handleSleep: function(startAsync) {
  if (ABORT) return;
  noExitRuntime = true;
  if (Asyncify.state === Asyncify.State.Normal) {
   var reachedCallback = false;
   var reachedAfterCallback = false;
   startAsync(function(handleSleepReturnValue) {
    if (ABORT) return;
    Asyncify.handleSleepReturnValue = handleSleepReturnValue || 0;
    reachedCallback = true;
    if (!reachedAfterCallback) {
     return;
    }
    Asyncify.state = Asyncify.State.Rewinding;
    runAndAbortIfError(function() {
     Module["_asyncify_start_rewind"](Asyncify.currData);
    });
    if (typeof Browser !== "undefined" && Browser.mainLoop.func) {
     Browser.mainLoop.resume();
    }
    var start = Asyncify.getDataRewindFunc(Asyncify.currData);
    var asyncWasmReturnValue = start();
    if (!Asyncify.currData) {
     var asyncFinalizers = Asyncify.asyncFinalizers;
     Asyncify.asyncFinalizers = [];
     asyncFinalizers.forEach(function(func) {
      func(asyncWasmReturnValue);
     });
    }
   });
   reachedAfterCallback = true;
   if (!reachedCallback) {
    Asyncify.state = Asyncify.State.Unwinding;
    Asyncify.currData = Asyncify.allocateData();
    runAndAbortIfError(function() {
     Module["_asyncify_start_unwind"](Asyncify.currData);
    });
    if (typeof Browser !== "undefined" && Browser.mainLoop.func) {
     Browser.mainLoop.pause();
    }
   }
  } else if (Asyncify.state === Asyncify.State.Rewinding) {
   Asyncify.state = Asyncify.State.Normal;
   runAndAbortIfError(Module["_asyncify_stop_rewind"]);
   _free(Asyncify.currData);
   Asyncify.currData = null;
   Asyncify.sleepCallbacks.forEach(function(func) {
    func();
   });
  } else {
   abort("invalid state: " + Asyncify.state);
  }
  return Asyncify.handleSleepReturnValue;
 },
 handleAsync: function(startAsync) {
  return Asyncify.handleSleep(function(wakeUp) {
   startAsync().then(wakeUp);
  });
 }
};

var FSNode = function(parent, name, mode, rdev) {
 if (!parent) {
  parent = this;
 }
 this.parent = parent;
 this.mount = parent.mount;
 this.mounted = null;
 this.id = FS.nextInode++;
 this.name = name;
 this.mode = mode;
 this.node_ops = {};
 this.stream_ops = {};
 this.rdev = rdev;
};

var readMode = 292 | 73;

var writeMode = 146;

Object.defineProperties(FSNode.prototype, {
 read: {
  get: function() {
   return (this.mode & readMode) === readMode;
  },
  set: function(val) {
   val ? this.mode |= readMode : this.mode &= ~readMode;
  }
 },
 write: {
  get: function() {
   return (this.mode & writeMode) === writeMode;
  },
  set: function(val) {
   val ? this.mode |= writeMode : this.mode &= ~writeMode;
  }
 },
 isFolder: {
  get: function() {
   return FS.isDir(this.mode);
  }
 },
 isDevice: {
  get: function() {
   return FS.isChrdev(this.mode);
  }
 }
});

FS.FSNode = FSNode;

FS.staticInit();

Module["FS_createPath"] = FS.createPath;

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

Module["FS_createLazyFile"] = FS.createLazyFile;

Module["FS_createDevice"] = FS.createDevice;

Module["FS_unlink"] = FS.unlink;

Module["requestFullscreen"] = function Module_requestFullscreen(lockPointer, resizeCanvas) {
 Browser.requestFullscreen(lockPointer, resizeCanvas);
};

Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
 Browser.requestAnimationFrame(func);
};

Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
 Browser.setCanvasSize(width, height, noUpdates);
};

Module["pauseMainLoop"] = function Module_pauseMainLoop() {
 Browser.mainLoop.pause();
};

Module["resumeMainLoop"] = function Module_resumeMainLoop() {
 Browser.mainLoop.resume();
};

Module["getUserMedia"] = function Module_getUserMedia() {
 Browser.getUserMedia();
};

Module["createContext"] = function Module_createContext(canvas, useWebGL, setInModule, webGLContextAttributes) {
 return Browser.createContext(canvas, useWebGL, setInModule, webGLContextAttributes);
};

var GLctx;

for (var i = 0; i < 32; ++i) tempFixedLengthArray.push(new Array(i));

var miniTempWebGLFloatBuffersStorage = new Float32Array(288);

for (var i = 0; i < 288; ++i) {
 miniTempWebGLFloatBuffers[i] = miniTempWebGLFloatBuffersStorage.subarray(0, i + 1);
}

var __miniTempWebGLIntBuffersStorage = new Int32Array(288);

for (var i = 0; i < 288; ++i) {
 __miniTempWebGLIntBuffers[i] = __miniTempWebGLIntBuffersStorage.subarray(0, i + 1);
}

var ASSERTIONS = false;

function intArrayFromString(stringy, dontAddNull, length) {
 var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
 var u8array = new Array(len);
 var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
 if (dontAddNull) u8array.length = numBytesWritten;
 return u8array;
}

function intArrayToString(array) {
 var ret = [];
 for (var i = 0; i < array.length; i++) {
  var chr = array[i];
  if (chr > 255) {
   if (ASSERTIONS) {
    assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
   }
   chr &= 255;
  }
  ret.push(String.fromCharCode(chr));
 }
 return ret.join("");
}

var asmLibraryArg = {
 "__assert_fail": ___assert_fail,
 "__sys_fcntl64": ___sys_fcntl64,
 "__sys_getdents64": ___sys_getdents64,
 "__sys_ioctl": ___sys_ioctl,
 "__sys_mkdir": ___sys_mkdir,
 "__sys_mmap2": ___sys_mmap2,
 "__sys_munmap": ___sys_munmap,
 "__sys_open": ___sys_open,
 "__sys_rename": ___sys_rename,
 "__sys_rmdir": ___sys_rmdir,
 "__sys_stat64": ___sys_stat64,
 "__sys_unlink": ___sys_unlink,
 "alignfault": alignfault,
 "clock_gettime": _clock_gettime,
 "dlclose": _dlclose,
 "eglBindAPI": _eglBindAPI,
 "eglChooseConfig": _eglChooseConfig,
 "eglCreateContext": _eglCreateContext,
 "eglCreateWindowSurface": _eglCreateWindowSurface,
 "eglDestroyContext": _eglDestroyContext,
 "eglDestroySurface": _eglDestroySurface,
 "eglGetConfigAttrib": _eglGetConfigAttrib,
 "eglGetDisplay": _eglGetDisplay,
 "eglGetError": _eglGetError,
 "eglInitialize": _eglInitialize,
 "eglMakeCurrent": _eglMakeCurrent,
 "eglQueryString": _eglQueryString,
 "eglSwapBuffers": _eglSwapBuffers,
 "eglSwapInterval": _eglSwapInterval,
 "eglTerminate": _eglTerminate,
 "eglWaitGL": _eglWaitGL,
 "eglWaitNative": _eglWaitNative,
 "emscripten_asm_const_int": _emscripten_asm_const_int,
 "emscripten_cancel_main_loop": _emscripten_cancel_main_loop,
 "emscripten_exit_fullscreen": _emscripten_exit_fullscreen,
 "emscripten_exit_pointerlock": _emscripten_exit_pointerlock,
 "emscripten_force_exit": _emscripten_force_exit,
 "emscripten_get_device_pixel_ratio": _emscripten_get_device_pixel_ratio,
 "emscripten_get_element_css_size": _emscripten_get_element_css_size,
 "emscripten_get_fullscreen_status": _emscripten_get_fullscreen_status,
 "emscripten_get_gamepad_status": _emscripten_get_gamepad_status,
 "emscripten_get_num_gamepads": _emscripten_get_num_gamepads,
 "emscripten_glActiveTexture": _emscripten_glActiveTexture,
 "emscripten_glAttachShader": _emscripten_glAttachShader,
 "emscripten_glBeginQueryEXT": _emscripten_glBeginQueryEXT,
 "emscripten_glBindAttribLocation": _emscripten_glBindAttribLocation,
 "emscripten_glBindBuffer": _emscripten_glBindBuffer,
 "emscripten_glBindFramebuffer": _emscripten_glBindFramebuffer,
 "emscripten_glBindRenderbuffer": _emscripten_glBindRenderbuffer,
 "emscripten_glBindTexture": _emscripten_glBindTexture,
 "emscripten_glBindVertexArrayOES": _emscripten_glBindVertexArrayOES,
 "emscripten_glBlendColor": _emscripten_glBlendColor,
 "emscripten_glBlendEquation": _emscripten_glBlendEquation,
 "emscripten_glBlendEquationSeparate": _emscripten_glBlendEquationSeparate,
 "emscripten_glBlendFunc": _emscripten_glBlendFunc,
 "emscripten_glBlendFuncSeparate": _emscripten_glBlendFuncSeparate,
 "emscripten_glBufferData": _emscripten_glBufferData,
 "emscripten_glBufferSubData": _emscripten_glBufferSubData,
 "emscripten_glCheckFramebufferStatus": _emscripten_glCheckFramebufferStatus,
 "emscripten_glClear": _emscripten_glClear,
 "emscripten_glClearColor": _emscripten_glClearColor,
 "emscripten_glClearDepthf": _emscripten_glClearDepthf,
 "emscripten_glClearStencil": _emscripten_glClearStencil,
 "emscripten_glColorMask": _emscripten_glColorMask,
 "emscripten_glCompileShader": _emscripten_glCompileShader,
 "emscripten_glCompressedTexImage2D": _emscripten_glCompressedTexImage2D,
 "emscripten_glCompressedTexSubImage2D": _emscripten_glCompressedTexSubImage2D,
 "emscripten_glCopyTexImage2D": _emscripten_glCopyTexImage2D,
 "emscripten_glCopyTexSubImage2D": _emscripten_glCopyTexSubImage2D,
 "emscripten_glCreateProgram": _emscripten_glCreateProgram,
 "emscripten_glCreateShader": _emscripten_glCreateShader,
 "emscripten_glCullFace": _emscripten_glCullFace,
 "emscripten_glDeleteBuffers": _emscripten_glDeleteBuffers,
 "emscripten_glDeleteFramebuffers": _emscripten_glDeleteFramebuffers,
 "emscripten_glDeleteProgram": _emscripten_glDeleteProgram,
 "emscripten_glDeleteQueriesEXT": _emscripten_glDeleteQueriesEXT,
 "emscripten_glDeleteRenderbuffers": _emscripten_glDeleteRenderbuffers,
 "emscripten_glDeleteShader": _emscripten_glDeleteShader,
 "emscripten_glDeleteTextures": _emscripten_glDeleteTextures,
 "emscripten_glDeleteVertexArraysOES": _emscripten_glDeleteVertexArraysOES,
 "emscripten_glDepthFunc": _emscripten_glDepthFunc,
 "emscripten_glDepthMask": _emscripten_glDepthMask,
 "emscripten_glDepthRangef": _emscripten_glDepthRangef,
 "emscripten_glDetachShader": _emscripten_glDetachShader,
 "emscripten_glDisable": _emscripten_glDisable,
 "emscripten_glDisableVertexAttribArray": _emscripten_glDisableVertexAttribArray,
 "emscripten_glDrawArrays": _emscripten_glDrawArrays,
 "emscripten_glDrawArraysInstancedANGLE": _emscripten_glDrawArraysInstancedANGLE,
 "emscripten_glDrawBuffersWEBGL": _emscripten_glDrawBuffersWEBGL,
 "emscripten_glDrawElements": _emscripten_glDrawElements,
 "emscripten_glDrawElementsInstancedANGLE": _emscripten_glDrawElementsInstancedANGLE,
 "emscripten_glEnable": _emscripten_glEnable,
 "emscripten_glEnableVertexAttribArray": _emscripten_glEnableVertexAttribArray,
 "emscripten_glEndQueryEXT": _emscripten_glEndQueryEXT,
 "emscripten_glFinish": _emscripten_glFinish,
 "emscripten_glFlush": _emscripten_glFlush,
 "emscripten_glFramebufferRenderbuffer": _emscripten_glFramebufferRenderbuffer,
 "emscripten_glFramebufferTexture2D": _emscripten_glFramebufferTexture2D,
 "emscripten_glFrontFace": _emscripten_glFrontFace,
 "emscripten_glGenBuffers": _emscripten_glGenBuffers,
 "emscripten_glGenFramebuffers": _emscripten_glGenFramebuffers,
 "emscripten_glGenQueriesEXT": _emscripten_glGenQueriesEXT,
 "emscripten_glGenRenderbuffers": _emscripten_glGenRenderbuffers,
 "emscripten_glGenTextures": _emscripten_glGenTextures,
 "emscripten_glGenVertexArraysOES": _emscripten_glGenVertexArraysOES,
 "emscripten_glGenerateMipmap": _emscripten_glGenerateMipmap,
 "emscripten_glGetActiveAttrib": _emscripten_glGetActiveAttrib,
 "emscripten_glGetActiveUniform": _emscripten_glGetActiveUniform,
 "emscripten_glGetAttachedShaders": _emscripten_glGetAttachedShaders,
 "emscripten_glGetAttribLocation": _emscripten_glGetAttribLocation,
 "emscripten_glGetBooleanv": _emscripten_glGetBooleanv,
 "emscripten_glGetBufferParameteriv": _emscripten_glGetBufferParameteriv,
 "emscripten_glGetError": _emscripten_glGetError,
 "emscripten_glGetFloatv": _emscripten_glGetFloatv,
 "emscripten_glGetFramebufferAttachmentParameteriv": _emscripten_glGetFramebufferAttachmentParameteriv,
 "emscripten_glGetIntegerv": _emscripten_glGetIntegerv,
 "emscripten_glGetProgramInfoLog": _emscripten_glGetProgramInfoLog,
 "emscripten_glGetProgramiv": _emscripten_glGetProgramiv,
 "emscripten_glGetQueryObjecti64vEXT": _emscripten_glGetQueryObjecti64vEXT,
 "emscripten_glGetQueryObjectivEXT": _emscripten_glGetQueryObjectivEXT,
 "emscripten_glGetQueryObjectui64vEXT": _emscripten_glGetQueryObjectui64vEXT,
 "emscripten_glGetQueryObjectuivEXT": _emscripten_glGetQueryObjectuivEXT,
 "emscripten_glGetQueryivEXT": _emscripten_glGetQueryivEXT,
 "emscripten_glGetRenderbufferParameteriv": _emscripten_glGetRenderbufferParameteriv,
 "emscripten_glGetShaderInfoLog": _emscripten_glGetShaderInfoLog,
 "emscripten_glGetShaderPrecisionFormat": _emscripten_glGetShaderPrecisionFormat,
 "emscripten_glGetShaderSource": _emscripten_glGetShaderSource,
 "emscripten_glGetShaderiv": _emscripten_glGetShaderiv,
 "emscripten_glGetString": _emscripten_glGetString,
 "emscripten_glGetTexParameterfv": _emscripten_glGetTexParameterfv,
 "emscripten_glGetTexParameteriv": _emscripten_glGetTexParameteriv,
 "emscripten_glGetUniformLocation": _emscripten_glGetUniformLocation,
 "emscripten_glGetUniformfv": _emscripten_glGetUniformfv,
 "emscripten_glGetUniformiv": _emscripten_glGetUniformiv,
 "emscripten_glGetVertexAttribPointerv": _emscripten_glGetVertexAttribPointerv,
 "emscripten_glGetVertexAttribfv": _emscripten_glGetVertexAttribfv,
 "emscripten_glGetVertexAttribiv": _emscripten_glGetVertexAttribiv,
 "emscripten_glHint": _emscripten_glHint,
 "emscripten_glIsBuffer": _emscripten_glIsBuffer,
 "emscripten_glIsEnabled": _emscripten_glIsEnabled,
 "emscripten_glIsFramebuffer": _emscripten_glIsFramebuffer,
 "emscripten_glIsProgram": _emscripten_glIsProgram,
 "emscripten_glIsQueryEXT": _emscripten_glIsQueryEXT,
 "emscripten_glIsRenderbuffer": _emscripten_glIsRenderbuffer,
 "emscripten_glIsShader": _emscripten_glIsShader,
 "emscripten_glIsTexture": _emscripten_glIsTexture,
 "emscripten_glIsVertexArrayOES": _emscripten_glIsVertexArrayOES,
 "emscripten_glLineWidth": _emscripten_glLineWidth,
 "emscripten_glLinkProgram": _emscripten_glLinkProgram,
 "emscripten_glPixelStorei": _emscripten_glPixelStorei,
 "emscripten_glPolygonOffset": _emscripten_glPolygonOffset,
 "emscripten_glQueryCounterEXT": _emscripten_glQueryCounterEXT,
 "emscripten_glReadPixels": _emscripten_glReadPixels,
 "emscripten_glReleaseShaderCompiler": _emscripten_glReleaseShaderCompiler,
 "emscripten_glRenderbufferStorage": _emscripten_glRenderbufferStorage,
 "emscripten_glSampleCoverage": _emscripten_glSampleCoverage,
 "emscripten_glScissor": _emscripten_glScissor,
 "emscripten_glShaderBinary": _emscripten_glShaderBinary,
 "emscripten_glShaderSource": _emscripten_glShaderSource,
 "emscripten_glStencilFunc": _emscripten_glStencilFunc,
 "emscripten_glStencilFuncSeparate": _emscripten_glStencilFuncSeparate,
 "emscripten_glStencilMask": _emscripten_glStencilMask,
 "emscripten_glStencilMaskSeparate": _emscripten_glStencilMaskSeparate,
 "emscripten_glStencilOp": _emscripten_glStencilOp,
 "emscripten_glStencilOpSeparate": _emscripten_glStencilOpSeparate,
 "emscripten_glTexImage2D": _emscripten_glTexImage2D,
 "emscripten_glTexParameterf": _emscripten_glTexParameterf,
 "emscripten_glTexParameterfv": _emscripten_glTexParameterfv,
 "emscripten_glTexParameteri": _emscripten_glTexParameteri,
 "emscripten_glTexParameteriv": _emscripten_glTexParameteriv,
 "emscripten_glTexSubImage2D": _emscripten_glTexSubImage2D,
 "emscripten_glUniform1f": _emscripten_glUniform1f,
 "emscripten_glUniform1fv": _emscripten_glUniform1fv,
 "emscripten_glUniform1i": _emscripten_glUniform1i,
 "emscripten_glUniform1iv": _emscripten_glUniform1iv,
 "emscripten_glUniform2f": _emscripten_glUniform2f,
 "emscripten_glUniform2fv": _emscripten_glUniform2fv,
 "emscripten_glUniform2i": _emscripten_glUniform2i,
 "emscripten_glUniform2iv": _emscripten_glUniform2iv,
 "emscripten_glUniform3f": _emscripten_glUniform3f,
 "emscripten_glUniform3fv": _emscripten_glUniform3fv,
 "emscripten_glUniform3i": _emscripten_glUniform3i,
 "emscripten_glUniform3iv": _emscripten_glUniform3iv,
 "emscripten_glUniform4f": _emscripten_glUniform4f,
 "emscripten_glUniform4fv": _emscripten_glUniform4fv,
 "emscripten_glUniform4i": _emscripten_glUniform4i,
 "emscripten_glUniform4iv": _emscripten_glUniform4iv,
 "emscripten_glUniformMatrix2fv": _emscripten_glUniformMatrix2fv,
 "emscripten_glUniformMatrix3fv": _emscripten_glUniformMatrix3fv,
 "emscripten_glUniformMatrix4fv": _emscripten_glUniformMatrix4fv,
 "emscripten_glUseProgram": _emscripten_glUseProgram,
 "emscripten_glValidateProgram": _emscripten_glValidateProgram,
 "emscripten_glVertexAttrib1f": _emscripten_glVertexAttrib1f,
 "emscripten_glVertexAttrib1fv": _emscripten_glVertexAttrib1fv,
 "emscripten_glVertexAttrib2f": _emscripten_glVertexAttrib2f,
 "emscripten_glVertexAttrib2fv": _emscripten_glVertexAttrib2fv,
 "emscripten_glVertexAttrib3f": _emscripten_glVertexAttrib3f,
 "emscripten_glVertexAttrib3fv": _emscripten_glVertexAttrib3fv,
 "emscripten_glVertexAttrib4f": _emscripten_glVertexAttrib4f,
 "emscripten_glVertexAttrib4fv": _emscripten_glVertexAttrib4fv,
 "emscripten_glVertexAttribDivisorANGLE": _emscripten_glVertexAttribDivisorANGLE,
 "emscripten_glVertexAttribPointer": _emscripten_glVertexAttribPointer,
 "emscripten_glViewport": _emscripten_glViewport,
 "emscripten_has_asyncify": _emscripten_has_asyncify,
 "emscripten_memcpy_big": _emscripten_memcpy_big,
 "emscripten_request_fullscreen": _emscripten_request_fullscreen,
 "emscripten_request_fullscreen_strategy": _emscripten_request_fullscreen_strategy,
 "emscripten_request_pointerlock": _emscripten_request_pointerlock,
 "emscripten_resize_heap": _emscripten_resize_heap,
 "emscripten_sample_gamepad_data": _emscripten_sample_gamepad_data,
 "emscripten_set_beforeunload_callback_on_thread": _emscripten_set_beforeunload_callback_on_thread,
 "emscripten_set_blur_callback_on_thread": _emscripten_set_blur_callback_on_thread,
 "emscripten_set_canvas_element_size": _emscripten_set_canvas_element_size,
 "emscripten_set_element_css_size": _emscripten_set_element_css_size,
 "emscripten_set_focus_callback_on_thread": _emscripten_set_focus_callback_on_thread,
 "emscripten_set_fullscreenchange_callback_on_thread": _emscripten_set_fullscreenchange_callback_on_thread,
 "emscripten_set_gamepadconnected_callback_on_thread": _emscripten_set_gamepadconnected_callback_on_thread,
 "emscripten_set_gamepaddisconnected_callback_on_thread": _emscripten_set_gamepaddisconnected_callback_on_thread,
 "emscripten_set_keydown_callback_on_thread": _emscripten_set_keydown_callback_on_thread,
 "emscripten_set_keypress_callback_on_thread": _emscripten_set_keypress_callback_on_thread,
 "emscripten_set_keyup_callback_on_thread": _emscripten_set_keyup_callback_on_thread,
 "emscripten_set_main_loop": _emscripten_set_main_loop,
 "emscripten_set_mousedown_callback_on_thread": _emscripten_set_mousedown_callback_on_thread,
 "emscripten_set_mouseenter_callback_on_thread": _emscripten_set_mouseenter_callback_on_thread,
 "emscripten_set_mouseleave_callback_on_thread": _emscripten_set_mouseleave_callback_on_thread,
 "emscripten_set_mousemove_callback_on_thread": _emscripten_set_mousemove_callback_on_thread,
 "emscripten_set_mouseup_callback_on_thread": _emscripten_set_mouseup_callback_on_thread,
 "emscripten_set_pointerlockchange_callback_on_thread": _emscripten_set_pointerlockchange_callback_on_thread,
 "emscripten_set_resize_callback_on_thread": _emscripten_set_resize_callback_on_thread,
 "emscripten_set_touchcancel_callback_on_thread": _emscripten_set_touchcancel_callback_on_thread,
 "emscripten_set_touchend_callback_on_thread": _emscripten_set_touchend_callback_on_thread,
 "emscripten_set_touchmove_callback_on_thread": _emscripten_set_touchmove_callback_on_thread,
 "emscripten_set_touchstart_callback_on_thread": _emscripten_set_touchstart_callback_on_thread,
 "emscripten_set_visibilitychange_callback_on_thread": _emscripten_set_visibilitychange_callback_on_thread,
 "emscripten_set_wheel_callback_on_thread": _emscripten_set_wheel_callback_on_thread,
 "emscripten_sleep": _emscripten_sleep,
 "emscripten_thread_sleep": _emscripten_thread_sleep,
 "emscripten_websocket_get_ready_state": _emscripten_websocket_get_ready_state,
 "emscripten_websocket_new": _emscripten_websocket_new,
 "emscripten_websocket_send_binary": _emscripten_websocket_send_binary,
 "emscripten_websocket_set_onclose_callback_on_thread": _emscripten_websocket_set_onclose_callback_on_thread,
 "emscripten_websocket_set_onerror_callback_on_thread": _emscripten_websocket_set_onerror_callback_on_thread,
 "emscripten_websocket_set_onmessage_callback_on_thread": _emscripten_websocket_set_onmessage_callback_on_thread,
 "emscripten_websocket_set_onopen_callback_on_thread": _emscripten_websocket_set_onopen_callback_on_thread,
 "environ_get": _environ_get,
 "environ_sizes_get": _environ_sizes_get,
 "exit": _exit,
 "fd_close": _fd_close,
 "fd_fdstat_get": _fd_fdstat_get,
 "fd_read": _fd_read,
 "fd_seek": _fd_seek,
 "fd_write": _fd_write,
 "gettimeofday": _gettimeofday,
 "segfault": segfault,
 "setTempRet0": _setTempRet0,
 "sigaction": _sigaction,
 "signal": _signal,
 "system": _system,
 "time": _time
};

var asm = createWasm();

var ___wasm_call_ctors = Module["___wasm_call_ctors"] = function() {
 return (___wasm_call_ctors = Module["___wasm_call_ctors"] = Module["asm"]["__wasm_call_ctors"]).apply(null, arguments);
};

var _main = Module["_main"] = function() {
 return (_main = Module["_main"] = Module["asm"]["main"]).apply(null, arguments);
};

var _malloc = Module["_malloc"] = function() {
 return (_malloc = Module["_malloc"] = Module["asm"]["malloc"]).apply(null, arguments);
};

var _fflush = Module["_fflush"] = function() {
 return (_fflush = Module["_fflush"] = Module["asm"]["fflush"]).apply(null, arguments);
};

var _memset = Module["_memset"] = function() {
 return (_memset = Module["_memset"] = Module["asm"]["memset"]).apply(null, arguments);
};

var _free = Module["_free"] = function() {
 return (_free = Module["_free"] = Module["asm"]["free"]).apply(null, arguments);
};

var ___errno_location = Module["___errno_location"] = function() {
 return (___errno_location = Module["___errno_location"] = Module["asm"]["__errno_location"]).apply(null, arguments);
};

var _memcpy = Module["_memcpy"] = function() {
 return (_memcpy = Module["_memcpy"] = Module["asm"]["memcpy"]).apply(null, arguments);
};

var _htons = Module["_htons"] = function() {
 return (_htons = Module["_htons"] = Module["asm"]["htons"]).apply(null, arguments);
};

var _ntohs = Module["_ntohs"] = function() {
 return (_ntohs = Module["_ntohs"] = Module["asm"]["ntohs"]).apply(null, arguments);
};

var stackSave = Module["stackSave"] = function() {
 return (stackSave = Module["stackSave"] = Module["asm"]["stackSave"]).apply(null, arguments);
};

var stackRestore = Module["stackRestore"] = function() {
 return (stackRestore = Module["stackRestore"] = Module["asm"]["stackRestore"]).apply(null, arguments);
};

var stackAlloc = Module["stackAlloc"] = function() {
 return (stackAlloc = Module["stackAlloc"] = Module["asm"]["stackAlloc"]).apply(null, arguments);
};

var _emscripten_stack_init = Module["_emscripten_stack_init"] = function() {
 return (_emscripten_stack_init = Module["_emscripten_stack_init"] = Module["asm"]["emscripten_stack_init"]).apply(null, arguments);
};

var _emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = function() {
 return (_emscripten_stack_set_limits = Module["_emscripten_stack_set_limits"] = Module["asm"]["emscripten_stack_set_limits"]).apply(null, arguments);
};

var _emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = function() {
 return (_emscripten_stack_get_free = Module["_emscripten_stack_get_free"] = Module["asm"]["emscripten_stack_get_free"]).apply(null, arguments);
};

var _emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = function() {
 return (_emscripten_stack_get_base = Module["_emscripten_stack_get_base"] = Module["asm"]["emscripten_stack_get_base"]).apply(null, arguments);
};

var _emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = function() {
 return (_emscripten_stack_get_end = Module["_emscripten_stack_get_end"] = Module["asm"]["emscripten_stack_get_end"]).apply(null, arguments);
};

var _sbrk = Module["_sbrk"] = function() {
 return (_sbrk = Module["_sbrk"] = Module["asm"]["sbrk"]).apply(null, arguments);
};

var _memalign = Module["_memalign"] = function() {
 return (_memalign = Module["_memalign"] = Module["asm"]["memalign"]).apply(null, arguments);
};

var _emscripten_get_sbrk_ptr = Module["_emscripten_get_sbrk_ptr"] = function() {
 return (_emscripten_get_sbrk_ptr = Module["_emscripten_get_sbrk_ptr"] = Module["asm"]["emscripten_get_sbrk_ptr"]).apply(null, arguments);
};

var dynCall_v = Module["dynCall_v"] = function() {
 return (dynCall_v = Module["dynCall_v"] = Module["asm"]["dynCall_v"]).apply(null, arguments);
};

var dynCall_viiii = Module["dynCall_viiii"] = function() {
 return (dynCall_viiii = Module["dynCall_viiii"] = Module["asm"]["dynCall_viiii"]).apply(null, arguments);
};

var dynCall_i = Module["dynCall_i"] = function() {
 return (dynCall_i = Module["dynCall_i"] = Module["asm"]["dynCall_i"]).apply(null, arguments);
};

var dynCall_vi = Module["dynCall_vi"] = function() {
 return (dynCall_vi = Module["dynCall_vi"] = Module["asm"]["dynCall_vi"]).apply(null, arguments);
};

var dynCall_iii = Module["dynCall_iii"] = function() {
 return (dynCall_iii = Module["dynCall_iii"] = Module["asm"]["dynCall_iii"]).apply(null, arguments);
};

var dynCall_vii = Module["dynCall_vii"] = function() {
 return (dynCall_vii = Module["dynCall_vii"] = Module["asm"]["dynCall_vii"]).apply(null, arguments);
};

var dynCall_ii = Module["dynCall_ii"] = function() {
 return (dynCall_ii = Module["dynCall_ii"] = Module["asm"]["dynCall_ii"]).apply(null, arguments);
};

var dynCall_viii = Module["dynCall_viii"] = function() {
 return (dynCall_viii = Module["dynCall_viii"] = Module["asm"]["dynCall_viii"]).apply(null, arguments);
};

var dynCall_iiiiii = Module["dynCall_iiiiii"] = function() {
 return (dynCall_iiiiii = Module["dynCall_iiiiii"] = Module["asm"]["dynCall_iiiiii"]).apply(null, arguments);
};

var dynCall_iiii = Module["dynCall_iiii"] = function() {
 return (dynCall_iiii = Module["dynCall_iiii"] = Module["asm"]["dynCall_iiii"]).apply(null, arguments);
};

var dynCall_iiiii = Module["dynCall_iiiii"] = function() {
 return (dynCall_iiiii = Module["dynCall_iiiii"] = Module["asm"]["dynCall_iiiii"]).apply(null, arguments);
};

var dynCall_vjii = Module["dynCall_vjii"] = function() {
 return (dynCall_vjii = Module["dynCall_vjii"] = Module["asm"]["dynCall_vjii"]).apply(null, arguments);
};

var dynCall_vf = Module["dynCall_vf"] = function() {
 return (dynCall_vf = Module["dynCall_vf"] = Module["asm"]["dynCall_vf"]).apply(null, arguments);
};

var dynCall_iiji = Module["dynCall_iiji"] = function() {
 return (dynCall_iiji = Module["dynCall_iiji"] = Module["asm"]["dynCall_iiji"]).apply(null, arguments);
};

var dynCall_iid = Module["dynCall_iid"] = function() {
 return (dynCall_iid = Module["dynCall_iid"] = Module["asm"]["dynCall_iid"]).apply(null, arguments);
};

var dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = function() {
 return (dynCall_iiiiiiiii = Module["dynCall_iiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiii"]).apply(null, arguments);
};

var dynCall_jiji = Module["dynCall_jiji"] = function() {
 return (dynCall_jiji = Module["dynCall_jiji"] = Module["asm"]["dynCall_jiji"]).apply(null, arguments);
};

var dynCall_ji = Module["dynCall_ji"] = function() {
 return (dynCall_ji = Module["dynCall_ji"] = Module["asm"]["dynCall_ji"]).apply(null, arguments);
};

var dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = function() {
 return (dynCall_iiiiiiiiii = Module["dynCall_iiiiiiiiii"] = Module["asm"]["dynCall_iiiiiiiiii"]).apply(null, arguments);
};

var dynCall_iiiiiidii = Module["dynCall_iiiiiidii"] = function() {
 return (dynCall_iiiiiidii = Module["dynCall_iiiiiidii"] = Module["asm"]["dynCall_iiiiiidii"]).apply(null, arguments);
};

var dynCall_viiiiiii = Module["dynCall_viiiiiii"] = function() {
 return (dynCall_viiiiiii = Module["dynCall_viiiiiii"] = Module["asm"]["dynCall_viiiiiii"]).apply(null, arguments);
};

var dynCall_viiiiiiiiiii = Module["dynCall_viiiiiiiiiii"] = function() {
 return (dynCall_viiiiiiiiiii = Module["dynCall_viiiiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiiiii"]).apply(null, arguments);
};

var dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = function() {
 return (dynCall_iiiiiiii = Module["dynCall_iiiiiiii"] = Module["asm"]["dynCall_iiiiiiii"]).apply(null, arguments);
};

var dynCall_viiiii = Module["dynCall_viiiii"] = function() {
 return (dynCall_viiiii = Module["dynCall_viiiii"] = Module["asm"]["dynCall_viiiii"]).apply(null, arguments);
};

var dynCall_vffff = Module["dynCall_vffff"] = function() {
 return (dynCall_vffff = Module["dynCall_vffff"] = Module["asm"]["dynCall_vffff"]).apply(null, arguments);
};

var dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = function() {
 return (dynCall_viiiiiiii = Module["dynCall_viiiiiiii"] = Module["asm"]["dynCall_viiiiiiii"]).apply(null, arguments);
};

var dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = function() {
 return (dynCall_viiiiiiiii = Module["dynCall_viiiiiiiii"] = Module["asm"]["dynCall_viiiiiiiii"]).apply(null, arguments);
};

var dynCall_vff = Module["dynCall_vff"] = function() {
 return (dynCall_vff = Module["dynCall_vff"] = Module["asm"]["dynCall_vff"]).apply(null, arguments);
};

var dynCall_vfi = Module["dynCall_vfi"] = function() {
 return (dynCall_vfi = Module["dynCall_vfi"] = Module["asm"]["dynCall_vfi"]).apply(null, arguments);
};

var dynCall_viif = Module["dynCall_viif"] = function() {
 return (dynCall_viif = Module["dynCall_viif"] = Module["asm"]["dynCall_viif"]).apply(null, arguments);
};

var dynCall_vif = Module["dynCall_vif"] = function() {
 return (dynCall_vif = Module["dynCall_vif"] = Module["asm"]["dynCall_vif"]).apply(null, arguments);
};

var dynCall_viff = Module["dynCall_viff"] = function() {
 return (dynCall_viff = Module["dynCall_viff"] = Module["asm"]["dynCall_viff"]).apply(null, arguments);
};

var dynCall_vifff = Module["dynCall_vifff"] = function() {
 return (dynCall_vifff = Module["dynCall_vifff"] = Module["asm"]["dynCall_vifff"]).apply(null, arguments);
};

var dynCall_viffff = Module["dynCall_viffff"] = function() {
 return (dynCall_viffff = Module["dynCall_viffff"] = Module["asm"]["dynCall_viffff"]).apply(null, arguments);
};

var dynCall_viiiiii = Module["dynCall_viiiiii"] = function() {
 return (dynCall_viiiiii = Module["dynCall_viiiiii"] = Module["asm"]["dynCall_viiiiii"]).apply(null, arguments);
};

var dynCall_iidiiii = Module["dynCall_iidiiii"] = function() {
 return (dynCall_iidiiii = Module["dynCall_iidiiii"] = Module["asm"]["dynCall_iidiiii"]).apply(null, arguments);
};

var _asyncify_start_unwind = Module["_asyncify_start_unwind"] = function() {
 return (_asyncify_start_unwind = Module["_asyncify_start_unwind"] = Module["asm"]["asyncify_start_unwind"]).apply(null, arguments);
};

var _asyncify_stop_unwind = Module["_asyncify_stop_unwind"] = function() {
 return (_asyncify_stop_unwind = Module["_asyncify_stop_unwind"] = Module["asm"]["asyncify_stop_unwind"]).apply(null, arguments);
};

var _asyncify_start_rewind = Module["_asyncify_start_rewind"] = function() {
 return (_asyncify_start_rewind = Module["_asyncify_start_rewind"] = Module["asm"]["asyncify_start_rewind"]).apply(null, arguments);
};

var _asyncify_stop_rewind = Module["_asyncify_stop_rewind"] = function() {
 return (_asyncify_stop_rewind = Module["_asyncify_stop_rewind"] = Module["asm"]["asyncify_stop_rewind"]).apply(null, arguments);
};

Module["ccall"] = ccall;

Module["addRunDependency"] = addRunDependency;

Module["removeRunDependency"] = removeRunDependency;

Module["FS_createPath"] = FS.createPath;

Module["FS_createDataFile"] = FS.createDataFile;

Module["FS_createPreloadedFile"] = FS.createPreloadedFile;

Module["FS_createLazyFile"] = FS.createLazyFile;

Module["FS_createDevice"] = FS.createDevice;

Module["FS_unlink"] = FS.unlink;

Module["FS"] = FS;

Module["writeStackCookie"] = writeStackCookie;

Module["checkStackCookie"] = checkStackCookie;

var calledRun;

function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}

var calledMain = false;

dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};

function callMain(args) {
 var entryFunction = Module["_main"];
 args = args || [];
 var argc = args.length + 1;
 var argv = stackAlloc((argc + 1) * 4);
 SAFE_HEAP_STORE((argv >> 2) * 4, allocateUTF8OnStack(thisProgram), 4);
 for (var i = 1; i < argc; i++) {
  SAFE_HEAP_STORE(((argv >> 2) + i) * 4, allocateUTF8OnStack(args[i - 1]), 4);
 }
 SAFE_HEAP_STORE(((argv >> 2) + argc) * 4, 0, 4);
 try {
  var ret = entryFunction(argc, argv);
  if (!keepRuntimeAlive()) {
   exit(ret, true);
  }
 } catch (e) {
  if (e instanceof ExitStatus) {
   return;
  } else if (e == "unwind") {
   return;
  } else {
   var toLog = e;
   if (e && typeof e === "object" && e.stack) {
    toLog = [ e, e.stack ];
   }
   err("exception thrown: " + toLog);
   quit_(1, e);
  }
 } finally {
  calledMain = true;
 }
}

function stackCheckInit() {
 _emscripten_stack_init();
 writeStackCookie();
}

function run(args) {
 args = args || arguments_;
 if (runDependencies > 0) {
  return;
 }
 stackCheckInit();
 preRun();
 if (runDependencies > 0) {
  return;
 }
 function doRun() {
  if (calledRun) return;
  calledRun = true;
  Module["calledRun"] = true;
  if (ABORT) return;
  initRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  if (shouldRunNow) callMain(args);
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout(function() {
   setTimeout(function() {
    Module["setStatus"]("");
   }, 1);
   doRun();
  }, 1);
 } else {
  doRun();
 }
 checkStackCookie();
}

Module["run"] = run;

function exit(status, implicit) {
 EXITSTATUS = status;
 if (implicit && keepRuntimeAlive() && status === 0) {
  return;
 }
 if (keepRuntimeAlive()) {} else {
  exitRuntime();
  if (Module["onExit"]) Module["onExit"](status);
  ABORT = true;
 }
 quit_(status, new ExitStatus(status));
}

if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}

var shouldRunNow = true;

if (Module["noInitialRun"]) shouldRunNow = false;

run();

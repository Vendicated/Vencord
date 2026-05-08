# Native File System adapter (ponyfill)

What is this?

This is a file system API that follows the [File System Access](https://wicg.github.io/file-system-access/) specification. Thanks to it we can have a unified way of handling data in all browsers and even in NodeJS & Deno in a more secure way.

At a high level what we're providing is several bits:

1. Ponyfills for `showDirectoryPicker`, `showOpenFilePicker` and `showSaveFilePicker`, with fallbacks to regular input elements.
2. Ponyfills for `FileSystemFileHandle` and `FileSystemDirectoryHandle` interfaces.
3. Ponyfill for `FileSystemWritableFileStream` to truncate and write data.
4. An implementation of `navigator.storage.getDirectory()` (`getOriginPrivateDirectory`) which can read & write data to and from several sources called adapters, not just the browser sandboxed file system
5. An polyfill for `DataTransferItem.prototype.getAsFileSystemHandle()`

## File system adapters

When `getOriginPrivateDirectory` is called with no arguments, the browser's native sandboxed file system is used, just like calling `navigator.storage.getDirectory()`.

Optionally, a file system backend adapter can be provided as an argument. This ponyfill ships with a few backends built in:

* `node`: Uses NodeJS's `fs` module
* `deno`: Interact with filesystem using Deno
* `sandbox` (deprecated): Uses [requestFileSystem](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestFileSystem). Only supported in Chromium-based browsers using the `Blink` engine.
* `indexeddb`: Stores files into the browser's `IndexedDB` object database.
* `memory`: Stores files in-memory. Thus, it is a temporary file store that clears when the user navigates away.
* `cache`: Stores files with the browser's [Cache API](https://web.dev/cache-api-quick-guide/) in request/response pairs.

You can even load in your own underlying adapter and get the same set of API's

The API is designed in such a way that it can work with or without the ponyfill if you choose to remove or add this.<br>
It's not trying to interfere with the changing spec by using other properties that may conflict with the feature changes to the spec.

( The current minium supported browser I have chosen to support is the ones that can handle import/export )<br>
( Some parts are lazy loaded when needed )

### Updating from 2.x to 3.x
v3 removed all top level await that conditionally loaded polyfills like
WritableStream, DOMException, and Blob/File. considering that now all latest
up to date env have this built in globally on `globalThis` namespace. This makes
the file system adapter lighter for ppl who want a smaller bundle and supports
newer engines.

But if you still need to provide polyfills for older environments
then you can provide your own polyfill and set it up with our config before any
other script is evaluated

```js

import config from 'native-file-system-adapter/config.js'
// This is the default config that you could override as needed.
Object.assign(config, {
  ReadableStream: globalThis.ReadableStream,
  WritableStream: globalThis.WritableStream,
  TransformStream: globalThis.TransformStream,
  DOMException: globalThis.DOMException,
  Blob: globalThis.Blob,
  File: globalThis.File
})
// continue like normal.
import xyz from 'native-file-system-adapter'
```



### ES import in browser

```html
<script type="module">
  import { getOriginPrivateDirectory } from 'https://cdn.jsdelivr.net/npm/native-file-system-adapter/mod.js'
  // Get a directory handle for a sandboxed virtual file system
  // same as calling navigator.storage.getDirectory()
  const dirHandle1 = await getOriginPrivateDirectory()
  // or use an adapter (see adapters table above for a list of available adapters)
  const dirHandle2 = await getOriginPrivateDirectory(import('https://cdn.jsdelivr.net/npm/native-file-system-adapter/src/adapters/<adapterName>.js'))
</script>
```

```
npm i native-file-system-adapter
```

```js
import { getOriginPrivateDirectory } from 'native-file-system-adapter'
import indexedDbAdapter from 'native-file-system-adapter/lib/adapters/indexeddb.js'
import nodeAdapter from 'native-file-system-adapter/lib/adapters/node.js'
const dirHandle = await getOriginPrivateDirectory(indexedDbAdapter)
const nodeDirHandle = await getOriginPrivateDirectory(nodeAdapter, './real-dir')
```

## Examples

### File system sandbox

You can get a directory handle to a sandboxed virtual file system using the `getOriginPrivateDirectory` function.
This is a legacy name introduced by an older `Native File System` specification and is kept for simplicity.
It is equivalent to the `navigator.storage.getDirectory()` method introduced by the later [File System Access](https://wicg.github.io/file-system-access/) spec.

```js
import { getOriginPrivateDirectory, support } from 'native-file-system-adapter'
// Uses native implementation - same as calling navigator.storage.getDirectory()
await getOriginPrivateDirectory().catch(err => {
  // native implementation not supported fallback to any of the adapters

  // Blinks old sandboxed api
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/sandbox.js'))
  // fast in-memory file system
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/memory.js'))
  // Using indexDB
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/indexeddb.js'))
  // Store things in the new Cache API as request/responses (bad at mutating data)
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/cache.js'))

  // Node only variant:
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/memory.js'))
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/lib/adapters/node.js'), './starting-path')

  // Deno only variant:
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/src/adapters/memory.js'))
  handle = await getOriginPrivateDirectory(import('native-file-system-adapter/src/adapters/deno.js'), './starting-path')
})
```

### File and directory pickers

```js
import { showDirectoryPicker, showOpenFilePicker } from 'native-file-system-adapter'
// The polyfilled (file input) version will turn into a memory adapter
// You will have read & write permission on the memory adapter,
// you might want to transfer (copy) the handle to another adapter
const [fileHandle] = await showOpenFilePicker({_preferPolyfill: boolean, ...sameOpts})
const dirHandle = await showDirectoryPicker({_preferPolyfill: boolean, ...sameOpts})
```

### Drag and drop

```js
// DataTransferItem.prototype.getAsFileSystemHandle() is conditionally polyfilled
import 'native-file-system-adapter'
window.ondrop = async evt => {
  evt.preventDefault()
  for (let item of evt.dataTransfer.items) {
    const handle = await item.getAsFileSystemHandle()
    console.log(handle)
  }
}
```

### Copy file handles to sandboxed file system

```js
import { showOpenFilePicker, getOriginPrivateDirectory } from 'native-file-system-adapter'

// request user to select a file
const [fileHandle] = await showOpenFilePicker({
  types: [], // default
  multiple: false, // default
  excludeAcceptAllOption: false, // default
  _preferPolyfill: false // default
})

// returns a File Instance
const file = await fileHandle.getFile()

// copy the file over to a another place
const rootHandle = await getOriginPrivateDirectory()
const fileHandle = await rootHandle.getFileHandle(file.name, { create: true })
const writable = await fileHandle.createWritable()
await writable.write(file)
await writable.close()
```

### Save / download a file

```js
import { showSaveFilePicker } from 'native-file-system-adapter'

const fileHandle = await showSaveFilePicker({
  _preferPolyfill: false,
  suggestedName: 'Untitled.png',
  types: [
    { accept: { "image/png": [ "png" ] } },
    { accept: { "image/jpg": [ "jpg" ] } },
    { accept: { "image/webp": [ "webp" ] } }
  ],
  excludeAcceptAllOption: false // default
})

// Look at what extension they chosen
const extensionChosen = fileHandle.name.split('.').pop()

const blob = {
  jpg: generateCanvasBlob({ type: 'blob', format: 'jpg' }),
  png: generateCanvasBlob({ type: 'blob', format: 'png' }),
  webp: generateCanvasBlob({ type: 'blob', format: 'webp' })
}[extensionChosen]

await blob.stream().pipeTo(fileHandle.createWritable())
// or
const writer = await fileHandle.createWritable()
await writer.write(blob)
await writer.close()
```

## Supported browsers

When importing as an ES module, browsers that support [dynamic imports](https://caniuse.com/es6-module-dynamic-import) and ES2018 features are a minimum requirement. When using a bundler, this restriction is no longer applicable.

When the directory picker falls back to `input` elements, the browser must support [webkitdirectory](https://caniuse.com/mdn-api_htmlinputelement_webkitdirectory) and [webkitRelativePath](https://caniuse.com/mdn-api_file_webkitrelativepath). Because of this, support for picking directories is generally poor on Mobile browsers.

For drag and drop, the `getAsFileSystemHandle()` polyfill depends on the `File and Directory Entries API` support, more specifically [FileSystemDirectoryEntry](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryEntry), [FileSystemFileEntry](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileEntry) and [webkitGetAsEntry](https://developer.mozilla.org/en-US/docs/Web/API/DataTransferItem/webkitGetAsEntry).


## Limitations

- Storing a file handle in IndexedDB or sharing it with postMessage isn't currently possible unless you use native.
- `showDirectoryPicker` and `showOpenFilePicker` will not throw any `AbortError`s (e.g. user cancellations) when using a fallback input element
- `showSaveFilePicker` may not actually show any prompt when using a fallback with `<a download>`
- Cache adapter only works in secure (HTTPS) contexts `window.isSecureContext === true`
- IndexedDB adapter may not work in some browsers in Private mode

## A note when downloading with the polyfilled version

Saving/downloading a file is borrowing some of ideas from [StreamSaver.js](https://github.com/jimmywarting/StreamSaver.js).
The difference is:
 - Using service worker is optional choice with this adapter.
 - It does not rely on some man-in-the-middle or external hosted service worker.
 - If you want to stream large data to the disk directly instead of taking up much RAM you need to set up a service worker yourself.<br>(note that it requires https - but again worker is optional)

to set up a service worker you have to basically copy [the example](https://github.com/jimmywarting/native-file-system-adapter/tree/master/example/sw.js) and register it:

```js
navigator.serviceWorker.register('sw.js')
```

Without service worker you are going to write all data to the memory and download it once it closes.

Seeking and truncating won't do anything. You should be writing all data in sequential order when using the polyfilled version.

## Testing

- For browser tests: In project folder, run `php -S localhost:3000` or `npx http-server -p 3000 .`
  - open `http://localhost:3000/example/test.html` in your browser.
- For node: `npm run test-node`
- For deno: `npm run test-deno`

## Resources

I recommend to follow up on this links for you to learn more about the API and how it works

- https://web.dev/file-system-access
- https://wicg.github.io/file-system-access
- https://github.com/WICG/file-system-access

## Alternatives
- [browser-fs-access](https://github.com/GoogleChromeLabs/browser-fs-access) by [@tomayac](https://github.com/tomayac): A similar, more like a shim (without `getSystemDirectory`).
- [StreamSaver](https://github.com/jimmywarting/StreamSaver.js) by [@jimmywarting](https://github.com/jimmywarting): A way to save large data to the disk directly with a writable stream <br><small>(same technique can be achieved if service worker are setup properly)</small>
- [FileSaver](https://github.com/eligrey/FileSaver.js) by [@eligrey](https://github.com/eligrey): One among the first libs to save blobs to the disk

## License

native-file-system-adapter is licensed under the MIT License. See `LICENSE` for details.

# perspectives-serviceworker
Runs the Perspectives Distributed Runtime in a [service worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorker). This package is used exclusively in:
* [perspectives-proxy](https://github.com/joopringelberg/perspectives-proxy)

The service worker connects to the core (run in the same javascript process) via an InternalChannel instance created by the PDR itself. It connects to the client through the [Channel Messaging API](https://developer.mozilla.org/en-US/docs/Web/API/Channel_Messaging_API), where this client runs in a browser window tab.


## Installation
Install with npm:

```
$ npm install perspectives-serviceworker
```

## Usage
The service worker is set up by a function in the perspectives-proxy package, `configurePDRproxy`, when applied to the argument "serviceWorkerChannel". This function is called by the `inplace` client.


## Build
Create `dist/perspectives-serviceworker.js` by evaluating on the command line:

```
$ npm run build
```
This is equivalent to:
```
$ npx webpack
```
## Watch
Have Webpack watch the sources and update `dist/perspectives-serviceworker.js` by evaluating on the command line:

```
$ npm run watch
```
This is equivalent to:
```
$ npx webpack --watch
```

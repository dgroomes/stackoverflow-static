

export {browser}

// FireFox web extension docs and the "browser" global variable: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API
declare var browser: FireFox

interface FireFox {
    runtime: Runtime
}

/**
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime
 */
interface Runtime {

    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
    onInstalled: any
}

interface Event {
    addListener(callback: Function) : void
}

// This code runs on the web page. It does some initialization to wire up the main objects and variables.

export {exec}
import {initRpcWebPage} from "../rpc/rpc-web-page.ts"
import {PostsExpander} from "./PostsExpander.ts"
import {AppStorage} from "./AppStorage.ts"
import {VotesScraper} from "./VotesScraper.js"
import {PostsViewer} from "./PostsViewer.js"

console.debug("[web-load-source.js] Initializing...")

let browserDescriptor // Either "chromium" or "firefox. Firefox and Chromium web extension APIs have differences and we need to know the browser.
window.webResourcesOrigin = null // The origin that serves the web resources like the JavaScript files. This origin will be a special Chromium/Firefox extension URL.
let webExtensionId // This is the ID of the web extension. This is always a super long ID that's generated the browser.

/**
 * Detect the current environment and assign the following global properties:
 *   - browserDescriptor
 *   - extensionContext
 *   - webResourcesOrigin
 *   - webExtensionId
 */
function detectEnvironment() {

    /**
     * Detect information based on the extension URL.
     *
     * From the examples below, notice how the legal characters include lowercase letters, numbers and the hyphen
     * character.
     *
     * @param url. For example:
     *               - chrome-extension://akidegfimbjmokpejlcnjagogamdiinl/web-page/posts-viewer.html
     *               - moz-extension://df0b610b-995b-9240-8c3b-fcaf155c9005/web-page/web-load-source.js
     */
    function detectFromExtensionUrl(url) {
        let regex = new RegExp("(chrome-extension|moz-extension)://([a-z0-9-]+)")
        let matches = regex.exec(url)
        window.webResourcesOrigin = matches[0]

        let host = matches[1]
        if (host === "chrome-extension")
            browserDescriptor = "chromium"
        else if (host === "moz-extension") {
            browserDescriptor = "firefox"
        } else {
            throw new Error(`Unrecognized host name: '${host}', Expected either 'chrome-extension' or 'moz-extension'`)
        }

        webExtensionId = matches[2]
    }

    // The "posts-viewer.html" page itself is served by the web extension and so the URL protocol will be
    // "chrome-extension://" or "moz-extension://"
    if (window.origin.startsWith("chrome-extension://") || window.origin.startsWith("moz-extension://")) {
        detectFromExtensionUrl(window.origin)
        return
    }

    let script = document.getElementById("web-injected")
    detectFromExtensionUrl(script.src)
}

async function configureState() {

    initRpcWebPage(browserDescriptor, webExtensionId)

    rpcServer.registerPromiseProcedure("scrape-votes", (procedureArgs) => {
        let votesScraper = new VotesScraper(procedureArgs.votesPageLimit)
        return votesScraper.scrapeVotes()
    })
    rpcServer.registerPromiseProcedure("expand-posts", (_procedureArgs) => {
        return postsExpander.expandPosts()
    })
    rpcServer.listen()

    window.appStorage = new AppStorage(rpcClient)
    window.postsExpander = new PostsExpander()
    window.postsViewer = new PostsViewer()
}

/**
 *  This is the main function
 */
async function exec() {
    detectEnvironment()
    await configureState()
    console.debug(`[web-load-source.js] [${Date.now()}] Fully initialized.`)
    window.postMessage("web-page-initialized", "*")
}

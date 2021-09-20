// This code is designed to run on the web page.

/**
 *  Initialize the web page objects of the RPC framework. Programs that depend on the RPC framework must call this
 *  function.
 *
 *  The window will be initialized with instances of RpcClient and RpcServer on the global variables "rpcClient" and
 *  "rpcServer" respectively.
 *
 *  @param browserDescriptor either "chromium" or "firefox" are supported
 *  @param webExtensionId
 */
function initRpcWebPage(browserDescriptor, webExtensionId) {
    console.debug("[rpc-web-page.js] Initializing...")
    let rpcClient
    let rpcServer

    if (browserDescriptor === "chromium") {
        rpcClient = new ChromiumWebPageToBackgroundRpcClient(webExtensionId)
        rpcServer = new ChromiumWebPageRpcServer(webExtensionId)
    } else if (browserDescriptor === "firefox") {
        rpcClient = new FirefoxWebPageToContentScriptRpcClient(webExtensionId)
        rpcServer = new FirefoxWebPageRpcServer()
    } else {
        throw new Error(`Unexpected browser: '${browserDescriptor}'. Expected either 'chromium' or 'firefox'`)
    }

    /**
     * Assign the RPC objects to the window. A function declaration is necessary to help intellisense in the IDE.
     * @param {RpcClient} rpcClient
     * @param {RpcServer} rpcServer
     */
    (function assignPolymorphicGlobals(rpcClient, rpcServer) {
        window.rpcClient = rpcClient
        window.rpcServer = rpcServer
    })(rpcClient, rpcServer)
}

/**
 * This is a concrete implementation of RpcServer for Chromium that runs in the web page and services RPC requests.
 */
class ChromiumWebPageRpcServer extends RpcServer {

    #webExtensionId

    constructor(webExtensionId) {
        super("web-page-server")
        this.#webExtensionId = webExtensionId
    }

    listen() {
        let that = this
        window.addEventListener("message", ({data}) => {
            if (!that.intake(data)) {
                return false
            }

            let {procedureName} = data

            that.dispatch(data).then(procedureReturnValue => {
                // Send the procedure return value to the RPC client (it's assumed that the client is in a background
                // script or popup script).
                let returnMessage = {
                    procedureTargetReceiver: "background-client",
                    procedureName,
                    procedureReturnValue
                }
                console.debug(`[ChromiumWebPageRpcServer] sending message:`)
                console.debug(JSON.stringify(returnMessage, null, 2))
                chrome.runtime.sendMessage(that.#webExtensionId, returnMessage)
            })
        })
    }
}

/**
 * This is a concrete implementation of RpcServer for Firefox that runs in the web page and services RPC requests.
 */
class FirefoxWebPageRpcServer extends RpcServer {

    constructor() {
        super("web-page-server")
    }

    listen() {
        let that = this
        window.addEventListener("message", async ({data}) => {
            if (!that.intake(data)) {
                return false
            }

            let procedureReturnValue = await that.dispatch(data)

            let {procedureName} = data
            // Send the procedure return value to the RPC client by way of the RPC proxy.
            let returnMessage = {
                procedureTargetReceiver: "content-script-rpc-proxy",
                procedureName,
                procedureReturnValue
            }
            console.debug(`[FirefoxWebPageRpcServer] sending message:`)
            console.debug(JSON.stringify(returnMessage, null, 2))
            window.postMessage(returnMessage)
        })
    }
}

/**
 * An implementation of the RpcClient interface for Chromium browsers that runs in the web page and sends RPC requests
 * to an RPC server in a background script.
 */
class ChromiumWebPageToBackgroundRpcClient extends RpcClient {

    #webExtensionId

    constructor(webExtensionId) {
        super("background-server")
        this.#webExtensionId = webExtensionId
    }

    execRemoteProcedure(procedureName, procedureArgs) {
        let rpcRequest = this.createRequest(procedureName, procedureArgs)
        return new Promise((resolve) => {
            chrome.runtime.sendMessage(this.#webExtensionId, rpcRequest,
                function (returnValue) {
                    console.debug("[ChromiumWebPageToBackgroundRpcClient] Got a return value from the remote procedure call:")
                    console.debug({returnValue})
                    resolve(returnValue)
                })
        })
    }
}

/**
 * An implementation of the RpcClient for Firefox that runs in the web page and sends RPC requests to a content script
 * RPC gateway which then forwards the requests to an RPC server in a background script.
 *
 * It will initiate remote procedure calls by passing messages to the Firefox content-script and then to the extension
 * background scripts. Unfortunately, Firefox does not support direct page-to-background communication because it does
 * not support the "externally_connectable" Manifest field. So we must resort to page-to-contentscript-to-background
 * communication. This is a significant difference between Chromium and Firefox and it is worth encapsulating the
 * implementation details in this class.
 */
class FirefoxWebPageToContentScriptRpcClient extends RpcClient {

    #webExtensionId

    constructor(webExtensionId) {
        super("content-script-rpc-proxy")
        this.#webExtensionId = webExtensionId
    }

    /**
     * This function uses the asynchronous broadcast messaging system of the "window" object plus Firefox's "runtime.sendMessage"
     * extension API to make a one-for-one request/response procedure call. Honestly, the implementation seems a little
     * strange but it makes for a great API to the calling code. I think this is an effective pattern.
     *
     * This function will send a message to the content-script RPC proxy ("rpc-content-script-proxy.js") and then
     * register a listener on the window to listen for the eventual expected response message.
     */
    execRemoteProcedure(procedureName, procedureArgs) {
        // I'm assuming it's wise to wire up the event listener before posting the message to avoid a race condition.
        // That's why I've put this before the "window.postMessage". But I don't think it actually matters.
        let returnValuePromise = new Promise((resolve => {
            window.addEventListener("message", function listenForRpcResponse({data}) {
                if (data.procedureTargetReceiver === "web-page-client"
                    && data.procedureName === procedureName) {

                    window.removeEventListener("message", listenForRpcResponse)
                    resolve(data.procedureReturnValue)
                }
            })
        }))

        let rpcRequest = this.createRequest(procedureName, procedureArgs)
        window.postMessage(rpcRequest, "*")

        return returnValuePromise
    }
}


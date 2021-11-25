// Core extension initialization code for the "Chromium Manifest V2" web extension.
//
// This declares the permissions that dictate which pages the extension are enabled for.

import {initRpcBackground } from '../../rpc-framework/rpc-backend.ts'
import {chrome} from "../../web-extension-types/chrome-extension-types.d.ts"

console.debug("[chromium-manifest-v2/init.js] Initializing...")

chrome.runtime.onInstalled.addListener(async () => {
    await initRpcBackground("chromium")

    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {hostEquals: 'stackoverflow.com'},
                }),
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {hostEquals: 'data.stackexchange.com'},
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }])
    })
})

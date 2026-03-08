// background.js — Service Worker (MV3)
import { callGemini } from './gemini.js';

// Open the side panel when the user clicks the extension icon
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// Message router: sidepanel → content script → sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // FROM sidepanel: "scrape the current tab's form"
    if (message.type === "SCRAPE_FORM") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab) {
                sendResponse({ success: false, error: "No active tab found." });
                return;
            }
            chrome.tabs.sendMessage(activeTab.id, { type: "SCRAPE_FORM" }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse(response);
                }
            });
        });
        return true; // keep channel open for async response
    }

    // FROM sidepanel: "fill all fields with generated text"
    if (message.type === "FILL_FORM") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab) {
                sendResponse({ success: false, error: "No active tab found." });
                return;
            }
            chrome.tabs.sendMessage(activeTab.id, { type: "FILL_FORM", fields: message.fields }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    sendResponse(response);
                }
            });
        });
        return true;
    }

    // FROM content script: process with Gemini
    if (message.type === "CALL_GEMINI") {
        (async () => {
            try {
                // 1. Get API Key and Model
                const { geminiApiKey, geminiModel } = await chrome.storage.local.get(['geminiApiKey', 'geminiModel']);
                const activeModel = geminiModel || 'gemini-3.1-pro-preview';

                if (!geminiApiKey) {
                    sendResponse({ success: false, error: "API key not found. Please set it in the extension." });
                    return;
                }

                // 2. Call Gemini
                let generatedFields;
                try {
                    const aiResponses = await callGemini(geminiApiKey, message.fields, message.jobContext, activeModel);
                    generatedFields = message.fields.map((field) => ({
                        ...field,
                        generatedText: aiResponses[field.label] || aiResponses[`field_${field.index}`] || 'No response generated.'
                    }));
                } catch (err) {
                    sendResponse({ success: false, error: `Gemini API Error: ${err.message}` });
                    return;
                }

                sendResponse({ success: true, generatedFields });

            } catch (err) {
                console.error("[Autopilot Background Error]", err);
                sendResponse({ success: false, error: err.message });
            }
        })();
        return true; // Keep message channel open for async
    }
});

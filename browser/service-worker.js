chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.tabs.sendMessage(tab.id, { command });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openShortcuts") {
    chrome.tabs.create({ url: "about://extensions/shortcuts" });
  }
});
// Background service worker for Dash extension
console.log('Dash background script loaded');

/**
 * Update extension action based on user preference
 */
async function updateExtensionAction() {
  try {
    const result = await chrome.storage.sync.get(['extensionOpenMode']);
    const openMode = result.extensionOpenMode || 'popup';
    
    if (openMode === 'panel') {
      // Disable popup and use onClicked handler to open side panel
      await chrome.action.setPopup({ popup: '' });
      console.log('Extension action set to panel mode');
    } else {
      // Enable popup
      await chrome.action.setPopup({ popup: 'popup.html' });
      console.log('Extension action set to popup mode');
    }
    
    console.log('Updated extension action mode to:', openMode);
  } catch (error) {
    console.error('Error updating extension action:', error);
  }
}

/**
 * Initialize default settings on first install
 */
async function initializeDefaultSettings() {
  try {
    console.log('Initializing default settings...');
    
    // Initialize extension behavior setting if not present
    const existingSettings = await chrome.storage.sync.get('extensionOpenMode');
    if (!existingSettings.extensionOpenMode) {
      await chrome.storage.sync.set({
        'extensionOpenMode': 'popup' // Default to popup mode
      });
      console.log('Initialized default extension open mode to popup');
    }
    
    console.log('Settings initialization completed');
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}

/**
 * Handle extension installation and updates
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('Extension installed for the first time');
    
    // Initialize default settings on first install
    await initializeDefaultSettings();
    
    // Set installation metadata
    chrome.storage.sync.set({
      'first-install': true,
      'install-date': new Date().toISOString()
    });
    
  } else if (details.reason === 'update') {
    // Extension was updated
    console.log('Extension updated from version:', details.previousVersion);
  } else if (details.reason === 'chrome_update') {
    // Chrome browser was updated
    console.log('Chrome browser was updated');
  }
  
  // Initialize extension action based on settings
  await updateExtensionAction();
});

/**
 * Handle extension startup
 */
chrome.runtime.onStartup.addListener(async () => {
  try {
    console.log('Extension starting up');
    
    // Initialize extension action based on settings
    await updateExtensionAction();
    console.log('Initialized extension action on startup');
  } catch (error) {
    console.error('Error during startup initialization:', error);
  }
});

/**
 * Storage change listener to update action when settings change
 */
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.extensionOpenMode) {
    console.log('Extension open mode changed:', changes.extensionOpenMode.newValue);
    await updateExtensionAction();
  }
});

/**
 * Action click handler for when popup is disabled (panel mode)
 */
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension action clicked - opening side panel');
  
  try {
    if (tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      const windows = await chrome.windows.getAll();
      if (windows.length > 0 && windows[0].id) {
        await chrome.sidePanel.open({ windowId: windows[0].id });
      }
    }
  } catch (error) {
    console.error('Error opening side panel:', error);
  }
});

/**
 * Command event listeners for keyboard shortcuts
 */
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  if (command === '_execute_action') {
    // This will automatically handle the action based on current mode
    console.log('Opening extension via keyboard shortcut');
  }
});


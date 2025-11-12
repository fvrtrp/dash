# Panel Mode Implementation for Dash Extension

This document describes the panel mode implementation for the Dash extension, inspired by the Sesh extension.

## Overview

The Dash extension now supports two modes of operation:
1. **Popup Mode** (default): Opens as a small popup window when clicking the extension icon
2. **Panel Mode**: Opens as a side panel in the browser

## Files Created/Modified

### New Files

1. **`panel.html`** - HTML structure for the side panel view
   - Similar to popup.html but includes a panel header with toggle button
   - Uses panel.css for panel-specific styling

2. **`panel.js`** - JavaScript for the side panel
   - Based on popup.js with panel-specific modifications
   - Handles panel-to-popup mode switching
   - Adjusts UI for full-height panel layout

3. **`panel.css`** - Styles specific to panel mode
   - Full viewport height and width styling
   - Panel header with toggle button
   - Responsive layout adjustments for panel context

4. **`background.js`** - Background service worker
   - Manages popup/panel mode switching
   - Listens for storage changes to update extension behavior
   - Opens side panel when in panel mode
   - Handles keyboard shortcuts

### Modified Files

1. **`manifest.json`**
   - Added `background` service worker configuration
   - Added `side_panel` configuration pointing to panel.html
   - Added `sidePanel` permission

2. **`popup.html`**
   - Added popup header with panel mode toggle button

3. **`popup.js`**
   - Added panel mode toggle button event listener
   - Switches extension to panel mode and closes popup

4. **`popup.css`**
   - Added styles for popup header and toggle button

## How It Works

### Mode Switching Flow

1. **From Popup to Panel:**
   - User clicks the panel icon button in popup
   - Extension saves `extensionOpenMode: 'panel'` to storage
   - Background service worker detects the change
   - Extension popup is disabled
   - Next click on extension icon opens side panel

2. **From Panel to Popup:**
   - User clicks the popup icon button in panel
   - Extension saves `extensionOpenMode: 'popup'` to storage
   - Background service worker detects the change
   - Extension popup is enabled
   - Next click on extension icon opens popup

### Background Service Worker

The `background.js` service worker:
- Initializes default mode (popup) on first install
- Listens for storage changes to `extensionOpenMode`
- Updates the extension action dynamically:
  - In popup mode: Sets popup HTML path
  - In panel mode: Disables popup and handles click events to open side panel
- Handles keyboard shortcut (Alt+Z) in both modes

### Panel Layout

The panel mode uses different styling to accommodate the side panel context:
- Full viewport height and width
- Fixed positioning for theme buttons and mode toggle
- Flexible layout that adapts to panel resizing
- Proper overflow handling for tasks and notes

## User Experience

### Popup Mode
- Default behavior - opens as a 400px wide popup
- Compact view suitable for quick task entry
- Notes mode expands to 700px width

### Panel Mode
- Opens as a side panel (can be docked or floating)
- Full height of browser window
- Better for extended note-taking sessions
- Stays open while browsing other tabs

## Implementation Details

### Storage Keys

- `extensionOpenMode`: 'popup' | 'panel' - Current mode preference

### Permissions

- `storage`: Required for syncing data and preferences
- `sidePanel`: Required for opening side panel

### Key Differences from Popup

1. **Layout**: Panel uses full viewport dimensions
2. **Header**: Panel includes a dedicated header with app name and toggle
3. **Styling**: Panel-specific CSS overrides for optimal side panel display
4. **Navigation**: Panel persists while navigating tabs

## Testing

To test the implementation:

1. Load the extension in Chrome
2. Click the extension icon to open popup (default mode)
3. Click the panel icon in popup header to switch to panel mode
4. Click the extension icon again to open side panel
5. Click the popup icon in panel header to switch back to popup mode

## Future Enhancements

Potential improvements:
- Remember last used mode per window
- Add panel width preferences
- Add quick mode toggle in extension menu
- Support for detached panel window

## References

- Sesh extension implementation
- Chrome Side Panel API documentation
- Chrome Extension Manifest V3 documentation


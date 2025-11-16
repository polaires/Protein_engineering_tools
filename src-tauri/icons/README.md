# Application Icons

To build the Tauri application, you'll need to add icon files in the following formats:

- `32x32.png` - 32x32 pixel PNG
- `128x128.png` - 128x128 pixel PNG
- `128x128@2x.png` - 256x256 pixel PNG (high DPI)
- `icon.icns` - macOS icon file
- `icon.ico` - Windows icon file

You can generate these from a single high-resolution PNG (1024x1024) using:
- Online tools like https://icon.kitchen/
- Tauri's icon generation: `npm run tauri icon path/to/icon.png`

For development, you can use placeholder icons or the application will use default Tauri icons.

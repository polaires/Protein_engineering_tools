# Molarity Calculator - Setup Guide

Complete setup instructions for developers and end users.

## Table of Contents

- [System Requirements](#system-requirements)
- [Development Setup](#development-setup)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)
- [Platform-Specific Notes](#platform-specific-notes)

## System Requirements

### For Development

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher (comes with Node.js)
- **Rust**: Latest stable version (for Tauri)
- **Disk Space**: ~500MB for dependencies

### For End Users

- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **RAM**: 2GB minimum, 4GB recommended
- **Disk Space**: ~50MB for installed application

## Development Setup

### 1. Install Prerequisites

#### Node.js and npm

**Windows:**
1. Download from [nodejs.org](https://nodejs.org/)
2. Run the installer
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

**macOS:**
```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### Rust (for Tauri)

**All Platforms:**
1. Install rustup:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. Follow the on-screen instructions

3. Restart your terminal and verify:
   ```bash
   rustc --version
   cargo --version
   ```

**Windows Additional Requirements:**
- Microsoft Visual Studio C++ Build Tools
- Windows 10 SDK

### 2. Clone the Repository

```bash
git clone <repository-url>
cd Protein_engineering_tools
```

### 3. Install Dependencies

```bash
npm install
```

This will install:
- React and ReactDOM
- TypeScript
- Tauri
- Tailwind CSS
- All development dependencies

**Installation time:** ~2-5 minutes depending on internet speed

### 4. Set Up Tauri Icons (Optional)

The project includes a placeholder for icons. To generate proper application icons:

1. Create a high-resolution icon (1024x1024 PNG)
2. Run:
   ```bash
   npm install -g @tauri-apps/cli
   tauri icon path/to/your/icon.png
   ```

This generates all required icon sizes for different platforms.

### 5. Run Development Server

#### Web Development Mode

```bash
npm run dev
```

- Opens at `http://localhost:1420`
- Hot module replacement enabled
- Fast refresh on code changes

#### Tauri Desktop Mode

```bash
npm run tauri:dev
```

- Opens as a desktop application
- Automatic reload on changes
- Native features enabled

**First launch:** May take 2-5 minutes to compile Rust code

## Building for Production

### Web Application

Build optimized web version:

```bash
npm run build
```

Output: `dist/` directory

**Preview the build:**
```bash
npm run preview
```

### Desktop Application

Build desktop application for your current platform:

```bash
npm run tauri:build
```

**Output locations:**

- **Windows**: `src-tauri/target/release/molarity-calculator.exe`
  - Also creates installer in `src-tauri/target/release/bundle/`

- **macOS**: `src-tauri/target/release/bundle/macos/`
  - Creates `.app` and `.dmg` files

- **Linux**: `src-tauri/target/release/bundle/`
  - Creates `.deb`, `.AppImage`, and/or `.rpm`

**Build time:** 5-10 minutes (first build may take longer)

### Cross-Platform Building

To build for other platforms, see [Tauri's cross-compilation guide](https://tauri.app/v1/guides/building/cross-platform).

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with UI

```bash
npm run test:ui
```

Opens Vitest UI in browser for interactive testing.

### Check Test Coverage

```bash
npm test -- --coverage
```

## Code Quality

### Linting

```bash
npm run lint
```

Checks for:
- TypeScript errors
- ESLint violations
- React best practices

### Type Checking

```bash
npx tsc --noEmit
```

Runs TypeScript compiler in check mode (no output).

## Troubleshooting

### Common Issues

#### 1. "Command not found: tauri"

**Solution:**
```bash
npm install
```

Tauri CLI is installed as a dev dependency.

#### 2. Rust compilation errors

**Solutions:**
- Update Rust: `rustup update`
- Clean build: `cd src-tauri && cargo clean`
- Reinstall dependencies: `rm -rf node_modules && npm install`

#### 3. Port 1420 already in use

**Solution:**
```bash
# Find and kill the process
# macOS/Linux:
lsof -ti:1420 | xargs kill -9

# Windows (PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 1420).OwningProcess | Stop-Process
```

Or change the port in `vite.config.ts`.

#### 4. IndexedDB errors in development

**Solution:**
- Clear browser data for localhost:1420
- Or use incognito/private mode

#### 5. Tailwind styles not applying

**Solution:**
```bash
# Rebuild
npm run build

# Clear cache
rm -rf .vite
npm run dev
```

#### 6. Module not found errors

**Solution:**
```bash
# Clean install
rm -rf node_modules
rm package-lock.json
npm install
```

### Platform-Specific Issues

#### Windows

**WebView2 not installed:**
- Tauri requires WebView2 Runtime
- Download from [Microsoft](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

**Build fails with MSVC errors:**
- Install Visual Studio Build Tools
- Ensure C++ development tools are selected

#### macOS

**"App is damaged" message:**
```bash
# Remove quarantine attribute
xattr -cr /path/to/app.app
```

**Code signing issues:**
- For development, builds are not signed
- For distribution, you'll need an Apple Developer account

#### Linux

**Missing dependencies:**
```bash
# Debian/Ubuntu
sudo apt-get install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev

# Fedora
sudo dnf install \
  webkit2gtk3-devel \
  openssl-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel

# Arch
sudo pacman -S \
  webkit2gtk \
  base-devel \
  curl \
  wget \
  openssl \
  gtk3 \
  libappindicator-gtk3 \
  librsvg
```

## Development Workflow

### Recommended Workflow

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Make changes** to source files

3. **Test in browser** at localhost:1420

4. **Run tests:**
   ```bash
   npm test
   ```

5. **Test desktop build:**
   ```bash
   npm run tauri:dev
   ```

6. **Lint before commit:**
   ```bash
   npm run lint
   ```

7. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

### Hot Reload

- **React components:** Instant hot reload
- **CSS:** Instant update
- **TypeScript types:** Requires restart
- **Tauri config:** Requires restart

## IDE Setup

### VS Code (Recommended)

**Recommended Extensions:**
```json
{
  "recommendations": [
    "tauri-apps.tauri-vscode",
    "rust-lang.rust-analyzer",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

**Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### WebStorm

1. Enable TypeScript integration
2. Set Node.js interpreter
3. Enable ESLint
4. Install Tailwind CSS plugin

## Environment Variables

### Optional Environment Variables

Create `.env` file in root:

```env
# Development
VITE_DEV_MODE=true

# API Configuration (future use)
VITE_API_URL=http://localhost:3000

# Feature Flags (future use)
VITE_ENABLE_CLOUD_SYNC=false
```

**Note:** Restart dev server after changing `.env`

## Database Management

### Reset Database

In browser console:
```javascript
// Clear all data
indexedDB.deleteDatabase('molarity-calculator-db');
// Refresh page to reinitialize
```

### Export Data

Use the app's export feature or:
```javascript
// In browser console
const db = await window.indexedDB.open('molarity-calculator-db');
// Export logic here
```

## Performance Profiling

### React DevTools

1. Install React DevTools extension
2. Open in browser
3. Use Profiler tab to analyze renders

### Lighthouse

```bash
npm run build
npm run preview
```

Then run Lighthouse in Chrome DevTools.

## Updating Dependencies

### Update packages

```bash
# Check for updates
npm outdated

# Update specific package
npm update <package-name>

# Update all (careful!)
npm update
```

### Update Tauri

```bash
# Update Tauri CLI
cargo install tauri-cli --locked

# Update Tauri dependencies
cd src-tauri
cargo update
```

## Deployment

### Web Deployment

Deploy `dist/` directory to:
- **Netlify**: Drag and drop or Git integration
- **Vercel**: Zero-config deployment
- **GitHub Pages**: Via Actions
- **Self-hosted**: Nginx/Apache

### Desktop Distribution

**Windows:**
- `.exe` for portable
- `.msi` installer from bundle

**macOS:**
- `.dmg` for easy installation
- `.app` bundle

**Linux:**
- `.AppImage` for universal
- `.deb` for Debian/Ubuntu
- `.rpm` for Fedora/RHEL

## Getting Help

### Resources

- [Tauri Documentation](https://tauri.app)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)

### Community

- Open an issue on GitHub
- Check existing issues and PRs
- Read ARCHITECTURE.md for design details

## Next Steps

After successful setup:

1. ✅ Explore the application
2. ✅ Read ARCHITECTURE.md
3. ✅ Review the code structure
4. ✅ Run the test suite
5. ✅ Make a test change
6. ✅ Build for production
7. ✅ Start developing!

---

Happy coding! 🧪

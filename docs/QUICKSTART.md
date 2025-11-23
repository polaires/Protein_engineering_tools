# Quick Start Guide

Get the Molarity Calculator running in 5 minutes!

## For Developers

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))
- Rust ([Install](https://rustup.rs/))

### Quick Setup

```bash
# 1. Clone and navigate
git clone <repository-url>
cd Protein_engineering_tools

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev
```

Open `http://localhost:1420` in your browser. Done! ✨

### Build Desktop App

```bash
npm run tauri:dev
```

## For End Users

### Download

1. Go to Releases page
2. Download for your platform:
   - Windows: `.exe` or `.msi`
   - macOS: `.dmg`
   - Linux: `.AppImage` or `.deb`
3. Install and run

## First Steps

### 1. Calculate Mass for a Solution

1. Select **"Calculate Mass"** mode
2. Enter:
   - Desired Molarity: `0.5` M
   - Final Volume: `100` mL
3. Search for chemical: `NaCl`
   - Molecular weight auto-fills
4. Click **Calculate**
5. Result shows mass needed in grams

### 2. Use a Recipe

1. Click **"Recipes"** tab
2. Search for `PBS`
3. Click on **"1× PBS"**
4. View calculated masses for all components
5. Follow preparation instructions

### 3. Search PubChem

1. In calculator, start typing a chemical name
2. If not found in local database, click **"Search PubChem"**
3. Chemical is added automatically for future use

## Common Tasks

### Calculate Dilution

1. Select **"Dilution (C₁V₁=C₂V₂)"** mode
2. Enter 3 of 4 values
3. Leave one blank
4. Click Calculate
5. Missing value is calculated

### View Calculation Steps

After calculating:
1. Click **"Show Calculation Steps"**
2. Review step-by-step breakdown
3. Verify the math

### Export Data

1. Go to **"About"** tab
2. Scroll to bottom
3. Click **"Export Data"**
4. Save JSON file as backup

## Tips

- 💡 Use Tab key to navigate between fields
- 💡 Results automatically show in appropriate units (g vs mg)
- 💡 All calculations work offline
- 💡 Recently used chemicals appear first in search
- 💡 Star ⭐ recipes to mark as favorites

## Keyboard Shortcuts

- `Tab` - Next field
- `Shift+Tab` - Previous field
- `Enter` - Calculate (when in input field)
- `Esc` - Close modals

## Getting Help

- **Documentation**: See README.md
- **Setup Issues**: See SETUP.md
- **Architecture**: See ARCHITECTURE.md
- **Report Bug**: Open GitHub issue

## Example Calculations

### Example 1: Make 100 mL of 1M Tris-HCl

**Input:**
- Molarity: `1` M
- Volume: `100` mL
- Chemical: `Tris-HCl` (MW: 157.60 g/mol)

**Result:** 15.76 g

### Example 2: Dilute 10× PBS to 1×

**Input:**
- C₁: `10` (stock concentration)
- C₂: `1` (desired concentration)
- V₂: `100` mL (final volume)

**Result:** V₁ = 10 mL (add 10 mL stock to 90 mL water)

### Example 3: Calculate Molarity from Mass

**Input:**
- Mass: `5.844` g
- Volume: `100` mL
- Chemical: `NaCl` (MW: 58.44 g/mol)

**Result:** 1 M

## Next Steps

1. ✅ Read the full README.md
2. ✅ Explore pre-configured recipes
3. ✅ Add your own chemicals from PubChem
4. ✅ Create custom recipes (coming soon)
5. ✅ Share feedback!

---

**Need more help?** Check out the comprehensive documentation:
- [README.md](README.md) - Full features and usage
- [SETUP.md](SETUP.md) - Detailed setup instructions
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details

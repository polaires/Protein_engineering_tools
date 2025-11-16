# Molarity Calculator

A comprehensive, professional-grade molarity calculator application built with React and Tauri for students and researchers across all academic levels.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Core Functionality

- **Multiple Calculation Modes**
  - Calculate mass needed for solution preparation
  - Calculate molarity from mass and volume
  - Calculate volume required for given mass and concentration
  - Dilution calculations (C₁V₁ = C₂V₂)

- **Chemical Database**
  - Curated database of 50+ common laboratory chemicals
  - Pre-loaded molecular weights and properties
  - Searchable by common name, IUPAC name, formula, or CAS number
  - PubChem API integration for additional chemicals
  - Offline functionality with IndexedDB caching

- **Solution Recipes**
  - Pre-configured recipes for common buffers (PBS, TBS, HEPES, etc.)
  - Automated mass calculations for all components
  - Detailed preparation instructions
  - Categorized by type (buffers, media, lysis, staining)

- **User Experience**
  - Clean, intuitive interface optimized for laboratory workflow
  - Real-time calculation with step-by-step breakdowns
  - Responsive design for desktop and tablet
  - Dark mode support
  - Toast notifications for user feedback

### Technical Features

- **TypeScript** for type safety and better developer experience
- **IndexedDB** for offline data storage and fast access
- **PubChem API** integration with caching and error handling
- **Tauri** for cross-platform desktop application
- **Tailwind CSS** for modern, responsive design
- **Unit tests** for calculation accuracy
- **Export/Import** functionality for data backup

## Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Rust (for Tauri builds)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Protein_engineering_tools
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Run as Tauri desktop app**
   ```bash
   npm run tauri:dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run tauri:build
   ```

## Usage

### Basic Calculator

1. **Select Calculation Mode**
   - Click on one of the four calculation mode tabs:
     - Calculate Mass (most common)
     - Calculate Molarity
     - Calculate Volume
     - Dilution

2. **Enter Parameters**
   - Input known values (molarity, volume, molecular weight)
   - Use the chemical search for automatic molecular weight lookup
   - Search both local database and PubChem

3. **Calculate**
   - Click "Calculate" to get results
   - View step-by-step calculation breakdown
   - Results automatically adjust units for readability

### Using Recipes

1. Navigate to the "Recipes" tab
2. Browse or search for a recipe
3. Click on a recipe to view details
4. See calculated masses for all components
5. Follow preparation instructions

### Chemical Search

- Start typing a chemical name
- Results appear from local database
- If not found locally, search PubChem with one click
- PubChem results are automatically saved for future use

## Formulas

### Molarity Calculation
```
Molarity (M) = moles / Volume (L)
moles = mass (g) / Molecular Weight (g/mol)
```

### Mass Calculation
```
mass (g) = Molarity (M) × Volume (L) × Molecular Weight (g/mol)
```

### Volume Calculation
```
Volume (L) = moles / Molarity (M)
```

### Dilution Calculation
```
C₁ × V₁ = C₂ × V₂
```

## Project Structure

```
Protein_engineering_tools/
├── src/
│   ├── components/          # React components
│   │   ├── Calculator.tsx   # Main calculator component
│   │   ├── ChemicalSearch.tsx
│   │   ├── RecipeList.tsx
│   │   └── Toast.tsx
│   ├── contexts/            # React contexts
│   │   └── AppContext.tsx   # Global state management
│   ├── data/                # Static data
│   │   ├── chemicals.ts     # Curated chemical database
│   │   └── recipes.ts       # Pre-configured recipes
│   ├── services/            # External services
│   │   ├── database.ts      # IndexedDB wrapper
│   │   └── pubchem.ts       # PubChem API service
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── calculations.ts  # Calculation utilities
│   ├── styles/              # CSS files
│   │   └── index.css
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── src-tauri/               # Tauri backend
│   ├── src/
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## Development

### Running Tests

```bash
npm test
```

### Running Tests with UI

```bash
npm run test:ui
```

### Linting

```bash
npm run lint
```

### Building for Production

```bash
# Build web version
npm run build

# Build desktop app (all platforms)
npm run tauri:build
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | React 18 |
| Language | TypeScript |
| Desktop Framework | Tauri |
| Styling | Tailwind CSS |
| Database | IndexedDB (idb) |
| API Integration | Axios |
| Build Tool | Vite |
| Testing | Vitest |
| Icons | Lucide React |

## Database Schema

### Chemicals
- `id`: Unique identifier
- `commonName`: Common chemical name
- `iupacName`: IUPAC systematic name
- `formula`: Chemical formula
- `molecularWeight`: Molecular weight (g/mol)
- `casNumber`: CAS registry number
- `category`: Chemical category
- `tags`: Search tags

### Recipes
- `id`: Unique identifier
- `name`: Recipe name
- `description`: Description
- `category`: Recipe category
- `components`: Array of chemical components
- `totalVolume`: Total volume
- `pH`: Target pH (if applicable)
- `instructions`: Preparation steps
- `notes`: Additional notes

### User Preferences
- `defaultVolume`: Default volume for calculations
- `defaultVolumeUnit`: Default volume unit
- `defaultConcentrationUnit`: Default concentration unit
- `recentChemicals`: Recently used chemicals
- `favoriteRecipes`: Favorite recipes
- `theme`: UI theme preference
- `scientificNotation`: Enable scientific notation
- `decimalPlaces`: Number of decimal places

## API Integration

### PubChem REST API

The application integrates with the PubChem REST API to fetch chemical data:

- **Base URL**: `https://pubchem.ncbi.nlm.nih.gov/rest/pug`
- **Caching**: 24-hour cache for API responses
- **Error Handling**: Graceful fallback with user-friendly messages
- **Rate Limiting**: Automatic retry with exponential backoff

Example API calls:
```
# Search by name
GET /compound/name/{name}/cids/JSON

# Get compound properties
GET /compound/cid/{cid}/property/MolecularFormula,MolecularWeight,IUPACName/JSON

# Get synonyms
GET /compound/cid/{cid}/synonyms/JSON
```

## Future Enhancements

- [ ] User accounts and cloud synchronization
- [ ] Custom buffer recipe builder
- [ ] pH calculator
- [ ] Serial dilution calculator
- [ ] Percentage solution calculator
- [ ] Print/export recipes as PDF
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Chemical hazard information
- [ ] Unit conversion calculator

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use functional components and hooks
- Write descriptive comments for complex logic
- Add unit tests for new calculations
- Use semantic HTML and ARIA labels

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Chemical data from PubChem database (NIH)
- Icons from Lucide React
- Fonts from Google Fonts
- Community feedback and testing

## Support

For questions, issues, or suggestions:

- Open an issue on GitHub
- Check existing documentation
- Review the About section in the app

## Version History

### 1.0.0 (2024)
- Initial release
- Core molarity calculator
- Chemical database with 50+ chemicals
- PubChem API integration
- Pre-configured buffer recipes
- Offline functionality
- Desktop app with Tauri

## Citation

If you use this tool in your research, please cite:

```
Molarity Calculator v1.0.0
https://github.com/your-repo/molarity-calculator
```

---

**Built with ❤️ for the scientific community**

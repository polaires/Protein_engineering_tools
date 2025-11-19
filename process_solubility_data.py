#!/usr/bin/env python3
"""
Process comprehensive solubility data from CSV into JSON database for periodic table.
Handles compounds with and without explicit Element/Anion fields.
"""

import csv
import json
import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

# Element symbols and their names for matching
ELEMENT_DATA = {
    'H': 'hydrogen', 'He': 'helium', 'Li': 'lithium', 'Be': 'beryllium', 'B': 'boron',
    'C': 'carbon', 'N': 'nitrogen', 'O': 'oxygen', 'F': 'fluorine', 'Ne': 'neon',
    'Na': 'sodium', 'Mg': 'magnesium', 'Al': 'aluminum', 'Si': 'silicon', 'P': 'phosphorus',
    'S': 'sulfur', 'Cl': 'chlorine', 'Ar': 'argon', 'K': 'potassium', 'Ca': 'calcium',
    'Sc': 'scandium', 'Ti': 'titanium', 'V': 'vanadium', 'Cr': 'chromium', 'Mn': 'manganese',
    'Fe': 'iron', 'Co': 'cobalt', 'Ni': 'nickel', 'Cu': 'copper', 'Zn': 'zinc',
    'Ga': 'gallium', 'Ge': 'germanium', 'As': 'arsenic', 'Se': 'selenium', 'Br': 'bromine',
    'Kr': 'krypton', 'Rb': 'rubidium', 'Sr': 'strontium', 'Y': 'yttrium', 'Zr': 'zirconium',
    'Nb': 'niobium', 'Mo': 'molybdenum', 'Tc': 'technetium', 'Ru': 'ruthenium', 'Rh': 'rhodium',
    'Pd': 'palladium', 'Ag': 'silver', 'Cd': 'cadmium', 'In': 'indium', 'Sn': 'tin',
    'Sb': 'antimony', 'Te': 'tellurium', 'I': 'iodine', 'Xe': 'xenon', 'Cs': 'cesium',
    'Ba': 'barium', 'La': 'lanthanum', 'Ce': 'cerium', 'Pr': 'praseodymium', 'Nd': 'neodymium',
    'Pm': 'promethium', 'Sm': 'samarium', 'Eu': 'europium', 'Gd': 'gadolinium', 'Tb': 'terbium',
    'Dy': 'dysprosium', 'Ho': 'holmium', 'Er': 'erbium', 'Tm': 'thulium', 'Yb': 'ytterbium',
    'Lu': 'lutetium', 'Hf': 'hafnium', 'Ta': 'tantalum', 'W': 'tungsten', 'Re': 'rhenium',
    'Os': 'osmium', 'Ir': 'iridium', 'Pt': 'platinum', 'Au': 'gold', 'Hg': 'mercury',
    'Tl': 'thallium', 'Pb': 'lead', 'Bi': 'bismuth', 'Po': 'polonium', 'At': 'astatine',
    'Rn': 'radon', 'Fr': 'francium', 'Ra': 'radium', 'Ac': 'actinium', 'Th': 'thorium',
    'Pa': 'protactinium', 'U': 'uranium', 'Np': 'neptunium', 'Pu': 'plutonium', 'Am': 'americium',
    'Cm': 'curium', 'Bk': 'berkelium', 'Cf': 'californium', 'Es': 'einsteinium', 'Fm': 'fermium',
    'Md': 'mendelevium', 'No': 'nobelium', 'Lr': 'lawrencium', 'Rf': 'rutherfordium', 'Db': 'dubnium',
    'Sg': 'seaborgium', 'Bh': 'bohrium', 'Hs': 'hassium', 'Mt': 'meitnerium', 'Ds': 'darmstadtium',
    'Rg': 'roentgenium', 'Cn': 'copernicium', 'Nh': 'nihonium', 'Fl': 'flerovium', 'Mc': 'moscovium',
    'Lv': 'livermorium', 'Ts': 'tennessine', 'Og': 'oganesson'
}

# Common polyatomic cations
POLYATOMIC_CATIONS = {
    'NH4': 'ammonium',
    'H3O': 'hydronium',
}

# Elements that typically form salts/compounds we care about
# Exclude those that are primarily organic compound constituents
INORGANIC_ELEMENTS = {
    'Li', 'Be', 'Na', 'Mg', 'Al', 'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni',
    'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru',
    'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd',
    'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy', 'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re',
    'Os', 'Ir', 'Pt', 'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Fr', 'Ra', 'Ac', 'Th', 'Pa',
    'U', 'Np', 'Pu', 'Am', 'Cm', 'Bk', 'Cf', 'Es', 'Fm', 'Md', 'No', 'Lr', 'Rf', 'Db', 'Sg',
    'Bh', 'Hs', 'Mt', 'Ds', 'Rg', 'Cn', 'Nh', 'Fl', 'Mc', 'Lv', 'Ts', 'Og', 'B', 'Si', 'NH4'
}


def extract_element_from_name(compound_name: str) -> Optional[str]:
    """
    Extract the primary metal/cation element from a compound name.
    Returns element symbol or polyatomic cation symbol.
    Only returns elements that are in INORGANIC_ELEMENTS set.
    """
    if not compound_name:
        return None

    name_lower = compound_name.lower()

    # Check for polyatomic cations first
    if 'ammonium' in name_lower:
        return 'NH4'

    # Check for metal names in the compound name
    # Sort by length (descending) to match longer names first
    for symbol, name in sorted(ELEMENT_DATA.items(), key=lambda x: len(x[1]), reverse=True):
        if name in name_lower:
            # Only accept inorganic elements
            if symbol not in INORGANIC_ELEMENTS:
                continue

            # Additional check: if it's a common element, make sure it's actually the cation
            # Skip if it appears to be part of an organic compound name
            # Common organic prefixes/words to avoid
            organic_words = ['late', 'acid', 'ate', 'ene', 'ane', 'yne', 'ol', 'one', 'ide']

            # Check context around the element name
            # If preceded or followed by organic indicators, skip
            name_idx = name_lower.find(name)
            if name_idx > 0:
                prefix = name_lower[max(0, name_idx-3):name_idx]
                if any(prefix.endswith(w) for w in ['pro', 'iso', 'neo', 'tert']):
                    continue

            # For common elements, require explicit ion/cation mention
            if symbol in ['B', 'Si', 'Br', 'I', 'As', 'Se', 'Te', 'Sb']:
                if not ('ion' in name_lower or 'cation' in name_lower or f'{name}(' in name_lower):
                    continue

            return symbol

    return None


def extract_element_from_smiles(smiles: str) -> Optional[str]:
    """
    Extract the primary cation/metal element from SMILES notation.
    Looks for charged species and metal atoms.
    Only returns elements that are in INORGANIC_ELEMENTS set.
    """
    if not smiles or smiles == 'N/A':
        return None

    # Look for explicitly charged metal ions in SMILES (e.g., [La+3], [Cu+2])
    charged_pattern = r'\[([A-Z][a-z]?)\+\d*\]'
    matches = re.findall(charged_pattern, smiles)

    for match in matches:
        if match in INORGANIC_ELEMENTS:
            return match

    # Look for metal atoms in brackets [metal notation]
    for symbol in INORGANIC_ELEMENTS:
        if symbol == 'NH4':
            continue  # Skip polyatomic ions
        if f'[{symbol}' in smiles:
            return symbol

    return None


def extract_anion_from_name(compound_name: str) -> Optional[str]:
    """
    Extract common anion from compound name.
    """
    if not compound_name:
        return None

    name_lower = compound_name.lower()

    # Common anions
    anion_patterns = {
        'chloride': 'Cl',
        'bromide': 'Br',
        'iodide': 'I',
        'fluoride': 'F',
        'sulfate': 'SO4',
        'nitrate': 'NO3',
        'carbonate': 'CO3',
        'phosphate': 'PO4',
        'hydroxide': 'OH',
        'oxide': 'O',
        'acetate': 'C2H3O2',
        'sulfide': 'S',
    }

    for anion_name, anion_symbol in anion_patterns.items():
        if anion_name in name_lower:
            return anion_symbol

    return None


def process_csv_to_database(csv_path: str) -> Tuple[Dict, Dict]:
    """
    Process CSV file and create the solubility database.
    Returns (database_dict, stats_dict)
    """
    database = defaultdict(lambda: {'element': '', 'compounds': {}})

    # Track statistics
    total_rows = 0
    processed_rows = 0
    skipped_rows = 0
    elements_found = set()

    print(f"Reading CSV file: {csv_path}")

    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        for row in reader:
            total_rows += 1

            # Extract basic info
            compound = row.get('Compound', '').strip()
            element = row.get('Element', '').strip()
            anion = row.get('Anion', '').strip()
            mw_str = row.get('MW (g/mol)', '').strip()
            temp_str = row.get('Temp (°C)', '').strip()
            substance_name = row.get('Substance Name', '').strip()
            smiles = row.get('SMILES', '').strip()
            quality = row.get('Data Quality', '').strip()
            source = row.get('Source', '').strip()

            if not compound:
                skipped_rows += 1
                continue

            # Validate element if provided - must be a real inorganic element
            if element and element not in INORGANIC_ELEMENTS:
                element = ''  # Treat invalid element as missing

            # If element is not provided or invalid, try to extract it
            if not element:
                element = extract_element_from_name(compound)
                if not element:
                    element = extract_element_from_smiles(smiles)
                if not element:
                    element = extract_element_from_name(substance_name)

            # If still no element, skip this row
            if not element:
                skipped_rows += 1
                if total_rows % 1000 == 0:
                    print(f"  Skipped row {total_rows}: {compound} (no element found)")
                continue

            # If anion is not provided, try to extract it
            if not anion:
                anion = extract_anion_from_name(compound)
                if not anion:
                    anion = extract_anion_from_name(substance_name)
                if not anion:
                    anion = ''  # Empty string if we can't determine

            # Parse molecular weight
            try:
                mw = float(mw_str) if mw_str else None
            except ValueError:
                mw = None

            # Parse temperature
            try:
                temp = float(temp_str) if temp_str else None
            except ValueError:
                temp = None

            if temp is None:
                skipped_rows += 1
                continue

            # Parse solubility data
            mass_pct = row.get('Mass %', '').strip()
            molarity = row.get('Molarity (M)', '').strip()
            log_s = row.get('log S', '').strip()
            g_per_100ml = row.get('g/100mL H2O', '').strip()

            # Helper to parse float or None
            def parse_float(val):
                if not val:
                    return None
                try:
                    return float(val)
                except ValueError:
                    return None

            # Create temperature data point
            temp_data = {
                'temperature': temp,
                'massPct': parse_float(mass_pct),
                'molarity': parse_float(molarity),
                'logS': parse_float(log_s),
                'gPer100mL': parse_float(g_per_100ml)
            }

            # Initialize element entry if needed
            if element not in database:
                database[element]['element'] = element
                database[element]['compounds'] = {}

            # Initialize compound entry if needed
            if compound not in database[element]['compounds']:
                database[element]['compounds'][compound] = {
                    'formula': compound,
                    'anion': anion,
                    'molecularWeight': mw,
                    'substanceName': substance_name if substance_name else None,
                    'temperatureData': {},
                    'sources': set(),
                    'quality': quality if quality else None
                }

            # Add temperature data
            temp_key = str(int(temp))
            database[element]['compounds'][compound]['temperatureData'][temp_key] = temp_data

            # Add source
            if source:
                database[element]['compounds'][compound]['sources'].add(source)

            elements_found.add(element)
            processed_rows += 1

            if processed_rows % 1000 == 0:
                print(f"  Processed {processed_rows} rows... (found {len(elements_found)} elements)")

    # Convert sets to lists for JSON serialization
    for element in database:
        for compound in database[element]['compounds']:
            sources = database[element]['compounds'][compound]['sources']
            database[element]['compounds'][compound]['sources'] = sorted(list(sources))

    # Create statistics
    total_compounds = sum(len(data['compounds']) for data in database.values())

    stats = {
        'totalElements': len(database),
        'totalCompounds': total_compounds,
        'elements': sorted(database.keys()),
        'temperatureRange': [0, 100],  # Based on typical data
        'dataSource': 'Comprehensive Solubility Database',
        'lastUpdated': '2025-11-19',
        'processingStats': {
            'totalRows': total_rows,
            'processedRows': processed_rows,
            'skippedRows': skipped_rows
        }
    }

    print(f"\nProcessing complete!")
    print(f"  Total rows: {total_rows}")
    print(f"  Processed: {processed_rows}")
    print(f"  Skipped: {skipped_rows}")
    print(f"  Elements: {len(database)}")
    print(f"  Compounds: {total_compounds}")
    print(f"  Elements found: {sorted(elements_found)}")

    return dict(database), stats


def main():
    """Main processing function."""
    csv_path = 'solubility_data_comprehensive.csv'
    db_output = 'public/data/solubility-database.json'
    stats_output = 'public/data/solubility-stats.json'

    print("Starting solubility data processing...")
    print("=" * 60)

    # Process the CSV
    database, stats = process_csv_to_database(csv_path)

    # Write database JSON
    print(f"\nWriting database to {db_output}...")
    with open(db_output, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2)

    # Write stats JSON
    print(f"Writing statistics to {stats_output}...")
    with open(stats_output, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2)

    print("\nDone! 🎉")
    print(f"Database: {db_output}")
    print(f"Statistics: {stats_output}")


if __name__ == '__main__':
    main()

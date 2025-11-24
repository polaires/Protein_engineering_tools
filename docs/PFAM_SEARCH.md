# Pfam Domain Search Feature

## Overview

The Pfam domain search feature allows you to automatically search protein sequences against the Pfam database using the HMMER web API. This feature is integrated into the ProtParam sequence analysis tool.

## Features

- **Automatic Domain Detection**: Search protein sequences against the Pfam-A database
- **Detailed Results**: View domain accessions, names, descriptions, positions, E-values, and bit scores
- **Visual Domain Map**: See a graphical representation of domain coverage across your sequence
- **External Links**: Direct links to InterPro/Pfam entries for detailed information

## How to Use

1. Navigate to the **ProtParam** tool in the application
2. Enter or paste your protein sequence in the sequence input field
3. Click the **"Search Pfam Domains"** button
4. Wait for the search to complete (typically 5-30 seconds)
5. Review the results showing all detected Pfam domains

## API Information

This feature uses the [HMMER web services API](https://hmmer-web-docs.readthedocs.io/en/latest/api.html) provided by EMBL-EBI.

- **API Endpoint**: `https://www.ebi.ac.uk/Tools/hmmer/search/hmmscan`
- **Database**: Pfam-A (protein families database)
- **Method**: Profile HMM scanning

## CORS Handling

The HMMER API may have CORS restrictions depending on your deployment environment. This implementation supports two modes:

### Direct Mode (Default)

By default, the frontend makes direct requests to the HMMER API at EBI.

### Proxy Mode

If you encounter CORS issues, you can enable proxy mode to route requests through your Railway backend.

#### Enabling Proxy Mode

Add the following environment variable to your frontend configuration:

```bash
VITE_USE_HMMER_PROXY=true
```

#### Backend Setup

The backend proxy endpoints are already configured in `server/index.js`:

- `POST /api/hmmer/search` - Submit a new search
- `GET /api/hmmer/results/:jobId` - Poll for results

Make sure your Railway backend is deployed and the `VITE_API_URL` environment variable is set correctly in your frontend.

## Environment Variables

### Frontend (.env)

```bash
# Enable HMMER proxy mode (optional, only if CORS issues occur)
VITE_USE_HMMER_PROXY=false

# Backend API URL (required for proxy mode)
VITE_API_URL=https://your-railway-backend.railway.app
```

### Backend (.env)

No additional environment variables are required for the HMMER proxy. The backend uses the standard configuration.

## Response Format

The search returns a `PfamSearchResult` object:

```typescript
interface PfamSearchResult {
  success: boolean;
  domains: PfamDomain[];
  sequence: string;
  sequenceLength: number;
  searchTime?: number;
  error?: string;
}

interface PfamDomain {
  acc: string;           // Pfam accession (e.g., PF00001)
  name: string;          // Pfam ID/name (e.g., 7tm_1)
  type: string;          // Domain type
  description: string;   // Domain description
  start: number;         // Start position in sequence
  end: number;           // End position in sequence
  evalue: number;        // E-value (lower = more significant)
  bitscore: number;      // Bit score (higher = better match)
}
```

## Understanding Results

### E-value

The E-value (Expectation value) represents the number of matches you would expect to find by chance in a database search. Lower E-values indicate more significant matches.

- **E < 0.001**: Highly significant match
- **E < 0.01**: Significant match
- **E > 0.01**: May not be significant

### Bit Score

The bit score is a normalized score that accounts for the size of the database. Higher bit scores indicate better matches.

## Troubleshooting

### No domains found

This is normal for many sequences. Not all proteins contain known Pfam domains.

### Search timeout

If searches consistently timeout:
1. Check your internet connection
2. Try a shorter sequence
3. Enable proxy mode if not already enabled

### CORS errors in browser console

If you see CORS errors:
1. Set `VITE_USE_HMMER_PROXY=true` in your frontend environment
2. Ensure your Railway backend is running and accessible
3. Verify `VITE_API_URL` is set correctly

## Implementation Files

- **Frontend Service**: `src/services/pfamApi.ts`
- **Frontend UI**: `src/components/ProtParam.tsx`
- **Backend Proxy**: `server/index.js` (lines 1034-1094)

## References

- [HMMER Web Services Documentation](https://hmmer-web-docs.readthedocs.io/en/latest/api.html)
- [Pfam Database](https://pfam.xfam.org/)
- [InterPro](https://www.ebi.ac.uk/interpro/)

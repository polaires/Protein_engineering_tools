/**
 * Main App component
 */

import { useState } from 'react';
import { Calculator as CalcIcon, FlaskConical, BookOpen, Settings, Github, Sparkles, Dna } from 'lucide-react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Calculator from '@/components/Calculator';
import RecipeList from '@/components/RecipeList';
import RecipeBuilder from '@/components/RecipeBuilder';
import ProtParam from '@/components/ProtParam';
import { ToastContainer } from '@/components/Toast';
import { Recipe } from '@/types';

type Tab = 'calculator' | 'protparam' | 'recipes' | 'builder' | 'about';

function AppContent() {
  const { toasts, removeToast, loadingChemicals, loadingRecipes } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('calculator');

  // Handle recipe selection
  const handleRecipeSelect = (recipe: Recipe) => {
    console.log('Selected recipe:', recipe);
    // Could navigate to calculator with pre-filled values
  };

  // Loading state
  if (loadingChemicals.isLoading || loadingRecipes.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">
            {loadingChemicals.message || loadingRecipes.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass-card sticky top-0 z-40 mb-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FlaskConical className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  Protein Engineering Tools
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Professional tools for molecular biology and biochemistry
                </p>
              </div>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-icon"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setActiveTab('calculator')}
              className={`calc-mode-tab ${activeTab === 'calculator' ? 'active' : ''}`}
            >
              <CalcIcon className="w-4 h-4 inline mr-2" />
              Molarity Calculator
            </button>
            <button
              onClick={() => setActiveTab('protparam')}
              className={`calc-mode-tab ${activeTab === 'protparam' ? 'active' : ''}`}
            >
              <Dna className="w-4 h-4 inline mr-2" />
              ProtParam
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`calc-mode-tab ${activeTab === 'recipes' ? 'active' : ''}`}
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Recipes
            </button>
            <button
              onClick={() => setActiveTab('builder')}
              className={`calc-mode-tab ${activeTab === 'builder' ? 'active' : ''}`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Recipe Builder
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`calc-mode-tab ${activeTab === 'about' ? 'active' : ''}`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              About
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-8">
        {activeTab === 'calculator' && (
          <div className="animate-in">
            <Calculator />
          </div>
        )}

        {activeTab === 'protparam' && (
          <div className="animate-in">
            <ProtParam />
          </div>
        )}

        {activeTab === 'recipes' && (
          <div className="animate-in">
            <div className="mb-6">
              <h2 className="section-title">Buffer & Solution Recipes</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Browse pre-configured recipes for common laboratory solutions
              </p>
            </div>
            <RecipeList onSelectRecipe={handleRecipeSelect} />
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="animate-in">
            <RecipeBuilder />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="animate-in max-w-4xl mx-auto">
            <div className="card">
              <h2 className="section-title">About Protein Engineering Tools</h2>

              <div className="space-y-6">
                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">
                    Features
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        Molarity Calculator
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        <li>Multiple calculation modes (mass, molarity, volume, dilution)</li>
                        <li>Customizable concentration units (M, mM, μM, nM, pM)</li>
                        <li>Customizable volume units (L, mL, μL)</li>
                        <li>Curated database of 50+ common laboratory chemicals</li>
                        <li>PubChem API integration for additional chemicals</li>
                        <li>Pre-configured buffer recipes (PBS, TBS, HEPES, etc.)</li>
                        <li>Custom recipe builder for multi-component solutions</li>
                        <li>Concentration multiplier support (1×, 5×, 10×, custom stock solutions)</li>
                        <li>Solubility warnings for high concentrations</li>
                        <li>Step-by-step calculation breakdowns</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        ProtParam - Protein Analysis
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        <li>Molecular weight calculation</li>
                        <li>Theoretical isoelectric point (pI)</li>
                        <li>Amino acid composition and percentages</li>
                        <li>Atomic composition (C, H, N, O, S)</li>
                        <li>Extinction coefficient (reduced and oxidized)</li>
                        <li>Instability index (protein stability prediction)</li>
                        <li>Aliphatic index</li>
                        <li>Grand average of hydropathicity (GRAVY)</li>
                        <li>Aromaticity calculation</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        General
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                        <li>Offline functionality with IndexedDB storage</li>
                        <li>Export/import data for backup</li>
                        <li>Dark mode support</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <div className="divider" />

                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">
                    How to Use
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        1. Select Calculation Mode
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        Choose the type of calculation you need: mass, molarity, volume, or dilution.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        2. Enter Parameters
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        Input the known values. Use the chemical search to automatically populate molecular weights.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2">
                        3. View Results
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        Get instant results with step-by-step calculations to verify the math.
                      </p>
                    </div>
                  </div>
                </section>

                <div className="divider" />

                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">
                    Formulas
                  </h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="font-semibold mb-1">Molarity:</div>
                      <code>M = moles / Volume (L)</code>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="font-semibold mb-1">Mass:</div>
                      <code>mass (g) = Molarity (M) × Volume (L) × MW (g/mol)</code>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      <div className="font-semibold mb-1">Dilution:</div>
                      <code>C₁ × V₁ = C₂ × V₂</code>
                    </div>
                  </div>
                </section>

                <div className="divider" />

                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">
                    Technology Stack
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <div className="font-semibold text-primary-700 dark:text-primary-300">
                        Frontend
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        React 18 + TypeScript
                      </div>
                    </div>
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <div className="font-semibold text-primary-700 dark:text-primary-300">
                        Desktop
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        Tauri
                      </div>
                    </div>
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <div className="font-semibold text-primary-700 dark:text-primary-300">
                        Styling
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        Tailwind CSS
                      </div>
                    </div>
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <div className="font-semibold text-primary-700 dark:text-primary-300">
                        Database
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        IndexedDB (idb)
                      </div>
                    </div>
                  </div>
                </section>

                <div className="divider" />

                <section className="text-center text-sm text-slate-600 dark:text-slate-400">
                  <p>Version 1.0.0</p>
                  <p className="mt-2">
                    Built for students and researchers in life sciences
                  </p>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <p>
          Made with ❤️ for the scientific community
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

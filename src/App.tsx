/**
 * Main App component
 */

import { useState } from 'react';
import { Calculator as CalcIcon, FlaskConical, Settings, Github, Dna as DnaIcon, Droplets, LogOut, LogIn, User as UserIcon, Atom } from 'lucide-react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import Calculator from '@/components/Calculator';
import ProtParam from '@/components/ProtParam';
import DNA from '@/components/DNA';
import SolubilityPeriodicTable from '@/components/SolubilityPeriodicTable';
import LoginModal from '@/components/LoginModal';
import { ToastContainer } from '@/components/Toast';

type Tab = 'solution' | 'protein' | 'dna' | 'element' | 'about';

function AppContent() {
  const { toasts, removeToast, loadingChemicals, loadingRecipes, isAuthenticated, currentUser, logout, showLoginModal, setShowLoginModal } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('solution');

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

            <div className="flex items-center gap-2">
              {/* User info or Login button */}
              {isAuthenticated ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {currentUser?.username}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="btn-icon"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="btn-primary"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </button>
              )}

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
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setActiveTab('solution')}
              className={`calc-mode-tab ${activeTab === 'solution' ? 'active' : ''}`}
            >
              <CalcIcon className="w-4 h-4 inline mr-2" />
              Solution
            </button>
            <button
              onClick={() => setActiveTab('protein')}
              className={`calc-mode-tab ${activeTab === 'protein' ? 'active' : ''}`}
            >
              <Droplets className="w-4 h-4 inline mr-2" />
              Protein
            </button>
            <button
              onClick={() => setActiveTab('dna')}
              className={`calc-mode-tab ${activeTab === 'dna' ? 'active' : ''}`}
            >
              <DnaIcon className="w-4 h-4 inline mr-2" />
              DNA
            </button>
            <button
              onClick={() => setActiveTab('element')}
              className={`calc-mode-tab ${activeTab === 'element' ? 'active' : ''}`}
            >
              <Atom className="w-4 h-4 inline mr-2" />
              Element
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
        {activeTab === 'solution' && (
          <div className="animate-in">
            <Calculator />
          </div>
        )}

        {activeTab === 'protein' && (
          <div className="animate-in">
            <ProtParam />
          </div>
        )}

        {activeTab === 'dna' && (
          <div className="animate-in">
            <DNA />
          </div>
        )}

        {activeTab === 'element' && (
          <div className="animate-in">
            <SolubilityPeriodicTable />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="animate-in max-w-4xl mx-auto">
            <div className="card">
              <h2 className="section-title">About Protein Engineering Tools</h2>

              <div className="space-y-6">
                <section>
                  <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                    A comprehensive toolkit for molecular biology and biochemistry, designed for students and researchers in life sciences.
                  </p>
                </section>

                <div className="divider" />

                <section>
                  <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
                    Features
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                        <CalcIcon className="w-5 h-5" />
                        Solution
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Molarity calculator with multiple modes, 50+ chemical database, buffer recipes, and custom recipe builder
                      </p>
                    </div>

                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                        <Droplets className="w-5 h-5" />
                        Protein
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Sequence analysis (MW, pI, stability, hydropathicity) and A280 concentration calculator
                      </p>
                    </div>

                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                        <DnaIcon className="w-5 h-5" />
                        DNA
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Golden Gate assembly calculator, advanced E. coli codon optimization (CAI-based with restriction site removal, terminator detection, and CAI visualization), and library design tools
                      </p>
                    </div>

                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                      <h4 className="font-semibold text-primary-700 dark:text-primary-300 mb-2 flex items-center gap-2">
                        <Atom className="w-5 h-5" />
                        Element
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        Interactive periodic table with detailed element information from PubChem
                      </p>
                    </div>
                  </div>
                </section>

                <div className="divider" />

                <section>
                  <h3 className="text-xl font-semibold mb-3 text-slate-800 dark:text-slate-200">
                    Technology
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      React 18 + TypeScript
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tailwind CSS
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      IndexedDB
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      Tauri
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      PubChem API
                    </span>
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-sm font-medium text-slate-700 dark:text-slate-300">
                      Recharts
                    </span>
                  </div>
                </section>

                <div className="divider" />

                <section className="text-center text-sm text-slate-600 dark:text-slate-400">
                  <p className="font-medium">Version 1.0.0</p>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        message="Login to save your custom recipes and measurements to the cloud"
      />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium text-slate-700 dark:text-slate-300">
          Developed by Wei Wang
        </p>
        <p className="mt-1">
          For questions or suggestions: <a href="mailto:ww2607@columbia.edu" className="text-primary-600 dark:text-primary-400 hover:underline">ww2607@columbia.edu</a>
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

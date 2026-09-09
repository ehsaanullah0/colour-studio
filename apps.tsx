/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PaletteColor, HarmonyMode, PaletteHistoryItem, PantoneColor } from './types';
import { PANTONE_COLORS } from './data/pantoneColors';
import { generateHarmonicPalette } from './utils/colorUtils';
import { Header } from './components/Header';
import { PaletteGenerator } from './components/PaletteGenerator';
import { InspirationsView } from './components/InspirationsView';
import { CombinationsView } from './components/CombinationsView';
import { PantoneLibrary } from './components/PantoneLibraryModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ExportModal } from './components/ExportModal';
import { ReplaceColorModal } from './components/ReplaceColorModal';
import { Toast } from './components/Toast';
import { EhsaanLogo } from './components/EhsaanLogo';

const LOCAL_STORAGE_HISTORY_KEY = 'pantone_palette_studio_history_v1';
export const MAX_HISTORY_ITEMS = 10;

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'inspirations' | 'library' | 'combinations'>('inspirations');
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>('coty-showcase');
  const [paletteCount, setPaletteCount] = useState<number>(5);
  const [palette, setPalette] = useState<PaletteColor[]>([]);
  const [history, setHistory] = useState<PaletteHistoryItem[]>([]);

  // Modals & Drawers
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [replaceSlotIndex, setReplaceSlotIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  // Dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Load history from localStorage on initial load (capped at max 10)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, MAX_HISTORY_ITEMS));
        }
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
  }, []);

  // Save history to localStorage (strictly capped at MAX_HISTORY_ITEMS = 10)
  const saveHistoryList = (newList: PaletteHistoryItem[]) => {
    const capped = newList.slice(0, MAX_HISTORY_ITEMS);
    setHistory(capped);
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(capped));
    } catch (e) {
      console.error('Failed to persist history', e);
    }
  };

  // Initial palette generation
  useEffect(() => {
    const initialRaw = generateHarmonicPalette('coty-showcase', 5);
    const initial = initialRaw.map((color, idx) => ({
      ...color,
      id: `slot-${idx}-${Date.now()}`,
      locked: false,
    }));
    setPalette(initial);
  }, []);

  // Core Randomize function
  const handleRandomize = useCallback(() => {
    setPalette((prev) => {
      if (prev.length === 0) return prev;

      // Extract locked colors
      const lockedSlots: (PantoneColor | null)[] = prev.map((c) => (c.locked ? c : null));

      // Choose base color if any locked, else random
      const firstLocked = prev.find((c) => c.locked);
      const generated = generateHarmonicPalette(harmonyMode, paletteCount, firstLocked, lockedSlots);

      const newPalette = generated.map((col, idx) => {
        const existing = prev[idx];
        if (existing && existing.locked) {
          return existing;
        }
        return {
          ...col,
          id: existing ? existing.id : `slot-${idx}-${Date.now()}`,
          locked: false,
        };
      });

      // Auto-append to history (deduplicating recent)
      const newHistoryItem: PaletteHistoryItem = {
        id: `pal-${Date.now()}`,
        timestamp: Date.now(),
        name: `${newPalette[0]?.name || 'Pantone'} Harmonics`,
        harmony: harmonyMode,
        colors: newPalette.map(({ id, locked, ...rest }) => rest),
        isFavorite: false,
      };

      setHistory((prevHist) => {
        const updated = [newHistoryItem, ...prevHist].slice(0, MAX_HISTORY_ITEMS);
        try {
          localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      return newPalette;
    });
  }, [harmonyMode, paletteCount]);

  // Adjust count when paletteCount changes
  useEffect(() => {
    setPalette((prev) => {
      if (prev.length === paletteCount || prev.length === 0) return prev;

      if (prev.length < paletteCount) {
        // Need to append more colors
        const needed = paletteCount - prev.length;
        const usedCodes = new Set(prev.map((c) => c.code));
        const pool = PANTONE_COLORS.filter((c) => !usedCodes.has(c.code));
        const additional = pool.slice(0, needed).map((c, i) => ({
          ...c,
          id: `slot-${prev.length + i}-${Date.now()}`,
          locked: false,
        }));
        return [...prev, ...additional];
      } else {
        // Truncate
        return prev.slice(0, paletteCount);
      }
    });
  }, [paletteCount]);

  // Keyboard shortcut: Spacebar to randomize (unless user is typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (e.code === 'Space' && !isInput && (activeTab === 'studio' || activeTab === 'inspirations')) {
        e.preventDefault();
        handleRandomize();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRandomize, activeTab]);

  // Toggle lock state of a slot
  const handleToggleLock = (id: string) => {
    setPalette((prev) =>
      prev.map((c) => (c.id === id ? { ...c, locked: !c.locked } : c))
    );
  };

  // Replace a specific slot with a chosen color
  const handleSelectColorToReplace = (slotIndex: number) => {
    setReplaceSlotIndex(slotIndex);
  };

  const handleApplyReplacementColor = (color: PantoneColor) => {
    if (replaceSlotIndex === null) return;
    setPalette((prev) =>
      prev.map((c, idx) =>
        idx === replaceSlotIndex
          ? { ...color, id: c.id, locked: true }
          : c
      )
    );
    showToast(`Slot #${replaceSlotIndex + 1} updated to ${color.name} (${color.code}) and locked`);
    setReplaceSlotIndex(null);
  };

  // Explicitly bookmark / save current palette
  const handleSaveToHistory = () => {
    const newHistoryItem: PaletteHistoryItem = {
      id: `pal-saved-${Date.now()}`,
      timestamp: Date.now(),
      name: `${palette[0]?.name || 'Pantone'} Palette`,
      harmony: harmonyMode,
      colors: palette.map(({ id, locked, ...rest }) => rest),
      isFavorite: true,
    };

    const updated = [newHistoryItem, ...history.filter((h) => h.id !== newHistoryItem.id)].slice(0, MAX_HISTORY_ITEMS);
    saveHistoryList(updated);
    showToast(`Saved "${newHistoryItem.name}" to Palette Vault (${updated.length}/${MAX_HISTORY_ITEMS})`);
  };

  // Restore palette from history
  const handleRestorePalette = (item: PaletteHistoryItem) => {
    setPaletteCount(item.colors.length);
    setHarmonyMode(item.harmony);
    const restored = item.colors.map((c, i) => ({
      ...c,
      id: `restored-${i}-${Date.now()}`,
      locked: false,
    }));
    setPalette(restored);
    setIsHistoryOpen(false);
    setActiveTab('studio');
  };

  // Toggle favorite in history
  const handleToggleFavorite = (id: string) => {
    const updated = history.map((item) =>
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    );
    saveHistoryList(updated);
  };

  // Clear all history
  const handleClearHistory = () => {
    saveHistoryList([]);
    showToast('Cleared palette history');
  };

  // Add single color from library into current palette
  const handleSelectColorForPalette = (color: PantoneColor) => {
    setPalette((prev) => {
      // If already present, don't duplicate
      if (prev.some((c) => c.code === color.code)) {
        showToast(`${color.name} is already in the active palette.`);
        return prev;
      }
      // Replace first unlocked color, or replace last
      const unlockIdx = prev.findIndex((c) => !c.locked);
      const targetIdx = unlockIdx !== -1 ? unlockIdx : prev.length - 1;
      const updated = [...prev];
      updated[targetIdx] = {
        ...color,
        id: updated[targetIdx]?.id || `slot-${targetIdx}-${Date.now()}`,
        locked: true,
      };
      showToast(`Added ${color.name} (${color.hex}) to palette and locked it.`);
      return updated;
    });
    setActiveTab('studio');
  };

  // Generate around color from library
  const handleGenerateAroundColor = (color: PantoneColor) => {
    const raw = generateHarmonicPalette('complementary', paletteCount, color);
    const updated = raw.map((c, i) => ({
      ...c,
      id: `seed-${i}-${Date.now()}`,
      locked: i === 0, // lock the seed color
    }));
    setPalette(updated);
    setActiveTab('studio');
    showToast(`Generated complementary harmony anchored on ${color.name} (${color.code})`);
  };

  return (
    <div className="min-h-screen bg-[#0d0d10] text-[#f4f4f5] flex flex-col selection:bg-amber-400/20 selection:text-amber-200">
      {/* Editorial Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onRandomize={handleRandomize}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
        {activeTab === 'studio' && (
          <PaletteGenerator
            palette={palette}
            harmonyMode={harmonyMode}
            setHarmonyMode={(mode) => {
              setHarmonyMode(mode);
              // Immediately regenerate with the new harmony mode
              setTimeout(handleRandomize, 10);
            }}
            paletteCount={paletteCount}
            setPaletteCount={setPaletteCount}
            onToggleLock={handleToggleLock}
            onRandomize={handleRandomize}
            onSaveToHistory={handleSaveToHistory}
            onSelectColorToReplace={handleSelectColorToReplace}
            onToast={showToast}
          />
        )}

        {activeTab === 'inspirations' && (
          <InspirationsView
            palette={palette}
            harmonyMode={harmonyMode}
            setHarmonyMode={(mode) => {
              setHarmonyMode(mode);
              setTimeout(handleRandomize, 10);
            }}
            onRandomize={handleRandomize}
            onToggleLock={handleToggleLock}
            onToast={showToast}
            onNavigateToStudio={() => setActiveTab('studio')}
            onOpenExport={() => setIsExportOpen(true)}
          />
        )}

        {activeTab === 'combinations' && (
          <CombinationsView palette={palette} onToast={showToast} />
        )}

        {activeTab === 'library' && (
          <PantoneLibrary
            onSelectColorForPalette={handleSelectColorForPalette}
            onGenerateAroundColor={handleGenerateAroundColor}
            onToast={showToast}
          />
        )}
      </main>

      {/* Footer / Minimalist Studio Credits */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/60 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <EhsaanLogo size="xs" className="w-5 h-5 ring-1 ring-neutral-700/60" />
            <span className="font-serif font-bold text-neutral-300">EHSAAN COLOUR STUDIO</span>
            <span>&#8226; Standardized PMS & TCX Color matching engine</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Click any color swatch to copy #hex</span>
            <span>Inspired by architectural & minimal studio aesthetics</span>
          </div>
        </div>
      </footer>

      {/* History Slide-over Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onRestorePalette={handleRestorePalette}
        onToggleFavorite={handleToggleFavorite}
        onClearHistory={handleClearHistory}
        onToast={showToast}
      />

      {/* Export Dialogue */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        palette={palette}
        onToast={showToast}
      />

      {/* Replace specific color modal */}
      <ReplaceColorModal
        isOpen={replaceSlotIndex !== null}
        onClose={() => setReplaceSlotIndex(null)}
        targetSlotIndex={replaceSlotIndex}
        currentColor={replaceSlotIndex !== null ? palette[replaceSlotIndex] : undefined}
        onSelectColor={handleApplyReplacementColor}
      />

      {/* Floating Action Toast Notification */}
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
    </div>
  );
}

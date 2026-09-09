import React, { useState } from 'react';
import { PaletteColor } from '../types';
import { X, Copy, Check, Download, FileCode, Code2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { copyTextToClipboard, generateSvgSwatch, downloadSvgFile } from '../utils/colorUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  palette: PaletteColor[];
  onToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  palette,
  onToast,
}) => {
  const [activeFormat, setActiveFormat] = useState<'hex' | 'css' | 'tailwind' | 'json'>('hex');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const hexList = palette.map((c) => c.hex).join(', ');

  const cssVariables = `:root {\n${palette
    .map(
      (c, i) =>
        `  --pantone-${i + 1}: ${c.hex}; /* ${c.code} ${c.name} */`
    )
    .join('\n')}\n}`;

  const tailwindConfig = `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        pantone: {\n${palette
    .map(
      (c, i) =>
        `          '${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || `color-${i + 1}`}': '${c.hex}', // ${c.code}`
    )
    .join('\n')}\n        }\n      }\n    }\n  }\n};`;

  const jsonExport = JSON.stringify(
    palette.map((c) => ({
      code: c.code,
      name: c.name,
      hex: c.hex,
      rgb: c.rgb,
      category: c.category,
      year: c.year,
    })),
    null,
    2
  );

  const getActiveContent = () => {
    switch (activeFormat) {
      case 'hex':
        return hexList;
      case 'css':
        return cssVariables;
      case 'tailwind':
        return tailwindConfig;
      case 'json':
        return jsonExport;
    }
  };

  const handleCopy = async (content: string, key: string) => {
    const success = await copyTextToClipboard(content);
    if (success) {
      setCopiedKey(key);
      onToast('Export content copied to clipboard!');
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleDownloadSvg = () => {
    const svg = generateSvgSwatch(palette);
    downloadSvgFile(svg, `ehsaan-palette-${Date.now()}.svg`);
    onToast('Downloaded Pantone SVG swatch file!');
  };

  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    const swatchWidth = 200;
    const swatchHeight = 280;
    const padding = 30;
    canvas.width = palette.length * swatchWidth + padding * 2;
    canvas.height = swatchHeight + padding * 2 + 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('EHSAAN COLOUR STUDIO SPECIFICATION', padding, 28);

    palette.forEach((color, idx) => {
      const x = padding + idx * swatchWidth;
      const y = padding + 20;

      // Card shadow & background
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, swatchWidth - 15, swatchHeight);
      ctx.shadowColor = 'transparent';

      // Swatch color block
      ctx.fillStyle = color.hex;
      ctx.fillRect(x, y, swatchWidth - 15, 180);

      // Card texts
      ctx.fillStyle = '#111827';
      ctx.font = '900 13px sans-serif';
      ctx.fillText('PANTONE®', x + 14, y + 210);

      ctx.fillStyle = '#374151';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(color.code, x + 14, y + 232);

      ctx.fillStyle = '#4b5563';
      ctx.font = '500 12px sans-serif';
      ctx.fillText(color.name, x + 14, y + 252);

      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(color.hex, x + 14, y + 270);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `pantone-palette-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onToast('Downloaded High-Res PNG swatch graphic!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[#131317] border border-neutral-800 rounded-2xl shadow-2xl text-white overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold tracking-tight">Export Palette</h3>
            <p className="text-xs text-neutral-400">Copy code representations or download high-fidelity artwork</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Swatch Quick Strip Preview */}
        <div className="h-12 w-full flex">
          {palette.map((c, i) => (
            <div
              key={i}
              className="flex-1 h-full flex items-center justify-center text-[10px] font-mono font-bold"
              style={{ backgroundColor: c.hex, color: '#ffffff' }}
            >
              <span className="bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-xs">{c.hex}</span>
            </div>
          ))}
        </div>

        {/* Format Selector Tabs */}
        <div className="p-5 space-y-4 flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setActiveFormat('hex')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeFormat === 'hex' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Hex List
              </button>
              <button
                onClick={() => setActiveFormat('css')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeFormat === 'css' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                CSS Variables
              </button>
              <button
                onClick={() => setActiveFormat('tailwind')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeFormat === 'tailwind' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tailwind CSS
              </button>
              <button
                onClick={() => setActiveFormat('json')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeFormat === 'json' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                JSON Data
              </button>
            </div>

            <button
              onClick={() => handleCopy(getActiveContent(), 'code')}
              className="px-3.5 py-1.5 rounded-lg bg-white text-neutral-950 hover:bg-neutral-100 font-bold text-xs flex items-center gap-1.5 shadow transition"
            >
              {copiedKey === 'code' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Copy Code</span>
            </button>
          </div>

          {/* Code display block */}
          <div className="relative">
            <pre className="w-full h-44 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs font-mono text-neutral-300 overflow-auto whitespace-pre leading-relaxed select-all">
              {getActiveContent()}
            </pre>
          </div>

          {/* Graphic Downloads */}
          <div className="pt-3 border-t border-neutral-800/80">
            <h4 className="text-xs font-semibold text-neutral-300 mb-2">Graphic Assets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleDownloadSvg}
                className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between text-xs font-medium text-neutral-200 transition text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-neutral-800 text-amber-400">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">Vector SVG Poster</span>
                    <span className="text-[11px] text-neutral-400">Authentic Pantone card layouts</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-neutral-400" />
              </button>

              <button
                onClick={handleDownloadPng}
                className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between text-xs font-medium text-neutral-200 transition text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-neutral-800 text-rose-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold block">High-Res PNG Swatches</span>
                    <span className="text-[11px] text-neutral-400">Ready for presentation & sharing</span>
                  </div>
                </div>
                <Download className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

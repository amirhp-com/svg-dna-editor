import React, { useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { html as beautifyHtml } from 'js-beautify';
import { Download, Code2, Paintbrush, Minimize2, Github, Copy, Check, RotateCw, Sun, Moon, Wand2, Link, FileCode2, Image as ImageIcon } from 'lucide-react';

const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <circle cx="50" cy="50" r="40" stroke="#58a6ff" stroke-width="4" fill="#161b22" />
  <path d="M 30 50 L 45 65 L 70 35" stroke="#2ea043" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

const optimizeSvg = (svgString: string) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return svgString;

    // Security: remove scripts and event handlers
    const scripts = svg.querySelectorAll('script');
    scripts.forEach(s => s.remove());

    const allElements = svg.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Normalization: ensure xmlns
    if (!svg.hasAttribute('xmlns')) {
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    // Remove comments and empty text nodes
    const cleanNodes = (node: Node) => {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        const child = node.childNodes[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          node.removeChild(child);
        } else if (child.nodeType === Node.TEXT_NODE && !child.nodeValue?.trim()) {
          node.removeChild(child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          cleanNodes(child);
        }
      }
    };
    cleanNodes(svg);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  } catch (e) {
    return svgString;
  }
};

const rotateSvg = (svgString: string, angle: number = 90) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return svgString;

    let cx = 50, cy = 50;
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/[ ,]+/).map(Number);
      if (parts.length === 4) {
        cx = parts[0] + parts[2] / 2;
        cy = parts[1] + parts[3] / 2;
      }
    } else {
      const w = parseFloat(svg.getAttribute('width') || '100');
      const h = parseFloat(svg.getAttribute('height') || '100');
      cx = w / 2;
      cy = h / 2;
    }

    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `rotate(${angle} ${cx} ${cy})`);

    while (svg.firstChild) {
      g.appendChild(svg.firstChild);
    }
    svg.appendChild(g);

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  } catch (e) {
    return svgString;
  }
};

const extractColors = (svgString: string) => {
  const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
  const rgbRegex = /rgba?\([^)]+\)/g;

  const colors = new Set<string>();

  let match;
  while ((match = hexRegex.exec(svgString)) !== null) {
    colors.add(match[0].toLowerCase());
  }
  while ((match = rgbRegex.exec(svgString)) !== null) {
    colors.add(match[0].toLowerCase());
  }

  return Array.from(colors);
};

export default function App() {
  const [code, setCode] = useState(DEFAULT_SVG);
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  const colors = useMemo(() => extractColors(code), [code]);

  const handleBeautify = () => {
    const formatted = beautifyHtml(code, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: false,
    });
    setCode(formatted);
  };

  const handleMinify = () => {
    const minified = code
      .replace(/>\s+</g, '><')
      .replace(/<!--.*?-->/g, '')
      .replace(/\n/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    setCode(minified);
  };

  const handleOptimize = () => {
    const optimized = optimizeSvg(code);
    const formatted = beautifyHtml(optimized, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: false,
    });
    setCode(formatted);
  };

  const handleRotate = () => {
    const rotated = rotateSvg(code, 90);
    const formatted = beautifyHtml(rotated, {
      indent_size: 2,
      wrap_line_length: 80,
      preserve_newlines: false,
    });
    setCode(formatted);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vector.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const handleCopyFormat = (format: 'data' | 'base64' | 'css') => {
    let textToCopy = '';
    const encodedSvg = encodeURIComponent(code).replace(/'/g, "%27").replace(/"/g, "%22");

    if (format === 'data') {
      textToCopy = `data:image/svg+xml;utf8,${encodedSvg}`;
    } else if (format === 'base64') {
      try {
        textToCopy = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(code)))}`;
      } catch (e) {
        textToCopy = `data:image/svg+xml;base64,${btoa(code)}`;
      }
    } else if (format === 'css') {
      textToCopy = `.svg-bg {\n  background-image: url("data:image/svg+xml;utf8,${encodedSvg}");\n}`;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0d1117] text-[#c9d1d9] font-sans selection:bg-[#1f6feb] selection:text-white">
      {/* Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 bg-[#161b22] border-b border-[#30363d] gap-4 md:gap-0">
        <div className="flex items-center gap-3">
          <Code2 className="w-6 h-6 text-[#58a6ff]" />
          <h1 className="text-lg font-semibold text-[#c9d1d9]">SVG DNA Editor</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleOptimize}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
          >
            <Wand2 className="w-4 h-4" />
            Optimize
          </button>
          <button
            onClick={handleBeautify}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
          >
            <Paintbrush className="w-4 h-4" />
            Beautify
          </button>
          <button
            onClick={handleMinify}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
          >
            <Minimize2 className="w-4 h-4" />
            Minify
          </button>
          <button
            onClick={handleRotate}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#c9d1d9] bg-[#21262d] border border-[#30363d] rounded-md hover:bg-[#30363d] hover:border-[#8b949e] transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            Rotate 90°
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#238636] border border-[rgba(240,246,252,0.1)] rounded-md hover:bg-[#2ea043] transition-colors"
          >
            <Download className="w-4 h-4" />
            Download SVG
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#30363d] min-h-[50vh] md:min-h-0">
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Editor</span>
            <button
              onClick={handleCopy}
              className="p-1 text-[#8b949e] hover:text-[#c9d1d9] transition-colors rounded"
              title="Copy code"
            >
              {copied ? <Check className="w-4 h-4 text-[#3fb950]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex-1 relative">
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 1.5,
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                formatOnPaste: true,
              }}
              loading={
                <div className="flex items-center justify-center h-full text-[#8b949e]">
                  Loading editor...
                </div>
              }
            />
          </div>
          {/* Colors Grid */}
          {colors.length > 0 && (
            <div className="p-4 bg-[#161b22] border-t border-[#30363d]">
              <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider mb-2 block">Extracted Colors</span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color, i) => (
                  <button
                    key={`${color}-${i}`}
                    onClick={() => handleCopyColor(color)}
                    className="w-8 h-8 rounded-md border border-[#30363d] flex items-center justify-center relative group shadow-sm transition-transform hover:scale-110"
                    style={{ backgroundColor: color }}
                    title={`Copy ${color}`}
                  >
                    {copiedColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview Pane */}
        <div className="flex-1 flex flex-col bg-[#0d1117] min-h-[50vh] md:min-h-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d] gap-2 sm:gap-0">
            <span className="text-xs font-semibold text-[#8b949e] uppercase tracking-wider">Live Preview</span>

            <div className="flex items-center gap-3">
              {/* Zoom Slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8b949e] w-8 text-right">{zoom}%</span>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-24 accent-[#58a6ff]"
                />
              </div>

              <div className="w-px h-4 bg-[#30363d]"></div>

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                className="p-1 text-[#8b949e] hover:text-[#c9d1d9] transition-colors rounded"
                title="Toggle background"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <div className="w-px h-4 bg-[#30363d]"></div>

              {/* Copy Formats */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopyFormat('data')}
                  className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors rounded"
                  title="Copy Data URI"
                >
                  {copiedFormat === 'data' ? <Check className="w-4 h-4 text-[#3fb950]" /> : <Link className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopyFormat('base64')}
                  className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors rounded"
                  title="Copy Base64"
                >
                  {copiedFormat === 'base64' ? <Check className="w-4 h-4 text-[#3fb950]" /> : <FileCode2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopyFormat('css')}
                  className="p-1.5 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] transition-colors rounded"
                  title="Copy CSS Class"
                >
                  {copiedFormat === 'css' ? <Check className="w-4 h-4 text-[#3fb950]" /> : <ImageIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className={`flex-1 flex items-center justify-center p-8 overflow-auto relative ${theme === 'dark' ? 'checkerboard-bg-dark' : 'checkerboard-bg-light'}`}>
            <div
              className="flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
              dangerouslySetInnerHTML={{ __html: code }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-[#161b22] border-t border-[#30363d] text-sm text-[#8b949e] gap-4 sm:gap-0">
        <div className="flex items-center gap-4">
          <span>v.1.0.1</span>
          <span className="w-1 h-1 rounded-full bg-[#30363d]"></span>
          <span>&copy; {new Date().getFullYear()} Amirhossein Hosseinpour</span>
          <span className="w-1 h-1 rounded-full bg-[#30363d]"></span>
          <a href="https://amirhp.com/landing" target="_blank" rel="noopener noreferrer" className="hover:text-[#58a6ff] transition-colors">
            Amirhp.Com
          </a>
        </div>
        <a
          href="https://github.com/amirhp-com/svg-dna-editor/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:text-[#58a6ff] transition-colors"
        >
          <Github className="w-4 h-4" />
          <span>@svg-dna-editor</span>
        </a>
      </footer>
    </div>
  );
}

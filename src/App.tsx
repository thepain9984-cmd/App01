import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Plus, 
  Eye, 
  Play, 
  TrendingUp, 
  List, 
  HelpCircle,
  FileText,
  Volume2,
  VolumeX,
  Type,
  Maximize,
  Save,
  CheckCircle2,
  PenTool,
  BookOpen
} from "lucide-react";
import SidebarPanel from "./components/SidebarPanel";
import DraftGenerator from "./components/DraftGenerator";
import InlineEditorOverlay from "./components/InlineEditorOverlay";
import { Document, CopilotSuggestion } from "./types";

// Seed sample document to make the app ready to show right away
const INITIAL_DOC: Document = {
  id: "initial_doc_1",
  title: "The Clockmaker of Edinburgh",
  content: `Across the cobblestone lanes of Edinburgh, where the cold North Sea wind carried the faint scent of salt and peat, Alistair worked in absolute silence. 

His clock shop was no larger than a horse-drawn carriage, packed to the rafters with ticking brass, swinging pendulums, and glass-domed timepieces. For forty years, locals knew him as the quiet man with brass-bitten fingers and spectacles perched low on his nose.

One freezing November evening, a mysterious traveler arrived carrying a leather pouch. Inside lay a single, intricate gear. Unlike ordinary brass gears, this one carried a dark obsidian hue and a faint warmth that defied the winter frost.

When Alistair placed the gear on his analyzing bench, something remarkable happened. The teeth spun in reverse. Each tick felt like a soft breath into the drafty room. Time, it seemed, was attempting to trace its steps backward.`,
  createdAt: new Date().toISOString(),
  lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  wordCount: 153,
  charCount: 948
};

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  
  // Design Preferences
  const [fontFamily, setFontFamily] = useState<"serif" | "serif-elegant" | "mono">("serif");
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<"spacious" | "comfy" | "tight">("comfy");
  
  // Dialog / Modal State
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isProactiveReviewing, setIsProactiveReviewing] = useState(false);
  
  // Selection / Floating iteration state
  const [selection, setSelection] = useState("");
  const [contextBefore, setContextBefore] = useState("");
  const [contextAfter, setContextAfter] = useState("");
  const [selectionCoords, setSelectionCoords] = useState<{ top: number; left: number } | null>(null);
  
  // Copilot Review Suggestions
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[]>([]);
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // Autosave confirmation state visual indicator
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCharCountRef = useRef<number>(0);

  // Load from localStorage or seed initial state
  useEffect(() => {
    const savedDocs = localStorage.getItem("scribe_docs");
    const savedSuggestions = localStorage.getItem("scribe_suggestions");
    
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs) as Document[];
        if (parsed.length > 0) {
          setDocuments(parsed);
          setCurrentDocId(parsed[0].id);
          lastCharCountRef.current = parsed[0].content.length;
        } else {
          setDocuments([INITIAL_DOC]);
          setCurrentDocId(INITIAL_DOC.id);
          lastCharCountRef.current = INITIAL_DOC.content.length;
        }
      } catch (e) {
        setDocuments([INITIAL_DOC]);
        setCurrentDocId(INITIAL_DOC.id);
      }
    } else {
      setDocuments([INITIAL_DOC]);
      setCurrentDocId(INITIAL_DOC.id);
      lastCharCountRef.current = INITIAL_DOC.content.length;
    }

    if (savedSuggestions) {
      try {
        setSuggestions(JSON.parse(savedSuggestions));
      } catch (e) {
        setSuggestions([]);
      }
    }
  }, []);

  // Sync to local storage
  const saveToStorage = (updatedDocs: Document[], updatedSuggestions?: CopilotSuggestion[]) => {
    localStorage.setItem("scribe_docs", JSON.stringify(updatedDocs));
    if (updatedSuggestions) {
      localStorage.setItem("scribe_suggestions", JSON.stringify(updatedSuggestions));
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (!currentDocId) return;

    setSaveStatus("saving");

    // Word & char count analytics
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;

    const updated = documents.map((doc) => {
      if (doc.id === currentDocId) {
        return {
          ...doc,
          content: text,
          wordCount: words,
          charCount: chars,
          lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return doc;
    });

    setDocuments(updated);
    saveToStorage(updated);
    
    setTimeout(() => {
      setSaveStatus("saved");
    }, 400);

    // AI Proactive background listener: Debounces review trigger when writing halts for 12 seconds
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(() => {
      // Trigger auto-copilot if text size changed significantly
      const delta = Math.abs(chars - lastCharCountRef.current);
      if (delta > 35 && text.trim().length > 30) {
        triggerProactiveCopilot(text);
      }
    }, 12000);
  };

  // Trigger Proactive Critique Analysis
  const triggerProactiveCopilot = async (overrideContent?: string) => {
    const doc = documents.find((d) => d.id === currentDocId);
    const contentToAnalyze = overrideContent !== undefined ? overrideContent : (doc?.content || "");
    
    if (!contentToAnalyze || contentToAnalyze.trim().length < 15) return;

    setIsProactiveReviewing(true);
    setIsCopilotLoading(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToAnalyze,
          documentTitle: doc?.title || "Untitled"
        })
      });

      if (response.ok) {
        const data = await response.json();
        const incoming = (data.suggestions || []) as CopilotSuggestion[];
        
        // Merge or replace suggestions
        const newSuggestions = [
          ...incoming,
          ...suggestions.filter(s => s.applied || s.dismissed)
        ];
        
        setSuggestions(newSuggestions);
        saveToStorage(documents, newSuggestions);
        lastCharCountRef.current = contentToAnalyze.length;
      }
    } catch (err) {
      console.error("Proactive critique request failed", err);
    } finally {
      setIsProactiveReviewing(false);
      setIsCopilotLoading(false);
    }
  };

  // Document selection management
  const selectDocument = (id: string) => {
    setCurrentDocId(id);
    const selected = documents.find(d => d.id === id);
    if (selected) {
      lastCharCountRef.current = selected.content.length;
    }
    // Settle floating states
    setSelection("");
    setSelectionCoords(null);
  };

  const handleNewDocument = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newDoc: Document = {
      id: newId,
      title: `Draft ${documents.length + 1}`,
      content: "",
      createdAt: new Date().toISOString(),
      lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wordCount: 0,
      charCount: 0
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    setCurrentDocId(newId);
    saveToStorage(updated);
    
    lastCharCountRef.current = 0;
  };

  const handleDeleteDocument = (id: string) => {
    if (documents.length <= 1) return;
    const remaining = documents.filter((d) => d.id !== id);
    setDocuments(remaining);
    saveToStorage(remaining);

    if (currentDocId === id) {
      setCurrentDocId(remaining[0].id);
      lastCharCountRef.current = remaining[0].content.length;
    }
  };

  const activeDoc = documents.find((doc) => doc.id === currentDocId);

  // Apply rewrite/replacement suggestion
  const handleApplyReplacement = (replacementText: string) => {
    if (!activeDoc || !selection.trim()) return;

    const text = activeDoc.content;
    const idx = text.indexOf(selection);
    if (idx === -1) {
      // Safe fallback if index has changed due to fast draft modifications
      // Replace all occurrences or notify
      alert("Note: highlighted selection has evolved. Attempting best fit insertion.");
      return;
    }

    const startPart = text.substring(0, idx);
    const endPart = text.substring(idx + selection.length);
    const finalContent = startPart + replacementText + endPart;

    const words = finalContent.trim() === "" ? 0 : finalContent.trim().split(/\s+/).length;
    const chars = finalContent.length;

    const updated = documents.map((doc) => {
      if (doc.id === currentDocId) {
        return {
          ...doc,
          content: finalContent,
          wordCount: words,
          charCount: chars,
          lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return doc;
    });

    setDocuments(updated);
    saveToStorage(updated);

    // Reset selection coordinates to hide floating widget
    setSelection("");
    setSelectionCoords(null);
    lastCharCountRef.current = finalContent.length;
  };

  // Apply copilot card suggestion from sidebar
  const handleApplyCopilotSuggestion = (suggestion: CopilotSuggestion) => {
    if (!activeDoc) return;

    const fullContent = activeDoc.content;
    // Inspect if targetQuote is embedded inside active content
    const quoteIndex = fullContent.indexOf(suggestion.targetQuote);
    if (quoteIndex === -1) {
      // Quote can't be mapped directly (it might have been modified)
      // Let's do general appending or simple notification
      alert("We couldn't map the exact sentence automatically since it was edited. Please apply modifications manually.");
      return;
    }

    const preQuote = fullContent.substring(0, quoteIndex);
    const postQuote = fullContent.substring(quoteIndex + suggestion.targetQuote.length);
    const finalContent = preQuote + suggestion.suggestedText + postQuote;

    const words = finalContent.trim() === "" ? 0 : finalContent.trim().split(/\s+/).length;
    const chars = finalContent.length;

    // Mark the suggestion as applied
    const updatedSuggestions = suggestions.map((s) => 
      s.id === suggestion.id ? { ...s, applied: true } : s
    );

    const updatedDocs = documents.map((doc) => {
      if (doc.id === currentDocId) {
        return {
          ...doc,
          content: finalContent,
          wordCount: words,
          charCount: chars,
          lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
      return doc;
    });

    setDocuments(updatedDocs);
    setSuggestions(updatedSuggestions);
    saveToStorage(updatedDocs, updatedSuggestions);
    lastCharCountRef.current = finalContent.length;
  };

  const handleDismissSuggestion = (id: string) => {
    const updated = suggestions.map((s) => 
      s.id === id ? { ...s, dismissed: true } : s
    );
    setSuggestions(updated);
    saveToStorage(documents, updated);
  };

  // Draft generator payload receiver
  const handleDraftGeneratorResult = (title: string, generatedContent: string) => {
    const cleanTitle = title.replace(/["]/g, "").trim();
    const newId = Math.random().toString(36).substring(2, 9);
    
    const newDoc: Document = {
      id: newId,
      title: cleanTitle || "Generated Masterpiece",
      content: generatedContent,
      createdAt: new Date().toISOString(),
      lastSaved: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wordCount: generatedContent.trim().split(/\s+/).length,
      charCount: generatedContent.length
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);
    setCurrentDocId(newId);
    saveToStorage(updated);
    setIsGeneratorOpen(false);
    
    lastCharCountRef.current = generatedContent.length;
  };

  // Mouse selection handler inside the central textarea
  const handleTextareaSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;

    if (start !== end) {
      const text = target.value.substring(start, end);
      if (text.trim().length > 4) {
        setSelection(text);
        setContextBefore(target.value.substring(Math.max(0, start - 400), start));
        setContextAfter(target.value.substring(end, end + 400));
        
        // Calculate coords relative to the text area area
        const rect = target.getBoundingClientRect();
        setSelectionCoords({
          top: rect.top + 70,
          left: rect.left + rect.width / 2 - 190
        });
      }
    } else {
      // Clear overlay when selection clears
      setSelection("");
      setSelectionCoords(null);
    }
  };

  return (
    <div id="scribe_app_container" className="flex h-screen bg-stone-100 text-stone-850 font-sans overflow-hidden">
      
      {/* Sidebar Panel Navigation */}
      <SidebarPanel
        documents={documents}
        currentDocId={currentDocId}
        onSelectDoc={selectDocument}
        onNewDoc={handleNewDocument}
        onDeleteDoc={handleDeleteDocument}
        onOpenDraftGenerator={() => setIsGeneratorOpen(true)}
        suggestions={suggestions}
        onApplySuggestion={handleApplyCopilotSuggestion}
        onDismissSuggestion={handleDismissSuggestion}
        isCopilotLoading={isCopilotLoading}
        onRunCopilot={() => triggerProactiveCopilot()}
      />

      {/* Main Core Writing Studio Area */}
      <main id="scribe_writing_canvas" className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
        
        {/* Editor Settings and Status Bar */}
        <div id="editor_upper_bar" className="h-14 px-6 border-b border-stone-200/80 bg-stone-50 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-3">
            {activeDoc ? (
              <input
                id="doc_title_inline_input"
                type="text"
                value={activeDoc.title}
                onChange={(e) => {
                  const updated = documents.map(doc => 
                    doc.id === currentDocId ? { ...doc, title: e.target.value } : doc
                  );
                  setDocuments(updated);
                  saveToStorage(updated);
                }}
                className="font-serif font-bold text-sm text-stone-800 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-stone-500 focus:outline-none transition-colors py-0.5 px-1 max-w-[280px]"
                placeholder="Title this writing..."
              />
            ) : (
              <span className="text-xs text-stone-400 italic">No document open</span>
            )}
            
            {activeDoc && (
              <span id="save_status_pill" className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200/60 text-stone-500 flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${saveStatus === "saving" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                {saveStatus === "saving" ? "Typing..." : "Saved"}
              </span>
            )}
          </div>

          {/* Typography Preferences Controls */}
          {activeDoc && (
            <div id="editor_typography_controls" className="flex items-center gap-4">
              {/* Proactive background analyzer indicator */}
              <AnimatePresence>
                {isProactiveReviewing && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-1.5 text-[10px] font-mono text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-100"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                    <span>Background Copilot reviewing...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-1 text-xs border border-stone-200 bg-white rounded-lg p-0.5 shadow-sm">
                <button
                  id="font_select_serif"
                  onClick={() => setFontFamily("serif")}
                  className={`px-2.5 py-1 text-xs font-serif rounded-md transition-colors ${
                    fontFamily === "serif" ? "bg-stone-200 text-stone-900 font-bold" : "text-stone-400 hover:text-stone-700"
                  }`}
                  title="Merriweather Serif Font"
                >
                  Serif
                </button>
                <button
                  id="font_select_elegant"
                  onClick={() => setFontFamily("serif-elegant")}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors font-semibold ${
                    fontFamily === "serif-elegant" ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:text-stone-700"
                  }`}
                  title="Classic Old-Style Georgia Font"
                >
                  Classic
                </button>
                <button
                  id="font_select_mono"
                  onClick={() => setFontFamily("mono")}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md transition-colors ${
                    fontFamily === "mono" ? "bg-stone-200 text-stone-900" : "text-stone-400 hover:text-stone-700"
                  }`}
                  title="JetBrains Mono Code Font"
                >
                  Mono
                </button>
              </div>

              {/* Font Size Adjusters */}
              <div className="flex items-center gap-1">
                <button
                  id="font_decrease"
                  onClick={() => setFontSize(prev => Math.max(12, prev - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  title="Decrease Size"
                >
                  A-
                </button>
                <span className="text-xs font-mono text-stone-400 w-6 text-center select-none">{fontSize}</span>
                <button
                  id="font_increase"
                  onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
                  title="Increase Size"
                >
                  A+
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Hint Overlay Banner */}
        <AnimatePresence>
          {!selection && activeDoc && activeDoc.content.trim().length > 10 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-2 bg-orange-50/50 border-b border-orange-100 flex items-center justify-center text-center gap-2 select-none"
            >
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-orange-850 bg-orange-150 px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3 text-orange-500" />
                Pro-Writer Feature
              </span>
              <p className="text-xs text-orange-950 font-sans">
                Drag over any sentence or paragraph to evoke instantaneous inline AI contextual rewrite!
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Writing Sheet */}
        <div id="editor_sheet_scroller" className="flex-1 overflow-y-auto px-6 py-12 flex justify-center bg-stone-50/40 relative">
          {activeDoc ? (
            <div id="writing_sheet_card" className="w-full max-w-3xl bg-white border border-stone-200 shadow-sm rounded-2xl p-8 sm:p-12 min-h-[75vh] flex flex-col">
              
              {/* Document Title header style */}
              <div id="editor_doc_header" className="mb-6 pb-6 border-b border-stone-150">
                <h2 className="text-2xl font-serif font-black text-stone-800 tracking-tight">
                  {activeDoc.title || "Untitled Writing Assignment"}
                </h2>
                <div className="flex items-center gap-3 text-[10px] font-mono text-stone-400 mt-2">
                  <span>CREATED {new Date(activeDoc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span>•</span>
                  <span>{activeDoc.wordCount} WORDS</span>
                  <span>•</span>
                  <span>PAUSE FOR AUTO-CRITIQUE</span>
                </div>
              </div>

              {/* Writing Workspace Area */}
              <textarea
                id="scribe_text_area"
                value={activeDoc.content}
                onChange={handleTextChange}
                onSelect={handleTextareaSelection}
                placeholder="Unload your thoughts, formulate a draft, or start drafting your story freely here..."
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight === "spacious" ? "1.8" : lineHeight === "tight" ? "1.4" : "1.6",
                }}
                className={`w-full flex-1 resize-none bg-transparent text-stone-800 placeholder:text-stone-350 focus:outline-none focus:ring-0 select-text ${
                  fontFamily === "serif" 
                    ? "font-serif tracking-normal font-normal" 
                    : fontFamily === "serif-elegant" 
                    ? "font-serif tracking-normal leading-relaxed text-stone-900" 
                    : "font-mono text-stone-800 tracking-tight"
                }`}
              />
            </div>
          ) : (
            <div id="no_active_draft_splash" className="my-auto flex flex-col items-center justify-center text-center max-w-md p-6">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 shadow-sm border border-stone-200/80 mb-6 animate-bounce">
                <PenTool className="w-8 h-8 text-stone-500" />
              </div>
              <h2 className="font-serif font-bold text-stone-800 text-lg">Your Workspace is a Blank Slate</h2>
              <p className="text-sm text-stone-500 mt-2 leading-relaxed">
                Invoke the generative orchestrator to create a custom AI starting draft, or create a brand new blank workspace file inside.
              </p>
              <div className="flex flex-col sm:flex-row gap-2.5 mt-6 w-full">
                <button
                  id="splash_new_doc"
                  onClick={handleNewDocument}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Create Blank
                </button>
                <button
                  id="splash_open_ai_generator"
                  onClick={() => setIsGeneratorOpen(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-black text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-orange-300" />
                  <span>Start with AI Draft</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Floating Contextual Editor Overlay */}
        <InlineEditorOverlay
          selectionCoords={selectionCoords}
          selectedText={selection}
          contextBefore={contextBefore}
          contextAfter={contextAfter}
          documentTitle={activeDoc?.title || "Untitled"}
          onApplyReplacement={handleApplyReplacement}
          onClose={() => {
            setSelection("");
            setSelectionCoords(null);
          }}
        />
      </main>

      {/* Orchestrate AI Draft Generator Dialog Modal */}
      <AnimatePresence>
        {isGeneratorOpen && (
          <DraftGenerator
            onDraftGenerated={handleDraftGeneratorResult}
            onClose={() => setIsGeneratorOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

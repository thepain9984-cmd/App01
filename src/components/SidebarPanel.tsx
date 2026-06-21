import React from "react";
import { 
  Plus, 
  FileText, 
  Trash2, 
  Compass, 
  Sparkles, 
  TrendingUp, 
  BookOpen, 
  History,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Clock,
  ExternalLink
} from "lucide-react";
import { Document, CopilotSuggestion } from "../types";

interface SidebarPanelProps {
  documents: Document[];
  currentDocId: string | null;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onOpenDraftGenerator: () => void;
  
  // Copilot suggestions
  suggestions: CopilotSuggestion[];
  onApplySuggestion: (suggestion: CopilotSuggestion) => void;
  onDismissSuggestion: (id: string) => void;
  isCopilotLoading: boolean;
  onRunCopilot: () => void;
}

export default function SidebarPanel({
  documents,
  currentDocId,
  onSelectDoc,
  onNewDoc,
  onDeleteDoc,
  onOpenDraftGenerator,
  suggestions,
  onApplySuggestion,
  onDismissSuggestion,
  isCopilotLoading,
  onRunCopilot
}: SidebarPanelProps) {
  const activeDoc = documents.find((doc) => doc.id === currentDocId);
  const activeSuggestions = suggestions.filter(s => !s.applied && !s.dismissed);

  return (
    <div 
      id="scribe_sidebar_panel" 
      className="w-80 border-r border-stone-200 bg-stone-50 flex flex-col h-full overflow-hidden"
    >
      {/* Sidebar Header Brand */}
      <div id="sidebar_brand_header" className="p-4 border-b border-stone-200 bg-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-stone-850 flex items-center justify-center text-orange-200 font-serif font-black text-sm">
            S
          </div>
          <div>
            <h1 className="text-xs font-bold text-stone-800 tracking-tight leading-none">Magic Scribe AI</h1>
            <span className="text-[9px] font-mono font-medium text-stone-400">CO-AUTHOR STUDIO</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">Active</span>
        </div>
      </div>

      {/* Primary Actions */}
      <div id="sidebar_header_actions" className="p-4 space-y-2 border-b border-stone-200">
        <button
          id="btn_new_blank_doc"
          onClick={onNewDoc}
          className="w-full py-2 px-3 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-colors text-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Blank Slate</span>
        </button>

        <button
          id="btn_open_generator_trigger"
          onClick={onOpenDraftGenerator}
          className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-black text-white transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm group"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-400 group-hover:scale-110 transition-transform" />
          <span>Orchestrate AI Draft</span>
        </button>
      </div>

      {/* Main lists */}
      <div id="sidebar_main_scroller" className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Document Draft Registry */}
        <div id="docs_registry_section" className="space-y-2">
          <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider select-none flex items-center justify-between">
            <span>SAVED DRAFTS ({documents.length})</span>
            <History className="w-3.5 h-3.5" />
          </h3>
          
          {documents.length === 0 ? (
            <div id="no_docs_placeholder" className="py-4 text-center rounded-lg border border-dashed border-stone-200">
              <p className="text-[11px] text-stone-400 font-sans italic">No drafting documents setup.</p>
            </div>
          ) : (
            <div id="doc_item_list" className="space-y-1">
              {documents.map((doc) => {
                const isSelected = doc.id === currentDocId;
                return (
                  <div
                    key={doc.id}
                    id={`doc_wrapper_${doc.id}`}
                    className={`group flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-xs ${
                      isSelected 
                        ? "bg-stone-200 text-stone-900 border-l-2 border-stone-800" 
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                    onClick={() => onSelectDoc(doc.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className={`w-4 h-4 shrink-0 ${isSelected ? "text-stone-800" : "text-stone-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate leading-tight">
                          {doc.title || "Untitled Draft"}
                        </p>
                        <p className="text-[9px] font-mono text-stone-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{doc.wordCount} words</span>
                          <span>•</span>
                          <span>{doc.lastSaved}</span>
                        </p>
                      </div>
                    </div>
                    {documents.length > 1 && (
                      <button
                        id={`delete_doc_btn_${doc.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDoc(doc.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-200 text-stone-400 hover:text-red-650 transition-all cursor-pointer"
                        title="Delete draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Proactive Copilot Insights Feedback Box */}
        <div id="proactive_copilot_section" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider select-none flex items-center gap-1.5">
              <span>Inline Suggestions</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-100 text-orange-850 font-bold">
                {activeSuggestions.length}
              </span>
            </h3>
            
            <button
              id="sidebar_copilot_eval_btn"
              onClick={onRunCopilot}
              disabled={isCopilotLoading || !activeDoc || !activeDoc.content.trim()}
              className="text-[10px] font-semibold text-orange-650 hover:text-orange-950 font-sans tracking-wide uppercase disabled:opacity-35 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-orange-500" />
              <span>Evaluate</span>
            </button>
          </div>

          {!activeDoc ? (
            <div className="p-3 text-center bg-stone-100 rounded-xl border border-stone-200">
              <p className="text-[11px] text-stone-400 italic">Select a draft document to see suggestions.</p>
            </div>
          ) : isCopilotLoading ? (
            <div id="eval_loading_indicator" className="p-4 bg-orange-50/40 border border-orange-100 rounded-xl flex flex-col items-center justify-center gap-2.5 text-center">
              <svg className="animate-spin h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <p className="text-xs font-semibold text-stone-700">Analyzing writing rhythm...</p>
                <p className="text-[9px] font-mono text-stone-400 mt-0.5">GEMINI DEEP CRITIQUE</p>
              </div>
            </div>
          ) : activeSuggestions.length === 0 ? (
            <div id="copilot_success_slate" className="p-4 bg-stone-100 rounded-xl border border-stone-200 text-center space-y-2">
              <p className="text-[11px] text-stone-500 font-sans">
                No active critique suggestions. Press <span className="font-semibold text-orange-650">Evaluate</span> above to look for improvements.
              </p>
            </div>
          ) : (
            <div id="suggestions_registry" className="space-y-3">
              {activeSuggestions.map((s) => (
                <div
                  key={s.id}
                  id={`suggestion_card_${s.id}`}
                  className="p-3 bg-white hover:shadow-md transition-shadow rounded-xl border border-stone-200 flex flex-col space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                        {s.type}
                      </span>
                      <h4 className="font-semibold text-stone-800 font-sans mt-1.5 leading-snug">
                        {s.title}
                      </h4>
                    </div>
                    <button
                      id={`dismiss_suggest_${s.id}`}
                      onClick={() => onDismissSuggestion(s.id)}
                      className="text-stone-300 hover:text-stone-500 p-0.5 rounded cursor-pointer"
                      title="Dismiss insight"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <p className="text-stone-600 leading-relaxed text-[11px]">
                    {s.description}
                  </p>

                  {s.targetQuote && (
                    <div className="bg-stone-50 p-2 rounded border border-stone-100 text-[10px] italic text-stone-500">
                      Target: "{s.targetQuote}"
                    </div>
                  )}

                  {s.suggestedText && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-stone-100">
                      <button
                        id={`apply_suggest_${s.id}`}
                        onClick={() => onApplySuggestion(s)}
                        className="py-1 px-2.5 rounded bg-stone-800 hover:bg-black text-white text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span>Accept Change</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer Info */}
      {activeDoc && (
        <div id="sidebar_stats_footer" className="p-4 bg-stone-100 border-t border-stone-200">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white border border-stone-200 rounded-lg p-2">
              <span className="text-[9px] font-mono text-stone-400 uppercase">Words count</span>
              <p className="font-bold text-stone-800">{activeDoc.wordCount}</p>
            </div>
            <div id="stats_chars" className="bg-white border border-stone-200 rounded-lg p-2">
              <span className="text-[9px] font-mono text-stone-400 uppercase">Characters</span>
              <p className="font-bold text-stone-800">{activeDoc.charCount}</p>
            </div>
          </div>
          <div id="last_sync_indicator" className="text-center mt-3 flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-[10px] font-mono text-stone-500">Auto-saved Locally</span>
          </div>
        </div>
      )}
    </div>
  );
}

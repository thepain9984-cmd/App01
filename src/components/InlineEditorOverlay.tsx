import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  CornerDownLeft, 
  X, 
  Check, 
  ArrowRightLeft, 
  Maximize2, 
  Minimize2, 
  VolumeX,
  Type as FontIcon,
  ChevronRight,
  RefreshCw,
  Undo
} from "lucide-react";

interface InlineEditorOverlayProps {
  selectionCoords: { top: number; left: number } | null;
  selectedText: string;
  contextBefore: string;
  contextAfter: string;
  documentTitle: string;
  onApplyReplacement: (newText: string) => void;
  onClose: () => void;
}

const ACTION_SUGGESTIONS = [
  { label: "Make Punchier", value: "make it punchy, direct and active voice" },
  { label: "Elaborate & Expand", value: "expand this with more vivid metaphors and concrete details" },
  { label: "Shorten & Condense", value: "condense this to be as clear and brief as possible" },
  { label: "Formalize Tone", value: "make it look polished, academic, and professional" },
  { label: "Fix Flow & Phrasing", value: "improve the smooth flow of this sentence and enhance vocabulary options" }
];

export default function InlineEditorOverlay({
  selectionCoords,
  selectedText,
  contextBefore,
  contextAfter,
  documentTitle,
  onApplyReplacement,
  onClose
}: InlineEditorOverlayProps) {
  const [feedback, setFeedback] = useState("");
  const [isIterating, setIsIterating] = useState(false);
  const [iterationResult, setIterationResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("rewrite");

  if (!selectionCoords || !selectedText.trim()) return null;

  // Let's ensure coordinates stays boundaries safe within viewport
  const safetyTop = Math.max(50, Math.min(selectionCoords.top, window.innerHeight - 380));
  const safetyLeft = Math.max(10, Math.min(selectionCoords.left, window.innerWidth - 420));

  const runIteration = async (customInstruction?: string) => {
    const promptValue = customInstruction || feedback;
    if (!promptValue.trim()) {
      setError("Please pick an action or type what you would like to improve.");
      return;
    }

    setIsIterating(true);
    setError(null);

    try {
      const response = await fetch("/api/iterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selection: selectedText,
          feedback: promptValue,
          contextBefore,
          contextAfter,
          documentTitle,
          mode
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Iteration failed");
      }

      const data = await response.json();
      setIterationResult(data.replacement || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to weave in changes. Please try again.");
    } finally {
      setIsIterating(false);
    }
  };

  const handleApply = () => {
    if (iterationResult) {
      onApplyReplacement(iterationResult);
    }
  };

  return (
    <div 
      id="inline_overlay_absolute"
      className="absolute z-40"
      style={{
        top: `${safetyTop}px`,
        left: `${safetyLeft}px`,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          className="bg-white border border-stone-200/90 shadow-xl rounded-xl w-[380px] p-4 flex flex-col space-y-3 shrink-0"
        >
          {/* Header */}
          <div id="overlay_header" className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-500 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
              <span>Contextual Refinement</span>
            </div>
            <button 
              id="close_overlay_btn"
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Slices of selected text */}
          <div id="selection_preview" className="rounded-lg bg-stone-50 p-2.5 border border-stone-100 max-h-[80px] overflow-y-auto">
            <p className="text-[11px] text-stone-400 font-mono select-none uppercase tracking-widest mb-0.5">HIGHLIGHTED SEGMENT</p>
            <p className="text-xs text-stone-600 font-sans italic leading-relaxed">
              "{selectedText}"
            </p>
          </div>

          {!iterationResult ? (
            /* Action formulation interface */
            <div id="overlay_inputs" className="space-y-2.5">
              {/* Presets Row list */}
              <div id="fast_tags" className="flex flex-wrap gap-1.5 pt-0.5">
                {ACTION_SUGGESTIONS.map((tag, idx) => (
                  <button
                    key={idx}
                    id={`tag_btn_${idx}`}
                    type="button"
                    onClick={() => {
                      setFeedback(tag.value);
                      runIteration(tag.value);
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-transparent transition-all cursor-pointer font-medium"
                    disabled={isIterating}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* Natural feedback input box */}
              <div id="feedback_input_group" className="space-y-1">
                <div className="relative">
                  <input
                    id="inline_feedback_input"
                    type="text"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide inline feedback (e.g., 'Rewrite in casual tone')"
                    className="w-full pr-10 pl-3 py-2 text-xs rounded-lg border border-stone-200 bg-white text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 font-sans leading-normal"
                    disabled={isIterating}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && feedback.trim()) {
                        runIteration();
                      }
                    }}
                  />
                  <button
                    id="submit_feedback_arrow"
                    type="button"
                    onClick={() => runIteration()}
                    disabled={isIterating || !feedback.trim()}
                    className="absolute right-1.5 top-1.5 p-1 rounded-md text-stone-400 hover:text-orange-600 disabled:opacity-30 self-center"
                  >
                    <CornerDownLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {error && (
                <p id="overlay_error_msg" className="text-[10px] text-red-600 bg-red-50 p-2 rounded-md border border-red-100 font-sans leading-normal">
                  {error}
                </p>
              )}

              {isIterating && (
                <div id="overlay_typing_ticker" className="flex items-center justify-center gap-2 py-3 rounded-lg border border-stone-100/80 bg-stone-50/50">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" />
                  </div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">Weaving context changes...</span>
                </div>
              )}
            </div>
          ) : (
            /* Diff comparison and Apply layout */
            <div id="diff_comparison_view" className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[10px] leading-relaxed">
                <div id="diff_block_original" className="bg-stone-50 border border-stone-100 rounded-lg p-2 max-h-[140px] overflow-y-auto">
                  <p className="text-[9px] font-mono font-semibold text-stone-400 uppercase mb-1">Before</p>
                  <p className="text-stone-500 line-through italic">"{selectedText}"</p>
                </div>
                <div id="diff_block_suggested" className="bg-orange-50/60 border border-orange-100 rounded-lg p-2 max-h-[140px] overflow-y-auto">
                  <p className="text-[9px] font-mono font-semibold text-orange-700 uppercase mb-1">Scribe Suggestion</p>
                  <p className="text-stone-800 font-sans font-medium">"{iterationResult}"</p>
                </div>
              </div>

              <div id="diff_action_buttons" className="flex items-center gap-2 pt-1">
                <button
                  id="iteration_back_btn"
                  type="button"
                  onClick={() => {
                    setIterationResult(null);
                    setFeedback("");
                  }}
                  className="flex-1 px-2.5 py-1.5 text-[11px] rounded bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Undo className="w-3 h-3" />
                  <span>Adjust Prompt</span>
                </button>
                <button
                  id="iteration_apply_btn"
                  type="button"
                  onClick={handleApply}
                  className="flex-1 px-2.5 py-1.5 text-[11px] rounded bg-stone-800 hover:bg-black text-white font-medium shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3 h-3" />
                  <span>Apply Rewrite</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

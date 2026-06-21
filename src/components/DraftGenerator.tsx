import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  ArrowRight, 
  BookOpen, 
  PenTool, 
  MessageSquare, 
  Briefcase,
  Layers,
  FileCheck2
} from "lucide-react";
import { Attachment } from "../types";

interface DraftGeneratorProps {
  onDraftGenerated: (title: string, content: string) => void;
  onClose: () => void;
}

const SAMPLE_PRESETS = [
  {
    icon: <BookOpen className="w-4 h-4 text-amber-500" />,
    label: "Creative Essay",
    prompt: "An analytical yet deeply philosophical essay exploring how artificial intelligence is changing our relationship with memory and journaling.",
    tone: "Contemplative & Elegant",
    genre: "Essay"
  },
  {
    icon: <PenTool className="w-4 h-4 text-emerald-500" />,
    label: "Product Announcement",
    prompt: "A compelling launch post for 'Nimbus Note', a distraction-free writing instrument for tablets. Highlight its sensory tactile feel and local-first backup model.",
    tone: "Polished & Captivating",
    genre: "Blog Post"
  },
  {
    icon: <Briefcase className="w-4 h-4 text-blue-500" />,
    label: "Professional Proposal",
    prompt: "A project proposal to transition a team from fragmented Slack chats to a highly structured weekly email sync, outlining a 3-week pilot schedule.",
    tone: "Direct & Structured",
    genre: "Proposal"
  },
  {
    icon: <MessageSquare className="w-4 h-4 text-rose-500" />,
    label: "Fictional Short Story",
    prompt: "A short sci-fi scene about a watchmaker who discovers a gear that ticks backwards, set in a cozy clock shop in Edinburgh during a winter storm.",
    tone: "Vivid & Atmosopheric",
    genre: "Short Fiction"
  }
];

export default function DraftGenerator({ onDraftGenerated, onClose }: DraftGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [genre, setGenre] = useState("Blog Post");
  const [tone, setTone] = useState("Thoughtful & Inspiring");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFiles = (fileList: FileList) => {
    setError(null);
    Array.from(fileList).forEach((file) => {
      const id = Math.random().toString(36).substring(2, 9);
      const reader = new FileReader();

      const newAttachment: Attachment = {
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        base64: "",
        loading: true
      };

      setAttachments((prev) => [...prev, newAttachment]);

      // If it's an image, read as DataURL
      if (file.type.startsWith("image/")) {
        reader.onloadend = () => {
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === id
                ? { ...att, base64: reader.result as string, loading: false }
                : att
            )
          );
        };
        reader.readAsDataURL(file);
      } else {
        // Assume text-oriented standard file (text, pdf, csv, code)
        reader.onloadend = () => {
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === id
                ? {
                    ...att,
                    base64: "data:text/plain;base64," + btoa(reader.result as string),
                    textContent: reader.result as string,
                    loading: false
                  }
                : att
            )
          );
        };
        reader.readAsText(file);
      }
    });

    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const selectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setPrompt(preset.prompt);
    setTone(preset.tone);
    setGenre(preset.genre);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please outline your writing prompt first.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          attachments,
          genre,
          tone
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation request failed");
      }

      const data = await response.json();
      
      // Determine a smart title based on the first few words of the prompt
      const generatedTitle = prompt.length > 25 
        ? prompt.substring(0, 25).trim() + "..." 
        : prompt;

      onDraftGenerated(generatedTitle, data.text || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong during generation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="draft_generator_backdrop" className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -15 }}
        className="bg-stone-50 border border-stone-200 shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div id="generator_header" className="px-6 py-4 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-semibold text-stone-800 tracking-tight">Initiate Creative Draft</h3>
              <p className="text-xs text-stone-500 font-mono">GEMINI-3.5-FLASH CO-AUTHOR</p>
            </div>
          </div>
          <button 
            id="close_generator_btn"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div id="generator_scroll_container" className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Presets */}
          <div id="presets_section">
            <h4 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3 select-none flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Writing Presets / Inspirations
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_PRESETS.map((preset, index) => (
                <button
                  key={index}
                  id={`preset_btn_${index}`}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 text-left bg-white hover:border-orange-200 hover:bg-stone-50 transition-all duration-200 group text-xs cursor-pointer"
                >
                  <div className="p-1.5 rounded-lg bg-stone-100 group-hover:bg-white border border-stone-200/60 font-sans">
                    {preset.icon}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="font-semibold text-stone-700 group-hover:text-orange-950 flex items-center justify-between">
                      <span>{preset.label}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{preset.genre}</span>
                    </div>
                    <p className="text-stone-500 line-clamp-2 leading-relaxed text-[11px]">{preset.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Outline Prompts */}
            <div id="prompt_section" className="space-y-2">
              <label htmlFor="prompt_input" className="block text-xs font-semibold text-stone-500 uppercase tracking-widest select-none">
                Outline What You Want to Write
              </label>
              <textarea
                id="prompt_input"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Excribe details, key arguments, audience, background, or outline guidelines..."
                className="w-full rounded-xl border border-stone-200 bg-white p-3.5 text-stone-800 text-sm focus:border-stone-400 focus:outline-none placeholder:text-stone-400 font-sans resize-y leading-relaxed transition-colors"
                disabled={isGenerating}
              />
            </div>

            {/* Custom Configurations: Tone & Genre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="genre_field" className="space-y-1.5">
                <label htmlFor="genre_select" className="block text-xs font-semibold text-stone-400 uppercase tracking-widest select-none">
                  Format / Genre
                </label>
                <select
                  id="genre_select"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full text-stone-800 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-0 focus:outline-none focus:border-stone-400 cursor-pointer"
                  disabled={isGenerating}
                >
                  <option value="Blog Post">Blog Post / Article</option>
                  <option value="Creative Essay">Creative Essay</option>
                  <option value="Professional Proposal">Project Proposal</option>
                  <option value="Short Fiction">Short Story / Fiction</option>
                  <option value="Marketing Newsletter">Marketing Sync / Email</option>
                  <option value="Academic Digest">Abstract / Research Note</option>
                </select>
              </div>

              <div id="tone_field" className="space-y-1.5">
                <label htmlFor="tone_select" className="block text-xs font-semibold text-stone-400 uppercase tracking-widest select-none">
                  Tone Style
                </label>
                <select
                  id="tone_select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full text-stone-800 bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-0 focus:outline-none focus:border-stone-400 cursor-pointer"
                  disabled={isGenerating}
                >
                  <option value="Thoughtful & Inspiring">Thoughtful & Inspiring</option>
                  <option value="Crisp & Technical">Crisp & Technical (JetBrains-Vibe)</option>
                  <option value="Academic & Formal">Academic & Formal</option>
                  <option value="Empathetic & Warm">Empathetic & Warm</option>
                  <option value="Bold & Punchy">Bold & Punchy</option>
                  <option value="Witty & Conversational">Witty & Conversational</option>
                </select>
              </div>
            </div>

            {/* Attachments Section */}
            <div id="attachments_container" className="space-y-2">
              <label className="block text-xs font-semibold text-stone-400 uppercase tracking-widest select-none">
                File Attachments (Images or Documents for context)
              </label>

              <div
                id="dropzone_container"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-orange-400 bg-orange-50/40"
                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-100/60 bg-white"
                }`}
              >
                <input
                  type="file"
                  id="hidden_file_input"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  disabled={isGenerating}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                    <Upload className="w-5 h-5 text-stone-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-stone-700">
                      Drag & Drop files here, or <span className="text-orange-600 font-semibold underline decoration-dashed">click to browse</span>
                    </p>
                    <p className="text-[10px] text-stone-400 font-mono">
                      Supports PNG, JPG, JPEG (Images) or TXT, MD, CSV, TSX, JS (Code & Texts)
                    </p>
                  </div>
                </div>
              </div>

              {/* Uploaded Attachments Row list */}
              <AnimatePresence>
                {attachments.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2 pt-2"
                  >
                    {attachments.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-200/70 border border-stone-300 text-stone-700 text-xs font-sans min-w-10"
                      >
                        {file.type.startsWith("image/") ? (
                          <ImageIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        )}
                        <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                        <span className="text-[9px] font-mono opacity-60">({(file.size / 1024).toFixed(0)}kb)</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(file.id);
                          }}
                          className="p-0.5 rounded-full hover:bg-stone-300 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          disabled={isGenerating}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            {error && (
              <div id="error_container" className="p-3.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            {/* Generate Action Bar */}
            <div id="generator_footer" className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
              <button
                type="button"
                id="cancel_draft_btn"
                onClick={onClose}
                className="px-4.5 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-xs font-semibold text-stone-600 transition-colors cursor-pointer"
                disabled={isGenerating}
              >
                Back to Blank Slate
              </button>
              <button
                type="submit"
                id="submit_draft_btn"
                disabled={isGenerating || !prompt.trim()}
                className="relative px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-900 active:scale-[0.98] transition-all disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer overflow-hidden group"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Summoning Creative Muse...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-orange-400 group-hover:rotate-12 transition-transform" />
                    <span>Orchestrate Custom Draft</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                  </>
                )}
                {isGenerating && (
                  <motion.div 
                    className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400"
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  />
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

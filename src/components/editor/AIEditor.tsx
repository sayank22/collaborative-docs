'use client';

import { useState, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { 
  Loader2, 
  Sparkles, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Palette
} from 'lucide-react';
import type { Editor } from '@tiptap/core';

interface AIEditorProps {
  editor: Editor;
  userRole: string;
}

export function AIEditor({ editor, userRole }: AIEditorProps) {
  // 1. Keeps the toolbar UI in sync with the cursor (e.g., highlighting the Bold button)
  const [, setTick] = useState(0);
  
  // 2. Tracks our manual fetch request
  const [isAILoading, setIsAILoading] = useState(false);

  // 3. Tracks Popover open/close state
  const [isAIOpen, setIsAIOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const forceUpdate = () => setTick((tick) => tick + 1);

    editor.on('transaction', forceUpdate);
    editor.on('selectionUpdate', forceUpdate);

    return () => {
      editor.off('transaction', forceUpdate);
      editor.off('selectionUpdate', forceUpdate);
    };
  }, [editor]);

  // The AI Trigger Function
  const handleAI = async (command: 'improve' | 'fix' | 'shorter') => {
    // Capture the exact selection coordinates
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    if (!text || text.trim() === '') {
      toast.error('Please highlight some text first!');
      return;
    }

    setIsAILoading(true);
    toast.loading('AI is thinking...', { id: 'ai-toast' });
    
    try {
      const result = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: text,
          command,
        }),
      });

      if (!result.ok) {
        throw new Error(`Server responded with status ${result.status}`);
      }

      const completionText = await result.text();

      console.log("Browser received:", completionText);
      console.log("Selection:", { from, to });
      
      if (completionText) {
        // Clean up any rogue quotes from the AI response
        const cleanText = completionText.replace(/^"|"$/g, '').trim();

        // Explicitly replace the captured range with the new AI text
        const success = editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, cleanText)
          .run();

        console.log("Insert success:", success);
          
        toast.success('AI Help applied!');
      } else {
        toast.error("AI didn't return any text.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('AI Request failed: ' + message);
    } finally {
      setIsAILoading(false);
      toast.dismiss('ai-toast');
    }
  };

  const handleAIAction = (command: 'improve' | 'fix' | 'shorter') => {
    handleAI(command);
    setIsAIOpen(false); // Close the shadcn popover immediately after selection
  };

  return (
    <>
      {/* Editor Toolbar */}
      {editor && userRole !== 'viewer' && (
        <div className="sticky top-16 z-40 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">

          {/* UPGRADED: AI Help BUTTON WITH SHADCN POPOVER */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-2">
            <Popover open={isAIOpen} onOpenChange={setIsAIOpen}>
              <PopoverTrigger asChild>
                <button 
                  disabled={isAILoading}
                  className="flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50 border border-purple-200 shadow-sm data-[state=open]:bg-purple-100"
                >
                  {isAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI Help
                </button>
              </PopoverTrigger>
              
              <PopoverContent className="w-48 rounded-xl bg-white p-1.5 shadow-lg border border-slate-100" align="start">
                <div className="flex flex-col space-y-0.5">
                  <button onClick={() => handleAIAction('improve')} className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition-colors">
                    Make Professional
                  </button>
                  <button onClick={() => handleAIAction('fix')} className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition-colors">
                    Fix Grammar
                  </button>
                  <button onClick={() => handleAIAction('shorter')} className="flex items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-purple-700 transition-colors">
                    Make Shorter
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Basic Formatting */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Bold">
              <Bold className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Italic">
              <Italic className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Underline">
              <UnderlineIcon className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Strikethrough">
              <Strikethrough className="h-4 w-4" />
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-slate-200 px-2">
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Heading 1">
              <Heading1 className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Heading 2">
              <Heading2 className="h-4 w-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-slate-200 px-2">
            <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Align Left">
              <AlignLeft className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Align Center">
              <AlignCenter className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Align Right">
              <AlignRight className="h-4 w-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-slate-200 px-2">
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Bullet List">
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`rounded p-1.5 transition-colors hover:bg-slate-100 ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-600'}`} title="Numbered List">
              <ListOrdered className="h-4 w-4" />
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex items-center px-2">
            <div className="group relative flex items-center gap-1 rounded p-1.5 transition-colors hover:bg-slate-100">
              <Palette className="h-4 w-4 text-slate-600" />
              <input 
                type="color" 
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                value={editor.getAttributes('textStyle').color || '#000000'}
                className="h-5 w-5 cursor-pointer appearance-none rounded border-none bg-transparent p-0 outline-none"
                title="Text Color"
              />
            </div>
          </div>
        </div>
      )}

      {/* Editor "Page" Container */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-slate-200 bg-white p-8 shadow-sm sm:p-12 lg:p-16">
          <EditorContent editor={editor} />
        </div>
      </main>
    </>
  );
}
'use client';

import { EditorContent } from '@tiptap/react';
import { useCompletion } from '@ai-sdk/react';
import { toast } from 'sonner';
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
  // Vercel AI SDK Hook
  const { isLoading } = useCompletion({
    api: '/api/ai',
    // Note: We removed onFinish and onError from here to handle them directly 
    // inside the handleAI function where we have access to the exact selection range.
  });

  // The AI Trigger Function
  const handleAI = async (command: 'improve' | 'fix' | 'shorter') => {
    // 1. Capture the exact selection coordinates
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    
    if (!text || text.trim() === '') {
      toast.error('Please highlight some text first!');
      return;
    }

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

const completionText = await result.text();

console.log(completionText);
      
      if (completionText) {
        // 3. Explicitly replace the captured range with the new AI text
        editor
          .chain()
          .focus()
          .insertContentAt({ from, to }, completionText)
          .run();
          
        toast.success('AI Magic applied!');
      } else {
        toast.error("AI didn't return any text.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error('AI Request failed: ' + message);
    } finally {
      toast.dismiss('ai-toast');
    }
  };

  return (
    <>
      {/* Editor Toolbar */}
      {editor && userRole !== 'viewer' && (
        <div className="sticky top-16 z-40 flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-4 py-2 sm:px-6">
          
          {/* AI MAGIC BUTTONS */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-2">
            <div className="relative group">
              <button 
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-md bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50 border border-purple-200 shadow-sm"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                AI Help
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute left-0 top-full mt-1 hidden w-40 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl group-hover:flex z-50">
                <button onClick={() => handleAI('improve')} className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Make Professional</button>
                <button onClick={() => handleAI('fix')} className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Fix Grammar</button>
                <button onClick={() => handleAI('shorter')} className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors">Make Shorter</button>
              </div>
            </div>
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
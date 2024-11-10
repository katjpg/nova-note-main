'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Menu, MoreHorizontal, Save, Trash2, FileText, Download } from 'lucide-react';
import { useNotes } from '@/lib/contexts/NotesContext';
import rehypeSanitize from "rehype-sanitize";
import type { Note } from '@/lib/types/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const NotePanel: React.FC = () => {
  const { notes, currentNote, updateNote } = useNotes();
  const [localTitle, setLocalTitle] = useState('');
  const [localContent, setLocalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  
  const currentNoteData = currentNote ? notes[currentNote] : null;
  const isPDF = currentNoteData?.attachments?.[0]?.fileType === 'pdf';
  const pdfUrl = currentNoteData?.attachments?.[0]?.url;
  
  // Save timer ref
  const saveTimerRef = useRef<NodeJS.Timeout>();

  // Initialize local state when currentNote changes
  useEffect(() => {
    if (currentNoteData) {
      setLocalTitle(currentNoteData.title);
      setLocalContent(currentNoteData.content);
      setSaveError(null);
    } else {
      setLocalTitle('');
      setLocalContent('');
    }
  }, [currentNoteData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const saveNote = async (noteId: string, updates: Partial<Note>): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          ...updates,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save note: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save note');
      }

      // Update local state
      await updateNote(noteId, updates);
    } catch (error) {
      console.error('Error saving note:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save note');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced save function
  const debouncedSave = useCallback((noteId: string, updates: Partial<Note>) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    return new Promise<void>((resolve, reject) => {
      saveTimerRef.current = setTimeout(async () => {
        try {
          await saveNote(noteId, updates);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 500);
    });
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string | undefined) => {
    if (newContent !== undefined && !isPDF && currentNote) {
      setLocalContent(newContent);
      
      debouncedSave(currentNote, { content: newContent })
        .catch(error => {
          console.error('Failed to save note:', error);
        });
    }
  }, [currentNote, isPDF, debouncedSave]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    
    if (currentNote && !isPDF) {
      debouncedSave(currentNote, { title: newTitle })
        .catch(error => {
          console.error('Failed to save title:', error);
        });
    }
  }, [currentNote, isPDF, debouncedSave]);

  const handleDownloadPDF = async () => {
    if (pdfUrl) {
      try {
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentNoteData?.title || 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
      }
    }
  };

  if (!currentNote) {
    return (
      <div className="flex-1 ml-6 h-full bg-white rounded-[20px] border border-gray-200 flex flex-col items-center justify-center text-gray-500">
        <FileText className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">Select or create a note to begin</p>
        <p className="text-sm mt-2 text-gray-400">Your notes will appear here</p>
      </div>
    );
  }

  if (isPDF) {
    return (
      <div className="flex-1 ml-6 h-full bg-white rounded-[20px] border border-gray-200 flex flex-col">
        {/* PDF Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4 flex-1">
            <Menu className="w-5 h-5 text-gray-400" />
            <div className="h-4 w-px bg-gray-200" />
            <h2 className="text-xl font-medium truncate">{currentNoteData?.title}</h2>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title={currentNoteData?.title || 'PDF Document'}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Failed to load PDF
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-color-mode="light" className="flex-1 ml-6 h-full bg-white rounded-[20px] border border-gray-200 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-1">
          <Menu className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600" />
          <div className="h-4 w-px bg-gray-200" />
          <input
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            className="text-xl font-medium bg-transparent border-none focus:outline-none focus:ring-0 flex-1"
            placeholder="Untitled"
          />
        </div>
        <div className="flex items-center gap-4">
          {saveError ? (
            <span className="text-sm text-red-500">{saveError}</span>
          ) : (
            <span className="text-sm text-gray-500">
              {isSaving ? 'Saving...' : 'Saved'}
            </span>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              className={`px-3 py-1 rounded-md text-sm ${
                previewMode === 'edit' ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => setPreviewMode('edit')}
            >
              Edit
            </button>
            <button
              className={`px-3 py-1 rounded-md text-sm ${
                previewMode === 'preview' ? 'bg-white shadow-sm' : ''
              }`}
              onClick={() => setPreviewMode('preview')}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-full">
          <MDEditor
            value={localContent}
            onChange={handleContentChange}
            preview={previewMode}
            height="100%"
            visibleDragbar={false}
            previewOptions={{
              rehypePlugins: [[rehypeSanitize]],
            }}
            className="w-full h-full border-none"
            textareaProps={{
              placeholder: 'Start writing in markdown...',
            }}
          />
        </div>
      </div>

      {/* Quick Markdown Reference */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-4 text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
          <span className="inline-flex items-center">**bold**</span>
          <span className="inline-flex items-center">*italic*</span>
          <span className="inline-flex items-center"># Heading</span>
          <span className="inline-flex items-center">- List</span>
          <span className="inline-flex items-center">`code`</span>
          <span className="inline-flex items-center">[Link](url)</span>
          <a 
            href="https://www.markdownguide.org/basic-syntax/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 ml-auto"
          >
            More syntax →
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotePanel;
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  File, 
  Trash2, 
  Loader2, 
  Upload, 
  FileText,
  AlertCircle,
  X
} from 'lucide-react';
import { useNotes } from '@/lib/contexts/NotesContext';
import type { 
  TreeItem, 
  FileUploadState, 
  FileUploadResponse, 
  ProcessingStatus,
  Note 
} from '@/lib/types/types';

// Environment configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Custom Alert Component
const CustomAlert: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 p-3 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg">
    <AlertCircle className="h-4 w-4" />
    {children}
  </div>
);

// Custom Progress Component
const CustomProgress: React.FC<{ value: number }> = ({ value }) => (
  <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
    <div 
      className="h-full bg-blue-500 transition-all duration-300" 
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

const Sidebar: React.FC = () => {
  const {
    fileStructure,
    currentNote,
    setCurrentNote,
    createNote,
    deleteNote,
    searchNotes,
    notes
  } = useNotes();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0
  });
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingCheckIntervalRef = useRef<NodeJS.Timeout>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingCheckIntervalRef.current) {
        clearInterval(processingCheckIntervalRef.current);
      }
    };
  }, []);

  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'text/markdown'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      return 'Only PDF and Markdown files are supported';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  // Processing status check
  const startProcessingCheck = async (fileId: string) => {
    if (processingCheckIntervalRef.current) {
      clearInterval(processingCheckIntervalRef.current);
    }

    setProcessingStatus({ status: 'pending', progress: 0 });
    
    processingCheckIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/process/${fileId}`);
        if (!response.ok) throw new Error('Failed to check processing status');

        const status: ProcessingStatus = await response.json();
        setProcessingStatus(status);

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(processingCheckIntervalRef.current);
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
        clearInterval(processingCheckIntervalRef.current);
        setProcessingStatus({
          status: 'failed',
          progress: 0,
          message: 'Failed to check processing status'
        });
      }
    }, 2000);
  };

  // File upload handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: validationError
      });
      return;
    }

    try {
      setUploadState({ isUploading: true, progress: 0 });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json() as FileUploadResponse;
      if (!data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      // Start processing status check
      startProcessingCheck(data.fileId);

      // Create note for uploaded file
      await handleCreateNote(file.name, {
        attachments: [{
          id: data.fileId,
          fileName: file.name,
          fileType: file.type === 'application/pdf' ? 'pdf' : 'markdown',
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          url: `${API_BASE_URL}${data.url}`,
          noteId: ''
        }]
      });

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
      setProcessingStatus(null);
    } finally {
      setUploadState({ isUploading: false, progress: 0 });
    }
  };

  // Note creation handler
  const handleCreateNote = async (name: string = newItemName, additionalData: Partial<Note> = {}) => {
    if (!name.trim()) return;
    
    setIsCreating(true);
    try {
      const note = await createNote('root', name, additionalData);
      if (!note?.id) {
        throw new Error('Failed to create note - no ID returned');
      }
      
      setCurrentNote(note.id);
      setNewItemName('');
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create note:', error);
      alert(`Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Note deletion handler
  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(noteId);
      await deleteNote(noteId);
      if (currentNote === noteId) {
        setCurrentNote(null);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert(`Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Note item renderer
  const renderNoteItem = (note: TreeItem) => {
    const isActive = note.id === currentNote;
    const noteData = notes[note.id];
    const hasAttachment = Boolean(noteData?.attachments && noteData.attachments.length > 0);
    const isDeletingThis = isDeleting === note.id;
    
    return (
      <div
        key={note.id}
        className={`flex items-center px-2 py-1.5 rounded-lg cursor-pointer group ${
          isActive ? 'bg-blue-50' : 'hover:bg-gray-100'
        }`}
        onClick={() => setCurrentNote(note.id)}
      >
        {hasAttachment ? (
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
        ) : (
          <File className="w-4 h-4 mr-2 text-gray-400" />
        )}
        
        <span className="text-sm text-gray-700 flex-1 truncate">
          {note.name}
        </span>
        
        <button
          onClick={(e) => handleDeleteNote(e, note.id)}
          disabled={isDeletingThis}
          className={`${
            isDeletingThis ? 'opacity-50' : 'opacity-0 group-hover:opacity-100'
          } p-1 hover:bg-gray-200 rounded transition-opacity disabled:cursor-not-allowed`}
          title="Delete note"
        >
          {isDeletingThis ? (
            <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-red-500" />
          )}
        </button>
      </div>
    );
  };

  const filteredNotes = searchQuery
    ? searchNotes(searchQuery)
    : fileStructure.children;

  return (
    <div className="w-64 h-full flex flex-col bg-white rounded-[20px] border border-gray-200">
      {/* Header and Search */}
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-semibold">Files</h1>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-8 py-2 text-sm bg-gray-50 border border-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2.5 p-0.5 hover:bg-gray-200 rounded-full"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto px-4 space-y-1">
        {filteredNotes.length > 0 ? (
          filteredNotes.map(renderNoteItem)
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <p className="text-gray-600 mb-2">No notes found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-blue-500 hover:text-blue-600"
            >
              Create a new note
            </button>
          </div>
        )}
      </div>

      {/* Upload and Create Section */}
      <div className="p-4 border-t border-gray-200 space-y-4">
        {/* File Upload */}
        <label className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.md"
            onChange={handleFileUpload}
            disabled={uploadState.isUploading}
          />
        </label>

        {/* Upload Progress */}
        {uploadState.isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-500">Uploading...</span>
              </div>
              <span className="text-gray-500">{uploadState.progress}%</span>
            </div>
            <CustomProgress value={uploadState.progress} />
          </div>
        )}

        {/* Processing Status */}
        {processingStatus && processingStatus.status !== 'completed' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-500">Processing file...</span>
              </div>
              <span className="text-gray-500">{processingStatus.progress}%</span>
            </div>
            <CustomProgress value={processingStatus.progress} />
          </div>
        )}

        {/* Error Messages */}
        {(uploadState.error || processingStatus?.status === 'failed') && (
          <CustomAlert>
            {uploadState.error || processingStatus?.message}
          </CustomAlert>
        )}

        {/* Create Note Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) void handleCreateNote();
                if (e.key === 'Escape') setShowCreateModal(false);
              }}
              placeholder="Enter note name..."
              className="w-full px-3 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                  onClick={() => void handleCreateNote()}
                  disabled={isCreating || !newItemName.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-xl font-semibold mb-4">Deleting Note</h2>
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span className="text-gray-600">Deleting note...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

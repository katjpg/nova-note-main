'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Note, TreeItem } from '@/lib/types/types';

// Define the shape of our notes state
interface NotesState {
  [key: string]: Note;
}

// Define the structure for file organization
interface FileStructure extends TreeItem {
  children: TreeItem[];
}

// Define the context type with all available methods
interface NotesContextType {
  notes: NotesState;
  currentNote: string | null;
  fileStructure: FileStructure;
  setCurrentNote: (id: string | null) => void;
  createNote: (parentId: string, title: string, noteData?: Partial<Note>) => Promise<Note>;
  updateNote: (noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  searchNotes: (query: string) => TreeItem[];
}

// Create the context with a default value
const NotesContext = createContext<NotesContextType | undefined>(undefined);

// API base URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State management
  const [notes, setNotes] = useState<NotesState>({});
  const [currentNote, setCurrentNote] = useState<string | null>(null);
  const [fileStructure, setFileStructure] = useState<FileStructure>({
    id: 'root',
    name: 'Root',
    parentId: null,
    children: []
  });

  // Fetch initial notes data
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notes`);
        if (!response.ok) {
          throw new Error('Failed to fetch notes');
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.notes)) {
          // Process notes into state
          const notesState: NotesState = {};
          const fileItems: TreeItem[] = [];

          data.notes.forEach((note: Note) => {
            notesState[note.id] = note;
            fileItems.push({
              id: note.id,
              name: note.title,
              parentId: 'root'
            });
          });

          // Update state
          setNotes(notesState);
          setFileStructure(prev => ({
            ...prev,
            children: fileItems
          }));
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };

    fetchNotes();
  }, []);

  const createNote = useCallback(async (
    parentId: string,
    title: string,
    noteData?: Partial<Note>
  ): Promise<Note> => {
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/notes`;
    console.log('Attempting to create note at:', apiUrl);
    
    try {
      // First, check if we can reach the API
      try {
        const healthCheck = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`);
        if (!healthCheck.ok) {
          throw new Error('API server is not responding');
        }
      } catch (error) {
        throw new Error(`API server is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
  
      // Proceed with note creation
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title,
          content: '',
          ...noteData
        }),
      });
  
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!data.success || !data.noteId) {
        throw new Error('Server returned an invalid response');
      }
  
      const newNote: Note = {
        id: data.noteId,
        title,
        content: '',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        ...noteData,
        ...data.metadata
      };
  
      // Update states
      setNotes(prev => ({
        ...prev,
        [newNote.id]: newNote
      }));
  
      setFileStructure(prev => ({
        ...prev,
        children: [...prev.children, {
          id: newNote.id,
          name: title,
          parentId
        }]
      }));
  
      return newNote;
    } catch (error) {
      console.error('Detailed error in createNote:', error);
      throw error;
    }
  }, []);

  // Update an existing note
  const updateNote = useCallback(async (noteId: string, updates: Partial<Note>): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId,
          ...updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update note');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Server returned an invalid response');
      }

      // Update notes state
      setNotes(prev => ({
        ...prev,
        [noteId]: {
          ...prev[noteId],
          ...updates,
          updated: new Date().toISOString()
        }
      }));

      // Update file structure if title changed
      if (updates.title) {
        setFileStructure(prev => ({
          ...prev,
          children: prev.children.map(item =>
            item.id === noteId
              ? { ...item, name: updates.title as string }
              : item
          )
        }));
      }
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }, []);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete note');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Server returned an invalid response');
      }

      // Update notes state
      setNotes(prev => {
        const next = { ...prev };
        delete next[noteId];
        return next;
      });

      // Update file structure
      setFileStructure(prev => ({
        ...prev,
        children: prev.children.filter(item => item.id !== noteId)
      }));

      // Clear current note if it was deleted
      if (currentNote === noteId) {
        setCurrentNote(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }, [currentNote]);

  // Search notes
  const searchNotes = useCallback((query: string): TreeItem[] => {
    if (!query.trim()) {
      return fileStructure.children;
    }

    const normalizedQuery = query.toLowerCase();
    return fileStructure.children.filter(item => {
      const note = notes[item.id];
      if (!note) return false;

      return (
        note.title.toLowerCase().includes(normalizedQuery) ||
        note.content.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [notes, fileStructure]);

  // Context value
  const contextValue: NotesContextType = {
    notes,
    currentNote,
    fileStructure,
    setCurrentNote,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
  };

  return (
    <NotesContext.Provider value={contextValue}>
      {children}
    </NotesContext.Provider>
  );
};

// Custom hook for using the notes context
export const useNotes = () => {
  const context = useContext(NotesContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};

// Export the provider for use in _app.tsx or layout.tsx
export default NotesProvider;
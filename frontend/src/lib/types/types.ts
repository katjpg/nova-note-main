// types.ts

export interface Note {
  id: string;
  title: string;
  content: string;
  created: string;
  updated: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    url: string;
    noteId: string;
  }>;
}

export interface TreeItem {
  id: string;
  name: string;
  parentId: string | null;
  children?: TreeItem[];
}

export interface FileStructure {
  id: string;
  name: string;
  type: 'folder';
  children: TreeItem[];
}

// Extended Note interface to support attachments
export interface Note {
  id: string;
  title: string;
  content: string;
  created: string;
  updated: string;
  attachments?: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadDate: string;
    url: string;
    noteId: string;
  }>;
}

// File attachment interface
export interface FileAttachment {
  id: string;
  fileName: string;
  fileType: 'pdf' | 'markdown';
  fileSize: number;
  uploadDate: Date;
  url: string;
  noteId: string;
}

// File upload state interface
export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error?: string;
}

// API response interfaces
export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  url: string;
  error?: string;
}

export interface ProcessingStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  result?: {
    chunks: number;
    wordCount: number;
  };
}
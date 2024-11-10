// API configuration
export const API_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    endpoints: {
      upload: '/api/upload',
      process: (fileId: string) => `/api/process/${fileId}`,
      notes: '/api/notes',
      files: (fileId: string) => `/api/files/${fileId}`,
    },
    fileConfig: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'text/markdown'] as const,
    },
  } as const;
  
  // Helper functions
  export const getFullUrl = (path: string) => `${API_CONFIG.baseUrl}${path}`;
  
  // Type for API responses
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  
  // Export utility functions
  export const handleApiResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'API request failed');
    }
    return response.json();
  };
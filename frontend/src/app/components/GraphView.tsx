'use client'

import { useState, useEffect, useRef } from 'react';
import { Star, Loader } from 'lucide-react';
import DeckBar from './DeckBar';

interface GraphStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
}

const GraphView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [graphExists, setGraphExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeckBar, setShowDeckBar] = useState(false);
  const [status, setStatus] = useState<GraphStatus | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    checkGraphExists();
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  const checkGraphExists = async () => {
    try {
      const response = await fetch('/KG.html', { method: 'HEAD' });
      const exists = response.ok;
      setGraphExists(exists);
      setShowDeckBar(exists);
    } catch {
      setGraphExists(false);
      setShowDeckBar(false);
    }
  };

  const handleGenerateGraph = async () => {
    setIsLoading(true);
    setError(null);
    setStatus({
      status: 'processing',
      progress: 0,
      message: 'Processing files and generating knowledge graph...'
    });

    try {
      // Process KG first
      const kgResponse = await fetch('/api/graph/process-kg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!kgResponse.ok) {
        const data = await kgResponse.json();
        throw new Error(data.error || 'Failed to process knowledge graph');
      }

      const kgData = await kgResponse.json();
      if (!kgData.success) {
        throw new Error(kgData.error || 'Failed to process knowledge graph');
      }

      setStatus({
        status: 'processing',
        progress: 50,
        message: `Successfully processed ${kgData.kg_docs} documents. Generating visualization...`
      });

      // Wait a bit to ensure processing is complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now check if the graph was generated
      await checkGraphExists();
      
      const iframe = document.getElementById('graph-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = '/KG.html?' + new Date().getTime();
      }

      setStatus({
        status: 'completed',
        progress: 100,
        message: 'Knowledge graph generated successfully'
      });
      setShowDeckBar(true);

    } catch (error) {
      console.error('Error generating graph:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate graph');
      setStatus({
        status: 'failed',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to generate graph'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="relative flex-1 min-h-[calc(100vh-152px)] bg-white rounded-[20px] border border-gray-200 overflow-hidden">
        {graphExists ? (
          <iframe
            id="graph-frame"
            src={`/KG.html?${new Date().getTime()}`}
            className="w-full h-full border-none"
            title="Knowledge Graph Visualization"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {error && (
              <div className="text-red-500 text-sm mb-2">
                {error}
              </div>
            )}
            <button
              onClick={handleGenerateGraph}
              disabled={isLoading}
              className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-3
                       flex items-center gap-2 hover:bg-gray-50 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Star className="w-5 h-5" />
              )}
              <span>
                {isLoading ? 'Generating Graph...' : 'Generate Graph'}
              </span>
            </button>
            {status && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-gray-500">
                  {status.message}
                </p>
                <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {showDeckBar && (
        <DeckBar 
          className="ml-6" 
          onCreateDecks={checkGraphExists} 
        />
      )}
    </div>
  );
};

export default GraphView;
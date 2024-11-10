'use client'

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

const GraphView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [graphExists, setGraphExists] = useState(false);

  useEffect(() => {
    checkGraphExists();
  }, []);

  const checkGraphExists = async () => {
    try {
      const response = await fetch('/KG.html', { method: 'HEAD' });
      setGraphExists(response.ok);
    } catch {
      setGraphExists(false);
    }
  };

  const handleGenerateGraph = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/graph/generate', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate graph');
      }
      
      await checkGraphExists();
      
      // Refresh the iframe with new graph
      const iframe = document.getElementById('graph-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = '/KG.html?' + new Date().getTime();
      }
    } catch (error) {
      console.error('Error generating graph:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex-1 min-h-[calc(100vh-152px)] bg-white rounded-[20px] border border-gray-200 overflow-hidden">
      {graphExists ? (
        <iframe
          id="graph-frame"
          src="/KG.html"
          className="w-full h-full border-none"
          title="Knowledge Graph Visualization"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={handleGenerateGraph}
            disabled={isLoading}
            className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-3
                     flex items-center gap-2 hover:bg-gray-50 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star className="w-5 h-5" />
            <span>{isLoading ? 'Generating...' : 'Generate Graph'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GraphView;
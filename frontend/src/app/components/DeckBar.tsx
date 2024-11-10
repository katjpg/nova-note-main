'use client'

import { useState } from 'react';
import { Star, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface DeckTheme {
  cluster_id: number;
  theme: string;
  concept_count: number;
  relationship_count: number;
  token_count?: number;
}

interface DeckBarProps {
  className?: string;
  onCreateDecks?: () => Promise<void>;
}

const DeckBar: React.FC<DeckBarProps> = ({ className = '', onCreateDecks }) => {
  const [decks, setDecks] = useState<DeckTheme[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDecks = async () => {
    if (onCreateDecks) {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/decks/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create decks');
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to create decks');
        }

        setDecks(data.decks);
        await onCreateDecks();
      } catch (error) {
        console.error('Error creating decks:', error);
        setError(error instanceof Error ? error.message : 'Failed to create decks');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGenerateFlashcards = async (clusterId: number) => {
    // TODO: Implement flashcard generation
    console.log('Generating flashcards for cluster:', clusterId);
  };

  return (
    <div className={`w-96 bg-white rounded-[20px] border border-gray-200 flex flex-col p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Study Decks</h2>
        {!decks.length && (
          <button
            onClick={createDecks}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Star className="w-4 h-4" />
            )}
            <span>Create Decks</span>
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4 overflow-y-auto">
        {decks.map((deck) => (
          <Card key={deck.cluster_id}>
            <CardHeader>
              <CardTitle>{deck.theme}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Concepts:</span>
                  <span>{deck.concept_count}</span>
                </div>
              </div>
              <button
                onClick={() => handleGenerateFlashcards(deck.cluster_id)}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
              >
                <Star className="w-4 h-4" />
                <span>Generate Flashcards</span>
              </button>
            </CardContent>
          </Card>
        ))}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Loader className="w-8 h-8 animate-spin mb-2" />
            <p>Creating study decks...</p>
          </div>
        )}

        {!isLoading && !decks.length && !error && (
          <div className="text-center py-8 text-gray-500">
            No decks created yet
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckBar;
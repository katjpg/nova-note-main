import { FC } from 'react';
import { BookOpen, BrainCircuit, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Dummy data for cognitive science decks
const dummyDecks = [
  {
    id: 1,
    theme: "Memory and Learning Processes",
    conceptCount: 15,
    relationshipCount: 28,
    concepts: ["Working Memory", "Long-term Potentiation", "Encoding", "Retrieval"]
  },
  {
    id: 2,
    theme: "Attention and Perception",
    conceptCount: 12,
    relationshipCount: 22,
    concepts: ["Selective Attention", "Feature Integration", "Bottom-up Processing"]
  },
  {
    id: 3,
    theme: "Decision Making and Reasoning",
    conceptCount: 18,
    relationshipCount: 32,
    concepts: ["Heuristics", "Cognitive Biases", "Deductive Reasoning"]
  },
  {
    id: 4,
    theme: "Language and Communication",
    conceptCount: 14,
    relationshipCount: 25,
    concepts: ["Syntax Processing", "Semantic Networks", "Phonological Loop"]
  }
];

const DecksPage: FC = () => {
  return (
    <div className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Study Decks</h1>
            <p className="text-gray-500 mt-1">Review and master your knowledge</p>
          </div>
          <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
            <BrainCircuit className="w-4 h-4" />
            <span>Create New Deck</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dummyDecks.map((deck) => (
            <Card key={deck.id} className="hover:shadow-lg transition-shadow duration-200 group">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg font-medium">{deck.theme}</span>
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{deck.conceptCount}</span> concepts
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{deck.relationshipCount}</span> relationships
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {deck.concepts.map((concept, index) => (
                    <div 
                      key={index}
                      className="text-sm bg-gray-50 px-3 py-2 rounded-md text-gray-700"
                    >
                      {concept}
                    </div>
                  ))}
                </div>

                <button className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors group-hover:border-blue-500 group-hover:text-blue-500">
                  <span>Study Deck</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DecksPage;
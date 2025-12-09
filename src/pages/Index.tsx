import { useState } from 'react';
import { Brain } from 'lucide-react';
import { UQRC_LLM } from '@/lib/uqrc';
import { ChatInterface } from '@/components/ChatInterface';
import { TrainingPanel } from '@/components/TrainingPanel';
import { MemoryViewer } from '@/components/MemoryViewer';
import { NeuralVisualizer } from '@/components/NeuralVisualizer';

const Index = () => {
  const [llm] = useState(() => new UQRC_LLM());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTrained = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Brain className="w-6 h-6 text-background" />
            </div>
            <div>
              <h1 className="text-xl font-bold">UQRC-LLM</h1>
              <p className="text-sm text-muted-foreground mono">
                v1.0.0 | Geometric-Semantic Field Model
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChatInterface llm={llm} />
          </div>
          <div className="space-y-6">
            <TrainingPanel llm={llm} onTrained={handleTrained} />
            <MemoryViewer llm={llm} refreshTrigger={refreshTrigger} />
            <NeuralVisualizer llm={llm} refreshTrigger={refreshTrigger} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="glass-card p-6 rounded-lg">
            <h3 className="font-semibold mb-2 text-primary">🌀 UQRC Field</h3>
            <p className="text-sm text-muted-foreground">
              Uses discrete derivatives and Laplacian smoothing for stable knowledge evolution.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <h3 className="font-semibold mb-2 text-success">🔗 Geometric Graph</h3>
            <p className="text-sm text-muted-foreground">
              Phrases form parent-child hierarchies with spectral weight relationships.
            </p>
          </div>
          <div className="glass-card p-6 rounded-lg">
            <h3 className="font-semibold mb-2 text-warning">🎯 Zero-Prior Learning</h3>
            <p className="text-sm text-muted-foreground">
              Starts dead, learns only from input, never generates unknown words.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-muted-foreground mono">
            𝒪_UQRC(u) = νΔu + ℛu + L_S u
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
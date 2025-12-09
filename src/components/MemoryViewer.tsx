import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Trash2, RefreshCw } from 'lucide-react';
import { UQRC_LLM } from '@/lib/uqrc';
import { toast } from 'sonner';

interface MemoryViewerProps {
  llm: UQRC_LLM;
  refreshTrigger: number;
}

export const MemoryViewer = ({ llm, refreshTrigger }: MemoryViewerProps) => {
  const [stats, setStats] = useState(llm.getStats());
  const [memories, setMemories] = useState(llm.getMemories());

  useEffect(() => {
    setStats(llm.getStats());
    setMemories(llm.getMemories());
  }, [refreshTrigger, llm]);

  const handleClear = () => {
    if (confirm('Clear all UQRC memory? This resets to dead state.')) {
      llm.clearMemory();
      setStats(llm.getStats());
      setMemories([]);
      toast.success('Memory cleared - dead state');
    }
  };

  const handleRefresh = () => {
    setStats(llm.getStats());
    setMemories(llm.getMemories());
  };

  return (
    <Card className="p-6 bg-card shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-neural" />
          <h2 className="text-lg font-semibold">Field State</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} className="h-8 w-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-3 rounded-lg">
          <div className="text-xl font-bold text-primary mono">{stats.phraseNodes}</div>
          <div className="text-xs text-muted-foreground">Phrases</div>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <div className="text-xl font-bold text-neural mono">{stats.wordNodes}</div>
          <div className="text-xs text-muted-foreground">Words</div>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <div className="text-xl font-bold text-success mono">{stats.totalEdges}</div>
          <div className="text-xs text-muted-foreground">Links</div>
        </div>
        <div className="glass-card p-3 rounded-lg">
          <div className="text-xl font-bold text-warning mono">{stats.stability.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Stability</div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Recent Training</h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {memories.length === 0 ? (
            <div className="glass-card p-3 rounded-lg text-center text-muted-foreground text-sm">
              Dead state. Train to grow.
            </div>
          ) : (
            memories.slice(0, 5).map((memory, index) => (
              <div key={index} className="glass-card p-2 rounded-lg text-xs">
                <div><span className="text-primary">Q:</span> {memory.prompt}</div>
                <div className="text-muted-foreground"><span className="text-success">A:</span> {memory.response}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
};
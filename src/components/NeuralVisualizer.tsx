import { Card } from '@/components/ui/card';
import { Network, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UQRC_LLM } from '@/lib/uqrc';

interface NeuralVisualizerProps {
  llm: UQRC_LLM;
  refreshTrigger: number;
}

export const NeuralVisualizer = ({ llm, refreshTrigger }: NeuralVisualizerProps) => {
  const [stats, setStats] = useState(llm.getStats());
  const [fieldState, setFieldState] = useState(llm.getFieldState());

  useEffect(() => {
    setStats(llm.getStats());
    setFieldState(llm.getFieldState());
  }, [refreshTrigger, llm]);

  return (
    <Card className="p-6 bg-card shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-5 h-5 text-success" />
        <h2 className="text-lg font-semibold">UQRC Field</h2>
      </div>

      <div className="glass-card p-4 rounded-lg mb-4">
        <div className="text-center mb-4">
          <div className="text-3xl font-bold mono text-primary">
            u = {fieldState.u.toFixed(4)}
          </div>
          <div className="text-xs text-muted-foreground">Field Value</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-lg font-bold mono text-warning">
              {fieldState.curvature.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Curvature</div>
          </div>
          <div>
            <div className="text-lg font-bold mono text-success">
              {fieldState.stability.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">Stability</div>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">System Status</span>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Phase:</span>
            <span className="mono text-foreground">{stats.phase}</span>
          </div>
          <div className="flex justify-between">
            <span>Nodes:</span>
            <span className="mono text-foreground">{stats.totalNodes}</span>
          </div>
          <div className="flex justify-between">
            <span>Edges:</span>
            <span className="mono text-foreground">{stats.totalEdges}</span>
          </div>
          <div className="flex justify-between">
            <span>Evolution:</span>
            <span className="mono text-success">Active</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
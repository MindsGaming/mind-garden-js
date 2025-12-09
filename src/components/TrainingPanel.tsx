import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { BookOpen, Zap } from 'lucide-react';
import { UQRC_LLM } from '@/lib/uqrc';
import { toast } from 'sonner';

interface TrainingPanelProps {
  llm: UQRC_LLM;
  onTrained: () => void;
}

export const TrainingPanel = ({ llm, onTrained }: TrainingPanelProps) => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isTraining, setIsTraining] = useState(false);

  const handleTrain = async () => {
    if (!prompt.trim() || !response.trim()) {
      toast.error('Provide both prompt and response');
      return;
    }

    setIsTraining(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    llm.learnFrom(prompt, response);
    
    toast.success('Pattern learned!', {
      description: `"${prompt}" → "${response}"`,
    });

    setPrompt('');
    setResponse('');
    setIsTraining(false);
    onTrained();
  };

  return (
    <Card className="p-6 bg-card shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-warning" />
        <h2 className="text-lg font-semibold">Train UQRC</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">When user says:</label>
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Hello" className="bg-input" />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Respond with:</label>
          <Input value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Hello, how are you?" className="bg-input" />
        </div>

        <Button onClick={handleTrain} disabled={isTraining || !prompt.trim() || !response.trim()} className="w-full shadow-glow">
          {isTraining ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Evolving field...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Train Pattern
            </>
          )}
        </Button>
      </div>

      <div className="mt-4 p-3 glass-card rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>UQRC:</strong> Creates nodes with spectral weights, links phrases geometrically, and evolves the field.
        </p>
      </div>
    </Card>
  );
};
import { Layer } from './Layer';
import { LocalMemory } from './LocalMemory';
import { Tagger } from './Tagger';

export interface TrainingEntry {
  prompt: string;
  response: string;
  tags: string[];
  timestamp: number;
}

export class SelfLearningLLM {
  private inputLayer: Layer;
  private hiddenLayer: Layer;
  private outputLayer: Layer;
  private memory: LocalMemory;
  private tagger: Tagger;
  private vectorSize: number;
  private vocabulary: Map<string, number>;
  private conversationContext: string[];

  constructor(inputSize: number = 32, hiddenSize: number = 16, outputSize: number = 32) {
    this.vectorSize = inputSize;
    this.inputLayer = new Layer(hiddenSize, inputSize);
    this.hiddenLayer = new Layer(hiddenSize, hiddenSize);
    this.outputLayer = new Layer(outputSize, hiddenSize);
    this.memory = new LocalMemory('SelfLearningLLM');
    this.tagger = new Tagger();
    this.vocabulary = new Map();
    this.conversationContext = [];
    
    this.loadVocabulary();
  }

  private loadVocabulary(): void {
    const saved = this.memory.recall('vocabulary');
    if (saved) {
      this.vocabulary = new Map(Object.entries(saved));
    }
  }

  private saveVocabulary(): void {
    this.memory.remember('vocabulary', Object.fromEntries(this.vocabulary));
  }

  vectorize(text: string): number[] {
    const words = text.toLowerCase().split(/\s+/);
    const vector = Array(this.vectorSize).fill(0);

    words.forEach(word => {
      if (!this.vocabulary.has(word)) {
        this.vocabulary.set(word, this.vocabulary.size);
        this.saveVocabulary();
      }
      const index = this.vocabulary.get(word)! % this.vectorSize;
      vector[index] += 1;
    });

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
  }

  tag(text: string): string[] {
    return this.tagger.extractTags(text);
  }

  predict(input: number[]): number[] {
    let output = this.inputLayer.forward(input);
    output = this.hiddenLayer.forward(output);
    output = this.outputLayer.forward(output);
    return output;
  }

  train(input: number[], target: number[], learningRate: number = 0.1): void {
    // Forward pass
    const hidden1 = this.inputLayer.forward(input);
    const hidden2 = this.hiddenLayer.forward(hidden1);
    const output = this.outputLayer.forward(hidden2);

    // Calculate errors
    const outputErrors = output.map((o, i) => target[i] - o);
    
    // Backward pass
    const hidden2Errors = this.outputLayer.train(hidden2, outputErrors, learningRate);
    const hidden1Errors = this.hiddenLayer.train(hidden1, hidden2Errors, learningRate);
    this.inputLayer.train(input, hidden1Errors, learningRate);
  }

  learnFrom(prompt: string, response: string): void {
    const inputVector = this.vectorize(prompt);
    const targetVector = this.vectorize(response);
    const tags = this.tag(prompt);

    // Train the network
    for (let i = 0; i < 10; i++) {
      this.train(inputVector, targetVector, 0.1);
    }

    // Store in memory
    const entry: TrainingEntry = {
      prompt,
      response,
      tags,
      timestamp: Date.now()
    };

    const memories = this.getMemories();
    memories.push(entry);
    this.memory.remember('training_data', memories);
  }

  respond(prompt: string): string {
    const tags = this.tag(prompt);
    const memories = this.getMemories();
    
    // Add to conversation context
    this.conversationContext.push(prompt.toLowerCase());
    if (this.conversationContext.length > 5) {
      this.conversationContext.shift();
    }
    
    // Find best match using contextual similarity
    let bestMatch: TrainingEntry | null = null;
    let bestScore = 0;
    
    for (const memory of memories) {
      const tagSimilarity = this.tagger.similarity(tags, memory.tags);
      const contextScore = this.getContextScore(prompt, memory);
      const combinedScore = tagSimilarity * 0.7 + contextScore * 0.3;
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMatch = memory;
      }
    }

    // Use memory if score is decent
    if (bestMatch && bestScore > 0.2) {
      return bestMatch.response;
    }

    // Try neural network prediction
    if (memories.length > 0) {
      const inputVector = this.vectorize(prompt);
      const output = this.predict(inputVector);
      const prediction = this.devectorize(output);
      
      if (prediction && prediction.length > 3) {
        return prediction;
      }
    }

    // Last resort: intent-based fallback
    return this.getIntentBasedFallback(tags, prompt);
  }
  
  private getContextScore(prompt: string, memory: TrainingEntry): number {
    const promptWords = new Set(prompt.toLowerCase().split(/\s+/));
    const memoryWords = new Set(memory.prompt.toLowerCase().split(/\s+/));
    
    // Check if any recent context words appear in the memory
    const contextRelevance = this.conversationContext.some(ctx => 
      memory.prompt.toLowerCase().includes(ctx) || 
      ctx.includes(memory.prompt.toLowerCase().split(/\s+/)[0])
    ) ? 0.5 : 0;
    
    // Word overlap score
    const intersection = [...promptWords].filter(w => memoryWords.has(w)).length;
    const union = new Set([...promptWords, ...memoryWords]).size;
    const wordScore = union > 0 ? intersection / union : 0;
    
    return Math.max(contextRelevance, wordScore);
  }
  
  private getIntentBasedFallback(tags: string[], prompt: string): string {
    const lowerPrompt = prompt.toLowerCase().trim();
    const hasIntent = (intent: string) => tags.some(t => t.includes(`intent:${intent}`));
    
    // Only use greeting fallback for very clear greetings
    if (hasIntent('greeting') && lowerPrompt.length < 20 && 
        (lowerPrompt.startsWith('hello') || lowerPrompt.startsWith('hi') || 
         lowerPrompt.startsWith('hey') || lowerPrompt === 'greetings')) {
      return "Hello! I'm learning to chat. You can teach me new responses in the Training Panel!";
    }
    
    // Only use farewell for clear goodbyes
    if (hasIntent('farewell') && lowerPrompt.length < 15 &&
        (lowerPrompt.startsWith('bye') || lowerPrompt.startsWith('goodbye'))) {
      return "Goodbye! Thanks for chatting with me.";
    }
    
    // For everything else, try to echo with variation
    const words = prompt.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      return `Interesting! You mentioned "${words[0]}". I'm still learning about this - teach me more?`;
    }
    
    return "I'm still learning. Try teaching me this in the Training Panel!";
  }

  private devectorize(vector: number[]): string {
    const words: Array<[string, number]> = [];
    
    this.vocabulary.forEach((index, word) => {
      const vecIndex = index % this.vectorSize;
      words.push([word, vector[vecIndex]]);
    });

    words.sort((a, b) => b[1] - a[1]);
    return words.slice(0, 5).map(w => w[0]).join(' ');
  }

  getMemories(): TrainingEntry[] {
    return this.memory.recall('training_data') || [];
  }

  clearMemory(): void {
    this.memory.clear();
    this.vocabulary.clear();
    this.conversationContext = [];
  }

  getStats() {
    const memories = this.getMemories();
    return {
      totalMemories: memories.length,
      vocabularySize: this.vocabulary.size,
      recentMemories: memories.slice(-5).reverse()
    };
  }
}

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

  constructor(inputSize: number = 32, hiddenSize: number = 16, outputSize: number = 32) {
    this.vectorSize = inputSize;
    this.inputLayer = new Layer(hiddenSize, inputSize);
    this.hiddenLayer = new Layer(hiddenSize, hiddenSize);
    this.outputLayer = new Layer(outputSize, hiddenSize);
    this.memory = new LocalMemory('SelfLearningLLM');
    this.tagger = new Tagger();
    this.vocabulary = new Map();
    
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
    const inputVector = this.vectorize(prompt);
    const tags = this.tag(prompt);
    
    // Check memory for similar prompts
    const memories = this.getMemories();
    const similar = memories.find(m => 
      this.tagger.similarity(tags, m.tags) > 0.5
    );

    if (similar) {
      return similar.response;
    }

    // Use neural network prediction
    const output = this.predict(inputVector);
    const prediction = this.devectorize(output);
    
    return prediction || "I'm still learning. Can you teach me how to respond?";
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

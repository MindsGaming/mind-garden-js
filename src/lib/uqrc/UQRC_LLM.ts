// UQRC-LLM Main Class
// Unified interface for the UQRC language model

import { MemoryStore } from './MemoryStore';
import { SpectralWeightEngine } from './SpectralWeightEngine';
import { UQRCOperatorEngine } from './UQRCOperatorEngine';
import { GeometricGraphEngine } from './GeometricGraphEngine';
import { ResponseSelector } from './ResponseSelector';
import { FieldState, UQRCNode } from './types';

export interface UQRCStats {
  totalNodes: number;
  phraseNodes: number;
  wordNodes: number;
  totalEdges: number;
  fieldValue: number;
  curvature: number;
  stability: number;
  phase: string;
}

export interface RecentMemory {
  prompt: string;
  response: string;
  timestamp: number;
}

export class UQRC_LLM {
  private store: MemoryStore;
  private spectral: SpectralWeightEngine;
  private operator: UQRCOperatorEngine;
  private graph: GeometricGraphEngine;
  private selector: ResponseSelector;
  private trainingLog: RecentMemory[];
  
  constructor() {
    this.store = new MemoryStore();
    this.spectral = new SpectralWeightEngine();
    this.operator = new UQRCOperatorEngine(this.store.getConfig());
    this.graph = new GeometricGraphEngine(this.store);
    this.selector = new ResponseSelector(this.store, this.graph, this.operator);
    this.trainingLog = [];
    
    this.loadTrainingLog();
  }
  
  // Main response method
  respond(prompt: string): string {
    // Process input to update graph
    this.graph.processInput(prompt);
    
    // Evolve field state
    this.evolveField(prompt);
    
    // Generate response
    const response = this.selector.generateResponse(prompt);
    
    return response;
  }
  
  // Learn from a prompt-response pair
  learnFrom(prompt: string, response: string): void {
    // Process training pair
    this.graph.processTrainingPair(prompt, response);
    
    // Evolve field for both prompt and response
    this.evolveField(prompt);
    this.evolveField(response);
    
    // Update stability weights for involved nodes
    this.reinforceNodes(prompt, response);
    
    // Log the training
    this.trainingLog.push({
      prompt,
      response,
      timestamp: Date.now()
    });
    
    // Keep last 100 training entries
    if (this.trainingLog.length > 100) {
      this.trainingLog.shift();
    }
    
    this.saveTrainingLog();
  }
  
  // Evolve the field state based on new input
  private evolveField(input: string): void {
    const nodes = this.graph.processInput(input);
    if (nodes.length === 0) return;
    
    const currentState = this.store.getFieldState();
    const stabilityHistory = this.store.getStabilityHistory();
    
    for (const node of nodes) {
      const neighbors = this.store.getNeighbors(node.id);
      const neighborFieldValues = neighbors.map(n => n.fieldValue);
      const neighborCurvatures = neighbors.map(n => n.curvatureSignature);
      
      // Update field state
      const newState = this.operator.updateField(
        currentState,
        node,
        neighborFieldValues,
        neighborCurvatures,
        stabilityHistory
      );
      
      this.store.updateFieldState(newState);
      this.store.updateNodeFieldValue(node.id, newState.u);
    }
  }
  
  // Reinforce nodes involved in training
  private reinforceNodes(prompt: string, response: string): void {
    const promptPhrases = this.graph.findMatchingPhrases(prompt);
    const responsePhrases = this.graph.findMatchingPhrases(response);
    
    // Increase stability for trained nodes
    for (const node of [...promptPhrases, ...responsePhrases]) {
      const updated = this.store.getNode(node.id);
      if (updated) {
        updated.stabilityWeight = Math.min(updated.stabilityWeight + 0.1, 2.0);
        updated.usageWeight += 0.5;
      }
    }
  }
  
  // Get current phase based on graph state
  private getPhase(): string {
    const stats = this.store.getStats();
    
    if (stats.totalNodes === 0) {
      return 'A - Dead State';
    } else if (stats.phraseNodes < 5) {
      return 'B - Node Creation';
    } else if (stats.totalEdges < 10) {
      return 'C - Neighborhood Growth';
    } else if (stats.stability > 0.7) {
      return 'D - Field Evolution';
    } else if (stats.phraseNodes > 20) {
      return 'E - Response Loop';
    } else {
      return 'F - Multi-Phrase Chain';
    }
  }
  
  // Get memories (for compatibility with existing UI)
  getMemories(): RecentMemory[] {
    return [...this.trainingLog].reverse();
  }
  
  // Get stats for UI
  getStats(): UQRCStats {
    const storeStats = this.store.getStats();
    return {
      ...storeStats,
      phase: this.getPhase()
    };
  }
  
  // Get all nodes for visualization
  getNodes(): UQRCNode[] {
    return this.store.getAllNodes();
  }
  
  // Get field state for visualization
  getFieldState(): FieldState {
    return this.store.getFieldState();
  }
  
  // Clear all memory
  clearMemory(): void {
    this.store.clear();
    this.trainingLog = [];
    localStorage.removeItem('uqrc_training_log');
  }
  
  // Persistence for training log
  private saveTrainingLog(): void {
    localStorage.setItem('uqrc_training_log', JSON.stringify(this.trainingLog));
  }
  
  private loadTrainingLog(): void {
    const saved = localStorage.getItem('uqrc_training_log');
    if (saved) {
      try {
        this.trainingLog = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load training log:', e);
      }
    }
  }
  
  // Tag extraction (for compatibility)
  tag(text: string): string[] {
    // Extract key words as tags
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(w => w.length > 3);
  }
}

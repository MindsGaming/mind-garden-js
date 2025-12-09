// Module 1: Memory Store
// Handles nodes, edges, weights with persistence

import { UQRCNode, UQRCEdge, GraphState, FieldState, UQRCConfig } from './types';
import { SpectralWeightEngine } from './SpectralWeightEngine';

const STORAGE_KEY = 'uqrc_llm_state';

export class MemoryStore {
  private nodes: Map<string, UQRCNode>;
  private edges: UQRCEdge[];
  private fieldState: FieldState;
  private config: UQRCConfig;
  private spectralEngine: SpectralWeightEngine;
  private stabilityHistory: number[];
  
  constructor() {
    this.spectralEngine = new SpectralWeightEngine();
    this.nodes = new Map();
    this.edges = [];
    this.stabilityHistory = [];
    
    // Default UQRC configuration
    this.config = {
      nu: 0.1,           // smoothing coefficient
      lambda: 0.05,      // stability coefficient
      minLengthThreshold: 0.1,
      curvatureThreshold: 2.0,
      stabilityThreshold: 0.3
    };
    
    // Initialize field state (dead state)
    this.fieldState = {
      u: 0,
      gradients: [],
      curvature: 0,
      stability: 1.0
    };
    
    this.load();
  }
  
  // Generate unique ID for a node
  private generateId(content: string, type: string): string {
    return `${type}_${content.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  }
  
  // Create a new node from content
  createNode(content: string, type: 'word' | 'phrase' | 'punctuation', parentId: string | null = null): UQRCNode {
    const existing = this.findNodeByContent(content);
    if (existing) {
      // Update usage weight instead of creating duplicate
      existing.usageWeight += 1;
      existing.lastUsedAt = Date.now();
      this.save();
      return existing;
    }
    
    const node: UQRCNode = {
      id: this.generateId(content, type),
      content,
      type,
      lengthWeight: this.spectralEngine.calculateLengthWeight(content),
      charIndexWeight: this.spectralEngine.calculateCharIndexWeight(content),
      stabilityWeight: this.spectralEngine.calculateInitialStabilityWeight(),
      usageWeight: this.spectralEngine.calculateInitialUsageWeight(),
      curvatureSignature: this.spectralEngine.calculateCurvatureSignature(content),
      fieldValue: this.fieldState.u,
      parentId,
      childIds: [],
      linkStrengths: new Map(),
      createdAt: Date.now(),
      lastUsedAt: Date.now()
    };
    
    this.nodes.set(node.id, node);
    
    // If there's a parent, add this as a child
    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.childIds.push(node.id);
      }
    }
    
    this.save();
    return node;
  }
  
  // Find node by exact content match
  findNodeByContent(content: string): UQRCNode | undefined {
    const normalized = content.toLowerCase().trim();
    for (const node of this.nodes.values()) {
      if (node.content.toLowerCase().trim() === normalized) {
        return node;
      }
    }
    return undefined;
  }
  
  // Find similar nodes (for neighborhood growth)
  findSimilarNodes(content: string, threshold: number = 0.5): UQRCNode[] {
    const targetWeights = {
      lengthWeight: this.spectralEngine.calculateLengthWeight(content),
      charIndexWeight: this.spectralEngine.calculateCharIndexWeight(content),
      curvatureSignature: this.spectralEngine.calculateCurvatureSignature(content)
    };
    
    const similar: UQRCNode[] = [];
    for (const node of this.nodes.values()) {
      const similarity = this.spectralEngine.calculateSimilarity(targetWeights, node);
      if (similarity >= threshold) {
        similar.push(node);
      }
    }
    
    return similar.sort((a, b) => b.usageWeight - a.usageWeight);
  }
  
  // Create or strengthen an edge between nodes
  createEdge(fromId: string, toId: string, isSequential: boolean = false): void {
    const existingEdge = this.edges.find(e => e.fromId === fromId && e.toId === toId);
    
    if (existingEdge) {
      existingEdge.strength += 0.1;
      // Update curvature based on node curvatures
      const fromNode = this.nodes.get(fromId);
      const toNode = this.nodes.get(toId);
      if (fromNode && toNode) {
        existingEdge.curvature = Math.abs(fromNode.curvatureSignature - toNode.curvatureSignature);
      }
    } else {
      const fromNode = this.nodes.get(fromId);
      const toNode = this.nodes.get(toId);
      
      if (fromNode && toNode) {
        const edge: UQRCEdge = {
          fromId,
          toId,
          strength: 1.0,
          curvature: Math.abs(fromNode.curvatureSignature - toNode.curvatureSignature),
          isSequential
        };
        this.edges.push(edge);
        
        // Update link strengths in nodes
        fromNode.linkStrengths.set(toId, edge.strength);
        toNode.linkStrengths.set(fromId, edge.strength);
      }
    }
    
    this.save();
  }
  
  // Get all edges from a node
  getEdgesFrom(nodeId: string): UQRCEdge[] {
    return this.edges.filter(e => e.fromId === nodeId);
  }
  
  // Get sequential edges (for response building)
  getSequentialEdges(nodeId: string): UQRCEdge[] {
    return this.edges.filter(e => e.fromId === nodeId && e.isSequential);
  }
  
  // Get neighbors of a node
  getNeighbors(nodeId: string): UQRCNode[] {
    const edges = this.edges.filter(e => e.fromId === nodeId || e.toId === nodeId);
    const neighborIds = new Set<string>();
    
    for (const edge of edges) {
      if (edge.fromId === nodeId) neighborIds.add(edge.toId);
      if (edge.toId === nodeId) neighborIds.add(edge.fromId);
    }
    
    return Array.from(neighborIds)
      .map(id => this.nodes.get(id))
      .filter((n): n is UQRCNode => n !== undefined);
  }
  
  // Get node by ID
  getNode(id: string): UQRCNode | undefined {
    return this.nodes.get(id);
  }
  
  // Get all nodes
  getAllNodes(): UQRCNode[] {
    return Array.from(this.nodes.values());
  }
  
  // Get all phrase nodes
  getPhraseNodes(): UQRCNode[] {
    return this.getAllNodes().filter(n => n.type === 'phrase');
  }
  
  // Update node field value
  updateNodeFieldValue(nodeId: string, fieldValue: number): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.fieldValue = fieldValue;
      this.save();
    }
  }
  
  // Update field state
  updateFieldState(newState: FieldState): void {
    this.fieldState = newState;
    this.stabilityHistory.push(newState.stability);
    // Keep last 20 stability values
    if (this.stabilityHistory.length > 20) {
      this.stabilityHistory.shift();
    }
    this.save();
  }
  
  // Get current field state
  getFieldState(): FieldState {
    return { ...this.fieldState };
  }
  
  // Get stability history
  getStabilityHistory(): number[] {
    return [...this.stabilityHistory];
  }
  
  // Get config
  getConfig(): UQRCConfig {
    return { ...this.config };
  }
  
  // Get full graph state
  getGraphState(): GraphState {
    return {
      nodes: new Map(this.nodes),
      edges: [...this.edges],
      fieldState: { ...this.fieldState },
      config: { ...this.config }
    };
  }
  
  // Clear all memory (reset to dead state)
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.stabilityHistory = [];
    this.fieldState = {
      u: 0,
      gradients: [],
      curvature: 0,
      stability: 1.0
    };
    localStorage.removeItem(STORAGE_KEY);
  }
  
  // Persistence
  private save(): void {
    const state = {
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        ...node,
        linkStrengths: Array.from(node.linkStrengths.entries())
      })),
      edges: this.edges,
      fieldState: this.fieldState,
      stabilityHistory: this.stabilityHistory
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  
  private load(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        
        this.nodes = new Map();
        for (const nodeData of state.nodes || []) {
          const node: UQRCNode = {
            ...nodeData,
            linkStrengths: new Map(nodeData.linkStrengths || [])
          };
          this.nodes.set(node.id, node);
        }
        
        this.edges = state.edges || [];
        this.fieldState = state.fieldState || this.fieldState;
        this.stabilityHistory = state.stabilityHistory || [];
      } catch (e) {
        console.error('Failed to load UQRC state:', e);
      }
    }
  }
  
  // Stats for UI
  getStats() {
    return {
      totalNodes: this.nodes.size,
      phraseNodes: this.getPhraseNodes().length,
      wordNodes: this.getAllNodes().filter(n => n.type === 'word').length,
      totalEdges: this.edges.length,
      fieldValue: this.fieldState.u,
      curvature: this.fieldState.curvature,
      stability: this.fieldState.stability
    };
  }
}

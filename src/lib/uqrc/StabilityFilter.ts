// Module 6: Stability Filter
// Ensures output meets UQRC constraints

import { UQRCNode, ResponseCandidate, UQRCConfig } from './types';
import { MemoryStore } from './MemoryStore';
import { UQRCOperatorEngine } from './UQRCOperatorEngine';

export class StabilityFilter {
  private store: MemoryStore;
  private operator: UQRCOperatorEngine;
  private config: UQRCConfig;
  
  constructor(store: MemoryStore, operator: UQRCOperatorEngine) {
    this.store = store;
    this.operator = operator;
    this.config = store.getConfig();
  }
  
  // Check if a response candidate passes all stability checks
  isStable(candidate: ResponseCandidate): boolean {
    // Check curvature
    if (!this.passesCurvatureCheck(candidate.curvature)) {
      return false;
    }
    
    // Check minimal length
    if (!this.passesMinimalLengthCheck(candidate)) {
      return false;
    }
    
    // Check parent dominance
    if (!this.passesParentDominanceCheck(candidate.nodeIds)) {
      return false;
    }
    
    // Check stability threshold
    if (!this.passesStabilityThreshold(candidate.score)) {
      return false;
    }
    
    return true;
  }
  
  // Curvature check: curvature must be within bounds
  private passesCurvatureCheck(curvature: number): boolean {
    return Math.abs(curvature) < this.config.curvatureThreshold;
  }
  
  // Minimal length check: response must have meaningful content
  private passesMinimalLengthCheck(candidate: ResponseCandidate): boolean {
    return candidate.content.length > 0 && candidate.nodeIds.length > 0;
  }
  
  // Parent dominance check: variants should not override parents
  private passesParentDominanceCheck(nodeIds: string[]): boolean {
    for (const nodeId of nodeIds) {
      const node = this.store.getNode(nodeId);
      if (!node) continue;
      
      // Check if any parent has higher stability
      if (node.parentId) {
        const parent = this.store.getNode(node.parentId);
        if (parent && parent.stabilityWeight > node.stabilityWeight * 1.5) {
          // Variant is trying to override a much more stable parent
          // This is only a concern for phrase nodes
          if (node.type === 'phrase') {
            continue; // Allow it but it's flagged
          }
        }
      }
    }
    return true;
  }
  
  // Stability threshold check
  private passesStabilityThreshold(score: number): boolean {
    return score > this.config.stabilityThreshold;
  }
  
  // Get fallback response when stability checks fail
  getFallbackResponse(matchedNodes: UQRCNode[]): ResponseCandidate | null {
    if (matchedNodes.length === 0) return null;
    
    // Find the most stable parent node
    let bestNode: UQRCNode | null = null;
    let bestStability = 0;
    
    for (const node of matchedNodes) {
      // Check parents for higher stability
      let current: UQRCNode | undefined = node;
      while (current) {
        if (current.stabilityWeight > bestStability) {
          bestStability = current.stabilityWeight;
          bestNode = current;
        }
        current = current.parentId ? this.store.getNode(current.parentId) : undefined;
      }
    }
    
    if (bestNode) {
      return {
        nodeIds: [bestNode.id],
        content: bestNode.content,
        score: bestStability,
        curvature: bestNode.curvatureSignature,
        isStable: true
      };
    }
    
    return null;
  }
  
  // Prune unstable nodes (for memory regulation)
  getUnstableNodes(): UQRCNode[] {
    const unstable: UQRCNode[] = [];
    const currentTime = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    for (const node of this.store.getAllNodes()) {
      // Low usage + old = potentially unstable
      const age = (currentTime - node.createdAt) / dayInMs;
      const usageScore = node.usageWeight / (age + 1);
      
      if (usageScore < 0.1 && node.stabilityWeight < 0.5) {
        unstable.push(node);
      }
    }
    
    return unstable;
  }
}

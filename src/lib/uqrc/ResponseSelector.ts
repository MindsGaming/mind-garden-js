// Module 5: Response Selector
// Walks the graph and returns stable output

import { MemoryStore } from './MemoryStore';
import { GeometricGraphEngine } from './GeometricGraphEngine';
import { UQRCOperatorEngine } from './UQRCOperatorEngine';
import { StabilityFilter } from './StabilityFilter';
import { ResponseCandidate, UQRCNode } from './types';

export class ResponseSelector {
  private store: MemoryStore;
  private graph: GeometricGraphEngine;
  private operator: UQRCOperatorEngine;
  private filter: StabilityFilter;
  
  constructor(
    store: MemoryStore,
    graph: GeometricGraphEngine,
    operator: UQRCOperatorEngine
  ) {
    this.store = store;
    this.graph = graph;
    this.operator = operator;
    this.filter = new StabilityFilter(store, operator);
  }
  
  // Main response generation method
  generateResponse(input: string): string {
    // Phase A: Dead state - if no knowledge, echo input
    if (this.store.getAllNodes().length === 0) {
      return input; // Echo what was said
    }
    
    // Find matching phrases
    const matches = this.graph.findMatchingPhrases(input);
    
    if (matches.length === 0) {
      // No matches - try to construct from known words
      return this.constructFromWords(input) || input;
    }
    
    // Build response candidates
    const candidates = this.buildCandidates(matches);
    
    // Filter for stability
    const stableCandidates = candidates.filter(c => this.filter.isStable(c));
    
    if (stableCandidates.length > 0) {
      // Return the highest scoring stable candidate
      stableCandidates.sort((a, b) => b.score - a.score);
      return stableCandidates[0].content;
    }
    
    // Fallback to most stable parent phrase
    const fallback = this.filter.getFallbackResponse(matches);
    if (fallback) {
      return fallback.content;
    }
    
    // Ultimate fallback: echo input (dead state behavior)
    return input;
  }
  
  // Build response candidates from matched nodes
  private buildCandidates(matches: UQRCNode[]): ResponseCandidate[] {
    const candidates: ResponseCandidate[] = [];
    
    for (const match of matches) {
      // Direct sequential response
      const nextPhrase = this.graph.getStrongestLink(match.id);
      if (nextPhrase) {
        candidates.push({
          nodeIds: [nextPhrase.id],
          content: nextPhrase.content,
          score: this.calculateScore(nextPhrase, match),
          curvature: nextPhrase.curvatureSignature,
          isStable: true
        });
      }
      
      // Chain response (multiple linked phrases)
      const chain = this.buildChain(match.id, 3);
      if (chain.length > 0) {
        const chainContent = chain.map(n => n.content).join(' ');
        const avgCurvature = chain.reduce((sum, n) => sum + n.curvatureSignature, 0) / chain.length;
        
        candidates.push({
          nodeIds: chain.map(n => n.id),
          content: chainContent,
          score: this.calculateChainScore(chain),
          curvature: avgCurvature,
          isStable: true
        });
      }
    }
    
    return candidates;
  }
  
  // Build a chain of linked phrases
  private buildChain(startId: string, maxLength: number): UQRCNode[] {
    const chain: UQRCNode[] = [];
    let currentId = startId;
    const visited = new Set<string>();
    
    for (let i = 0; i < maxLength; i++) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      
      const next = this.graph.getStrongestLink(currentId);
      if (!next || next.type !== 'phrase') break;
      
      chain.push(next);
      currentId = next.id;
    }
    
    return chain;
  }
  
  // Calculate score for a single response
  private calculateScore(response: UQRCNode, match: UQRCNode): number {
    // Base score from link strength
    const edges = this.store.getSequentialEdges(match.id);
    const edge = edges.find(e => e.toId === response.id);
    const linkStrength = edge?.strength || 0;
    
    // Stability bonus
    const stabilityBonus = response.stabilityWeight * 0.3;
    
    // Usage bonus
    const usageBonus = Math.min(response.usageWeight * 0.1, 0.3);
    
    // Curvature penalty (high curvature = less stable)
    const curvaturePenalty = Math.abs(response.curvatureSignature) * 0.1;
    
    return linkStrength + stabilityBonus + usageBonus - curvaturePenalty;
  }
  
  // Calculate score for a chain of responses
  private calculateChainScore(chain: UQRCNode[]): number {
    if (chain.length === 0) return 0;
    
    let totalScore = 0;
    for (let i = 0; i < chain.length; i++) {
      const node = chain[i];
      // Earlier nodes in chain get more weight
      const positionWeight = 1 - (i * 0.2);
      totalScore += node.stabilityWeight * positionWeight * node.usageWeight;
    }
    
    return totalScore / chain.length;
  }
  
  // Construct response from known words when no phrase matches
  private constructFromWords(input: string): string | null {
    const inputWords = input.toLowerCase().split(/\s+/);
    const knownWords: string[] = [];
    
    for (const word of inputWords) {
      const wordNode = this.store.findNodeByContent(word);
      if (wordNode) {
        knownWords.push(wordNode.content);
      }
    }
    
    if (knownWords.length === 0) return null;
    
    // Return known words in their original form
    return knownWords.join(' ');
  }
}

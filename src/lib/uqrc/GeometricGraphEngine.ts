// Module 4: Geometric Graph Engine
// Builds phrase relationships and manages parent-child hierarchies

import { MemoryStore } from './MemoryStore';
import { UQRCNode } from './types';

export class GeometricGraphEngine {
  private store: MemoryStore;
  
  constructor(store: MemoryStore) {
    this.store = store;
  }
  
  // Process input text into nodes and relationships
  processInput(input: string): UQRCNode[] {
    const trimmed = input.trim();
    if (!trimmed) return [];
    
    const createdNodes: UQRCNode[] = [];
    
    // Create phrase node for the full input
    const phraseNode = this.store.createNode(trimmed, 'phrase');
    createdNodes.push(phraseNode);
    
    // Tokenize into words and punctuation
    const tokens = this.tokenize(trimmed);
    
    let previousWordNode: UQRCNode | null = null;
    
    for (const token of tokens) {
      const type = this.isWord(token) ? 'word' : 'punctuation';
      const wordNode = this.store.createNode(token, type);
      createdNodes.push(wordNode);
      
      // Link word to parent phrase
      this.store.createEdge(phraseNode.id, wordNode.id, false);
      
      // Link sequential words
      if (previousWordNode) {
        this.store.createEdge(previousWordNode.id, wordNode.id, true);
      }
      
      previousWordNode = wordNode;
    }
    
    // Find parent phrases (shorter versions)
    this.establishParenthood(phraseNode);
    
    return createdNodes;
  }
  
  // Process a prompt-response pair
  processTrainingPair(prompt: string, response: string): void {
    const promptNodes = this.processInput(prompt);
    const responseNodes = this.processInput(response);
    
    // Link prompt phrase to response phrase (sequential learning)
    if (promptNodes.length > 0 && responseNodes.length > 0) {
      const promptPhrase = promptNodes.find(n => n.type === 'phrase');
      const responsePhrase = responseNodes.find(n => n.type === 'phrase');
      
      if (promptPhrase && responsePhrase) {
        this.store.createEdge(promptPhrase.id, responsePhrase.id, true);
      }
    }
  }
  
  // Tokenize text into words and punctuation
  private tokenize(text: string): string[] {
    // Split on word boundaries, keeping punctuation as separate tokens
    const tokens: string[] = [];
    let current = '';
    
    for (const char of text) {
      if (this.isPunctuation(char)) {
        if (current) {
          tokens.push(current);
          current = '';
        }
        tokens.push(char);
      } else if (char === ' ') {
        if (current) {
          tokens.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }
    
    if (current) {
      tokens.push(current);
    }
    
    return tokens;
  }
  
  private isWord(token: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(token);
  }
  
  private isPunctuation(char: string): boolean {
    return /[.,!?;:'"()\-]/.test(char);
  }
  
  // Establish parent-child relationships based on phrase containment
  private establishParenthood(newPhrase: UQRCNode): void {
    const allPhrases = this.store.getPhraseNodes();
    const content = newPhrase.content.toLowerCase();
    
    for (const existing of allPhrases) {
      if (existing.id === newPhrase.id) continue;
      
      const existingContent = existing.content.toLowerCase();
      
      // If new phrase contains existing phrase, existing is parent
      if (content.includes(existingContent) && content !== existingContent) {
        if (!newPhrase.parentId) {
          // Find the longest parent (most specific)
          const currentParent = this.store.getNode(newPhrase.parentId || '');
          if (!currentParent || existingContent.length > currentParent.content.length) {
            newPhrase.parentId = existing.id;
            existing.childIds.push(newPhrase.id);
            this.store.createEdge(existing.id, newPhrase.id, false);
          }
        }
      }
      
      // If existing phrase contains new phrase, new is child of existing
      if (existingContent.includes(content) && content !== existingContent) {
        if (!existing.childIds.includes(newPhrase.id)) {
          existing.childIds.push(newPhrase.id);
          newPhrase.parentId = existing.id;
          this.store.createEdge(existing.id, newPhrase.id, false);
        }
      }
    }
  }
  
  // Get the strongest linked phrase from a given phrase
  getStrongestLink(fromNodeId: string): UQRCNode | null {
    const edges = this.store.getSequentialEdges(fromNodeId);
    if (edges.length === 0) return null;
    
    // Sort by strength, respecting parent dominance
    edges.sort((a, b) => {
      const nodeA = this.store.getNode(a.toId);
      const nodeB = this.store.getNode(b.toId);
      
      if (!nodeA || !nodeB) return b.strength - a.strength;
      
      // Parent dominance: parent nodes get priority
      const parentBonusA = nodeA.parentId === fromNodeId ? 0 : 0.5;
      const parentBonusB = nodeB.parentId === fromNodeId ? 0 : 0.5;
      
      const scoreA = a.strength + parentBonusA + nodeA.stabilityWeight * 0.2;
      const scoreB = b.strength + parentBonusB + nodeB.stabilityWeight * 0.2;
      
      return scoreB - scoreA;
    });
    
    return this.store.getNode(edges[0].toId) || null;
  }
  
  // Find matching phrases for input
  findMatchingPhrases(input: string): UQRCNode[] {
    const normalized = input.toLowerCase().trim();
    const matches: Array<{ node: UQRCNode; score: number }> = [];
    
    for (const phrase of this.store.getPhraseNodes()) {
      const phraseContent = phrase.content.toLowerCase();
      
      // Exact match
      if (phraseContent === normalized) {
        matches.push({ node: phrase, score: 1.0 });
        continue;
      }
      
      // Substring match
      if (phraseContent.includes(normalized) || normalized.includes(phraseContent)) {
        const overlap = Math.min(phraseContent.length, normalized.length) / 
                       Math.max(phraseContent.length, normalized.length);
        matches.push({ node: phrase, score: overlap });
        continue;
      }
      
      // Word overlap
      const inputWords = new Set(normalized.split(/\s+/));
      const phraseWords = phrase.content.toLowerCase().split(/\s+/);
      let wordMatches = 0;
      
      for (const word of phraseWords) {
        if (inputWords.has(word)) wordMatches++;
      }
      
      if (wordMatches > 0) {
        const score = wordMatches / Math.max(inputWords.size, phraseWords.length);
        matches.push({ node: phrase, score: score * 0.5 });
      }
    }
    
    return matches
      .sort((a, b) => b.score - a.score)
      .map(m => m.node);
  }
  
  // Get parent chain for a node (for dominance checking)
  getParentChain(nodeId: string): UQRCNode[] {
    const chain: UQRCNode[] = [];
    let current = this.store.getNode(nodeId);
    
    while (current && current.parentId) {
      const parent = this.store.getNode(current.parentId);
      if (parent) {
        chain.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    
    return chain;
  }
  
  // Check if nodeA dominates nodeB (is a parent or has higher weight)
  dominates(nodeAId: string, nodeBId: string): boolean {
    const parentChain = this.getParentChain(nodeBId);
    return parentChain.some(p => p.id === nodeAId);
  }
}

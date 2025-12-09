// UQRC-LLM Core Types

export interface UQRCNode {
  id: string;
  content: string;
  type: 'word' | 'phrase' | 'punctuation';
  
  // Spectral weights
  lengthWeight: number;
  charIndexWeight: number;
  stabilityWeight: number;
  usageWeight: number;
  
  // Field properties
  curvatureSignature: number;
  fieldValue: number;
  
  // Relationships
  parentId: string | null;
  childIds: string[];
  linkStrengths: Map<string, number>;
  
  // Metadata
  createdAt: number;
  lastUsedAt: number;
}

export interface UQRCEdge {
  fromId: string;
  toId: string;
  strength: number;
  curvature: number;
  isSequential: boolean; // true if "from" was followed by "to" in input
}

export interface FieldState {
  u: number; // scalar field value
  gradients: number[]; // discrete gradients
  curvature: number; // current curvature [D_μ, D_ν]
  stability: number; // second-gradient stability measure
}

export interface UQRCConfig {
  nu: number; // smoothing coefficient
  lambda: number; // stability coefficient
  minLengthThreshold: number;
  curvatureThreshold: number;
  stabilityThreshold: number;
}

export interface GraphState {
  nodes: Map<string, UQRCNode>;
  edges: UQRCEdge[];
  fieldState: FieldState;
  config: UQRCConfig;
}

export interface ResponseCandidate {
  nodeIds: string[];
  content: string;
  score: number;
  curvature: number;
  isStable: boolean;
}

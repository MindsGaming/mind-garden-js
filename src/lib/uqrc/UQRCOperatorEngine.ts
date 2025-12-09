// Module 3: UQRC Operator Engine
// Handles Δu, ℛu, L_Su, Dμ, ∇μ∇νS

import { FieldState, UQRCConfig, UQRCNode } from './types';

export class UQRCOperatorEngine {
  private config: UQRCConfig;
  
  constructor(config: UQRCConfig) {
    this.config = config;
  }
  
  // Discrete Derivative Operator: D_μ u = u(x+1) - u(x)
  discreteDerivative(values: number[]): number[] {
    if (values.length < 2) return [0];
    
    const derivatives: number[] = [];
    for (let i = 0; i < values.length - 1; i++) {
      derivatives.push(values[i + 1] - values[i]);
    }
    return derivatives;
  }
  
  // Curvature: [D_μ, D_ν] = F_μν
  // Commutator of derivatives (should remain near zero for smooth evolution)
  calculateCurvature(fieldValues: number[]): number {
    if (fieldValues.length < 3) return 0;
    
    const d1 = this.discreteDerivative(fieldValues);
    const d2 = this.discreteDerivative(d1);
    
    // Curvature is the magnitude of second derivatives
    return d2.reduce((sum, val) => sum + Math.abs(val), 0) / Math.max(d2.length, 1);
  }
  
  // Laplacian Smoothing: Δu
  laplacianSmoothing(fieldValue: number, neighbors: number[]): number {
    if (neighbors.length === 0) return 0;
    
    const avgNeighbor = neighbors.reduce((sum, n) => sum + n, 0) / neighbors.length;
    return avgNeighbor - fieldValue;
  }
  
  // Curvature Influence: ℛu (Ricci-like term)
  curvatureInfluence(node: UQRCNode, neighborCurvatures: number[]): number {
    if (neighborCurvatures.length === 0) return 0;
    
    const avgCurvature = neighborCurvatures.reduce((sum, c) => sum + c, 0) / neighborCurvatures.length;
    return node.curvatureSignature * avgCurvature;
  }
  
  // Linguistic Stability Term: L_S u
  linguisticStability(node: UQRCNode): number {
    // Higher usage and stability = higher linguistic stability
    return node.usageWeight * node.stabilityWeight * 0.1;
  }
  
  // Second-Gradient Stability: ∇_μ ∇_ν S(u)
  // Prevents runaway learning
  secondGradientStability(stabilityHistory: number[]): number {
    if (stabilityHistory.length < 3) return 0;
    
    const d1 = this.discreteDerivative(stabilityHistory);
    const d2 = this.discreteDerivative(d1);
    
    // Return the magnitude of second gradient
    return d2.reduce((sum, val) => sum + val * val, 0) / Math.max(d2.length, 1);
  }
  
  // Main Evolution Operator: 𝒪_UQRC(u) = νΔu + ℛu + L_S u
  evolve(
    node: UQRCNode,
    neighborFieldValues: number[],
    neighborCurvatures: number[]
  ): number {
    const laplacian = this.laplacianSmoothing(node.fieldValue, neighborFieldValues);
    const ricci = this.curvatureInfluence(node, neighborCurvatures);
    const linguistic = this.linguisticStability(node);
    
    // 𝒪_UQRC(u) = νΔu + ℛu + L_S u
    return (
      this.config.nu * laplacian +
      ricci +
      linguistic
    );
  }
  
  // Full field update: u(t+1) = u(t) + 𝒪_UQRC(u) + Σ D_μu + λ ∇_μ∇_ν S(u)
  updateField(
    currentState: FieldState,
    node: UQRCNode,
    neighborFieldValues: number[],
    neighborCurvatures: number[],
    stabilityHistory: number[]
  ): FieldState {
    const evolution = this.evolve(node, neighborFieldValues, neighborCurvatures);
    const derivativeSum = currentState.gradients.reduce((sum, g) => sum + g, 0);
    const secondGradient = this.secondGradientStability(stabilityHistory);
    
    // u(t+1) = u(t) + 𝒪_UQRC(u) + Σ D_μu + λ ∇_μ∇_ν S(u)
    const newU = currentState.u + evolution + derivativeSum + this.config.lambda * secondGradient;
    
    // Update gradients
    const newGradients = [...currentState.gradients, newU - currentState.u].slice(-10);
    
    // Update curvature
    const newCurvature = this.calculateCurvature([...currentState.gradients.map((_, i) => i), newU]);
    
    // Update stability
    const newStability = 1 / (1 + Math.abs(secondGradient));
    
    return {
      u: newU,
      gradients: newGradients,
      curvature: newCurvature,
      stability: newStability
    };
  }
  
  // Check if curvature is within acceptable bounds
  isCurvatureStable(curvature: number): boolean {
    return Math.abs(curvature) < this.config.curvatureThreshold;
  }
  
  // Check if stability is acceptable
  isStable(stability: number): boolean {
    return stability > this.config.stabilityThreshold;
  }
}

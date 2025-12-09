// Module 2: Spectral Weight Engine
// Processes words into numerical weight vectors

export class SpectralWeightEngine {
  
  // Calculate length weight based on word length
  calculateLengthWeight(content: string): number {
    const len = content.length;
    // Normalize: longer words get slightly higher weight, capped
    return Math.min(len / 10, 1.0);
  }
  
  // Calculate character index weight (positional encoding)
  calculateCharIndexWeight(content: string): number {
    if (content.length === 0) return 0;
    
    // Sum of normalized character codes
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      const code = content.charCodeAt(i);
      // Normalize to 0-1 range (assuming ASCII/UTF-8 common chars)
      sum += (code % 128) / 128;
    }
    return sum / content.length;
  }
  
  // Stability weight starts at 1.0 and is adjusted by UQRC operators
  calculateInitialStabilityWeight(): number {
    return 1.0;
  }
  
  // Usage weight starts at 1 (first use)
  calculateInitialUsageWeight(): number {
    return 1.0;
  }
  
  // Compute total spectral weight for a node
  computeTotalWeight(
    lengthWeight: number,
    charIndexWeight: number,
    stabilityWeight: number,
    usageWeight: number
  ): number {
    // Weighted combination with parent-dominance bias
    return (
      lengthWeight * 0.2 +
      charIndexWeight * 0.1 +
      stabilityWeight * 0.4 +
      usageWeight * 0.3
    );
  }
  
  // Calculate curvature signature for a node
  calculateCurvatureSignature(content: string): number {
    // Simple hash-based signature for geometric placement
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0;
    }
    // Normalize to [-1, 1] range
    return Math.tanh(hash / 1000000);
  }
  
  // Calculate spectral similarity between two nodes
  calculateSimilarity(
    weights1: { lengthWeight: number; charIndexWeight: number; curvatureSignature: number },
    weights2: { lengthWeight: number; charIndexWeight: number; curvatureSignature: number }
  ): number {
    const lengthDiff = Math.abs(weights1.lengthWeight - weights2.lengthWeight);
    const charDiff = Math.abs(weights1.charIndexWeight - weights2.charIndexWeight);
    const curveDiff = Math.abs(weights1.curvatureSignature - weights2.curvatureSignature);
    
    // Inverse of distance = similarity
    const distance = Math.sqrt(lengthDiff ** 2 + charDiff ** 2 + curveDiff ** 2);
    return 1 / (1 + distance);
  }
}

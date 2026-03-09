export interface SlotOption {
  slotId: string;
  mode: 'RAIL' | 'ROAD';
  availableCapacity: number;
  etaHours: number;
}

export interface SlotRecommendation {
  slotId: string;
  score: number;
  rationale: string;
}

export const recommendSlots = (options: SlotOption[]): SlotRecommendation[] =>
  [...options]
    .map((option) => {
      const capacityScore = Math.min(option.availableCapacity / 10, 1) * 60;
      const etaScore = Math.max(0, 24 - option.etaHours) * 1.5;
      const score = Number((capacityScore + etaScore).toFixed(2));

      return {
        slotId: option.slotId,
        score,
        rationale: `mode=${option.mode},capacity=${option.availableCapacity},eta=${option.etaHours}`,
      };
    })
    .sort((a, b) => b.score - a.score);

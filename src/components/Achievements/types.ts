export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  unlocked: boolean;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: string;
}

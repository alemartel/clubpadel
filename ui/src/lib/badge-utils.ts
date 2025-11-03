/**
 * Badge utility functions for consistent badge variant mapping
 * Used across MyTeams and AdminTeams components
 */

export const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (level) {
    case "1": return "outline";
    case "2": return "outline";
    case "3": return "outline";
    case "4": return "outline";
    default: return "outline";
  }
};

export const getGenderBadgeVariant = (gender: string): "default" | "secondary" | "outline" => {
  switch (gender) {
    case "male": return "outline";
    case "female": return "outline";
    case "mixed": return "outline";
    default: return "outline";
  }
};

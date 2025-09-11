/**
 * Badge utility functions for consistent badge variant mapping
 * Used across MyTeams, AdminGroups, and AdminTeams components
 */

export const getLevelBadgeVariant = (level: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (level) {
    case "1": return "default";
    case "2": return "secondary";
    case "3": return "destructive";
    case "4": return "outline";
    default: return "default";
  }
};

export const getGenderBadgeVariant = (gender: string): "default" | "secondary" | "outline" => {
  switch (gender) {
    case "male": return "default";
    case "female": return "secondary";
    case "mixed": return "outline";
    default: return "default";
  }
};

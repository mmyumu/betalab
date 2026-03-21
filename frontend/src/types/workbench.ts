export type ToolbarAccent = "amber" | "emerald" | "rose" | "sky";

export type ToolbarItem = {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: ToolbarAccent;
};

export type ToolbarCategory = {
  id: string;
  label: string;
  description: string;
  items: ToolbarItem[];
};

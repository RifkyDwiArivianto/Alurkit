import {
  Braces,
  Flag,
  GitBranch,
  Play,
  Shuffle,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { NodeKind } from "./types";

export const NODE_ICONS: Record<NodeKind, LucideIcon> = {
  start: Play,
  setValue: Braces,
  transform: Shuffle,
  condition: GitBranch,
  delay: Timer,
  output: Flag,
};

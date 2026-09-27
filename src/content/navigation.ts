export interface WorkSpace {
  id: string;
  num: string;
  label: string;
  path: string;
}

export const workspaces: WorkSpace[] = [
  { id: "home", num: "1", label: "home", path: "~" },
  { id: "projects", num: "2", label: "projects", path: "~/projects" },
  { id: "research", num: "3", label: "research", path: "~/research" },
  { id: "oss", num: "4", label: "oss", path: "~/oss" },
  { id: "about", num: "5", label: "about", path: "~/about" },
  { id: "notes", num: "6", label: "notes", path: "~/notes" },
  { id: "contact", num: "7", label: "contact", path: "~/contact" },
  { id: "ai", num: "8", label: "ai", path: "~/ai" },
];

export interface TreeNode {
  name: string;
  kind: "dir" | "file";
  target?: string; // workspace id or project slug
  children?: TreeNode[];
}

export const tree: TreeNode[] = [
  {
    name: "projects",
    kind: "dir",
    target: "projects",
    children: [
      { name: "ice", kind: "dir", target: "ice" },
      { name: "nexus", kind: "dir", target: "nexus" },
      { name: "presentation-forge", kind: "dir", target: "presentation-forge" },
      { name: "timetable-generator", kind: "dir", target: "timetable-generator" },
      { name: "prompt-routing-classifier", kind: "dir", target: "prompt-routing-classifier" },
      { name: "archive", kind: "dir", target: "projects" },
    ],
  },
  {
    name: "research",
    kind: "dir",
    target: "research",
    children: [
      { name: "papers", kind: "dir", target: "research" },
      { name: "experiments", kind: "dir", target: "research" },
      { name: "timeline.log", kind: "file", target: "research" },
    ],
  },
  {
    name: "oss",
    kind: "dir",
    target: "oss",
    children: [
      { name: "merged", kind: "dir", target: "oss" },
      { name: "open", kind: "dir", target: "oss" },
    ],
  },
  {
    name: "about",
    kind: "dir",
    target: "about",
    children: [
      { name: "README.md", kind: "file", target: "about" },
      { name: "now.md", kind: "file", target: "about" },
      { name: "stack.toml", kind: "file", target: "about" },
      { name: "timeline.log", kind: "file", target: "about" },
    ],
  },
  { name: "notes", kind: "dir", target: "notes" },
  { name: "contact.json", kind: "file", target: "contact" },
  { name: "resume.md", kind: "file", target: "about" },
];

// GitHub achievements — user-confirmed earned badges (Sep 2026).
// Pull Shark ×2 and Pair Extraordinaire are kept from explicit user
// confirmation even when GitHub's public UI/API doesn't surface them.
export interface Achievement {
  slug: string;
  name: string;
  tier?: string;
  img: string;
  meaning: string;
}

export const achievements: Achievement[] = [
  {
    slug: "quickdraw",
    name: "Quickdraw",
    img: "/achievements/quickdraw.png",
    meaning: "Closed an issue or pull request within 5 minutes of opening it.",
  },
  {
    slug: "yolo",
    name: "YOLO",
    img: "/achievements/yolo.png",
    meaning: "Merged a pull request without review.",
  },
  {
    slug: "galaxy-brain",
    name: "Galaxy Brain",
    img: "/achievements/galaxy-brain.png",
    meaning: "Accepted answers on public discussions.",
  },
  {
    slug: "pull-shark",
    name: "Pull Shark",
    tier: "×2",
    img: "/achievements/pull-shark-x2.png",
    meaning: "Merged pull requests — bronze tier (×2).",
  },
  {
    slug: "pair-extraordinaire",
    name: "Pair Extraordinaire",
    img: "/achievements/pair-extraordinaire.png",
    meaning: "Co-authored commits in a merged pull request.",
  },
];

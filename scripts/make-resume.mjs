// Builds public/resume/Deepesh_Sonar_CV.pdf from src/content/*.
// Sanitized by construction: only email + public links, no phone/address/IDs.
import PDFDocument from "pdfkit";
import { createWriteStream, mkdirSync } from "node:fs";
import { profile } from "../src/content/profile.ts";
import { projects } from "../src/content/projects.ts";
import { papers } from "../src/content/research.ts";
import { prs } from "../src/content/oss.ts";

mkdirSync(new URL("../public/resume", import.meta.url), { recursive: true });
const doc = new PDFDocument({ margin: 48, size: "A4" });
doc.pipe(createWriteStream(new URL("../public/resume/Deepesh_Sonar_CV.pdf", import.meta.url)));

const H = (t) => { doc.moveDown(0.8).fontSize(11).font("Helvetica-Bold").fillColor("#1a1c26").text(t.toUpperCase()); doc.moveDown(0.2); };
const B = (t) => doc.fontSize(9.5).font("Helvetica").fillColor("#33343e").text(t);
const BI = (t) => doc.fontSize(9.5).font("Helvetica").fillColor("#33343e").text(`•  ${t}`);

doc.fontSize(20).font("Helvetica-Bold").fillColor("#14161f").text(profile.name);
doc.fontSize(10).font("Helvetica").fillColor("#55586e")
  .text(`${profile.tagline} · Mumbai, India`);
doc.text(`18deepnar@gmail.com · ${profile.links.github} · ${profile.links.linkedin} · ${profile.links.orcid}`);

H("Education");
B(`${profile.education.degree}, ${profile.education.school} — expected ${profile.education.expected} · CGPA ${profile.education.cgpa}`);

H("Flagship projects");
for (const p of projects.filter((p) => p.flagship)) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#14161f").text(`${p.name} (${p.period}) — ${p.status}`);
  B(p.blurb);
  for (const e of p.evidence.slice(0, 3)) BI(e);
}

H("Research");
for (const p of papers) {
  doc.fontSize(10).font("Helvetica-Bold").text(p.title);
  B(`${p.venue}${p.id ? ` · arXiv:${p.id}` : ""} — ${p.note} ${p.url}`);
}

H("Merged upstream");
for (const p of prs.filter((p) => p.state === "merged")) BI(`${p.repo} — ${p.title} (${p.url})`);

H("Team work (my lane)");
B("SIH 2025 ×2 rounds · DIPEX 2026 state final · NEXUS (merged: fraud/message/URL heads, txn flows, AI-provider console) · RapidRail (core: booking, wallet, QR tickets) · IIS-mini (Person-1 classical baselines).");

H("Stack");
B(profile.stack.join(" · "));

doc.end();
console.log("resume pdf written");

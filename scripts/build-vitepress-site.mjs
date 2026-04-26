import { mkdir, readdir, readFile, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");

const siteDir = path.resolve(webRoot, process.env.SITE_DIR || "site");
const siteBase = normalizeBase(process.env.SITE_BASE || "/");
const siteBasePrefix = siteBase === "/" ? "" : siteBase.slice(0, -1);
const industrySourceDir = path.resolve(
  repoRoot,
  process.env.INDUSTRY_MD_DIR || "code/report/md_reports"
);
const stockSourceDir = path.resolve(
  repoRoot,
  process.env.STOCK_MD_DIR || "code/report/custom_stock_md_reports"
);

async function ensureDir(target) {
  await mkdir(target, { recursive: true });
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function normalizeBase(value) {
  const trimmed = (value || "/").trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

function extractDate(fileName) {
  const match = fileName.match(/^(\d{4}-\d{2}-\d{2})_/);
  return match ? match[1] : null;
}

function sortReportsDesc(a, b) {
  return b.date.localeCompare(a.date);
}

function buildPageContent({ sourceContent, downloadPath, sectionLabel, date }) {
  return `---
title: ${date}
outline: deep
---

> 类型：${sectionLabel}
> 下载原始 Markdown：<a href="${downloadPath}" download target="_blank" rel="noreferrer">点击下载</a>

${sourceContent.trim()}
`;
}

function buildLatestList(sectionTitle, items) {
  if (items.length === 0) {
    return `## ${sectionTitle}\n\n暂无报告。\n`;
  }

  return [
    `## ${sectionTitle}`,
    "",
    `最新：[\`${items[0].date}\`](${items[0].link})`,
    "",
    ...items.slice(0, 12).map((item) => `- [${item.date}](${item.link})`),
    ""
  ].join("\n");
}

async function collectReports({
  sourceDir,
  outputDirName,
  downloadsDirName,
  fileSuffix,
  sectionTitle
}) {
  const sourceExists = await exists(sourceDir);
  const outputDir = path.join(siteDir, outputDirName);
  const downloadsDir = path.join(siteDir, "public", "downloads", downloadsDirName);

  await rm(outputDir, { recursive: true, force: true });
  await rm(downloadsDir, { recursive: true, force: true });
  await ensureDir(outputDir);
  await ensureDir(downloadsDir);

  if (!sourceExists) {
    return [];
  }

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const reports = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(fileSuffix))
    .map((entry) => {
      const date = extractDate(entry.name);
      return date ? { name: entry.name, date } : null;
    })
    .filter(Boolean)
    .sort(sortReportsDesc);

  const items = [];

  for (const report of reports) {
    const sourcePath = path.join(sourceDir, report.name);
    const targetPagePath = path.join(outputDir, `${report.date}.md`);
    const targetDownloadPath = path.join(downloadsDir, `${report.date}.md`);
    const targetDownloadCleanPath = path.join(downloadsDir, report.date);
    const downloadLink = `${siteBasePrefix}/downloads/${downloadsDirName}/${report.date}.md`;
    const sourceContent = await readFile(sourcePath, "utf8");

    await copyFile(sourcePath, targetDownloadPath);
    await copyFile(sourcePath, targetDownloadCleanPath);
    await writeFile(
      targetPagePath,
      buildPageContent({
        sourceContent,
        downloadPath: downloadLink,
        sectionLabel: sectionTitle,
        date: report.date
      }),
      "utf8"
    );

    items.push({
      text: report.date,
      link: `/${outputDirName}/${report.date}`,
      date: report.date
    });
  }

  return items;
}

async function writeSidebar(industryItems, stockItems) {
  const sidebarPath = path.join(siteDir, ".vitepress", "sidebar.generated.mjs");
  await ensureDir(path.dirname(sidebarPath));
  const content = `export const industrySidebar = ${JSON.stringify(
    [
      {
        text: "板块日报",
        collapsed: false,
        items: industryItems.map(({ text, link }) => ({ text, link }))
      }
    ],
    null,
    2
  )};

export const stockSidebar = ${JSON.stringify(
    [
      {
        text: "个股日报",
        collapsed: false,
        items: stockItems.map(({ text, link }) => ({ text, link }))
      }
    ],
    null,
    2
  )};
`;
  await writeFile(sidebarPath, content, "utf8");
}

async function writeHomePage(industryItems, stockItems) {
  const indexPath = path.join(siteDir, "index.md");
  const content = `---
layout: home
hero:
  name: Trend Detect Reports
  text: 每日板块与个股 Markdown 报告
  tagline: GitHub Pages + VitePress 自动展示
  actions:
    - theme: brand
      text: 查看板块日报
      link: ${industryItems[0]?.link || "/industry/"}
    - theme: alt
      text: 查看个股日报
      link: ${stockItems[0]?.link || "/stocks/"}
---

${buildLatestList("板块日报", industryItems)}

${buildLatestList("个股日报", stockItems)}
`;
  await writeFile(indexPath, content, "utf8");
}

async function main() {
  await ensureDir(siteDir);

  const industryItems = await collectReports({
    sourceDir: industrySourceDir,
    outputDirName: "industry",
    downloadsDirName: "industry",
    fileSuffix: "_industry_report.md",
    sectionTitle: "板块日报"
  });

  const stockItems = await collectReports({
    sourceDir: stockSourceDir,
    outputDirName: "stocks",
    downloadsDirName: "stocks",
    fileSuffix: "_custom_stock_report.md",
    sectionTitle: "个股日报"
  });

  await writeSidebar(industryItems, stockItems);
  await writeHomePage(industryItems, stockItems);

  console.log("Prepared VitePress content:");
  console.log(`- industry reports: ${industryItems.length}`);
  console.log(`- stock reports: ${stockItems.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

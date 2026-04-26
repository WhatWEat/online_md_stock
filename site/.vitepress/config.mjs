import { industrySidebar, stockSidebar } from "./sidebar.generated.mjs";

function normalizeBase(value) {
  const trimmed = (value || "/").trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withoutSpaces = trimmed.replace(/\s+/g, "");
  const withLeadingSlash = withoutSpaces.startsWith("/") ? withoutSpaces : `/${withoutSpaces}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

const siteBase = normalizeBase(process.env.SITE_BASE);

export default {
  base: siteBase,
  title: "Trend Detect Reports",
  description: "每日板块与个股 Markdown 报告",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    siteTitle: "Trend Detect Reports",
    nav: [
      { text: "首页", link: "/" },
      { text: "板块日报", link: "/industry/" },
      { text: "个股日报", link: "/stocks/" }
    ],
    sidebar: {
      "/industry/": industrySidebar,
      "/stocks/": stockSidebar
    },
    socialLinks: [{ icon: "github", link: "https://github.com/" }]
  }
};

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const __dirname = dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(readFileSync(join(__dirname, "repo.json"), "utf8"));
assert.equal(manifest.extensions.length, 1);
assert.equal(manifest.extensions[0].id, "marmota");
assert.equal(manifest.extensions[0].contentType, "comics");
assert.ok(manifest.extensions[0].scriptUrl.endsWith("/marmota.js"));

const script = readFileSync(join(__dirname, "marmota.js"), "utf8");

const searchHtml = `
<html>
  <body>
    <article class="page-item-detail manga">
      <a href="https://marmota.me/comic/the-spectacular-spider-men-2024/">
        <img alt="The Spectacular Spider-Men (2024)" src="https://marmota.me/wp-content/uploads/2026/01/spider-cover.webp">
      </a>
      <h3><a href="/comic/the-spectacular-spider-men-2024/">The Spectacular Spider-Men (2024)</a></h3>
      <a href="/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/">Latest issue</a>
    </article>
  </body>
</html>`;

const detailsHtml = `
<html>
  <head>
    <meta property="og:title" content="The Spectacular Spider-Men (2024) - Marmota">
    <meta property="og:image" content="https://marmota.me/wp-content/uploads/2026/01/spider-cover.webp">
    <meta property="og:description" content="Peter Parker and Miles Morales share trouble in New York.">
  </head>
  <body>
    <h1>The Spectacular Spider-Men (2024)</h1>
    <dl>
      <dt>Autor:</dt><dd>Greg Weisman</dd>
      <dt>Estado:</dt><dd>En curso</dd>
    </dl>
    <a href="/genero/marvel/">Marvel</a>
    <ul class="main version-chap">
      <li><a href="/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/">The Spectacular Spider-Men 7</a></li>
      <li><a href="/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-1/">The Spectacular Spider-Men 1</a></li>
    </ul>
  </body>
</html>`;

const dynamicDetailsHtml = `
<html>
  <body class="post-4321">
    <h1>Dynamic Comic</h1>
    <input type="hidden" id="wp-manga-current-post" value="4321">
    <script>
      window.manga = {"ajax_url":"https:\/\/marmota.me\/wp-admin\/admin-ajax.php"};
    </script>
    <div class="listing-chapters_wrap"></div>
  </body>
</html>`;

const dynamicAjaxHtml = `
<ul class="main version-chap">
  <li><a href="chapter-2/">Chapter 2</a></li>
  <li><a href="/comic/dynamic-comic/chapter-1/">Chapter 1</a></li>
</ul>`;

const absoluteDetailsHtml = `
<html>
  <body>
    <h1>Absolute Batman (2024)</h1>
    <a href="#" class="wp-manga-action-button">Toggle</a>
    <a href="javascript:;" class="wp-manga-action-button">Reader action</a>
    <p>Absolute Batman is listed publicly, but no chapter anchors are rendered here.</p>
  </body>
</html>`;

const absoluteIssueHtml = (number) => `
<html>
  <head>
    <title>Absolute Batman (2024) - Marmota Comics</title>
    <link rel="canonical" href="https://marmota.me/comic/absolute-batman-2024/absolute-batman-${number}/">
  </head>
  <body>
    <h1>Absolute Batman (2024)</h1>
    <a class="btn next_page" href="/comic/absolute-batman-2024/absolute-batman-${number + 1}/"> Next </a>
    <img class="wp-manga-chapter-img img-responsive lazyload" data-src="https://marmota.me/wp-content/uploads/WP-manga/data/absolute-batman/${number}/001.jpg">
  </body>
</html>`;

const chapterHtml = `
<html>
  <body>
    <img class="site-logo" src="https://marmota.me/wp-content/uploads/logo.png" width="120" height="40">
    <img class="cover" src="https://marmota.me/wp-content/uploads/2026/01/spider-cover.webp" width="320" height="480">
    <div class="reading-content">
      <div class="page-break"><img class="wp-manga-chapter-img" data-src="https://marmota.me/wp-content/uploads/WP-manga/data/spider/007/001.webp" width="1200" height="1800"></div>
      <div class="page-break"><img class="wp-manga-chapter-img" srcset="https://marmota.me/wp-content/uploads/WP-manga/data/spider/007/002-small.webp 600w, https://marmota.me/wp-content/uploads/WP-manga/data/spider/007/002.webp 1200w" width="1200" height="1800"></div>
    </div>
  </body>
</html>`;

const cinderAPI = {
  async fetch(url, options = {}) {
    if (options.method === "POST" && url.endsWith("/wp-admin/admin-ajax.php")) {
      if (String(options.body || "").includes("manga_get_chapters") && String(options.body || "").includes("4321")) {
        return { status: 200, data: dynamicAjaxHtml, headers: {} };
      }
      return { status: 404, data: "", headers: {} };
    }
    if (url.includes("?s=spider")) return { status: 200, data: searchHtml, headers: {} };
    if (url.endsWith("/comic/the-spectacular-spider-men-2024/")) return { status: 200, data: detailsHtml, headers: {} };
    if (url.endsWith("/comic/dynamic-comic/")) return { status: 200, data: dynamicDetailsHtml, headers: {} };
    if (url.endsWith("/comic/absolute-batman-2024/")) return { status: 200, data: absoluteDetailsHtml, headers: {} };
    const absoluteMatch = url.match(/\/comic\/absolute-batman-2024\/absolute-batman-([0-9]+)\//);
    if (absoluteMatch) {
      const issueNumber = Number(absoluteMatch[1]);
      if (issueNumber >= 1 && issueNumber <= 3) {
        return { status: 200, data: absoluteIssueHtml(issueNumber), headers: {} };
      }
    }
    if (url.endsWith("/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/")) {
      return { status: 200, data: chapterHtml, headers: {} };
    }
    if (url === "https://marmota.me/" || url.includes("m_orderby=views")) return { status: 200, data: searchHtml, headers: {} };
    return { status: 404, data: "", headers: {} };
  },
  parseHTML() {
    return null;
  },
  store: {
    async get() { return null; },
    async set() {},
    async delete() {},
  },
  secureStore: {
    async get() { return null; },
    async set() {},
    async delete() {},
  },
  log: console.log.bind(console, "[marmota]"),
  warn: console.warn.bind(console, "[marmota]"),
  error: console.error.bind(console, "[marmota]"),
  __JSON: JSON,
  __encodeURIComponent: encodeURIComponent,
  __decodeURIComponent: decodeURIComponent,
  __encodeURI: encodeURI,
  __decodeURI: decodeURI,
  __atob: atob,
  __btoa: btoa,
  __parseInt: parseInt,
  __parseFloat: parseFloat,
  __setTimeout: setTimeout,
};

const factory = new Function(
  "cinder",
  "require", "process", "global", "globalThis", "__DEV__",
  "XMLHttpRequest", "WebSocket", "setInterval", "importScripts",
  `
  "use strict";
  var __cinderExport = undefined;
  var JSON = cinder.__JSON;
  var console = { log: cinder.log, warn: cinder.warn, error: cinder.error };
  var encodeURIComponent = cinder.__encodeURIComponent;
  var decodeURIComponent = cinder.__decodeURIComponent;
  var encodeURI = cinder.__encodeURI;
  var decodeURI = cinder.__decodeURI;
  var atob = cinder.__atob;
  var btoa = cinder.__btoa;
  var parseInt = cinder.__parseInt;
  var parseFloat = cinder.__parseFloat;
  var setTimeout = cinder.__setTimeout;

  ${script}

  return __cinderExport;
  `
);

const source = factory(
  cinderAPI,
  undefined, undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, undefined
);

assert.equal(source.id, "marmota");
assert.equal(source.name, "Marmota");
assert.equal(source.version, "0.1.3");
assert.equal(source.contentType, "comics");
assert.equal(source.capabilities.search, true);
assert.equal(source.capabilities.discover, true);
assert.equal(source.capabilities.manga, true);
assert.deepEqual(source.getSettings(), []);

const emptySearch = await source.search("", 0);
assert.deepEqual(emptySearch, []);

const searchResults = await source.search("spider", 0);
assert.equal(searchResults.length, 1);
assert.equal(searchResults[0].id, "/comic/the-spectacular-spider-men-2024/");
assert.equal(searchResults[0].title, "The Spectacular Spider-Men (2024)");
assert.ok(searchResults[0].cover.includes("spider-cover.webp"));

const discoverSections = await source.getDiscoverSections();
assert.equal(discoverSections.length, 2);

const discoverItems = await source.getDiscoverItems("latest", 0);
assert.equal(discoverItems.length, 1);

const details = await source.getMangaDetails("/comic/the-spectacular-spider-men-2024/");
assert.equal(details.title, "The Spectacular Spider-Men (2024)");
assert.equal(details.author, "Greg Weisman");
assert.equal(details.status, "ongoing");
assert.ok(details.genres.includes("Marvel"));

const chapters = await source.getChapters("/comic/the-spectacular-spider-men-2024/");
assert.equal(chapters.length, 2);
assert.equal(chapters[0].title, "The Spectacular Spider-Men 1");
assert.equal(chapters[1].title, "The Spectacular Spider-Men 7");

const dynamicChapters = await source.getChapters({
  id: "/comic/dynamic-comic/",
  url: "https://marmota.me/comic/dynamic-comic/",
});
assert.equal(dynamicChapters.length, 2);
assert.equal(dynamicChapters[0].id, "/comic/dynamic-comic/chapter-1/");
assert.equal(dynamicChapters[1].id, "/comic/dynamic-comic/chapter-2/");

const probedChapters = await source.getChapters("/comic/absolute-batman-2024/");
assert.equal(probedChapters.length, 3);
assert.equal(probedChapters[0].id, "/comic/absolute-batman-2024/absolute-batman-1/");
assert.equal(probedChapters[2].title, "Absolute Batman 3");

const pages = await source.getPages("/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/");
assert.equal(pages.length, 2);
assert.ok(pages[0].url.startsWith("https://marmota.me/"));
assert.ok(pages[0].url.endsWith("/001.webp"));
assert.ok(pages[1].url.endsWith("/002.webp"));
assert.equal(pages[0].headers.Referer, "https://marmota.me/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/");

console.log("Marmota extension sandbox tests passed.");

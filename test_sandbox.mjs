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
  async fetch(url) {
    if (url.includes("?s=spider")) return { status: 200, data: searchHtml, headers: {} };
    if (url.endsWith("/comic/the-spectacular-spider-men-2024/")) return { status: 200, data: detailsHtml, headers: {} };
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
assert.equal(source.version, "0.1.0");
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

const pages = await source.getPages("/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/");
assert.equal(pages.length, 2);
assert.ok(pages[0].url.endsWith("/001.webp"));
assert.ok(pages[1].url.endsWith("/002.webp"));
assert.equal(pages[0].headers.Referer, "https://marmota.me/comic/the-spectacular-spider-men-2024/the-spectacular-spider-men-7/");

console.log("Marmota extension sandbox tests passed.");

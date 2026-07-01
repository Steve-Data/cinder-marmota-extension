var Marmota = {};

Marmota.id = "marmota";
Marmota.name = "Marmota";
Marmota.version = "0.1.5";
Marmota.icon = "M";
Marmota.description = "Read public Spanish comics from Marmota.";
Marmota.contentType = "comics";
Marmota.contentTypes = ["comic"];
Marmota.contentSubtypes = ["westernComic", "spanish"];
Marmota.capabilities = {
  search: true,
  discover: true,
  download: false,
  resolve: false,
  searchDownloads: false,
  bookChapters: false,
  manga: true,
};

Marmota.BASE_URL = "https://marmota.me";

Marmota._headers = function(referer, extra) {
  var headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": referer || this.BASE_URL + "/",
    "Upgrade-Insecure-Requests": "1",
  };
  if (extra) {
    Object.keys(extra).forEach(function(key) {
      headers[key] = extra[key];
    });
  }
  return headers;
};

Marmota._imageHeaders = function(referer) {
  return {
    "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": referer || this.BASE_URL + "/",
  };
};

Marmota._warn = function() {
  if (typeof cinder !== "undefined" && cinder.warn) {
    cinder.warn.apply(cinder, arguments);
  }
};

Marmota._decode = function(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, function(_, hex) {
      return String.fromCharCode(parseInt(hex, 16));
    })
    .replace(/&#([0-9]+);/g, function(_, num) {
      return String.fromCharCode(parseInt(num, 10));
    })
    .replace(/\s+/g, " ")
    .trim();
};

Marmota._stripTags = function(value) {
  return this._decode(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " "));
};

Marmota._attr = function(html, attr) {
  var re = new RegExp("\\s" + attr + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i");
  var match = String(html || "").match(re);
  return match ? this._decode(match[2]) : "";
};

Marmota._absUrl = function(value) {
  var raw = this._decode(String(value || "").trim());
  if (!raw || /^data:/i.test(raw) || /^javascript:/i.test(raw)) return "";
  if (raw.indexOf("//") === 0) return "https:" + raw;
  if (/^http:\/\/(?:www\.)?marmota\.me/i.test(raw)) return raw.replace(/^http:/i, "https:");
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.charAt(0) === "/") return this.BASE_URL + raw;
  return this.BASE_URL + "/" + raw.replace(/^\/+/, "");
};

Marmota._pathFromUrl = function(value) {
  if (value && typeof value === "object") {
    value = value.id || value.url || (value.extra && (value.extra.id || value.extra.path || value.extra.slug)) || "";
  }
  var raw = this._decode(String(value || "").trim());
  if (!raw) return "";
  raw = raw.replace(/&amp;/g, "&").split("#")[0].split("?")[0];
  raw = raw.replace(/^https?:\/\/marmota\.me/i, "");
  raw = raw.replace(/^https?:\/\/www\.marmota\.me/i, "");
  if (/^https?:\/\//i.test(raw)) {
    var hostMatch = raw.match(/^https?:\/\/[^/]+(\/.*)?$/i);
    raw = hostMatch && hostMatch[1] ? hostMatch[1] : "/";
  }
  if (raw.charAt(0) !== "/") raw = "/" + raw;
  raw = raw.replace(/\/{2,}/g, "/");
  return raw;
};

Marmota._pathFromHref = function(value, basePath) {
  var raw = this._decode(String(value || "").trim());
  if (!raw || raw.charAt(0) === "#" || raw.indexOf("?") === 0) return "";
  if (/^(?:javascript|mailto|tel|sms):/i.test(raw)) return "";
  if (/^https?:\/\//i.test(raw) || raw.indexOf("//") === 0 || raw.charAt(0) === "/") {
    return this._pathFromUrl(raw);
  }

  var base = this._pathFromUrl(basePath || "/");
  if (!base.endsWith("/")) base += "/";
  return this._pathFromUrl(base + raw.replace(/^\.?\//, ""));
};

Marmota._parts = function(path) {
  return String(path || "").split("/").filter(function(part) {
    return !!part;
  });
};

Marmota._isSeriesPath = function(path) {
  var parts = this._parts(path);
  return parts.length === 2 && parts[0] === "comic" && !!parts[1];
};

Marmota._isChapterPath = function(path) {
  var parts = this._parts(path);
  return parts.length >= 3 && parts[0] === "comic" && !!parts[1] && !!parts[2];
};

Marmota._seriesSlug = function(path) {
  var parts = this._parts(path);
  if (parts.length >= 2 && parts[0] === "comic") return parts[1];
  return "";
};

Marmota._pathContainsSeries = function(path, seriesSlug) {
  if (!path || !seriesSlug) return false;
  var parts = this._parts(path);
  for (var i = 0; i < parts.length; i += 1) {
    if (parts[i] === seriesSlug) return true;
  }
  return false;
};

Marmota._isLikelyChapterPath = function(path, seriesPath, seriesSlug) {
  path = this._pathFromUrl(path);
  seriesPath = this._pathFromUrl(seriesPath);
  if (!path || !seriesSlug) return false;
  if (path === seriesPath || path === seriesPath.replace(/\/$/, "")) return false;
  if (!this._pathContainsSeries(path, seriesSlug)) return false;

  var parts = this._parts(path);
  if (parts.length < 2) return false;

  var last = parts[parts.length - 1].toLowerCase();
  if (!last || last === seriesSlug) return false;
  if (/^(comments?|comment-page-[0-9]+|feed|rss|attachment|tag|category|genre|genero)$/.test(last)) return false;
  if (/\.(?:jpg|jpeg|png|webp|avif|gif|svg|css|js)$/i.test(last)) return false;

  if (this._isChapterPath(path) && this._seriesSlug(path) === seriesSlug) return true;
  return parts.length >= 3;
};

Marmota._titleFromPath = function(path) {
  var parts = this._parts(path);
  var slug = parts.length ? parts[parts.length - 1] : "marmota";
  return slug
    .replace(/-/g, " ")
    .replace(/\b([a-z])/g, function(match) {
      return match.toUpperCase();
    });
};

Marmota._seriesBaseSlug = function(seriesSlug) {
  var slug = String(seriesSlug || "").replace(/\/+$/g, "");
  return slug.replace(/-(?:19|20)[0-9]{2}$/i, "");
};

Marmota._seriesIssuePrefixes = function(seriesSlug) {
  var prefixes = [];
  var seen = {};
  var add = function(value) {
    value = String(value || "").replace(/^-+|-+$/g, "");
    if (!value || seen[value]) return;
    seen[value] = true;
    prefixes.push(value);
  };

  var base = this._seriesBaseSlug(seriesSlug);
  var originals = [base, seriesSlug];
  for (var i = 0; i < originals.length; i += 1) {
    add(originals[i]);
    add(String(originals[i] || "").replace(/-v([0-9]+)(?=$|-)/ig, "-vol-$1"));
    add(String(originals[i] || "").replace(/-vol-([0-9]+)(?=$|-)/ig, "-v$1"));
    add(String(originals[i] || "").replace(/-volume-([0-9]+)(?=$|-)/ig, "-vol-$1"));
  }

  return prefixes;
};

Marmota._seriesSeedBases = function(seriesSlug) {
  var bases = [];
  var seen = {};
  var add = function(value) {
    value = String(value || "").toLowerCase().replace(/^-+|-+$/g, "");
    if (!value || seen[value]) return;
    seen[value] = true;
    bases.push(value);
  };

  var base = this._seriesBaseSlug(seriesSlug);
  add(base);
  add(seriesSlug);
  add(base.replace(/-(?:v|vol|volume)-[0-9]+$/i, ""));
  add(String(seriesSlug || "").replace(/-(?:v|vol|volume)-[0-9]+-(?:19|20)[0-9]{2}$/i, ""));
  return bases;
};

Marmota._seriesSeedNumbersFromHtml = function(html, seriesSlug) {
  var text = String(html || "").toLowerCase();
  var seeds = [];
  var seen = {};
  var bases = this._seriesSeedBases(seriesSlug);

  var add = function(value) {
    var number = parseInt(value, 10);
    if (!number || number < 1 || number > 300 || seen[number]) return;
    seen[number] = true;
    seeds.push(number);
  };

  for (var i = 0; i < bases.length; i += 1) {
    var escaped = bases[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-_ ]");
    var re = new RegExp(escaped + "[-_ ]+([0-9]{1,3})(?=[-_ .(]|$)", "gi");
    var match;
    while ((match = re.exec(text)) !== null) {
      add(match[1]);
    }
  }

  seeds.sort(function(a, b) {
    return a - b;
  });
  return seeds;
};

Marmota._isBlockedHtml = function(html) {
  var text = String(html || "").toLowerCase();
  if (!text) return true;
  return text.indexOf("cf-browser-verification") !== -1 ||
    text.indexOf("attention required") !== -1 ||
    text.indexOf("just a moment") !== -1 ||
    text.indexOf("captcha") !== -1 ||
    text.indexOf("bunny-shield") !== -1 ||
    text.indexOf("shield-challenge") !== -1 ||
    text.indexOf("error code: 403") !== -1 ||
    text.indexOf("error code: 502") !== -1;
};

Marmota._responseText = function(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  return String(response.data || response.html || response.text || response.body || "");
};

Marmota._tryFetchText = async function(fetcher, url, options) {
  try {
    var requestOptions = options || {};
    if (!requestOptions.timeout) requestOptions.timeout = 30000;
    var response = await fetcher.call(cinder, url, requestOptions);
    var data = this._responseText(response);
    var status = response && typeof response.status === "number" ? response.status : 200;
    if (status >= 200 && status < 300 && data && !this._isBlockedHtml(data)) {
      return data;
    }
  } catch (error) {
    this._warn("Marmota fetch failed", url, error && error.message ? error.message : String(error));
  }
  return "";
};

Marmota._fetchText = async function(url, referer) {
  var headers = this._headers(referer || this.BASE_URL + "/");
  var html = await this._tryFetchText(cinder.fetch, url, { headers: headers });
  if (html) return html;

  if (typeof cinder.fetchBrowserCaptured === "function") {
    html = await this._tryFetchText(cinder.fetchBrowserCaptured, url, { headers: headers });
    if (html) return html;
  }

  if (typeof cinder.fetchBrowser === "function") {
    html = await this._tryFetchText(cinder.fetchBrowser, url, { headers: headers });
    if (html) return html;
  }

  return "";
};

Marmota._fetchPostText = async function(url, body, referer) {
  var headers = this._headers(referer || this.BASE_URL + "/", {
    "Accept": "text/html,application/json,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
  });
  return this._tryFetchText(cinder.fetch, url, {
    method: "POST",
    headers: headers,
    body: body,
  });
};

Marmota._srcFromSrcset = function(srcset) {
  srcset = this._decode(srcset);
  if (!srcset) return "";
  var pieces = srcset.split(",");
  var best = "";
  var bestWidth = -1;
  for (var i = 0; i < pieces.length; i += 1) {
    var piece = pieces[i].trim();
    if (!piece) continue;
    var bits = piece.split(/\s+/);
    var url = bits[0] || "";
    var width = 0;
    var widthMatch = piece.match(/\s([0-9]+)w(?:\s|$)/);
    if (widthMatch) width = parseInt(widthMatch[1], 10);
    if (!best || width >= bestWidth) {
      best = url;
      bestWidth = width;
    }
  }
  return best;
};

Marmota._imageFromTag = function(tag) {
  var candidates = [
    this._attr(tag, "data-src"),
    this._attr(tag, "data-lazy-src"),
    this._attr(tag, "data-original"),
    this._attr(tag, "data-lazy"),
    this._attr(tag, "data-url"),
    this._srcFromSrcset(this._attr(tag, "data-srcset")),
    this._srcFromSrcset(this._attr(tag, "srcset")),
    this._attr(tag, "src"),
  ];
  for (var i = 0; i < candidates.length; i += 1) {
    var url = this._absUrl(candidates[i]);
    if (url) return url;
  }
  return "";
};

Marmota._isJunkImage = function(url) {
  var text = String(url || "").toLowerCase();
  if (!text) return true;
  if (/\.svg(?:[?#]|$)/i.test(text)) return true;
  return text.indexOf("logo") !== -1 ||
    text.indexOf("avatar") !== -1 ||
    text.indexOf("icon") !== -1 ||
    text.indexOf("banner") !== -1 ||
    /(?:^|\/)zz[a-z0-9_-]*\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i.test(text) ||
    /(?:^|[\/._-])ads?(?:[\/._-]|$)/i.test(text) ||
    text.indexOf("/ad/") !== -1 ||
    text.indexOf("doubleclick") !== -1 ||
    text.indexOf("tracking") !== -1 ||
    text.indexOf("pixel") !== -1 ||
    text.indexOf("placeholder") !== -1 ||
    text.indexOf("zatk") !== -1 ||
    text.indexOf("flyer") !== -1 ||
    text.indexOf("jokerwantsyou") !== -1 ||
    text.indexOf("zzz_at_comics") !== -1 ||
    text.indexOf("loading") !== -1 ||
    text.indexOf("spinner") !== -1;
};

Marmota._looksLikeImageUrl = function(url) {
  var text = String(url || "").split("?")[0].toLowerCase();
  return /\.(?:jpg|jpeg|png|webp|avif)(?:$|[?#])/i.test(url) ||
    /\.(?:jpg|jpeg|png|webp|avif)$/i.test(text) ||
    text.indexOf("/wp-content/") !== -1 ||
    text.indexOf("/uploads/") !== -1 ||
    text.indexOf("/manga/") !== -1 ||
    text.indexOf("blogspot.") !== -1 ||
    text.indexOf("googleusercontent.") !== -1;
};

Marmota._bestImageNear = function(block) {
  var imgRe = /<img\b[\s\S]*?>/gi;
  var match;
  while ((match = imgRe.exec(String(block || ""))) !== null) {
    var url = this._imageFromTag(match[0]);
    if (url && !this._isJunkImage(url) && this._looksLikeImageUrl(url)) {
      return url;
    }
  }
  return "";
};

Marmota._titleFromNearbyBlock = function(block) {
  var hMatch = String(block || "").match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i);
  if (hMatch) {
    var hText = this._stripTags(hMatch[1]);
    if (hText) return hText;
  }
  var imgMatch = String(block || "").match(/<img\b[\s\S]*?>/i);
  if (imgMatch) {
    return this._attr(imgMatch[0], "alt") || this._attr(imgMatch[0], "title") || "";
  }
  return "";
};

Marmota._badLinkTitle = function(title) {
  var clean = String(title || "").trim().toLowerCase();
  return !clean ||
    clean === "leer" ||
    clean === "read" ||
    clean === "ver" ||
    clean === "more" ||
    clean === "mas" ||
    clean === "marmota" ||
    clean.length < 2;
};

Marmota._parseComicList = function(html) {
  var results = [];
  var byPath = {};
  var text = String(html || "");
  var linkRe = /<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = linkRe.exec(text)) !== null) {
    var path = this._pathFromUrl(match[2]);
    if (!this._isSeriesPath(path)) continue;

    var start = Math.max(0, match.index - 1800);
    var end = Math.min(text.length, linkRe.lastIndex + 1800);
    var block = text.substring(start, end);
    var title = this._stripTags(match[3]) || this._attr(match[0], "title") || this._attr(match[0], "aria-label");
    if (this._badLinkTitle(title)) title = this._titleFromNearbyBlock(block);
    if (this._badLinkTitle(title)) title = this._titleFromPath(path);

    var cover = this._bestImageNear(block);
    var existing = byPath[path];
    if (existing) {
      if ((!existing.cover || this._isJunkImage(existing.cover)) && cover) existing.cover = cover;
      if (this._badLinkTitle(existing.title) && title) existing.title = title;
      continue;
    }

    var item = {
      id: path,
      title: title,
      author: "Various",
      cover: cover,
      coverHeaders: cover ? this._imageHeaders(this._absUrl(path)) : undefined,
      url: this._absUrl(path),
      format: "comics",
      contentType: "comics",
    };
    byPath[path] = item;
    results.push(item);
  }
  return results;
};

Marmota._searchUrls = function(query, page) {
  var q = encodeURIComponent(String(query || "").trim());
  var pageNumber = (page || 0) + 1;
  var paged = pageNumber > 1 ? "&paged=" + pageNumber : "";
  var urls = [
    this.BASE_URL + "/?s=" + q + "&post_type=wp-manga" + paged,
    this.BASE_URL + "/?s=" + q + paged,
  ];
  if (pageNumber > 1) {
    urls.push(this.BASE_URL + "/page/" + pageNumber + "/?s=" + q + "&post_type=wp-manga");
    urls.push(this.BASE_URL + "/page/" + pageNumber + "/?s=" + q);
  }
  return urls;
};

Marmota.search = async function(query, page) {
  query = String(query || "").trim();
  if (!query) return [];

  var urls = this._searchUrls(query, page || 0);
  for (var i = 0; i < urls.length; i += 1) {
    var html = await this._fetchText(urls[i], this.BASE_URL + "/");
    if (!html) continue;
    var results = this._parseComicList(html);
    if (results.length > 0) return results;
  }
  return [];
};

Marmota.getDiscoverSections = async function() {
  return [
    { id: "latest", title: "Latest Updates", icon: "time" },
    { id: "popular", title: "Popular Comics", icon: "flame" },
  ];
};

Marmota.getDiscoverItems = async function(sectionId, page) {
  var pageNumber = (page || 0) + 1;
  var url = this.BASE_URL + "/";
  if (sectionId === "latest") {
    url = pageNumber > 1 ? this.BASE_URL + "/page/" + pageNumber + "/" : this.BASE_URL + "/";
  } else if (sectionId === "popular") {
    url = this.BASE_URL + "/?m_orderby=views" + (pageNumber > 1 ? "&paged=" + pageNumber : "");
  } else {
    return [];
  }

  var html = await this._fetchText(url, this.BASE_URL + "/");
  if (!html) return [];
  return this._parseComicList(html);
};

Marmota._metaContent = function(html, key) {
  var escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  var re1 = new RegExp("<meta[^>]+(?:property|name)=[\"']" + escaped + "[\"'][^>]+content=([\"'])([\\s\\S]*?)\\1[^>]*>", "i");
  var re2 = new RegExp("<meta[^>]+content=([\"'])([\\s\\S]*?)\\1[^>]+(?:property|name)=[\"']" + escaped + "[\"'][^>]*>", "i");
  var match = String(html || "").match(re1) || String(html || "").match(re2);
  return match ? this._decode(match[2]) : "";
};

Marmota._firstTextMatch = function(html, patterns) {
  for (var i = 0; i < patterns.length; i += 1) {
    var match = String(html || "").match(patterns[i]);
    if (match) {
      var text = this._stripTags(match[1]);
      if (text) return text;
    }
  }
  return "";
};

Marmota._metaByLabels = function(html, labels) {
  var source = String(html || "");
  for (var i = 0; i < labels.length; i += 1) {
    var label = labels[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var patterns = [
      new RegExp("<dt[^>]*>\\s*" + label + "\\s*:?\\s*<\\/dt>\\s*<dd[^>]*>([\\s\\S]*?)<\\/dd>", "i"),
      new RegExp("<strong[^>]*>\\s*" + label + "\\s*:?\\s*<\\/strong>\\s*([^<\\n]+)", "i"),
      new RegExp("<span[^>]*>\\s*" + label + "\\s*:?\\s*<\\/span>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>", "i"),
      new RegExp("<li[^>]*>[\\s\\S]*?" + label + "\\s*:?\\s*([\\s\\S]*?)<\\/li>", "i"),
    ];
    var value = this._firstTextMatch(source, patterns);
    if (value) return value;
  }
  return "";
};

Marmota._genres = function(html) {
  var genres = [];
  var seen = {};
  var linkRe = /<a\b[^>]*href\s*=\s*(["'])([^"']*(?:\/genero\/|\/genre\/|\/tag\/|\/category\/)[^"']*)\1[^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  while ((match = linkRe.exec(String(html || ""))) !== null) {
    var text = this._stripTags(match[3]);
    if (text && !seen[text.toLowerCase()]) {
      seen[text.toLowerCase()] = true;
      genres.push(text);
    }
  }
  if (genres.length === 0) genres.push("Comic");
  return genres;
};

Marmota._status = function(text) {
  var clean = String(text || "").toLowerCase();
  if (/completed|complete|finalizado|terminado|completo/.test(clean)) return "completed";
  if (/ongoing|en curso|activo|publicacion|publicacion|emision/.test(clean)) return "ongoing";
  return "unknown";
};

Marmota.getMangaDetails = async function(id) {
  var path = this._pathFromUrl(id);
  if (!this._isSeriesPath(path)) path = "/comic/" + String(id || "").replace(/^\/+|\/+$/g, "") + "/";
  var url = this._absUrl(path);
  var html = await this._fetchText(url, this.BASE_URL + "/");
  if (!html) {
    return {
      id: path,
      title: this._titleFromPath(path),
      author: "Various",
      description: "Marmota public page could not be loaded by the extension.",
      cover: "",
      status: "unknown",
      genres: ["Comic"],
      format: "comics",
      contentType: "comics",
    };
  }

  var title = this._firstTextMatch(html, [
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2\b[^>]*>([\s\S]*?)<\/h2>/i,
  ]) || this._metaContent(html, "og:title") || this._titleFromPath(path);
  title = title.replace(/\s*-\s*Marmota\s*$/i, "").trim();

  var description = this._metaContent(html, "og:description") ||
    this._firstTextMatch(html, [
      /<div[^>]+class=["'][^"']*\bsummary__content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class=["'][^"']*\bdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class=["'][^"']*\bentry-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]+class=["'][^"']*\bpost-content\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ]);

  var cover = this._metaContent(html, "og:image") || this._bestImageNear(html);
  var author = this._metaByLabels(html, ["Autor", "Autores", "Guionista", "Writer", "Artist", "Artista"]) || "Various";
  var statusText = this._metaByLabels(html, ["Estado", "Status"]);

  return {
    id: path,
    title: title,
    author: author,
    description: description,
    cover: cover,
    coverHeaders: cover ? this._imageHeaders(url) : undefined,
    status: this._status(statusText),
    genres: this._genres(html),
    format: "comics",
    contentType: "comics",
  };
};

Marmota._chapterNumber = function(title, path, index) {
  var parts = this._parts(path);
  var last = parts.length ? parts[parts.length - 1] : "";
  var candidates = [String(title || ""), last.replace(/-/g, " "), String(path || "")];
  var explicitRe = /(?:#|numero|nro|issue|capitulo|capítulo|chapter|parte|vol\.?)\s*([0-9]+(?:\.[0-9]+)?)/i;
  var looseRe = /(?:^|[^0-9])([0-9]+(?:\.[0-9]+)?)(?:[^0-9]|$)/;
  var match;
  for (var i = 0; i < candidates.length; i += 1) {
    match = candidates[i].match(explicitRe);
    if (match) return parseFloat(match[1]);
  }
  for (var j = 0; j < candidates.length; j += 1) {
    match = candidates[j].match(looseRe);
    if (match) return parseFloat(match[1]);
  }
  return index + 1;
};

Marmota._parseChaptersFromHtml = function(html, seriesPath, seriesSlug) {
  var chapters = [];
  var seen = {};
  var linkRe = /<a\b[^>]*href\s*=\s*(["'])([^"']+)\1[^>]*>([\s\S]*?)<\/a>/gi;
  var match;
  var sourceIndex = 0;
  while ((match = linkRe.exec(String(html || ""))) !== null) {
    var path = this._pathFromHref(match[2], seriesPath);
    if (!this._isLikelyChapterPath(path, seriesPath, seriesSlug)) continue;
    if (seen[path]) continue;
    seen[path] = true;

    var title = this._stripTags(match[3]) || this._attr(match[0], "title") || this._titleFromPath(path);
    if (this._badLinkTitle(title)) title = this._titleFromPath(path);
    var chapterNumber = this._chapterNumber(title, path, sourceIndex);
    chapters.push({
      id: path,
      title: title,
      chapterNumber: chapterNumber,
      url: this._absUrl(path),
      _sourceIndex: sourceIndex,
    });
    sourceIndex += 1;
  }

  return chapters;
};

Marmota._ajaxUrl = function(html) {
  var source = String(html || "");
  var patterns = [
    /["']ajax_url["']\s*:\s*["']([^"']+)["']/i,
    /["']ajaxUrl["']\s*:\s*["']([^"']+)["']/i,
    /ajaxurl\s*=\s*["']([^"']+)["']/i,
    /admin_url["']?\s*:\s*["']([^"']*admin-ajax\.php[^"']*)["']/i,
    /(https?:\/\/[^"']+\/wp-admin\/admin-ajax\.php)/i,
    /(\/wp-admin\/admin-ajax\.php)/i,
  ];
  for (var i = 0; i < patterns.length; i += 1) {
    var match = source.match(patterns[i]);
    if (match && match[1]) return this._absUrl(match[1].replace(/\\\//g, "/"));
  }
  return this.BASE_URL + "/wp-admin/admin-ajax.php";
};

Marmota._mangaPostId = function(html) {
  var source = String(html || "");
  var patterns = [
    /id=["']wp-manga-current-post["'][^>]*value=["']([0-9]+)["']/i,
    /value=["']([0-9]+)["'][^>]*id=["']wp-manga-current-post["']/i,
    /data-(?:manga|post)-id=["']([0-9]+)["']/i,
    /["'](?:manga|post)[_-]?id["']\s*:\s*["']?([0-9]+)/i,
    /(?:manga|post)[_-]?id\s*=\s*["']?([0-9]+)/i,
    /post-([0-9]+)/i,
  ];
  for (var i = 0; i < patterns.length; i += 1) {
    var match = source.match(patterns[i]);
    if (match && match[1]) return match[1];
  }
  return "";
};

Marmota._ajaxPayloadHtml = function(text) {
  var raw = String(text || "").trim();
  if (!raw) return "";
  try {
    var parsed = JSON.parse(raw);
    if (typeof parsed === "string") return parsed;
    if (parsed && typeof parsed.data === "string") return parsed.data;
    if (parsed && parsed.data && typeof parsed.data.html === "string") return parsed.data.html;
    if (parsed && parsed.data && typeof parsed.data.content === "string") return parsed.data.content;
    if (parsed && typeof parsed.html === "string") return parsed.html;
    if (parsed && typeof parsed.content === "string") return parsed.content;
  } catch (error) {}
  return raw;
};

Marmota._fetchAjaxChaptersHtml = async function(seriesHtml, seriesUrl) {
  var mangaId = this._mangaPostId(seriesHtml);
  if (!mangaId) return "";

  var ajaxUrl = this._ajaxUrl(seriesHtml);
  var bodies = [
    "action=manga_get_chapters&manga=" + encodeURIComponent(mangaId),
    "action=manga_get_chapters&manga_id=" + encodeURIComponent(mangaId),
    "action=wp_manga_get_chapters&manga=" + encodeURIComponent(mangaId),
    "action=wp_manga_get_chapters&manga_id=" + encodeURIComponent(mangaId),
  ];

  for (var i = 0; i < bodies.length; i += 1) {
    var responseText = await this._fetchPostText(ajaxUrl, bodies[i], seriesUrl);
    var html = this._ajaxPayloadHtml(responseText);
    if (html && html.indexOf("<a") !== -1) return html;
  }

  return "";
};

Marmota._sortChapterList = function(chapters) {
  chapters.sort(function(a, b) {
    if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
    return a._sourceIndex - b._sourceIndex;
  });

  return chapters.map(function(chapter) {
    return {
      id: chapter.id,
      title: chapter.title,
      chapterNumber: chapter.chapterNumber,
      url: chapter.url,
    };
  });
};

Marmota._candidateIssuePaths = function(seriesPath, seriesSlug, number) {
  var prefixes = this._seriesIssuePrefixes(seriesSlug);

  var paths = [];
  var seen = {};
  var root = this._pathFromUrl(seriesPath);
  if (!root.endsWith("/")) root += "/";

  for (var i = 0; i < prefixes.length; i += 1) {
    var candidates = [
      root + prefixes[i] + "-" + number + "/",
      root + prefixes[i] + "-" + String(number).padStart(2, "0") + "/",
    ];
    for (var j = 0; j < candidates.length; j += 1) {
      if (!seen[candidates[j]]) {
        seen[candidates[j]] = true;
        paths.push(candidates[j]);
      }
    }
  }

  return paths;
};

Marmota._chapterTitleFromHtml = function(html, fallback) {
  var title = this._firstTextMatch(html, [
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i,
    /<h2\b[^>]*>([\s\S]*?)<\/h2>/i,
    /<title\b[^>]*>([\s\S]*?)<\/title>/i,
  ]) || this._metaContent(html, "og:title") || fallback;
  title = title.replace(/\s*-\s*Marmota(?:\s+Comics)?\s*$/i, "").trim();
  return title || fallback;
};

Marmota._canonicalPathFromHtml = function(html) {
  var linkRe = /<link\b[\s\S]*?>/gi;
  var match;
  while ((match = linkRe.exec(String(html || ""))) !== null) {
    if (String(this._attr(match[0], "rel") || "").toLowerCase() !== "canonical") continue;
    var href = this._attr(match[0], "href");
    if (href) return this._pathFromUrl(href);
  }
  return "";
};

Marmota._isIssuePageHtml = function(html, seriesSlug, number, expectedPath) {
  var text = String(html || "").toLowerCase();
  if (!text) return false;
  if (this._isBlockedHtml(text)) return false;
  var baseSlug = this._seriesBaseSlug(seriesSlug).toLowerCase();
  var numberText = String(number);
  var padded2 = numberText.length === 1 ? "0" + numberText : numberText;
  var padded3 = numberText.length === 1 ? "00" + numberText : (numberText.length === 2 ? "0" + numberText : numberText);
  var seriesNeedles = [
    String(seriesSlug || "").toLowerCase(),
    baseSlug,
    baseSlug.replace(/-/g, " "),
  ].filter(function(value) {
    return !!value;
  });
  var hasSeriesMarker = false;
  for (var i = 0; i < seriesNeedles.length; i += 1) {
    if (text.indexOf(seriesNeedles[i]) !== -1) {
      hasSeriesMarker = true;
      break;
    }
  }
  if (!hasSeriesMarker) {
    return false;
  }
  var title = this._chapterTitleFromHtml(html, "").toLowerCase();
  var slugNumberMarkers = [
    baseSlug + "-" + numberText,
    baseSlug + "-" + padded2,
    baseSlug + "-" + padded3,
    String(seriesSlug || "").toLowerCase() + "-" + numberText,
    String(seriesSlug || "").toLowerCase() + "-" + padded2,
    String(seriesSlug || "").toLowerCase() + "-" + padded3,
  ];
  var hasSlugNumber = false;
  for (var j = 0; j < slugNumberMarkers.length; j += 1) {
    if (slugNumberMarkers[j] && text.indexOf(slugNumberMarkers[j]) !== -1) {
      hasSlugNumber = true;
      break;
    }
  }

  var titleHasNumber = title.indexOf("#" + numberText) !== -1 ||
    new RegExp("(?:^|[^0-9])" + numberText + "(?:[^0-9]|$)").test(title);
  var canonicalPath = this._canonicalPathFromHtml(html);
  var wantedPath = this._pathFromUrl(expectedPath || "");
  var canonicalMatchesExpected = !!wantedPath && canonicalPath === wantedPath;
  var hasPageImages = text.indexOf("wp-manga-chapter-img") !== -1;
  var hasReaderMarker = text.indexOf("wp-manga-chapter-img") !== -1 ||
    text.indexOf("reading-manga") !== -1 ||
    text.indexOf("next_page") !== -1 ||
    text.indexOf("prev_page") !== -1 ||
    text.indexOf("chapter-nav") !== -1 ||
    text.indexOf("rel=\"next\"") !== -1 ||
    text.indexOf("rel='next'") !== -1 ||
    text.indexOf("> next <") !== -1 ||
    text.indexOf(">next<") !== -1 ||
    text.indexOf("> prev <") !== -1 ||
    text.indexOf(">prev<") !== -1;

  return hasPageImages && (
    canonicalMatchesExpected ||
    (hasReaderMarker && (titleHasNumber || hasSlugNumber))
  );
};

Marmota._probeNumberedChapter = async function(seriesPath, seriesSlug, number) {
  var paths = this._candidateIssuePaths(seriesPath, seriesSlug, number);
  for (var i = 0; i < paths.length; i += 1) {
    var url = this._absUrl(paths[i]);
    var html = await this._fetchText(url, this._absUrl(seriesPath));
    if (this._isIssuePageHtml(html, seriesSlug, number, paths[i])) {
      var fallbackTitle = this._titleFromPath(paths[i]);
      var chapterTitle = this._chapterTitleFromHtml(html, fallbackTitle);
      if (this._chapterNumber(chapterTitle, "", number - 1) !== number) {
        chapterTitle = fallbackTitle;
      }
      return {
        id: this._pathFromUrl(paths[i]),
        title: chapterTitle,
        chapterNumber: number,
        url: url,
        _sourceIndex: number,
      };
    }
  }
  return null;
};

Marmota._probeNumberedChapters = async function(seriesPath, seriesSlug, seedNumbers) {
  var chapters = [];
  var maxMisses = 4;
  var maxNumber = 80;
  var batchSize = 4;
  var seenNumbers = {};
  var starts = [];
  var seenStarts = {};
  var seeds = seedNumbers || [];

  var addStart = function(value) {
    value = parseInt(value, 10);
    if (!value || value < 1) value = 1;
    if (seenStarts[value]) return;
    seenStarts[value] = true;
    starts.push(value);
  };

  addStart(1);
  for (var s = 0; s < seeds.length; s += 1) {
    maxNumber = Math.max(maxNumber, seeds[s] + 80);
    addStart(seeds[s] - maxMisses + 1);
    if (seeds[s] > 40) addStart(seeds[s] - 30);
  }

  starts.sort(function(a, b) {
    return a - b;
  });

  for (var range = 0; range < starts.length; range += 1) {
    var misses = 0;
    for (var start = starts[range]; start <= maxNumber && misses < maxMisses; start += batchSize) {
      var tasks = [];
      for (var number = start; number < start + batchSize && number <= maxNumber; number += 1) {
        tasks.push(this._probeNumberedChapter(seriesPath, seriesSlug, number));
      }

      var results = await Promise.all(tasks);
      for (var i = 0; i < results.length; i += 1) {
        if (results[i]) {
          if (!seenNumbers[results[i].chapterNumber]) {
            chapters.push(results[i]);
            seenNumbers[results[i].chapterNumber] = true;
          }
          misses = 0;
        } else {
          misses += 1;
          if (misses >= maxMisses) break;
        }
      }
    }
  }

  return chapters;
};

Marmota.getChapters = async function(mangaId) {
  var seriesPath = this._pathFromUrl(mangaId);
  if (!this._isSeriesPath(seriesPath)) seriesPath = "/comic/" + String(mangaId || "").replace(/^\/+|\/+$/g, "") + "/";
  var seriesSlug = this._seriesSlug(seriesPath);
  var url = this._absUrl(seriesPath);
  var html = await this._fetchText(url, this.BASE_URL + "/");
  if (!html) return [];

  var chapters = this._parseChaptersFromHtml(html, seriesPath, seriesSlug);
  if (chapters.length === 0) {
    var ajaxHtml = await this._fetchAjaxChaptersHtml(html, url);
    if (ajaxHtml) chapters = this._parseChaptersFromHtml(ajaxHtml, seriesPath, seriesSlug);
  }
  if (chapters.length === 0) {
    chapters = await this._probeNumberedChapters(seriesPath, seriesSlug, this._seriesSeedNumbersFromHtml(html, seriesSlug));
  }

  return this._sortChapterList(chapters);
};

Marmota._imageDimensionsTooSmall = function(tag) {
  var width = parseInt(this._attr(tag, "width") || "0", 10);
  var height = parseInt(this._attr(tag, "height") || "0", 10);
  return (width > 0 && width < 220) || (height > 0 && height < 220);
};

Marmota._pageCandidateAllowed = function(url, tag, requirePageHint) {
  if (!url || this._isJunkImage(url) || !this._looksLikeImageUrl(url)) return false;
  if (this._imageDimensionsTooSmall(tag || "")) return false;
  var text = (String(url || "") + " " + String(tag || "")).toLowerCase();
  var hasPageHint = /wp-manga-chapter-img|chapter[_ -]?img|chapter-image|reading-content|page-break|manga[_ -]?page|comic[_ -]?page|reader|\/data\/|\/chapter\//i.test(text);
  if (requirePageHint && !hasPageHint) return false;
  if (!hasPageHint && (text.indexOf("cover") !== -1 || text.indexOf("thumbnail") !== -1 || text.indexOf("thumb") !== -1)) return false;
  return true;
};

Marmota._addPage = function(pages, seen, url, tag, referer, requirePageHint) {
  url = this._absUrl(url);
  if (!this._pageCandidateAllowed(url, tag, requirePageHint)) return;
  if (seen[url]) return;
  seen[url] = true;
  pages.push({
    url: url,
    headers: this._imageHeaders(referer),
  });
};

Marmota._parsePageImages = function(html, referer) {
  var pages = [];
  var seen = {};
  var text = String(html || "");
  var imgRe = /<img\b[\s\S]*?>/gi;
  var match;

  while ((match = imgRe.exec(text)) !== null) {
    this._addPage(pages, seen, this._imageFromTag(match[0]), match[0], referer, true);
  }

  if (pages.length === 0) {
    imgRe.lastIndex = 0;
    while ((match = imgRe.exec(text)) !== null) {
      this._addPage(pages, seen, this._imageFromTag(match[0]), match[0], referer, false);
    }
  }

  if (pages.length === 0) {
    var urlRe = /https?:\/\/[^"'<>\\\s]+?\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'<>\\\s]*)?/gi;
    while ((match = urlRe.exec(text)) !== null) {
      this._addPage(pages, seen, match[0], "", referer, false);
    }
  }

  return pages;
};

Marmota.getPages = async function(chapterId) {
  var path = this._pathFromUrl(chapterId);
  if (!this._isChapterPath(path)) path = "/" + String(chapterId || "").replace(/^\/+/, "");
  var url = this._absUrl(path);
  var html = await this._fetchText(url, this.BASE_URL + "/");
  if (!html) {
    throw new Error("Marmota public issue page could not be loaded.");
  }

  var pages = this._parsePageImages(html, url);
  if (pages.length === 0) {
    throw new Error("Marmota returned no readable page images for this issue.");
  }
  return pages;
};

Marmota.getSettings = function() {
  return [];
};

__cinderExport = Marmota;

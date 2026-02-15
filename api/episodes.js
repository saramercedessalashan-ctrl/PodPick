const Parser = require("rss-parser");

function normTitle(s){
  return String(s || "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = async function handler(req, res) {
  const feedUrl = req.query.feedUrl ? String(req.query.feedUrl) : "";
  const collectionId = req.query.collectionId ? String(req.query.collectionId) : "";
  const limit = Math.min(Number(req.query.limit || 20), 50);

  if (!feedUrl) return res.status(400).json({ error: "Missing feedUrl" });

  try {
    const parser = new Parser({
      customFields: { item: [["itunes:duration", "itunesDuration"]] }
    });

    // 1) RSS episodes
    const feed = await parser.parseURL(feedUrl);

    const rssItems = (feed.items || []).slice(0, limit).map((it) => ({
      title: it.title || "",
      pubDate: it.pubDate || "",
      description: (it.contentSnippet || it.summary || "").toString(),
      itunesDuration: it.itunesDuration || "",
      enclosureUrl: it.enclosure?.url || ""
    }));

    // 2) Apple episode URLs (optional, but recommended)
    let appleEpisodes = [];
    if (collectionId) {
      const url =
        "https://itunes.apple.com/lookup?" +
        new URLSearchParams({
          id: collectionId,
          entity: "podcastEpisode",
          limit: String(limit)
        }).toString();

      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        appleEpisodes = (data.results || [])
          .filter(x => x.wrapperType === "podcastEpisode")
          .map(x => ({
            title: x.trackName || "",
            appleUrl: x.trackViewUrl || "",
            releaseDate: x.releaseDate || ""
          }));
      }
    }

    // 3) Match RSS -> Apple by title
    const appleMap = new Map();
    for (const ep of appleEpisodes) {
      const k = normTitle(ep.title);
      if (k && ep.appleUrl) appleMap.set(k, ep.appleUrl);
    }

    const items = rssItems.map(ep => {
      const k = normTitle(ep.title);
      return {
        ...ep,
        appleUrl: appleMap.get(k) || ""
      };
    });

    return res.status(200).json({
      items,
      podcastTitle: feed.title || ""
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "RSS fetch/parse failed",
      details: String(e?.message || e)
    });
  }
};


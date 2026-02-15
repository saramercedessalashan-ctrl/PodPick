import Parser from "rss-parser";

export default async function handler(req, res) {
  const feedUrl = req.query.feedUrl ? String(req.query.feedUrl) : "";
  const limit = Math.min(Number(req.query.limit || 20), 50);

  if (!feedUrl) return res.status(400).json({ error: "Missing feedUrl" });

  // 3.5s timeout so it doesn't hang
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 3500);

  try {
    const parser = new Parser({
      customFields: { item: [["itunes:duration", "itunesDuration"]] }
    });

    // Fetch RSS server-side (no browser CORS)
    const feed = await parser.parseURL(feedUrl);

    const items = (feed.items || []).slice(0, limit).map((it) => ({
      title: it.title || "",
      pubDate: it.pubDate || "",
      link: it.link || "",
      description: (it.contentSnippet || it.summary || "").toString(),
      itunesDuration: it.itunesDuration || "",
      enclosureUrl: it.enclosure?.url || ""
    }));

    clearTimeout(t);
    res.status(200).json({ items, podcastTitle: feed.title || "" });
  } catch (e) {
    clearTimeout(t);
    res.status(500).json({ error: "RSS fetch/parse failed" });
  }
}

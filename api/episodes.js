import Parser from "rss-parser";

export default async function handler(req, res) {
  const feedUrl = req.query.feedUrl ? String(req.query.feedUrl) : "";
  const limit = Math.min(Number(req.query.limit || 20), 50);

  if (!feedUrl) return res.status(400).json({ error: "Missing feedUrl" });

  try {
    const parser = new Parser({
      customFields: { item: [["itunes:duration", "itunesDuration"]] }
    });

    const feed = await parser.parseURL(feedUrl);

    const items = (feed.items || []).slice(0, limit).map((it) => ({
      title: it.title || "",
      pubDate: it.pubDate || "",
      link: it.link || "",
      description: (it.contentSnippet || it.summary || "").toString(),
      itunesDuration: it.itunesDuration || "",
      enclosureUrl: it.enclosure?.url || ""
    }));

    res.status(200).json({ items, podcastTitle: feed.title || "" });
  } catch (e) {
    res.status(500).json({ error: "RSS fetch/parse failed" });
  }
}


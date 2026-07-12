function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setCorsHeaders(res, origin) {
  const allowed = process.env.ALLOWED_ORIGIN || "*";
  const value =
    allowed === "*" || origin === allowed ? allowed : allowed.split(",")[0];
  res.setHeader("Access-Control-Allow-Origin", value);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCorsHeaders(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const { name, phone, city, type, budget } = req.body || {};

  if (!name?.trim() || !phone?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const text = [
    "🏠 <b>Новая заявка с сайта</b>",
    "",
    `👤 Имя: ${escapeHtml(name.trim())}`,
    `📞 Телефон: ${escapeHtml(phone.trim())}`,
    `📍 Город: ${escapeHtml(city || "—")}`,
    `🏢 Что ищут: ${escapeHtml(type || "—")}`,
    `💰 Бюджет: ${escapeHtml(budget || "—")}`,
  ].join("\n");

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error("Telegram API error:", details);
      return res.status(502).json({ error: "Telegram delivery failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Telegram request failed:", error);
    return res.status(502).json({ error: "Telegram delivery failed" });
  }
}

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const ACCESS_TOKEN = "je6rkufkJko4VwdKUgH/0U/tgXgp5J3rezOeMWP5wDFkVSoJxz6b1q4hMOcMmC6j5+PlR1PebVSPSgsufcnsIoqRT6lwiNgWL8FY8ev0aHUr3lu7hgNQjsgCr8PXZmvsSfEiXQe+lPvmWBZ5s70QIwdB04t89/1O/w1cDnyilFU=";

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type === "message") {
      const msg = event.message.text;

      let reply = "";

      if (msg === "1") {
        reply = "痛みですね。\n予約はこちら\nhttps://example.com";
      } else {
        reply = "1と送ってください";
      }

      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: reply }],
        }),
      });
    }
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);

const https = require("https");

/**
 * Send an Expo push notification to a single token.
 * Silently ignores invalid / null tokens.
 *
 * @param {string|null} expoPushToken  - The Expo push token (ExponentPushToken[...])
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendPush(expoPushToken, { title, body, data = {} }) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken[")) return;

  const message = JSON.stringify({
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "exp.host",
        path: "/--/api/v2/push/send",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(message),
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => { raw += chunk; });
        res.on("end", () => resolve(raw));
      }
    );
    req.on("error", reject);
    req.write(message);
    req.end();
  });
}

module.exports = { sendPush };

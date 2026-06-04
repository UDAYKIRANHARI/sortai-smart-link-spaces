import axios from "axios";
import * as cheerio from "cheerio";

const url = "https://www.instagram.com/reel/DVX--TmESQj/";

const userAgents = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_patched.html)",
  discord: "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
  slack: "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
  twitter: "Twitterbot/1.0"
};

async function testAgent(name: string, ua: string) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": ua,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      }
    });

    const $ = cheerio.load(response.data);
    const title = $("title").first().text().trim();
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDesc = $('meta[property="og:description"]').attr("content");

    console.log(`=== UA: ${name} ===`);
    console.log(`Status: ${response.status}`);
    console.log(`Title: ${title}`);
    console.log(`og:title: ${ogTitle || "none"}`);
    console.log(`og:desc: ${ogDesc || "none"}`);
    console.log(`HTML snippet (first 300 chars): ${response.data.slice(0, 300).replace(/\s+/g, " ")}`);
    console.log("=====================\n");
  } catch (err: any) {
    console.error(`=== UA: ${name} FAILED ===`);
    console.error(err.message);
    if (err.response) {
      console.error(`Status: ${err.response.status}`);
      console.error(`Headers:`, err.response.headers);
    }
    console.log("=====================\n");
  }
}

async function run() {
  for (const [name, ua] of Object.entries(userAgents)) {
    await testAgent(name, ua);
  }
}

run();

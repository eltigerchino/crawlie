import fs from "node:fs";
import { write } from "./utils.mjs";

const config = {
  target_url: new URL("https://lemonbae.xyz"),
  output_dir: "./dist",
};

const ORIGIN_REGEX = /(https:\/\/lemonbae\.xyz)|(https:\\\/\\\/lemonbae\.xyz)/g;

const RESOURCE_REGEX = /(?<=href="|source="|src="|url\().*?(?="|\))/g;

/** @type {Set<string>} */
const prerendered = new Set();

/**
 * @param {string} html
 */
async function crawl(html) {
  const related_resources = html.matchAll(RESOURCE_REGEX);
  for (const resource of related_resources) {
    const url = new URL(resource.toString(), config.target_url);
    if (url.origin !== config.target_url.origin) continue;
    prerender(url);
  }
}

/**
 *
 * @param {Response} response
 */
async function save(response) {
  let text = await response.text();

  const url = new URL(response.url);

  let output_path = `${config.output_dir}${url.pathname}`;

  if (response.headers.get("content-type")?.includes("text/html")) {
    await crawl(text);

    text = text.replace(ORIGIN_REGEX, "");

    if (output_path.endsWith("/")) {
      output_path += "index.html";
    } else {
      output_path += ".html";
    }
  }

  if (output_path.endsWith("/")) {
    console.warn("  Skipping:", output_path);
    return;
  }

  console.log(`  ${url} at ${output_path}`);

  // strip origin from urls in the document
  write(output_path, text);
}

/**
 * @param {URL} url
 */
async function prerender(url) {
  if (prerendered.has(url.pathname)) return;

  prerendered.add(url.pathname);

  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Failed to fetch ${url.href}`);
    return;
  }

  await save(response);
}

async function main() {
  if (fs.existsSync(config.output_dir)) {
    fs.rmSync(config.output_dir, { recursive: true });
  }
  fs.mkdirSync(config.output_dir, { recursive: true });

  console.log("Prerendering...");
  await prerender(config.target_url);
}

main();

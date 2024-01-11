import fs from "node:fs";
import { write } from "./utils.js";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import path from "node:path";

const ORIGIN_REGEX = /(https:\/\/lemonbae\.xyz)|(https:\\\/\\\/lemonbae\.xyz)/g;

const RESOURCE_REGEX =
  /(?<=href="|source="|src="|href='|source='|src='|url\().*?(?="|'|\))/g;

const SRCSET_REGEX = /(?<=srcset="|srcset=').*?(?="|')/g;

/** @type {Set<string>} */
const prerendered = new Set();

const RESOURCE_PREFIXES = ["http", ".", "/"];

/**
 * @param {URL} current_url
 * @param {string[]} resources
 * @param {import("./types.js").Config} config
 */
function validate(current_url, resources, config) {
  for (const resource of resources) {
    const url = new URL(resource, current_url);
    if (url.origin !== config.targetUrl.origin) {
      console.log(`Skipping resource: ${url.pathname}`);
      continue;
    }
    prerender(url, config);
  }
}

/**
 * @param {URL} current_url
 * @param {string} html
 * @param {import("./types.js").Config} config
 */
async function crawl(current_url, html, config) {
  const srcset_strings = html.matchAll(SRCSET_REGEX);
  for (const srcset_string of srcset_strings) {
    const results = srcset_string.toString().split(" ");

    const resources = results.filter((result) => {
      return RESOURCE_PREFIXES.some((prefix) => {
        return result.startsWith(prefix);
      });
    });

    validate(current_url, resources, config);
  }

  const regex_results = html.matchAll(RESOURCE_REGEX);
  let resources = [];
  for (const item of regex_results) {
    resources.push(item.toString());
  }
  validate(current_url, resources, config);
}

/**
 *
 * @param {Response} response
 * @param {import("./types.js").Config} config
 */
async function save(response, config) {
  const url = new URL(response.url);
  console.log(`\t${url.pathname}`);

  let output_path = `${config.outputDir}${url.pathname}`;

  if (response.headers.get("content-type")?.includes("image/")) {
    fs.mkdirSync(path.dirname(output_path), { recursive: true });
    const stream = fs.createWriteStream(output_path, { flags: "wx" });
    // @ts-ignore
    await finished(Readable.fromWeb(response.body).pipe(stream));
    return;
  }

  let text = await response.text();

  if (response.headers.get("content-type")?.includes("text/html")) {
    await crawl(new URL(response.url), text, config);

    if (!output_path.endsWith("/") && !output_path.endsWith(".html")) {
      output_path += ".html";
    }
  }

  if (output_path.endsWith("/")) {
    output_path += "index.html";
  }

  // strip origin from urls in the document
  text = text.replace(ORIGIN_REGEX, "");

  write(output_path, text);
}

/**
 * @param {URL} url
 * @param {import("./types.js").Config} config
 */
export async function prerender(url, config) {
  // let filepath = `${config.outputDir}${url.pathname}`;

  // const is_file = url.pathname === "/" || !url.pathname.endsWith("/");
  // const is_pathname =
  //   url.pathname.endsWith("/") && fs.readdirSync(filepath).length > 0;
  // if (fs.existsSync(filepath)) {
  //   if (is_file) {
  //     prerendered.add(url.pathname);

  //     if (fs.existsSync(filepath + "index.html")) {
  //       filepath += "index.html";
  //     } else if (fs.existsSync(filepath + ".html")) {
  //       filepath += ".html";
  //     }

  //     if (filepath.endsWith(".html")) {
  //       prerendered.add(url.pathname);
  //       await crawl(fs.readFileSync(filepath, "utf-8"), config);
  //     }
  //     return;
  //   } else if (is_pathname) {
  //     for (const file of fs.readdirSync(filepath)) {
  //       const file_path = `${filepath}/${file}`;
  //       if (file_path.endsWith(".html")) {
  //         prerendered.add(url.pathname);
  //         await crawl(fs.readFileSync(file_path, "utf-8"), config);
  //       }
  //     }
  //   }
  // }

  if (prerendered.has(url.pathname)) return;

  prerendered.add(url.pathname);

  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Failed to fetch ${url.href}`);
    return;
  }

  await save(response, config);
}

/**
 *
 * @param {import("./types.js").Config} config
 */
export function init(config) {
  if (fs.existsSync(config.outputDir)) {
    fs.rmSync(config.outputDir, { recursive: true });
    return;
  }
  fs.mkdirSync(config.outputDir, { recursive: true });
}

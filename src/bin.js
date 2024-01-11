#!/usr/bin/env node

import config from "../crawler.config.js";
import { init, prerender } from "./prerender.js";

console.log(process.argv);

init(config);
console.log("Prerendering...");
await prerender(config.targetUrl, config);

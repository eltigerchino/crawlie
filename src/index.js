import { init, prerender } from "./prerender.js";
import config from "../crawler.config.js";

init(config);
console.log("Prerendering...");
await prerender(config.targetUrl, config);

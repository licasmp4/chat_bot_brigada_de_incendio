// Self-check do mdToHtml (frontend/js/chat.js). Rode: node frontend/js/test_md.js
const fs = require("fs");
const path = require("path");
const assert = require("assert");

const src = fs.readFileSync(path.join(__dirname, "chat.js"), "utf8");
const fnSrc = src.match(/function mdToHtml[\s\S]*?\n}/)[0];
const mdToHtml = eval(`(${fnSrc})`);

assert(mdToHtml("**crítico**").includes("<strong>crítico</strong>"), "negrito");
assert(mdToHtml("## Passos").includes("<h4>Passos</h4>"), "título");
assert(mdToHtml("- água\n- espuma").includes("<ul>\n<li>água</li>\n<li>espuma</li>\n</ul>"), "lista ul");
assert(mdToHtml("1. saia\n2. ligue 193").includes("<ol>"), "lista ol");
assert(mdToHtml("use `CO2` aqui").includes("<code>CO2</code>"), "código inline");
assert(mdToHtml("<script>alert(1)</script>").includes("&lt;script&gt;"), "escapa HTML");
assert(!mdToHtml("<img src=x onerror=alert(1)>").includes("<img"), "sem injeção de tag");
assert(mdToHtml("linha um\n\nlinha dois") === "<p>linha um</p>\n<p>linha dois</p>", "parágrafos");
assert(mdToHtml("```\ncodigo <x>\n```").includes("<pre><code>\ncodigo &lt;x&gt;\n</code></pre>"), "bloco de código");

console.log("OK - mdToHtml valid");

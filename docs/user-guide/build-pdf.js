// Builds Vision-Empower-User-Guide.pdf from README.md + images/.
// Run from apps/vision_empower:  node docs/user-guide/build-pdf.js
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const { marked } = require("marked");
const { chromium } = require("@playwright/test");

const DIR = __dirname;
const OUT = path.join(DIR, "Vision-Empower-User-Guide.pdf");

// GitHub-style heading ids, so the README's "#3-finding-your-way-around"
// links keep working inside the PDF.
const slug = (text) =>
	text
		.toLowerCase()
		.replace(/<[^>]+>/g, "")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s/g, "-");

// Screenshots are taken at 1440px wide with the app's sidebar on the left.
// In print, the sidebar is cropped off (except where it's the point) so the
// content gets the full page width, and tall screenshots are cut into
// page-sized slices instead of being shrunk to fit one page.
const SIDEBAR_PX = 220;
const KEEP_SIDEBAR = new Set(["global-search.png", "login.png"]);
const SLICE_PX = 1300; // ≈ two-thirds of an A4 page at full width

function pngSize(file) {
	const header = fs.readFileSync(file).subarray(16, 24);
	return { width: header.readUInt32BE(0), height: header.readUInt32BE(4) };
}

function screenshot(src, alt) {
	const file = path.join(DIR, src);
	const name = path.basename(src);
	const { width, height } = pngSize(file);
	const left = KEEP_SIDEBAR.has(name) ? 0 : SIDEBAR_PX;
	const shown = width - left;
	const slices = [];
	for (let top = 0; top < height; top += SLICE_PX) {
		const sliceHeight = Math.min(SLICE_PX, height - top);
		if (sliceHeight < 60 && top > 0) break; // don't print a sliver
		slices.push(
			`<div class="shot" style="aspect-ratio: ${shown} / ${sliceHeight}">` +
				`<img src="${src}" alt="" style="width: ${(width / shown) * 100}%; ` +
				`margin-left: -${(left / shown) * 100}%; margin-top: -${(top / shown) * 100}%"></div>`
		);
	}
	return `<figure>${slices.join("")}<figcaption>${alt}</figcaption></figure>`;
}

marked.use({
	renderer: {
		heading({ tokens, depth }) {
			const text = this.parser.parseInline(tokens);
			return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
		},
		// Images anywhere (e.g. inside a list item) become sliced figures too.
		image({ href, text }) {
			return screenshot(href, text);
		},
		paragraph({ tokens }) {
			// A paragraph that is just an image → a captioned, sliced figure.
			if (tokens.length === 1 && tokens[0].type === "image") return screenshot(tokens[0].href, tokens[0].text);
			return `<p>${this.parser.parseInline(tokens)}</p>\n`;
		},
	},
});

// The README's last section is for developers (regenerating screenshots).
const markdown = fs
	.readFileSync(path.join(DIR, "README.md"), "utf-8")
	.split(/\n### Keeping this guide's screenshots up to date/)[0]
	.replace(/^# .*\n/, ""); // the cover page carries the title

const body = marked.parse(markdown);
const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Vision Empower — User Guide</title>
<style>
	@page { size: A4; margin: 18mm 16mm 20mm; }
	* { box-sizing: border-box; }
	body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
		font-size: 10.5pt; line-height: 1.5; color: #111827; margin: 0; }
	.cover { height: 250mm; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
	.cover .mark { width: 22mm; height: 22mm; border-radius: 5mm; background: linear-gradient(135deg, #3b82f6, #8b5cf6); margin-bottom: 10mm; }
	.cover h1 { font-size: 30pt; margin: 0 0 3mm; letter-spacing: -0.02em; }
	.cover .sub { font-size: 14pt; color: #4b5563; margin: 0 0 14mm; }
	.cover .roles { font-size: 11pt; color: #1e293b; }
	.cover .date { margin-top: 18mm; font-size: 10pt; color: #6b7280; }
	h2 { font-size: 17pt; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid #3b82f6; page-break-before: always; }
	h3 { font-size: 12.5pt; margin: 6mm 0 2mm; color: #1e293b; page-break-after: avoid; }
	p, ul, ol { margin: 0 0 3mm; }
	li { margin-bottom: 1mm; }
	a { color: #2563eb; text-decoration: none; }
	code { font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt; background: #f1f5f9; padding: 0.3mm 1.2mm; border-radius: 1mm; }
	pre { background: #f1f5f9; padding: 3mm; border-radius: 2mm; overflow: hidden; }
	blockquote { margin: 0 0 4mm; padding: 2mm 4mm; border-left: 3px solid #3b82f6; background: #eff6ff; color: #1e3a8a; }
	blockquote p { margin: 0; }
	table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9.5pt; page-break-inside: avoid; }
	th { text-align: left; background: #f1f5f9; font-weight: 600; }
	th, td { border: 1px solid #d1d5db; padding: 1.6mm 2.2mm; vertical-align: top; }
	figure { margin: 3mm 0 5mm; }
	.shot { width: 100%; overflow: hidden; border: 1px solid #d1d5db; border-bottom: none; page-break-inside: avoid; }
	.shot:last-of-type { border-bottom: 1px solid #d1d5db; }
	.shot + .shot { border-top: 1px dashed #cbd5e1; }
	.shot img { display: block; max-width: none; }
	img { max-width: 100%; }
	figcaption { font-size: 8.5pt; color: #6b7280; margin-top: 1.5mm; text-align: center; }
	strong { font-weight: 600; }
	h2 + p strong:first-child { color: #1e293b; }
</style></head><body>
<section class="cover">
	<div class="mark"></div>
	<h1>Vision Empower</h1>
	<p class="sub">User Guide &amp; Onboarding</p>
	<p class="roles">For Field Users, Senior Managers, Admins and Finance —<br>what you'll see, what you do, and how a purchase request moves from start to finish.</p>
	<p class="date">${today}</p>
</section>
${body}
</body></html>`;

(async () => {
	// Written next to the images so their relative paths resolve.
	const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ve-guide-")), "guide.html");
	fs.writeFileSync(tmp, html.replace(/src="images\//g, `src="${pathToFileURL(path.join(DIR, "images")).href}/`));

	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
	await page.pdf({
		path: OUT,
		format: "A4",
		printBackground: true,
		displayHeaderFooter: true,
		headerTemplate: "<span></span>",
		footerTemplate: `<div style="width:100%;font-size:8pt;color:#6b7280;padding:0 16mm;display:flex;justify-content:space-between;font-family:-apple-system,Arial,sans-serif">
			<span>Vision Empower — User Guide</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
		margin: { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
	});
	await browser.close();
	fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
	console.log(`Wrote ${OUT}`);
})();

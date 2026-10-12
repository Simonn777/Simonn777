import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, dirname, join, relative, sep } from "node:path";

const root = resolve("site");
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(join(path, entry.name))
          : [join(path, entry.name)],
      ),
    )
  ).flat();
}
const pages = (await walk(root)).filter((path) => path.endsWith(".html"));
const failures = [];
let checked = 0;
for (const page of pages) {
  const html = await readFile(page, "utf8");
  for (const match of html.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)) {
    const ref = match[1];
    if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(ref)) continue;
    const [rawPath, fragment] = ref.split("#");
    let target = rawPath
      ? resolve(dirname(page), decodeURIComponent(rawPath.split("?")[0]))
      : page;
    checked++;
    try {
      if (target !== root && !target.startsWith(root + sep))
        throw new Error("outside published directory");
      if ((await stat(target)).isDirectory())
        target = join(target, "index.html");
      const data = await readFile(target);
      if (fragment && target.endsWith(".html")) {
        const ids = [
          ...data.toString().matchAll(/\bid\s*=\s*["']([^"']+)["']/g),
        ].map((m) => m[1]);
        if (!ids.includes(decodeURIComponent(fragment)))
          throw new Error(`missing fragment #${fragment}`);
      }
    } catch (error) {
      failures.push(`${relative(root, page)} → ${ref}: ${error.message}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Checked ${checked} local references across ${pages.length} HTML pages.`,
  );

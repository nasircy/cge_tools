import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const privateValues = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"private_key"\s*:\s*"/,
  /AIza[0-9A-Za-z_-]{35}/,
  /gh[pousr]_[0-9A-Za-z]{30,}/,
  /github_pat_[0-9A-Za-z_]{40,}/,
];
const backendCode = [
  /(?:from\s*["']|import\(["'])firebase(?:\/|["'])/,
  /(?:firebasedatabase\.app|firebaseio\.com|firebaseapp\.com)/,
];
async function walk(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry =>
    entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
if (Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies }).some(name => /firebase|supabase|aws-sdk/.test(name))) throw Error("Backend SDK dependency is not allowed.");
const trackedAndNew = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const files = [...new Set([...trackedAndNew, ...await walk("dist")])];
for (const path of files) {
  const bytes = await readFile(path);
  const contents = [bytes.toString("utf8")];
  if (/\.(?:docx?|xlsx?|pdf|pem|key)$/i.test(path)) throw Error(`Private document or credential asset is not allowed in the public repository: ${path}`);
  if (contents.some(text => [...privateValues, ...backendCode].some(pattern => pattern.test(text)))) throw Error(`Private credential or backend reference detected: ${path}`);
  if (/adminsdk|serviceAccount|credentials.*\.json$|\.(?:key|pem)$/i.test(path)) throw Error(`Unexpected credential filename: ${path}`);
}
console.log("Verified: static build, no backend SDK or endpoints, no detected credential values, and no Word/sample document files.");

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Owner = { name: string; userId: string };
type Book = Record<string, Owner>;

const file = path.join(process.cwd(), ".data", "usernames.json");

let chain: Promise<unknown> = Promise.resolve();

function keyOf(username: string) {
  return username.trim().toLowerCase();
}

async function readBook(): Promise<Book> {
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as Book;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function claim(username: string, userId: string) {
  const name = username.trim();
  const key = keyOf(name);
  if (!key || key.length > 16 || !userId) return "invalid" as const;

  const book = await readBook();
  const taken = book[key];
  if (taken && taken.userId !== userId) return "exists" as const;

  for (const [existing, owner] of Object.entries(book)) {
    if (owner.userId === userId && existing !== key) delete book[existing];
  }

  book[key] = { name, userId };
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(book, null, 2));
  return "ok" as const;
}

export function claimUsername(username: string, userId: string) {
  const run = chain.then(() => claim(username, userId));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

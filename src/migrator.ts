import Database from "better-sqlite3";
import fsp from "fs/promises";
import path from "path";
const db = new Database(path.join(__dirname, "../data.db"));

const args = process.argv;
const command = (args[2] || "").toLowerCase();

function padNum(value: number) {
  return value.toString().padStart(2, "0");
}

async function getMigrationFiles() {
  const base = path.join(__dirname, "../migrations");
  const entries = await fsp.readdir(base);
  return entries.map((x) => path.join(base, x));
}

async function main() {
  switch (command) {
    case "create":
      const date = new Date();
      const title = (args[3] || "").replace(/\s/g, "-");
      if (!title) {
        console.log("No migration name provided");
      }
      const stamp =
        date.getFullYear() +
        padNum(date.getMonth()) +
        padNum(date.getDate()) +
        padNum(date.getHours()) +
        padNum(date.getMinutes()) +
        padNum(date.getSeconds());

      const fileName = `${stamp}-${title}.ts`;
      await fsp.writeFile(
        path.join(__dirname, "../migrations/", fileName),
        "",
        {
          encoding: "utf8",
        }
      );
      break;
    case "migrate":
      db.pragma("journal_mode=WAL");
      db.prepare(
        "create table if not exists migrations(name text not null)"
      ).run();
      const migrations = db.prepare(`select * from migrations`).all();
      const filesToRun = await getMigrationFiles();
      for (const file of filesToRun) {
        const migrationName = path.basename(file);
        if (migrations.find((m) => m.name === migrationName)) {
          continue;
        }
        const migration = await import(file);
        if (migration.up && typeof migration.up == "function") {
          try {
            db.transaction(() => {
              migration.up(db);
              db.prepare(`insert into migrations values (:name)`).run({
                name: migrationName,
              });
            }).default();
          } catch (e) {
            console.log(e);
          }
        }
      }
      break;
  }
}

main();

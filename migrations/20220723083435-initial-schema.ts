import { Database } from "better-sqlite3";

export function up(db: Database) {
  console.log("running");
  db.prepare(
    `create table if not exists testing (id integer primary key autoincrement, name text not null)`
  ).run();
}

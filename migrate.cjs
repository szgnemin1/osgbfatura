const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(process.cwd(), 'database.sqlite'));
try {
  db.exec("ALTER TABLE firms ADD COLUMN hazardClass TEXT;");
  console.log("Column added.");
} catch (e) {
  console.log("Error:", e.message);
}
db.close();

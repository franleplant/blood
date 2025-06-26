# Use the `sqlite` package for database access

For all SQLite database operations, use the `sqlite` package. This package provides a modern, promise-based API that is compatible with `async/await`.

## Rationale

- **Promise-based API:** The `sqlite` package returns promises from its database operations, which makes it easy to work with `async/await` and avoids the "callback hell" often associated with older database libraries.
- **`sqlite3` driver:** The `sqlite` package acts as a wrapper around the `sqlite3` driver, providing a more modern API while still using the battle-tested `sqlite3` engine.
- **Resource Management:** As of version 5.1.0, the `sqlite` package supports `Symbol.asyncDispose`, which allows for easy resource management with the `await using` syntax.

## How to use

1.  **Import:** Import the `sqlite` and `sqlite3` packages.
2.  **Open a connection:** Use `sqlite.open()` to open a database connection.
3.  **Run queries:** Use `db.all()`, `db.get()`, `db.run()`, etc., to execute queries.
4.  **Close the connection:** Use `await using` or `db.close()` to close the connection.

## Examples

### Good ✅

```typescript
import * as sqlite from "sqlite";
import sqlite3Driver from "sqlite3";

async function getUsers() {
  await using db = await sqlite.open({
    filename: "/path/to/db.sqlite",
    driver: sqlite3Driver.Database,
  });

  const users = await db.all("SELECT * FROM users");
  return users;
}
```

### Bad ❌

```typescript
// Bad: using the sqlite3 package directly with callbacks
import sqlite3 from "sqlite3";

const db = new sqlite3.Database("/path/to/db.sqlite");

db.all("SELECT * FROM users", (err, rows) => {
  if (err) {
    // handle error
  }
  // ...
});
```

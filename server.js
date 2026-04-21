const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
  host: "localhost",
  user: "autoevi_user",
  password: "autoevi123",
  database: "autoevi"
});

function dbQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function ensureSchema() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS car_suggestions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(100) NOT NULL,
      engine VARCHAR(50) NOT NULL,
      consumption VARCHAR(20) NOT NULL,
      years VARCHAR(20) NOT NULL,
      image TEXT NOT NULL,
      note TEXT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

db.connect(async (err) => {
  if (err) {
    console.error("MySQL error:", err.message);
    process.exit(1);
  }

  try {
    await ensureSchema();
    console.log("MySQL connected");
  } catch (schemaErr) {
    console.error("Schema error:", schemaErr.message);
    process.exit(1);
  }
});

app.post("/register", async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json("Vypln uzivatelske jmeno i heslo");
  }

  if (password.length < 4) {
    return res.status(400).json("Heslo musi mit alespon 4 znaky");
  }

  db.query(
    "SELECT id FROM users WHERE username=?",
    [username],
    async (err, rows) => {
      if (err) return res.status(500).json(err);
      if (rows.length > 0) {
        return res.status(409).json("Uzivatel uz existuje");
      }

      try {
        const hash = await bcrypt.hash(password, 10);
        db.query(
          "INSERT INTO users (username, password, role) VALUES (?,?,?)",
          [username, hash, "user"],
          (insertErr, result) => {
            if (insertErr) return res.status(500).json(insertErr);

            res.json({
              id: result.insertId,
              username,
              role: "user"
            });
          }
        );
      } catch (hashErr) {
        res.status(500).json(hashErr.message);
      }
    }
  );
});

app.post("/login", async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();

  if (!username || !password) {
    return res.status(400).json("Vypln uzivatelske jmeno i heslo");
  }

  db.query(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err, rows) => {
      if (err) return res.status(500).json(err);
      if (rows.length === 0) {
        return res.status(404).json("Uzivatel neexistuje");
      }

      const ok = await bcrypt.compare(password, rows[0].password);
      if (!ok) return res.status(401).json("Spatne heslo");

      res.json({
        id: rows[0].id,
        username: rows[0].username,
        role: rows[0].role
      });
    }
  );
});

app.get("/posts/:carId", (req, res) => {
  db.query(
    `SELECT posts.id, posts.text, users.username
     FROM posts
     JOIN users ON users.id = posts.user_id
     WHERE car_id=?
     ORDER BY posts.created_at DESC`,
    [req.params.carId],
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.post("/posts", (req, res) => {
  const { carId, userId, text } = req.body;

  db.query(
    "INSERT INTO posts (car_id, user_id, text) VALUES (?,?,?)",
    [carId, userId, text],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json("OK");
    }
  );
});

app.delete("/posts/:id", (req, res) => {
  if (req.body.userRole !== "admin") {
    return res.status(403).json("Zakazano");
  }

  db.query("DELETE FROM posts WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json("Smazano");
  });
});

app.post("/car-suggestions", async (req, res) => {
  const { userId, name, engine, consumption, years, image, note } = req.body;
  const cleanName = name?.trim();

  if (!userId) return res.status(401).json("Nejdriv se prihlas");
  if (!cleanName || !engine || !consumption || !years || !image) {
    return res.status(400).json("Vypln vsechny povinne udaje");
  }

  try {
    const users = await dbQuery("SELECT id FROM users WHERE id = ?", [userId]);
    if (!users.length) return res.status(404).json("Uzivatel neexistuje");

    const existingCars = await dbQuery(
      "SELECT id FROM cars WHERE LOWER(name) = LOWER(?)",
      [cleanName]
    );
    if (existingCars.length) {
      return res.status(409).json("Tohle auto uz v katalogu existuje");
    }

    const existingSuggestions = await dbQuery(
      "SELECT id FROM car_suggestions WHERE LOWER(name) = LOWER(?) AND status IN ('pending', 'approved')",
      [cleanName]
    );
    if (existingSuggestions.length) {
      return res.status(409).json("Na tohle auto uz existuje aktivni navrh");
    }

    const result = await dbQuery(
      `INSERT INTO car_suggestions (user_id, name, engine, consumption, years, image, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, cleanName, engine.trim(), consumption.trim(), years.trim(), image.trim(), note?.trim() || null]
    );

    res.json({ id: result.insertId, message: "Navrh byl odeslan adminovi" });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.get("/cars/:id/rating", async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT
        ROUND(AVG(rating), 1) AS averageRating,
        COUNT(*) AS ratingCount
       FROM ratings
       WHERE car_id = ?`,
      [req.params.id]
    );

    res.json({
      averageRating: rows[0].averageRating || 0,
      ratingCount: rows[0].ratingCount || 0
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.post("/cars/:id/rating", async (req, res) => {
  const { userId, rating } = req.body;
  const normalizedRating = Number(rating);

  if (!userId) return res.status(401).json("Nejdriv se prihlas");
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json("Hodnoceni musi byt mezi 1 a 5");
  }

  try {
    const users = await dbQuery("SELECT id FROM users WHERE id = ?", [userId]);
    if (!users.length) return res.status(404).json("Uzivatel neexistuje");

    const cars = await dbQuery("SELECT id FROM cars WHERE id = ?", [req.params.id]);
    if (!cars.length) return res.status(404).json("Auto neexistuje");

    const existing = await dbQuery(
      "SELECT id FROM ratings WHERE car_id = ? AND user_id = ?",
      [req.params.id, userId]
    );

    if (existing.length) {
      await dbQuery(
        "UPDATE ratings SET rating = ? WHERE id = ?",
        [normalizedRating, existing[0].id]
      );
    } else {
      await dbQuery(
        "INSERT INTO ratings (car_id, user_id, rating) VALUES (?, ?, ?)",
        [req.params.id, userId, normalizedRating]
      );
    }

    const summary = await dbQuery(
      `SELECT
        ROUND(AVG(rating), 1) AS averageRating,
        COUNT(*) AS ratingCount
       FROM ratings
       WHERE car_id = ?`,
      [req.params.id]
    );

    res.json({
      averageRating: summary[0].averageRating || 0,
      ratingCount: summary[0].ratingCount || 0
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.get("/admin/stats", (req, res) => {
  db.query(
    `SELECT
      (SELECT COUNT(*) FROM users) users,
      (SELECT COUNT(*) FROM posts) posts,
      (SELECT COUNT(*) FROM car_suggestions WHERE status = 'pending') pendingSuggestions`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows[0]);
    }
  );
});

app.get("/admin/users", (req, res) => {
  db.query("SELECT id, username, role FROM users", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.put("/admin/users/:id", (req, res) => {
  db.query(
    "UPDATE users SET role=? WHERE id=?",
    [req.body.role, req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json("OK");
    }
  );
});

app.get("/admin/posts", (req, res) => {
  db.query(
    `SELECT posts.id, posts.text, users.username
     FROM posts
     JOIN users ON users.id = posts.user_id
     ORDER BY posts.created_at DESC
     LIMIT 10`,
    (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows);
    }
  );
});

app.get("/admin/car-suggestions", async (req, res) => {
  try {
    const rows = await dbQuery(
      `SELECT car_suggestions.*, users.username
       FROM car_suggestions
       JOIN users ON users.id = car_suggestions.user_id
       ORDER BY
         CASE car_suggestions.status
           WHEN 'pending' THEN 0
           WHEN 'approved' THEN 1
           ELSE 2
         END,
         car_suggestions.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.post("/admin/car-suggestions/:id/approve", async (req, res) => {
  if (req.body.userRole !== "admin") {
    return res.status(403).json("Zakazano");
  }

  try {
    const suggestions = await dbQuery(
      "SELECT * FROM car_suggestions WHERE id = ?",
      [req.params.id]
    );

    if (!suggestions.length) {
      return res.status(404).json("Navrh nebyl nalezen");
    }

    const suggestion = suggestions[0];
    if (suggestion.status !== "pending") {
      return res.status(400).json("Navrh uz byl vyrizen");
    }

    const existingCars = await dbQuery("SELECT id FROM cars WHERE LOWER(name) = LOWER(?)", [suggestion.name]);
    if (existingCars.length > 0) {
      return res.status(409).json("Auto uz v katalogu existuje");
    }

    const result = await dbQuery(
      "INSERT INTO cars (name, engine, consumption, years, image) VALUES (?, ?, ?, ?, ?)",
      [suggestion.name, suggestion.engine, suggestion.consumption, suggestion.years, suggestion.image]
    );

    await dbQuery(
      "UPDATE car_suggestions SET status = 'approved', reviewed_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    res.json({ id: result.insertId, message: "Navrh byl schvalen" });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.post("/admin/car-suggestions/:id/reject", async (req, res) => {
  if (req.body.userRole !== "admin") {
    return res.status(403).json("Zakazano");
  }

  try {
    const suggestions = await dbQuery(
      "SELECT id, status FROM car_suggestions WHERE id = ?",
      [req.params.id]
    );

    if (!suggestions.length) {
      return res.status(404).json("Navrh nebyl nalezen");
    }

    if (suggestions[0].status !== "pending") {
      return res.status(400).json("Navrh uz byl vyrizen");
    }

    await dbQuery(
      "UPDATE car_suggestions SET status = 'rejected', reviewed_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    res.json({ message: "Navrh byl zamitnut" });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

app.get("/cars", (req, res) => {
  db.query("SELECT * FROM cars ORDER BY id DESC", (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get("/cars/:id", (req, res) => {
  db.query("SELECT * FROM cars WHERE id=?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows.length) return res.status(404).json("Not found");
    res.json(rows[0]);
  });
});

app.post("/cars", (req, res) => {
  const { userRole, name, engine, consumption, years, image } = req.body;

  if (userRole !== "admin") return res.status(403).json("Zakazano");
  if (!name || !engine || !consumption || !years || !image) {
    return res.status(400).json("Chybi data");
  }

  db.query(
    "INSERT INTO cars (name, engine, consumption, years, image) VALUES (?,?,?,?,?)",
    [name, engine, consumption, years, image],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId });
    }
  );
});

app.delete("/cars/:id", (req, res) => {
  const { userRole } = req.body;
  if (userRole !== "admin") return res.status(403).json("Zakazano");

  db.query("DELETE FROM cars WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json(err);
    res.json("Smazano");
  });
});

app.listen(3000, () => {
  console.log("SERVER bezi na http://localhost:3000");
});

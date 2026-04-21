const mysql = require("mysql2/promise");

const cars = [
  {
    name: "Skoda Octavia III Combi",
    engine: "2.0 TDI 110 kW",
    consumption: "4.8 l/100 km",
    years: "2017-2020",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Skoda Superb III Combi",
    engine: "2.0 TDI 140 kW",
    consumption: "5.3 l/100 km",
    years: "2019-2023",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Volkswagen Golf VII",
    engine: "1.5 TSI 110 kW",
    consumption: "5.4 l/100 km",
    years: "2017-2020",
    image: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Volkswagen Passat B8 Variant",
    engine: "2.0 TDI 110 kW",
    consumption: "5.1 l/100 km",
    years: "2018-2023",
    image: "https://images.unsplash.com/photo-1494905998402-395d579af36f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Audi A4 Avant B9",
    engine: "2.0 TDI 140 kW",
    consumption: "4.9 l/100 km",
    years: "2019-2023",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "BMW 320d Touring F31",
    engine: "2.0d 140 kW",
    consumption: "4.9 l/100 km",
    years: "2016-2019",
    image: "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Mercedes-Benz C 220 d T-Modell",
    engine: "2.0d 143 kW",
    consumption: "5.2 l/100 km",
    years: "2018-2021",
    image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Toyota Corolla Touring Sports",
    engine: "1.8 Hybrid 103 kW",
    consumption: "4.7 l/100 km",
    years: "2019-2024",
    image: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Hyundai i30 Kombi",
    engine: "1.5 T-GDI 117 kW",
    consumption: "5.7 l/100 km",
    years: "2020-2024",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Kia Ceed SW",
    engine: "1.5 T-GDI 118 kW",
    consumption: "5.8 l/100 km",
    years: "2021-2024",
    image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Ford Focus Kombi",
    engine: "1.0 EcoBoost 92 kW",
    consumption: "5.9 l/100 km",
    years: "2019-2024",
    image: "https://images.unsplash.com/photo-1489824904134-891ab64532f1?auto=format&fit=crop&w=1200&q=80"
  },
  {
    name: "Mazda 6 Wagon",
    engine: "2.0 Skyactiv-G 121 kW",
    consumption: "6.7 l/100 km",
    years: "2018-2023",
    image: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80"
  }
];

async function seed() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "autoevi_user",
    password: "autoevi123",
    database: "autoevi"
  });

  let inserted = 0;
  let skipped = 0;

  for (const car of cars) {
    const [rows] = await db.execute("SELECT id FROM cars WHERE name = ?", [car.name]);

    if (rows.length > 0) {
      skipped += 1;
      continue;
    }

    await db.execute(
      "INSERT INTO cars (name, engine, consumption, years, image) VALUES (?, ?, ?, ?, ?)",
      [car.name, car.engine, car.consumption, car.years, car.image]
    );
    inserted += 1;
  }

  const [allCars] = await db.execute("SELECT id, name, engine, consumption, years FROM cars ORDER BY id DESC");
  await db.end();

  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(JSON.stringify(allCars, null, 2));
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});

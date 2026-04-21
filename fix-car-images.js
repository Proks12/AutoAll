const mysql = require("mysql2/promise");

const updates = {
  "Škoda Octavia": "https://commons.wikimedia.org/wiki/Special:FilePath/%C5%A0koda_Octavia_III_1.6_TDI_Combi_%282017%29_%2852181854171%29.jpg",
  "Ford Mondeo": "https://commons.wikimedia.org/wiki/Special:FilePath/Ford_Mondeo_2008.jpg",
  "Skoda Octavia III Combi": "https://commons.wikimedia.org/wiki/Special:FilePath/Skoda_Octavia_III_Combi_01_2013-06-15.jpg",
  "Skoda Superb III Combi": "https://commons.wikimedia.org/wiki/Special:FilePath/%C5%A0koda_Superb_III_Combi_in_Aardenburg.jpg",
  "Volkswagen Golf VII": "https://commons.wikimedia.org/wiki/Special:FilePath/VW_Golf_VII.jpg",
  "Volkswagen Passat B8 Variant": "https://commons.wikimedia.org/wiki/Special:FilePath/Passat_B8_Variant.jpg",
  "Audi A4 Avant B9": "https://commons.wikimedia.org/wiki/Special:FilePath/Audi_A4_Avant_B9_IMG_1968.jpg",
  "BMW 320d Touring F31": "https://commons.wikimedia.org/wiki/Special:FilePath/BMW_320d_Touring_%28F31%29_%E2%80%93_Frontansicht%2C_11._Februar_2013%2C_D%C3%BCsseldorf.jpg",
  "Mercedes-Benz C 220 d T-Modell": "https://commons.wikimedia.org/wiki/Special:FilePath/Mercedes-Benz_C_220_d_T-Modell_%28S205%2C_2017%29_%2854718693902%29.jpg",
  "Toyota Corolla Touring Sports": "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota_Corolla_Touring_Sports_Hybrid_%28E210%29_IMG_2661.jpg",
  "Hyundai i30 Kombi": "https://commons.wikimedia.org/wiki/Special:FilePath/Hyundai_i30_kombi.jpg",
  "Kia Ceed SW": "https://commons.wikimedia.org/wiki/Special:FilePath/Kia_Ceed_sw_%282021%29_IMG_5804.jpg",
  "Ford Focus Kombi": "https://commons.wikimedia.org/wiki/Special:FilePath/Ford_Focus_Turnier.jpg",
  "Mazda 6 Wagon": "https://commons.wikimedia.org/wiki/Special:FilePath/Mazda_6_Wagon.jpg"
};

async function main() {
  const db = await mysql.createConnection({
    host: "localhost",
    user: "autoevi_user",
    password: "autoevi123",
    database: "autoevi"
  });

  let changed = 0;

  for (const [name, image] of Object.entries(updates)) {
    const [result] = await db.execute("UPDATE cars SET image = ? WHERE name = ?", [image, name]);
    changed += result.affectedRows;
  }

  const [rows] = await db.execute("SELECT id, name, image FROM cars ORDER BY id");
  await db.end();

  console.log(`Updated rows: ${changed}`);
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

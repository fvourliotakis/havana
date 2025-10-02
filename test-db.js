import mysql from "mysql2/promise";

const connectDB = async () => {
  try {
    const connection = await mysql.createConnection({
      host: "213.158.90.208", // ya "book.havana.gr"
      user: "havana_admin",
      password: "Simple@123",
      database: "hav-booking",
      port: 3306,
    });
    console.log("✅ Connected successfully!");
    const [rows] = await connection.query("SELECT NOW() as time");
    console.log("Server time:", rows[0].time);
    await connection.end();
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  }
};

connectDB();

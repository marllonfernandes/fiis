require("dotenv").config({
  allowEmptyValues: true,
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const mongoose = require("mongoose");

async function connectionDb() {
  // conecta mongodb
  const optionsDb = {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    autoIndex: true, // Don't build indexes
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
  };

  const uri =
    process.env.DB_USER && process.env.DB_PASS
      ? `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_URL}:${process.env.DB_PORT}/${process.env.DB_NAME}`
      : `mongodb://${process.env.DB_URL}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
  return await mongoose.connect(uri, optionsDb);
}

module.exports = { connectionDb };
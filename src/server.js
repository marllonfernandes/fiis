require("dotenv").config({
  allowEmptyValues: true,
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
});

const http = require("http");
const app = require("./app");
const httpServer = http.createServer(app);
const port = process.env.PORT || 8080;
const { connectionDb } = require("./db");

httpServer.listen(port, () => {
  connectionDb()
    .then((data) => {
      console.log("API connected MongoDb!");
    })
    .catch((err) => console.log(err.stack));
  console.log(`Application listening port ${port}`);
});

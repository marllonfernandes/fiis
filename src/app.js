const express = require("express");
const app = express();
const routes = require("./routes");

const middleware = function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*"); // colocar os dominios permitidos | ex: 127.0.0.1:3000
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "OPTIONS, GET, PUT, POST, DELETE");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
};

app.use(middleware);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(routes);

module.exports = app;
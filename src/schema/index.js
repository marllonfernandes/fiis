const mongoose = require("mongoose");

const fiiSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", required: true, index: true },
    desc: { type: String, default: "", required: false, index: true },
    admin: { type: String, default: "", required: false, index: true },
    price: { type: String, default: "", required: false, index: true },
    percentage: { type: String, default: "", required: false, index: true },
    liquidez: { type: String, default: "", required: false, index: true },
    ultimorendimento: {
      type: String,
      default: "",
      required: false,
      index: true,
    },
    rendimentodividendo: {
      type: String,
      default: "",
      required: false,
      index: true,
    },
    patrimonioliquido: {
      type: String,
      default: "",
      required: false,
      index: true,
    },
    valorpatrimonial: {
      type: String,
      default: "",
      required: false,
      index: true,
    },
    rentabilidademes: {
      type: String,
      default: "",
      required: false,
      index: true,
    },
    pvp: { type: String, default: "", required: false, index: true },
  },
  { timestamps: true }
);

const FII = mongoose.model("FII", fiiSchema);

module.exports = { FII };

const express = require("express");
const router = express.Router();
const aqp = require("api-query-params");
const { FII } = require("../schema");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 10000 });

router.get("/", async (req, res, next) => {
    try {
      const key = req.originalUrl;

      if (cache.has(key)) {
        return res.send(JSON.parse(cache.get(key)));
      } else {
        const { filter, skip, limit, sort, projection } = aqp(req.query);
        let acoesDb = [];

        acoesDb = await FII.find(filter)
          .skip(skip)
          .limit(limit)
          .sort(sort)
          .select(projection);

        cache.set(key, JSON.stringify(acoesDb));
        res.status(200).json(acoesDb);
      }
    } catch (error) {
      console.log(error.message);

      res.status(500).json(error);
    }
});

module.exports = router;
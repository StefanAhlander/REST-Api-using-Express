require("dotenv").config();
const express = require("express");
const mongoskin = require("mongoskin");
const logger = require("morgan");
const http = require("http");

const app = express();

app.set("port", process.env.PORT || 3000);

app.use(express.json());
app.use(logger("dev"));

const db = mongoskin.db(process.env.MONGO_DB_URI);
const id = mongoskin.helper.toObjectID;

app.param("collectionName", (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

app.get("/", (req, res, next) => {
  res.send("Select a collection, e.g., /collections/messages");
});

app.get("/collections/:collectionName", (req, res, next) => {
  req.collection
    .find({}, { limit: 10, sort: [["_id", -1]] })
    .toArray((e, results) => {
      if (e) return next(e);
      res.send(results);
    });
});

app.post("/collections/:collectionName", (req, res, next) => {
  // TODO: Validate req.body
  req.collection.insert(req.body, {}, (e, results) => {
    if (e) return next(e);
    res.send(results.ops);
  });
});

app.get("/collections/:collectionName/:id", (req, res, next) => {
  req.collection.findOne({ _id: id(req.params.id) }, (e, result) => {
    if (e) return next(e);
    res.send(result);
  });
});

app.put("/collections/:collectionName/:id", (req, res, next) => {
  req.collection.update(
    { _id: id(req.params.id) },
    { $set: req.body },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
    }
  );
});

app.delete("/collections/:collectionName/:id", (req, res, next) => {
  req.collection.remove({ _id: id(req.params.id) }, (e, result) => {
    if (e) return next(e);
    res.send(result.result.n === 1 ? { msg: "success" } : { msg: "error" });
  });
});

const server = http.createServer(app);

// Extra code to simplify testing in Jest by being able to use boot and shutdown in beforeAll and afterAll
const boot = () => {
  server.listen(app.get("port"), () => {
    console.info(`Express server listening on port ${app.get("port")}`);
  });
};

const shutdown = () => {
  server.close(process.exit);
};

if (require.main === module) {
  boot();
} else {
  console.info("Running app as a module");
  exports.boot = boot;
  exports.shutdown = shutdown;
  exports.port = app.get("port");
}

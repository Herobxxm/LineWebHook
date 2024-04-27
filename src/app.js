const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");

require("dotenv").config();

const app = express();

app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const line = require("@line/bot-sdk");
const lineClient = new line.Client({
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

app.get("/", (req, res) => {
  console.log("Hello World");
  res.send("Hello World");
});

app.post("/", line.middleware(config), (req, res) => {
  Promise.all([req.body.events.map(handleEvents)]).then((result) =>
    res.json(result)
  );
});

async function handleEvents(event) {
  console.log("event:", event);
  // check type of event
  if (event.type === "follow") {
    const userId = event.source.userId;
    try {
      const profile = await lineClient.getProfile(userId);
      console.log("profile:", profile);
      saveUserData(profile);
    } catch (error) {
      console.error("error:", "Can not save profile");
    }
  }
}

function saveUserData(profile) {
  return client
    .connect()
    .then(() => {
      const database = client.db("UserData");
      const collection = database.collection("users");
      collection
        .insertOne(profile)
        .then((result) => {
          console.log("result:", result);
          client.close();
        })
        .catch((error) => {
          console.error("error:", error);
          client.close();
        });
    })
    .catch((error) => {
      console.error("error:", error);
    });
}

app.use((err, req, res, next) => {
  if (err instanceof line.SignatureValidationFailed) {
    console.error(err);
    res.status(401).send(err.signature);
    return;
  } else if (err instanceof line.JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err); // will throw default 500
});

module.exports = app;
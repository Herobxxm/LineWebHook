const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const { MongoClient, ServerApiVersion } = require('mongodb');
const line = require('@line/bot-sdk');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

require('dotenv').config();
const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET
}

const client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

app.post('/webhook', line.middleware(config), (req, res) => {
    console.log('req.body:', req.body);
    Promise
        .all([
            req.body.events.map(handleEvents)
        ])
        .then((result) => res.json(result))
});

async function handleEvents(event) {
    console.log('event:', event);
    // check type of event
    if (event.type === 'follow') {
        const userId = event.source.userId;
        try {
            const profile = await lineClient.getProfile(userId);
            console.log('profile:', profile);
            saveUserData(profile);
        } catch (error) {
            console.error('error:', 'Can not save profile');
        }
    }
}

function saveUserData(profile) {
    return client.connect()
        .then(() => {
            const database = client.db('UserData');
            const collection = database.collection('Profile');
            collection.insertOne(profile)
                .then((result) => {
                    console.log('result:', result);
                    client.close();
                })
                .catch((error) => {
                    console.error('error:', error);
                    client.close();
                });
        })
        .catch((error) => {
            console.error('error:', error);
        });
}


module.exports = app;

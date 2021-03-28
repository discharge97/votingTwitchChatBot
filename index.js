const express = require('express');
const tmi = require('tmi.js');
const fs = require('fs');
const cors = require('cors')
const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');
let http = require("http");

const config = JSON.parse(fs.readFileSync('config.json'));

const options = {
    options: {
        debug: false
    },
    connection: {
        cluster: 'aws',
        reconnect: true,
    },
    identity: {
        username: config.twitch.channel,
        password: config.twitch.oAuth
    },
    channels: [config.twitch.channel]
};
io.set('origins', '*:*');
const client = new tmi.client(options);

let activeVote;
let peopleVoted = [];
app.use(cors());
app.use('/', express.static(path.join(process.cwd(), "dist")));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/', (_, res) => {
    res.sendFile(path.join(process.cwd(), "dist", "index.html"));
});

io.on('connection', client => {
    console.log(`Client ${client.id} connected!`);

    if (activeVote) {
        io.emit("vote", activeVote);
    }

    client.on('start', data => {
        activeVote = data;
        peopleVoted = [];

        io.emit("vote", activeVote);
    });

    client.on("end", () => {
        activeVote = undefined;
        peopleVoted = [];
        io.emit("end", undefined);
    });

    client.on("cancel", () => {
        io.emit("cancel", undefined);
    })
});

function handleCommand(channel, username, message, subscriber) {
    const cmdParts = message.match(/([^\s]+)/g);

    switch (cmdParts[0].toLowerCase()) {
        case "vote":
            if (!activeVote) return;

            if (peopleVoted.indexOf(username.toLowerCase()) >= 0) {
                client.action(channel, `${username}, You can only vote once per poll!`);
                return;
            }

            if (!isNaN(cmdParts[1]) && activeVote && activeVote.options.length >= parseInt(cmdParts[1])) {

                activeVote.options[parseInt(cmdParts[1]) - 1].count += subscriber ? 4 : 1;
                peopleVoted.push(username.toLowerCase());

                io.emit("vote", activeVote);
            } else {
                client.action(channel, `${username}, Invalid vote index.`);
            }
            break;

        default:
            // client.action("Unknown command.");
            break;
    }
}

client.on('connected', (adress, port) => {
    if (config.twitch.ShowJoinMessage) {
        client.action(config.twitch.Channel, config.twitch.JoinMessage);
    }
}).on('message', (channel, tags, message, self) => {
    try {
        if (self) return;

        if (message.startsWith(config.twitch.commandPrefix)) {
            handleCommand(channel, tags.username, message.replace(config.twitch.commandPrefix, ""), tags.subscriber);
        }
    } catch (err) {
        console.error(err);
    }
});

try {
    client.connect();

    server.listen(80, () => console.log(`Server started at http://localhost`));
} catch (err) {
    console.error(err);
}

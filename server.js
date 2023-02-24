const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const customParser = require("socket.io-msgpack-parser");
const { instrument } = require("@socket.io/admin-ui");

const cors = require("cors");
const { findRoom } = require("./utils/data/user");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

const Socket = require("./utils/Socket");

dotenv.config({ path: "./.env" });
const app = express();

app.use(cors()); //enable cross origin requests
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, XMLHttpRequest"
  );
  next();
});

const server = http.createServer(app);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.status(200).send("<h1>Teen Patti Backend is Running </h1>");
});

app.get("/room/:roomName", (req, res) => {
  try {
    let { roomObj } = findRoom(req.params.roomName);
    if (!roomObj) res.status(404).json("No such room found");
    res.status(200).json(roomObj);
  } catch (error) {
    res.status(400).json(error);
  }
});

//Starting the server
server.listen(PORT, () => {
  console.log(`Server active on port ${PORT}`);
});

const password = bcrypt.hashSync(process.env.SOCKETIO_ADMIN, 10);

const io = socketio(server, {
  pingInterval: 10000, // how often to ping/pong.
  pingTimeout: 60000, // time after which the connection is considered timed-out.
  parser: customParser,
  transports: ["websocket", "polling"],
});
instrument(io, {
  auth: {
    type: "basic",
    username: "burhan",
    password,
  },
  mode: process.env.NODE_ENV,
});
try {
  Socket(io);
} catch (error) {
  console.log(error);
}

const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const cors = require("cors");
const { findRoom } = require("./utils/data/user");

const Socket = require("./utils/Socket");

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

const io = socketio(server);

try {
  Socket(io);
} catch (error) {
  console.log(error);
}

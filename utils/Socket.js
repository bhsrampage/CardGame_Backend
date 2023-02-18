const { generateNotification } = require("./data/interaction");
const {
  addUser,
  getUsersInRoom,
  removeUser,
  createRoom,
  allotCards,
  packUser,
  stakeUser,
  getUser,
  declareWin,
} = require("./data/user");

const Socket = io => {
  let poll = [];
  io.on("connection", socket => {
    //Utility
    console.log("New Connection");
    const emitError = message => {
      console.log(message);
      socket.emit("error", { message });
    };

    //Functionality events = ["createRoom" , "joinRoom" , "leaveRoom"]
    //Poppulating events = ["roomData" , "message"]

    socket.on("createRoom", (roomName = "", table = 100) => {
      const { error: error1 } = createRoom(roomName, table);
      if (error1) {
        return emitError(error1);
      }
      console.log("Room Created " + roomName);
    });

    socket.on("joinRoom", (username = "test2", roomName = "test") => {
      const { error, user, roomObj } = addUser({
        id: socket.id,
        username,
        room: roomName,
      });

      if (error) {
        return emitError(error);
      }

      socket.join(roomName);

      socket.emit(
        "message",
        generateNotification(`Welcome to Game-Room "${roomName}"`, "Admin")
      ); //only sender

      socket.broadcast
        .to(roomName)
        .emit(
          "message",
          generateNotification(`${user.username} has joined the Game`, "Admin")
        ); //everyone other that sender

      console.log(`${user.username} has joined the Game`);
      const usersList = getUsersInRoom(roomName);
      io.to(roomName).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("leaveRoom", () => {
      const { user, room } = removeUser(socket.id);
      if (user) {
        io.emit(
          "message",
          generateNotification(`${user.username} has left ${room}!`, "Admin")
        );
        socket.leave(room);
        const usersList = getUsersInRoom(room);
        console.log(`${user.username} has left ${room}!`);
        io.to(room).emit("roomData", { name: room, usersList });
      }
    });

    socket.on("start", (roomName, cut, numCards) => {
      console.log("Attempting to start game " + roomName);
      const { roomObj, usersList } = allotCards(
        roomName,
        cut,
        numCards,
        socket.id
      );
      console.log("Game started in room " + roomName);
      io.to(roomName).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("play", (pack = false, stake = 1) => {
      const { roomObj, usersList } = pack
        ? packUser(socket.id)
        : stakeUser(socket.id, stake);

      io.to(roomObj.name).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("askWin", roomName => {
      socket.broadcast.to(roomName).emit("askingWin", getUser(socket.id));
      poll = [];
    });

    socket.on("confirmWin", (id, roomName) => {
      poll.push(1);
      const users = getUsersInRoom(roomName);
      if (poll.length > users.length / 2) {
        const { usersList, roomObj } = declareWin(id);
        io.to(roomName).emit("roomData", { ...roomObj, usersList });
      }
    });
  });
};

module.exports = Socket;

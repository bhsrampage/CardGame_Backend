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
  seeCards,
} = require("./data/user");

const Socket = (io) => {
  let poll = [];
  io.on("connection", (socket) => {
    //Utility
    console.log("New Connection");
    const emitError = (message) => {
      console.log(message);
      socket.emit("error", { message });
    };

    const emitMessage = (roomName, obj) => {
      console.log(obj.text);
      io.to(roomName).emit("message", obj);
    };

    const leaveGame = () => {
      const { user, room } = removeUser(socket.id);
      if (user) {
        emitMessage(
          room,
          generateNotification(`${user.username} has left ${room}!`, "Admin")
        );
        const usersList = getUsersInRoom(room);
        console.log(`${user.username} has left ${room}!`);
        io.to(room).emit("roomData", { name: room, usersList });
      }

      return room;
    };

    //Functionality events = ["createRoom" , "joinRoom" , "leaveRoom"]
    //Poppulating events = ["roomData" , "message" , "error" , "pollResults"]

    socket.on("createRoom", (roomName = "", table = 100) => {
      const { error: error1 } = createRoom(roomName, table);
      if (error1) {
        return emitError(error1);
      }
      socket.emit(
        "message",
        generateNotification(`A new Room is created :-  "${roomName}"`, "Admin")
      );
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

    socket.on("disconnect", leaveGame);
    socket.on("leaveRoom", () => socket.leave(leaveGame()));

    socket.on("start", (roomName, cut, numCards) => {
      console.log("Attempting to start game " + roomName);
      const { roomObj, usersList } = allotCards(
        roomName,
        cut,
        numCards,
        socket.id
      );
      emitMessage(
        roomName,
        generateNotification("Game started in room " + roomName, "Admin")
      );
      console.log("Game started in room " + roomName);
      io.to(roomName).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("seeCards", () => {
      const { usersList, roomObj, user } = seeCards(socket.id);
      emitMessage(
        roomObj.name,
        generateNotification(`${user.username} has seen his cards !!`, "Admin")
      );
      io.to(roomObj.name).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("play", (pack = false, stake = 1) => {
      const { roomObj, usersList, error, user } = pack
        ? packUser(socket.id)
        : stakeUser(socket.id, stake);
      if (error) {
        return emitError(error);
      }
      emitMessage(
        roomObj.name,
        generateNotification(
          user.username + pack ? `has staked ${stake}` : " has packed !!",
          "Admin"
        )
      );
      io.to(roomObj.name).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("askWin", (roomName) => {
      socket.broadcast.to(roomName).emit("askingWin", getUser(socket.id)); //ask everyone other than the user if he has won
      poll = [];
    });

    socket.on("confirmWin", (id, roomName) => {
      poll.push(socket.id);
      const users = getUsersInRoom(roomName);
      if (poll.length > users.length / 2) {
        const { usersList, roomObj, error, user } = declareWin(id);
        if (error) return emitError(error);
        io.to(roomName).emit("roomData", { ...roomObj, usersList });
        emitMessage(
          roomObj.name,
          generateNotification(
            `${user.username} has won this round !!`,
            "Admin"
          )
        );
      }
      io.to(roomName).emit("pollResults", poll);
    });
  });
};

module.exports = Socket;

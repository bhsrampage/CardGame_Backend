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
  gameShow,
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

    const leaveGame = (reason) => {
      if (reason) {
        console.log(reason);
      }
      const { user, room, error } = removeUser(socket.id);
      if (error) return;

      emitMessage(
        room,
        generateNotification(`${user.username} has left ${room}!`, "Admin")
      );
      const usersList = getUsersInRoom(room);
      console.log(`${user.username} has left ${room}!`);
      io.to(room).emit("roomData", { name: room, usersList });

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
    socket.on("leaveRoom", () => {
      socket.leave(leaveGame());
      console.log("User Left");
    });

    socket.on("start", (roomName, cut, numCards) => {
      console.log("Attempting to start game " + roomName);
      const { roomObj, usersList, error } = allotCards(
        roomName,
        cut,
        numCards,
        socket.id
      );
      if (error) {
        return emitError(error);
      }
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
      if (stake < 1)
        return emitError("Stake amount needs to be greater than 0");
      const { roomObj, usersList, error, user, won } = pack
        ? packUser(socket.id)
        : stakeUser(socket.id, stake);
      if (error) {
        return emitError(error);
      }
      emitMessage(
        roomObj.name,
        generateNotification(
          user.username +
            (pack
              ? won
                ? " has one the game"
                : " has packed !!"
              : ` has staked ${stake}`),
          "Admin"
        )
      );
      io.to(roomObj.name).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("show", (roomName) => {
      const { roomObj, usersList, user, error } = gameShow(roomName, socket.id);
      console.log("Show called by ", socket.id);
      if (error) {
        return emitError(error);
      }
      emitMessage(
        roomObj.name,
        generateNotification(user.username + `has called SHOW !!`, "Admin")
      );
      io.to(roomObj.name).emit("roomData", { ...roomObj, usersList });
    });

    socket.on("confirmWin", (id, roomName) => {
      const { usersList, roomObj, error, user } = declareWin(socket.id, id);
      if (error) return emitError(error);
      io.to(roomName).emit("roomData", { ...roomObj, usersList });
      emitMessage(
        roomObj.name,
        generateNotification(`${user.username} has won this round !!`, "Admin")
      );
    });
  });
};

module.exports = Socket;

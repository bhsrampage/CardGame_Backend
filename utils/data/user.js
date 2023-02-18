const { dealCards } = require("./cards");

const users = {}; //objects with keys as room ids and array of user data
const rooms = []; //list of rooms active
// addUser , removeUser , getUser , getUsersInRoom

function findUser(id) {
  for (let room in users) {
    for (let user in users[room] || []) {
      if (users[room][user].id === id) return { room, user };
    }
  }
  return { room: -1, user: -1 };
}

const createRoom = (room, table) => {
  room = room.trim().toLowerCase();

  //ValidateData
  if (!room) {
    return {
      error: "RoomName is required",
    };
  }
  //check if room exists
  const temp = rooms.find(i => i.name === room);

  if (temp) {
    return {
      error: "Room already exists",
    };
  }

  //room model
  rooms.push({
    name: room,
    table,
    numCards: 3,
    currentPlayer: 0,
    isStarted: false,
    pot: 0,
    maxStake: 0,
    cardsRemaining: [],
  });
  users[room] = [];
  return {};
};

const addUser = ({ id, username, room }) => {
  //cleandata
  username = username.trim().toLowerCase();
  room = room.trim().toLowerCase();

  //ValidateData
  if (!username || !room) {
    return {
      error: "Username and Room are required",
    };
  }

  //check if room exists
  const temp = rooms.find(i => i.name === room);

  if (!temp) {
    return {
      error: "No such room exists",
    };
  }
  // Check for existing user
  const existing = users[room].find(u => {
    u.username === username;
  });

  //Validate username
  if (existing) {
    return {
      error: "Username is in use!",
    };
  }

  //User Model
  const user = {
    id,
    username,
    isPacked: false,
    hasSeen: false,
    balance: temp.table,
    cardsInHand: [],
  };
  users[room].push(user);
  if (user) return { user, roomObj: temp };
};

const removeUser = id => {
  const { room, user } = findUser(id);

  let removedUser = users[room].splice(user, 1)[0];

  //check if all users are removed in that case delete room from array of rooms
  if (!users[room].length)
    rooms.splice(
      rooms.findIndex(i => i.name === room),
      1
    );

  if (user != -1) {
    return { user: removedUser, room };
  }
};

const getUser = id => {
  const { room, user } = findUser(id);

  return users[room][user];
};

const getUsersInRoom = room => {
  room = room.trim().toLowerCase();
  return users[room] || [];
};

const findRoom = room => {
  room = room.trim().toLowerCase();
  let index = -1;
  const temp = rooms.find((el, ind) => {
    if (el.name === room) {
      index = ind;
      return true;
    }
  });
  return { roomObj: temp, index };
};

const allotCards = (room, cut, numCards, id) => {
  let { index } = findRoom(room);
  let usersList = getUsersInRoom(room);
  console.log(usersList);
  usersList = usersList.filter(i => i.balance > 0);
  const initiatorUserIndex = users[room].findIndex(i => i.id === id);
  rooms[index]["currentPlayer"] = (initiatorUserIndex + 1) % usersList.length; //The next player to the initiator will start playing
  rooms[index]["numCards"] = numCards;
  console.log(usersList.length);
  let allotments = dealCards(usersList.length, numCards, cut);
  rooms[index]["cardsRemaining"] = allotments.splice(
    allotments.length - 1,
    1
  )[0];
  console.log(allotments);
  for (let i in allotments) {
    users[room][i]["cardsInHand"] = allotments[i];
    users[room][i]["isPacked"] = false;
    users[room][i]["balance"] -= 1; //cutting table
  }
  rooms[index]["pot"] += usersList.length; //Adding table to game Pot
  rooms[index]["isStarted"] = true;
  return { roomObj: rooms[index], usersList: getUsersInRoom(room) };
};

const packUser = id => {
  const { user, room } = findUser(id);
  const { index } = findRoom(room);

  users[room][user].isPacked = true;
  rooms[index]["currentPlayer"] = (user + 1) % users[room].length; //Shift to next player
  return { roomObj: rooms[index], usersList: users[room] };
};

const stakeUser = (id, amount) => {
  const { user, room } = findUser(id);
  let { index } = findRoom(room);
  users[room][user].balance -= amount;
  rooms[index].pot += amount;
  let temp = (user + 1) % users[room].length;
  while (users[room][temp].isPacked) temp = (temp + 1) % users[room].length;
  rooms[index]["currentPlayer"] = temp; //Shift to next player
  return { roomObj: rooms[index], usersList: users[room] };
};

const declareWin = id => {
  const { user, room } = findUser(id);
  let { index, roomObj } = findRoom(room);
  users[room][user].balance += roomObj.pot;
  rooms[index].pot = 0;
  rooms[index].isStarted = false;
  return { roomObj: rooms[index], usersList: users[room] };
};

module.exports = {
  createRoom,
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  findRoom,
  allotCards,
  packUser,
  stakeUser,
  declareWin,
};

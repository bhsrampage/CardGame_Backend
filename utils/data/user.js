const { dealCards } = require("./cards");

const users = {}; //objects with keys as room ids and array of user data
const rooms = []; //list of rooms active
// addUser , removeUser , getUser , getUsersInRoom

function findUser(id) {
  for (let room in users) {
    for (let user in users[room] || []) {
      if (users[room][user].id === id) return { room, user: parseInt(user) };
    }
  }
  return { room: -1, user: -1 };
}

const createRoom = (room, table) => {
  room = room?.trim().toLowerCase();
  //ValidateData
  if (!room) {
    return {
      error: "RoomName is required",
    };
  }
  //check if room exists
  const temp = rooms.find((i) => i.name === room);

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
    gameShow: false,
    initiator: null,
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
  const temp = rooms.find((i) => i.name === room);

  if (!temp) {
    return {
      error: "No such room exists",
    };
  }
  // Check for existing user
  const existing = users[room].find((u) => {
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
    isBlind: true,
    balance: temp.table,
    cardsInHand: [],
  };
  users[room].push(user);
  if (user) return { user, roomObj: temp };
};

const removeUser = (id) => {
  const { room, user } = findUser(id);
  if (user < 0)
    return {
      error: "No such userfound",
    };
  let removedUser = users[room].splice(user, 1)[0];

  //check if all users are removed in that case delete room from array of rooms
  if (!users[room].length)
    rooms.splice(
      rooms.findIndex((i) => i.name === room),
      1
    );

  if (user != -1) {
    return { user: removedUser, room };
  }
};

const getUser = (id) => {
  const { room, user } = findUser(id);

  return users[room][user];
};

const getUsersInRoom = (room) => {
  room = room.trim().toLowerCase();
  return users[room] || [];
};

const findRoom = (room) => {
  if (!room)
    return {
      error: "Room not specified",
    };
  room = room?.trim().toLowerCase();
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
  let { index, error } = findRoom(room);

  if (!rooms[index] || error)
    return {
      error: "No such Room Found",
    };
  let usersList = getUsersInRoom(room);
  //console.log(usersList);
  usersList = usersList.filter((i) => i.balance > 0);
  if (usersList.length < 2)
    return {
      error: "Not enough users to start the game",
    };

  const initiatorUserIndex = users[room].findIndex((i) => i.id === id);
  let temp = (initiatorUserIndex + 1) % users[room].length;
  while (users[room][temp].isPacked) temp = (temp + 1) % users[room].length;
  rooms[index]["currentPlayer"] = temp; //The next player to the initiator will start playing
  rooms[index]["numCards"] = numCards;
  rooms[index]["initiator"] = id;
  //console.log(usersList.length);
  let allotments = dealCards(usersList.length, numCards, cut);
  rooms[index]["cardsRemaining"] = allotments.splice(
    allotments.length - 1,
    1
  )[0];
  //console.log(allotments);
  let i = 0;
  users[room] = users[room].map((u) => {
    if (u.balance > 0) {
      u.cardsInHand = allotments[i];
      u.isPacked = false;
      u.isBlind = false;
      u.balance -= 1;
      i += 1;
      return u;
    }
    u.isPacked = true;
    return u;
  });
  // for (let i in allotments) {
  //   users[room][i]["cardsInHand"] = allotments[i];
  //   users[room][i]["isPacked"] = false;
  //   users[room][i]["balance"] -= 1; //cutting table
  // }
  rooms[index]["pot"] += usersList.length; //Adding table to game Pot
  rooms[index]["isStarted"] = true;
  return { roomObj: rooms[index], usersList: getUsersInRoom(room) };
};

const packUser = (id) => {
  const { user, room } = findUser(id);
  const { index, error } = findRoom(room);
  if (error) return { error };
  users[room][user].isPacked = true;
  let temp = (user + 1) % users[room].length;
  if (users[room].filter((i) => !i.isPacked).length === 1) {
    while (users[room][temp].isPacked) temp = (temp + 1) % users[room].length;
    return declareWin(false, users[room][temp].id);
  }
  while (users[room][temp].isPacked) temp = (temp + 1) % users[room].length;
  //console.log(user + 1, users[room].length, temp);
  rooms[index]["currentPlayer"] = temp; //Shift to next player
  return {
    roomObj: rooms[index],
    usersList: users[room],
    user: users[room][user],
  };
};

const stakeUser = (id, amount) => {
  const { user, room } = findUser(id);
  let { index, error } = findRoom(room);
  if (users[room][user].balance < amount)
    return { error: "Insufficient Balance" };
  if (rooms[index].maxStake / (users[room][user].isBlind ? 2 : 1) > amount)
    return {
      error: "You have staked lower than the max stake",
    };
  rooms[index].maxStake = (users[room][user].isBlind ? 2 : 1) * amount; //assign max stake to the current stake amount
  users[room][user].balance -= amount;
  rooms[index].pot += amount;
  //console.log(user);
  let temp = (user + 1) % users[room].length;
  //console.log(user + 1, users[room].length, temp);
  while (users[room][temp].isPacked) temp = (temp + 1) % users[room].length; //Next is an unpacked player
  //console.log(temp);
  rooms[index]["currentPlayer"] = temp; //Shift to next player
  return {
    roomObj: rooms[index],
    usersList: users[room],
    user: users[room][user],
  };
};

const seeCards = (id) => {
  const { user, room } = findUser(id);
  users[room][user].isBlind = false;

  return {
    roomObj: { name: room },
    usersList: users[room],
    user: users[room][user],
  };
};

const gameShow = (roomName, id) => {
  let { index } = findRoom(roomName);
  const { user, room } = findUser(id);
  let amount = rooms[index].maxStake / (users[room][user].isBlind ? 2 : 1);
  if (amount > users[room][user].balance) {
    return { error: "Insufficient balance to SHOW please PACK your cards !!!" };
  }
  users[room][user].balance -= amount;
  rooms[index]["gameShow"] = true;

  return {
    roomObj: rooms[index],
    usersList: users[room],
    user: users[room][user],
  };
};

const declareWin = (id, winnerId) => {
  // const { user: initiatorUser, room: initiatorRoom } = findUser(id);
  const { user: winnerUser, room: winnerRoom } = findUser(winnerId);
  // if (initiatorRoom !== winnerRoom)
  //   return {
  //     error: "Initiator and Winner are not in the same room",
  //   };
  let { index, roomObj } = findRoom(winnerRoom);
  if (rooms[index].pot === 0)
    return {
      error:
        users[winnerRoom][winnerUser].username +
        " has already been declared winner",
    };

  if (!!id && rooms[index].initiator !== id)
    return {
      error: "Only game Initiator can declare winner !!",
    };
  users[winnerRoom][winnerUser].balance += roomObj.pot;
  rooms[index].pot = 0;
  rooms[index].isStarted = false;
  rooms[index].gameShow = false;
  rooms[index].initiator = null;
  rooms[index].maxStake = 1;

  return {
    roomObj: rooms[index],
    usersList: users[winnerRoom],
    user: users[winnerRoom][winnerUser],
    won: true,
  };
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
  seeCards,
  gameShow,
};

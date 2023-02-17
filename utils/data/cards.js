const suits = ["Spades", "Diamonds", "Clubs", "Hearts"];
const values = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "Jack",
  "Queen",
  "King",
];

function createDeck() {
  let deck = [];

  for (let i in suits) {
    for (let j in values) {
      deck.push({ suit: suits[i], rank: values[j] });
    }
  }

  return deck;
}

function shuffle() {
  // for 1000 turns
  // switch the values of two random cards
  let deck = createDeck();
  for (let i = 0; i < 1000; i++) {
    let location1 = Math.floor(Math.random() * deck.length);
    let location2 = Math.floor(Math.random() * deck.length);
    let tmp = deck[location1];

    deck[location1] = deck[location2];
    deck[location2] = tmp;
  }

  return deck;
}

function dealCards(players, num, cutDeckAt = 0) {
  let cards = shuffle();
  let allotments = [];
  cards.splice(0, cutDeckAt); //cutting the deck

  for (let i = 0; i < players; i++) {
    allotments.push(cards.splice(0, num));
  }
  allotments.push(cards); //allotments to players and remaining cards in the deck

  return allotments;
}

module.exports = {
  dealCards,
};

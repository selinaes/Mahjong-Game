////////////////////////////////////////////////////////////////////////////////////////////
// data model for cards and game state

export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
export const SUITS = ["bamboo", "character", "dot"]

export type CardId = string

// unused: not seen so far 
// last-card-played: the last played card
// player-hand: unplayed tile
// player-played: all the card already played by the player 
// set-aside: form chow/pong/gang

export type LocationType = "unused" | "last-card-played" | "player-hand" | "player-played" | "set-aside"


export interface Card {
  id: CardId
  code: number  // code is a unique number for each card (each rank+suit combination)
  rank: typeof RANKS[number]
  suit: typeof SUITS[number]
  locationType: LocationType
  playerIndex: number | null
  // positionInLocation: number | null
}

export interface Config {
  numberOfDecks: number
  rankLimit: number
}


export function createConfig(numDecks: number, rankLimit: number){
  const conf: Config = {numberOfDecks: numDecks, rankLimit: rankLimit}
  return conf
}

/**
 * determines whether one can play a card given the last card played
 */
export function areCompatible(card: Card, lastCardPlayed: Card) {
  return true
  // if (card.rank === 'K' || lastCardPlayed.rank === 'K'){
  //   return true
  // }
  // return card.rank === lastCardPlayed.rank || card.suit === lastCardPlayed.suit
}

// determine whether a player can chow a card
export function canChow(cards: Card[], lastCardPlayed: Card){
  const v = lastCardPlayed.code
  if (v >= 1 && v < 30) { //bamboo, dot, character
    // cards contain value + 1, value + 2
    if (cards.filter(x => x.code === v+1 || x.code === v+2).length >= 2) {
      return true
    }
    // cards contain value + 1, value - 1
    if (cards.filter(x => x.code === v+1 || x.code === v-1).length >= 2) {
      return true
    }
    // cards contain value - 1, value - 2
    if (cards.filter(x => x.code === v-1 || x.code === v-2).length >= 2) {
      return true
    }
  }
  return false
}

// determine whether a player can pong a card
export function canPong(cards: Card[], lastCardPlayed: Card){
  let pong_cards = cards.filter(x => x.code === lastCardPlayed.code)
  if (pong_cards.length >= 2) {
    return pong_cards
  }
  return []
}

// determine whether a player can kong a card
export function canKong(cards: Card[], lastCardPlayed: Card){
  let kong_cards = cards.filter(x => x.code === lastCardPlayed.code)
  if (kong_cards.length === 3) {
    return true
  }
  return false 
}

// ?????
export type GamePhase = "initial-card-dealing" | "draw" | "play" | "game-over" 

export interface GameState {
  playerNames: string[]
  cardsById: Record<CardId, Card>
  currentTurnPlayerIndex: number
  phase: GamePhase
  playCount: number
  // fewerThan2CardsPlayer: number[]
  // config: Config
}

/**
 * @returns an array of the number of the cards in each player's hand
 */
export function computePlayerCardCounts({ playerNames, cardsById }: GameState) {
  const counts = playerNames.map(_ => 0)
  Object.values(cardsById).forEach(({ playerIndex }) => {
    if (playerIndex != null) {
      ++counts[playerIndex]
    }
  })
  return counts
}

// /**
//  * @returns an array of the players who have 2 or fewer cards in hand
//  */
//  export function computePlayers2FewerCard({ playerNames, cardsById }: GameState) {
//   const counts = playerNames.map(_ => 0)
//   Object.values(cardsById).forEach(({ playerIndex }) => {
//     if (playerIndex != null) {
//       ++counts[playerIndex]
//     }
//   })
//   const fewerPlayers:number[] = []
//   counts.forEach( (count, playerIndex) => {
//     if (count <= 2) {
//       fewerPlayers.push(playerIndex)
//     }
//   })
//   return fewerPlayers
// }

/**
 * finds the last played card
 */
export function getLastPlayedCard(cardsById: Record<CardId, Card>) {
  return Object.values(cardsById).find(c => c.locationType === "last-card-played") || null
}

/**
 * extracts the cards that are currently in the given player's hand
 */
 export function extractPlayerCards(cardsById: Record<CardId, Card>, playerIndex: number): Card[] {
  return Object.values(cardsById).filter(({ playerIndex: x }) => x === playerIndex)
}

/**
 * determines if someone has won the game -- i.e., has no cards left in their hand
 */
//  export function determineWinner(state: GameState) {
//   if (state.phase === "initial-card-dealing") {
//     return null
//   }
  // const playerIndex = computePlayerCardCounts(state).indexOf(0)
  // return playerIndex === -1 ? null : playerIndex
// }

/**
 * determines if a player has won the game -- (Hu), used as a helper in doAction
 */
export function determineWin(cards: Card[], extraCard: Card) {
  // create an array with all cards' codes and add the extraCard to evaluate
  let curr = cards.map(card => card.code) 
  curr.push(extraCard.code)
  
  // if only 2 cards left, win if they are the same
  if (curr.length === 2) {
    return curr[0] === curr[1]
  }

  // sort the cards (by their code)
  curr.sort((n1,n2) => n1 - n2)

  // go through every card, determine whether there are pairs
  for (let i = 0; i < curr.length; ++i) {
    let copied = [...curr]
    let pair = curr.filter(x => x === curr[i])
    
    // remove 2 same cards, 'AA' pattern, then check whether the rest can form 3 * 3 pattern
    if (pair.length >= 2) {
      copied.splice(i, 2);

      i += pair.length - 1

      // recursion to check  whether the rest forms 3 * 3 pattern
      if (check_3s(copied)) {
        return true
      }
      
    }    
  }
  return false
}


export function check_3s(rest: number[]): boolean {
  // if all 3-pairs are removed, leaving with 0 card, we know it conforms to the 3*3 pattern
  if (rest.length === 0) {
    return true
  }

  let threes = rest.filter(x => x === rest[0])
  // check if can find three identical ones (similar to pang)
  if (threes.length === 3) {
    rest.splice(0, 3)
    return check_3s(rest)
  }
  // check if can find three consecutive ones (similar to chow)
  else {
    if (rest.filter(x => x === rest[0]+1 || x === rest[0]+2).length >= 2) {
      rest.splice(0, 3)
      return check_3s(rest)
    }
  }
  return false
  
}

/**
 * creates an empty GameState in the initial-card-dealing state
 */
 export function createEmptyGame(playerNames: string[]): GameState {
  const cardsById: Record<CardId, Card> = {}
  let cardId = 0

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < SUITS.length; j++) {
      for (let k = 0; k < RANKS.length; k++) {

    // for (const suit of SUITS) {
      // for (const rank of RANKS.slice(0, rankLimit)) {
        const card: Card = {
          code: j * 10 + (k + 1), // ex. Bamboo1-9 = 01-09, Dot1-9 = 11-19, Character1-9 = 21-29
          suit: SUITS[j],
          rank: RANKS[k],
          id: String(cardId++),
          locationType: "unused",
          playerIndex: null,
          // positionInLocation: null,
        }
        cardsById[card.id] = card
      }
    }
  }

  // const defaultConfig: Config = {
  //   numberOfDecks: 2,
  //   rankLimit: 2,
  // }

  return {
    playerNames,
    cardsById,
    currentTurnPlayerIndex: 0,
    phase: "initial-card-dealing",
    playCount: 0,
    // fewerThan2CardsPlayer: [],
    // config: defaultConfig,
  }
}

/**
 * looks through the cards for a random card in the unused state -- 
 * basically, equivalent to continuously shuffling the deck of discarded cards
 */
export function findNextCardToDraw(cardsById: Record<CardId, Card>): CardId | null {
  const unplayedCardIds = Object.keys(cardsById).filter(cardId => cardsById[cardId].locationType === "unused")
  if (unplayedCardIds.length === 0) {
    return null
  }
  return unplayedCardIds[Math.floor(Math.random() * unplayedCardIds.length)]
}

////////////////////////////////////////////////////////////////////////////////////////////
// player actions

export interface DrawCardAction {
  action: "draw-card"
  playerIndex: number
}

export interface PlayCardAction {
  action: "play-card"
  playerIndex: number
  cardId: CardId
}

export interface PongAction {
  action: "pong"
  playerIndex: number
  cardId: CardId
}

export type Action = DrawCardAction | PlayCardAction | PongAction

function moveToNextPlayer(state: GameState) {
  state.currentTurnPlayerIndex = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
}

function moveToSpecificPlayer(state: GameState, playerId: number) {
  state.currentTurnPlayerIndex = playerId
}

function moveCardToPlayer({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // add to end position
  // const currentCardPositions = extractPlayerCards(cardsById, currentTurnPlayerIndex).map(x => x.positionInLocation)

  // update state
  card.locationType = "player-hand"
  card.playerIndex = currentTurnPlayerIndex
  // card.positionInLocation = Math.max(-1, ...currentCardPositions) + 1
}

function moveCardToLastPlayed({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // change current last-card-played to unused
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "player-played"
    }
  })

  // update state
  card.locationType = "last-card-played"
  card.playerIndex = null
  // card.positionInLocation = null
}

// ** playerId is the player index of the pong user 
function moveCardToSetAside({ cardsById }: GameState, pongcards: Card[], playerId: number){
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "set-aside"
      c.playerIndex = playerId
    }
  })
  pongcards.forEach(c => {
    c.locationType = "set-aside"
  })
}

export function getPongUser(state: GameState, action: Action){
  const lastPlayedCard = getLastPlayedCard(state.cardsById)
  for(let userId = 0; userId < state.playerNames.length; userId++){
    console.log("increment i is"+userId)
    if (lastPlayedCard.playerIndex === userId) {
      continue
    }
    else if (canPong(extractPlayerCards(state.cardsById,userId),lastPlayedCard).length !== 0) {
      console.log("currentPlayeridx: " + lastPlayedCard.playerIndex)
      console.log("model user id: " + userId)
      return userId
    }
  }
  return -1
}


/**
 * updates the game state based on the given action
 * @returns an array of cards that were updated, or an empty array if the action is disallowed
 */
export function doAction(state: GameState, action: Action): Card[] {
  // console.log("action is: "+action.action)
  let changedCards: Card[] = []
  if (state.phase === "game-over") {
    // game over already
    return []
  }
  if (action.playerIndex !== state.currentTurnPlayerIndex && action.action!=="pong") {
    // not your turn
    return []
  }

  if (state.phase === "initial-card-dealing" && action.action === "draw-card") {
    for(let i = 0; i < 13; ++i){
      const cardId = findNextCardToDraw(state.cardsById)
      if (cardId == null) {
        return []
      }
      const card = state.cardsById[cardId]
      moveCardToPlayer(state, card)
      changedCards.push(card)
    }
    if(state.currentTurnPlayerIndex === 0){ //by default player 0 is the dealer
      const cardId = findNextCardToDraw(state.cardsById)
      if (cardId == null) {
        return []
      }
      const card = state.cardsById[cardId]
      moveCardToPlayer(state, card)
      changedCards.push(card)
      if(determineWin(extractPlayerCards(state.cardsById,state.currentTurnPlayerIndex),card) === true){
        state.phase = "game-over"
      }
      
    }
    moveToNextPlayer(state)
    const counts = computePlayerCardCounts(state)
    if (counts.every((element)=>{return element >= 13})){
      state.phase = "play"
    }
  }
  
  else if(action.action === "pong"){  // user agreed to pong
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if (lastPlayedCard.playerIndex === action.playerIndex) { // if last played card is own card
      return []
    }
    let pongcards = canPong(extractPlayerCards(state.cardsById,action.playerIndex),lastPlayedCard)
    console.log("pongcards: " + pongcards)
    if (pongcards.length > 0) {
      moveCardToSetAside(state, pongcards,action.playerIndex)
      changedCards.push(lastPlayedCard)
      changedCards = changedCards.concat(pongcards)
      console.log("changeCards: " + changedCards)
      moveToSpecificPlayer(state, action.playerIndex)
      state.phase = "play"
    }
  }

  else if (state.phase === "draw" && action.action === "draw-card") {
    const cardId = findNextCardToDraw(state.cardsById)
    if (cardId == null) {
      return []
    }
    const card = state.cardsById[cardId]
    moveCardToPlayer(state, card)
    changedCards.push(card)
    
    // if player zimo
    if(determineWin(extractPlayerCards(state.cardsById,state.currentTurnPlayerIndex),card) === true){
      state.phase = "game-over"
    }
    state.phase = "play"
  }
  else if (state.phase === "play" && action.action === "play-card") {
    const card = state.cardsById[action.cardId]
    if (card.playerIndex !== state.currentTurnPlayerIndex || card.locationType !== "player-hand") {
      // not your card
      return []
    }
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    // if (lastPlayedCard == null) {
    //   return []
    // }
    // if (!areCompatible(lastPlayedCard, card)) {
    //   return []
    // }
    // if this is the first play (no "last-played-card" exist)
    if (lastPlayedCard){
      changedCards.push(lastPlayedCard)
    }
    moveCardToLastPlayed(state, card)
    changedCards.push(card)
    state.phase = "draw"
    moveToNextPlayer(state)
  }

  // if (state.phase === "play" && action.action !== "draw-card") {
  //   moveToNextPlayer(state)
  // }

  // if (state.phase === "play"){
  //   state.fewerThan2CardsPlayer = computePlayers2FewerCard(state)
  // }

  // if (determineWinner(state) != null) {
  //   state.phase = "game-over"
  // }

  ++state.playCount

  return changedCards
}

export function formatCard(card: Card, includeLocation = false) {
  let paddedCardId = card.id
  while (paddedCardId.length < 3) {
    paddedCardId = " " + paddedCardId
  }
  return `[${paddedCardId}] ${card.rank}${card.suit}${(card.rank.length === 1 ? " " : "")}`
    + (includeLocation
      ? ` ${card.locationType} ${card.playerIndex ?? ""}`
      : ""
    )
}

export function printState({ playerNames, cardsById, currentTurnPlayerIndex, phase, playCount }: GameState) {
  const lastPlayedCard = getLastPlayedCard(cardsById)
  console.log(`#${playCount} ${phase} ${lastPlayedCard ? formatCard(lastPlayedCard) : ""}`)
  playerNames.forEach((name, playerIndex) => {
    const cards = extractPlayerCards(cardsById, playerIndex)
    console.log(`${name}: ${cards.map(card => formatCard(card)).join(' ')} ${playerIndex === currentTurnPlayerIndex ? ' *TURN*' : ''}`)
  })
}

/**
 * @returns only those cards that the given player has any "business" seeing
 */
export function filterCardsForPlayerPerspective(cards: Card[], playerIndex: number) {
  return cards.filter(card => card.playerIndex == null || card.playerIndex === playerIndex).sort((a,b)=> {return a.code - b.code})
}

export function sortCards(cards: Card[]) {
  return cards.sort((a,b)=> {return a.code - b.code})
}
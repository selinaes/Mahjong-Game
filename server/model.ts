////////////////////////////////////////////////////////////////////////////////////////////
// data model for cards and game state

import { testjson } from './test'

export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"]
export const SUITS = ["bamboo", "character", "dot"]

export const dragonRanks = ["red", "green", "white"]
export const windRanks = ["east","south","west","north"]
// export const bonusRanks = ["flower","season"]

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
  rank: typeof RANKS[number] | typeof dragonRanks[number] | typeof windRanks[number] 
  suit: typeof SUITS[number] | "dragon" | "wind"
  locationType: LocationType
  playerIndex: number | null
  // positionInLocation: number | null
}

export interface Config {
  dealer: number //dealer position
  order: number //0:clockwise 1:counterclockwise
  dragonwind: number //0:disable 1:enable
  test: number
}


export function createConfig(dealer: number, order: number, dragonwind: number, test: number){
  const conf: Config = {dealer: dealer, order: order, dragonwind: dragonwind, test: test}
  return conf
}

// determine whether a player can chow a card
export function canChow(cards: Card[], lastCardPlayed: Card){
  const v = lastCardPlayed.code
  let all_chow_cards = []
  if (v >= 1 && v < 30) { //bamboo, dot, character

    let chow_card1 = cards.find(x => x.code === v+1)
    let chow_card2 = cards.find(x => x.code === v+2)
    let chow_card3 = cards.find(x => x.code === v-1)
    let chow_card4 = cards.find(x => x.code === v-2) 
    console.log("canChow() here:\n")
    console.log("chow_card1:"+JSON.stringify(chow_card1)+"\n")
    console.log("chow_card2:"+JSON.stringify(chow_card2)+"\n")
    console.log("chow_card3:"+JSON.stringify(chow_card3)+"\n")
    console.log("chow_card4:"+JSON.stringify(chow_card4)+"\n")
    // cards contain value + 1, value + 2
    if (chow_card1 && chow_card2) {
      all_chow_cards.push([chow_card1, chow_card2])
    }
    // cards contain value + 1, value - 1
    if (chow_card1 && chow_card3) {
      all_chow_cards.push([chow_card1, chow_card3])
    }
    // cards contain value - 1, value - 2
    if (chow_card3 && chow_card4) {
      all_chow_cards.push([chow_card3, chow_card4])
    }
  }
  return all_chow_cards
}

// determine whether a player can pong a card
export function canPong(cards: Card[], lastCardPlayed: Card){
  let pong_cards = cards.filter(x => x.code === lastCardPlayed.code)
  if (pong_cards.length >= 2) {
    let two_pong_cards = []
    two_pong_cards.push(pong_cards[0],pong_cards[1])
    return two_pong_cards
  }
  return []
}

// check if user can form a kong by himself
export function checkSelfKong(cards: Card[]): Card[][] {
  if (cards.length <= 3) {
    return []
  }
  // use two pointer to reduce time complexity
  let kong_cards: Card[][] = []
  cards.sort((a,b)=> {return a.code - b.code})
  let i = 0
  let j = 1
  while (j < cards.length) {
    if (cards[j].code === cards[i].code) {
      j += 1
      // find four indentical tiles
      if ((j - i) === 4) {
        // push them to one temp kong_card
        let kong_card:Card[] = []
        while (i < j) {
          kong_card.push(cards[i])
          i += 1
        }
        kong_cards.push(kong_card)
      }
      
    }
    else {      
      i = j
      j += 1
    }
  }
  return kong_cards
  
}


// determine whether a player can kong a card
export function canKong(cards: Card[], lastCardPlayed: Card){
  let kong_cards = cards.filter(x => x.code === lastCardPlayed.code)
  if (kong_cards.length === 3) {
    return kong_cards
  }
  return [] 
}

export type GamePhase = "initial-card-dealing" | "draw" | "play" | "game-over" 

export interface GameState {
  playerNames: string[]
  cardsById: Record<CardId, Card>
  currentTurnPlayerIndex: number
  phase: GamePhase
  playCount: number
  // fewerThan2CardsPlayer: number[]
  config: Config
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
  return Object.values(cardsById).filter(({ playerIndex: x, locationType: y }) => x === playerIndex && y === "player-hand")
}

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
 export function createNewGame(playerNames: string[], config: Config): GameState {
  let cardsById: Record<CardId, Card> = {}
  let cardId = 0
  if(config.test === 0){ //if disable test
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
      if(config.dragonwind === 1){
        //zhong fa bai
        for(let x = 0; x < dragonRanks.length; ++x){
          const card: Card = {
            code:3*10 + x * 2 + 1, //dragon = 31,33,35
            suit:"dragon",
            rank:dragonRanks[x],
            id:String(cardId++),
            locationType: "unused",
            playerIndex: null,
          }
          cardsById[card.id] = card
        }
        //dong nan xi bei
        for(let y = 0; y < windRanks.length; ++y){
          const card: Card = {
            code:4 * 10 + y*2 + 1, //wind = 41,43,45,47
            suit:"wind",
            rank:windRanks[y],
            id:String(cardId++),
            locationType: "unused",
            playerIndex: null,
          }
          cardsById[card.id] = card
        }
      }
    }
  }
  else{
    let cards: Card[] = JSON.parse(testjson)
    cards.forEach(card => {
      cardsById[card.id] = card
    });
  }
  
  return {
    playerNames,
    cardsById,
    currentTurnPlayerIndex: config.dealer,
    phase: "initial-card-dealing",
    playCount: 0,
    // fewerThan2CardsPlayer: [],
    config: config,
  }
}


//create game with game-over phase
export function createEmptyGame (playerNames: string[], config: Config): GameState{
  let cardsById: Record<CardId, Card> = {}
  return {
    playerNames: playerNames,
    cardsById: cardsById,
    currentTurnPlayerIndex: config.dealer,
    phase: "game-over",
    playCount: 0,
    config: config,
  }
}

/**
 * looks through the cards for a random card in the unused state -- 
 * basically, equivalent to continuously shuffling the deck of discarded cards
 */
export function findNextCardToDraw(cardsById: Record<CardId, Card>, config: Config): CardId | null {
  const unplayedCardIds = Object.keys(cardsById).filter(cardId => cardsById[cardId].locationType === "unused")
  if (unplayedCardIds.length === 0) {
    return null
  }
  if(config.test === 1){ //for e2e test
    return unplayedCardIds[0]
  }
  else if (config.test === 0){
    return unplayedCardIds[Math.floor(Math.random() * unplayedCardIds.length)]
  }
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
}

export interface KongAction {
  action: "kong"
  playerIndex: number
}

export interface ChowAction {
  action: "chow"
  playerIndex: number
  cardIds: CardId[]
}

export type Action = DrawCardAction | PlayCardAction | PongAction | KongAction | ChowAction

function moveToNextPlayer(state: GameState) {
  if(state.config.order === 0){
    state.currentTurnPlayerIndex = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
  }
  else if(state.config.order === 1){
    state.currentTurnPlayerIndex = (state.currentTurnPlayerIndex + 3) % state.playerNames.length
  }
}

function moveToSpecificPlayer(state: GameState, playerId: number) {
  state.currentTurnPlayerIndex = playerId
}

function moveCardToPlayer({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // update state
  card.locationType = "player-hand"
  card.playerIndex = currentTurnPlayerIndex
}

function moveCardToLastPlayed({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // change current last-card-played to a 'player-played'
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "player-played"
    }
  })

  // update state
  card.locationType = "last-card-played"
  card.playerIndex = null
  console.log("moved card id-"+card.id+"to last played")
}

// ** playerId is the player index of the pong/kong/chow user 
function moveCardToSetAside({ cardsById }: GameState, cards: Card[], playerId: number){
  console.log("moveCardToSetAside playerId is"+playerId)
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "set-aside"
      c.playerIndex = playerId
    }
  })
  cards.forEach(c => {
    c.locationType = "set-aside"
    c.playerIndex = playerId
  })
}

// ** playerId is the player index of the pong/kong/chow user 
function moveCardToSetAside2({ cardsById }: GameState, cardIds: CardId[], playerId: number){
  console.log("moveCardToSetAside playerId is"+playerId)
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "set-aside"
      c.playerIndex = playerId
    }
  })
  for (let cid of cardIds){
    cardsById[cid].locationType = "set-aside"
    cardsById[cid].playerIndex = playerId
  }
}

export function getWinUser(state: GameState){
  const lastPlayedCard = getLastPlayedCard(state.cardsById)
  // console.log("getWinUser, lastPlayed is id "+lastPlayedCard.id)
  let prevId = -1;
    if(state.config.order === 1){
      prevId = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
    }
    else if(state.config.order === 0){
      prevId = (state.currentTurnPlayerIndex + 3) % state.playerNames.length
    }
  for(let userId = 0; userId < state.playerNames.length; userId++){
    if (prevId === userId) {
      continue
    }
    else if (determineWin(extractPlayerCards(state.cardsById,userId),lastPlayedCard)) {
      return userId
    }
  }
  return -1
}

export function getPongUser(state: GameState){
  const lastPlayedCard = getLastPlayedCard(state.cardsById)
  console.log("getPongUser, lastPlayed is id "+lastPlayedCard.id)
  let prevId = -1;
    if(state.config.order === 1){
      prevId = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
    }
    else if(state.config.order === 0){
      prevId = (state.currentTurnPlayerIndex + 3) % state.playerNames.length
    }
  for(let userId = 0; userId < state.playerNames.length; userId++){
    // console.log("increment i is"+userId)
    if (prevId === userId) {
      continue
    }
    else if (canPong(extractPlayerCards(state.cardsById,userId),lastPlayedCard).length !== 0) {
      // console.log("currentPlayeridx: " + lastPlayedCard.playerIndex)
      // console.log("model user id: " + userId)
      return userId
    }
  }
  return -1
}

export function getKongUser(state: GameState){
  const lastPlayedCard = getLastPlayedCard(state.cardsById)
  console.log("getKongUser, lastPlayed is id "+lastPlayedCard.id)
  let prevId = -1;
    if(state.config.order === 1){
      prevId = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
    }
    else if(state.config.order === 0){
      prevId = (state.currentTurnPlayerIndex + 3) % state.playerNames.length
    }
  for(let userId = 0; userId < state.playerNames.length; userId++){
    if (prevId === userId) {
      continue
    }
    else 
    if (canKong(extractPlayerCards(state.cardsById,userId),lastPlayedCard).length !== 0) {
      // console.log("currentPlayeridx: " + lastPlayedCard.playerIndex)
      // console.log("model user id: " + userId)
      return userId
    }
  }
  return -1
}

export function getChowCards(state: GameState):Card[][]{
  const lastPlayedCard = getLastPlayedCard(state.cardsById)
  return canChow(extractPlayerCards(state.cardsById,state.currentTurnPlayerIndex),lastPlayedCard)
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
  if (action.playerIndex !== state.currentTurnPlayerIndex && action.action !== "pong" && action.action !== "kong") {
    // not your turn
    return []
  }

  if (state.phase === "initial-card-dealing" && action.action === "draw-card") {
    for(let i = 0; i < 13; ++i){
      const cardId = findNextCardToDraw(state.cardsById, state.config)
      if (cardId == null) {
        return []
      }
      const card = state.cardsById[cardId]
      moveCardToPlayer(state, card)
      changedCards.push(card)
    }
    if(state.currentTurnPlayerIndex === state.config.dealer){ //by default player 0 is the dealer
      const cardId = findNextCardToDraw(state.cardsById, state.config)
      if (cardId == null) {
        return []
      }
      const card = state.cardsById[cardId]
      if(determineWin(extractPlayerCards(state.cardsById,state.currentTurnPlayerIndex),card) === true){
        state.phase = "game-over"
      }
      moveCardToPlayer(state, card)
      changedCards.push(card)
      
    }
    moveToNextPlayer(state)
    const counts = computePlayerCardCounts(state)
    if (counts.every((element)=>{return element >= 13})){
      state.phase = "play"
    }
  }
  
  else if(action.action === "pong"){  // user agreed to pong  (but not sure if the action is still available)
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if (lastPlayedCard === null || lastPlayedCard.playerIndex === action.playerIndex) { // if last played card is own card
      return []
    }
    let pongcards = canPong(extractPlayerCards(state.cardsById,action.playerIndex),lastPlayedCard)
    console.log("pongcards: " + pongcards)
    if (pongcards.length > 0) {
      moveCardToSetAside(state, pongcards, action.playerIndex)
      changedCards.push(lastPlayedCard) // first in "updatedCards," used in emitUpdatedCardsForSpecialOps
      changedCards.push(lastPlayedCard)
      changedCards = changedCards.concat(pongcards)
      console.log("changeCards: " + changedCards)
      moveToSpecificPlayer(state, action.playerIndex)
      state.phase = "play"
    } 
  }

  else if(action.action === "chow"){  // user agreed to chow (but not sure if the action is still available)
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if(lastPlayedCard === null || action.playerIndex !== state.currentTurnPlayerIndex) { // if not xiajia chow
      return []
    }
    let chowcards = canChow(extractPlayerCards(state.cardsById,action.playerIndex),lastPlayedCard)
    console.log("chowCards: " + chowcards)
    if (chowcards.length > 0) { // re-affirm the chow is valid.
      moveCardToSetAside2(state, action.cardIds ,action.playerIndex)
      changedCards.push(lastPlayedCard) // first in "updatedCards," used in emitUpdatedCardsForSpecialOps
      for (let cid of action.cardIds){
        changedCards.push(state.cardsById[cid])
      }
      console.log("changeCards: " + JSON.stringify(changedCards))
      // moveToSpecificPlayer(state, action.playerIndex) // remain at current player. need to play a card
      state.phase = "play"
    }
  }
  
  else if (action.action === "kong") {
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if (lastPlayedCard === null || lastPlayedCard.playerIndex === action.playerIndex) { // if last played card is own card
      return []
    }
    let kongcards = canKong(extractPlayerCards(state.cardsById,action.playerIndex),lastPlayedCard)
    console.log("pongcards: " + kongcards)
    if (kongcards.length > 0) {
      moveCardToSetAside(state, kongcards,action.playerIndex)
      changedCards.push(lastPlayedCard) // first in "updatedCards," used in emitUpdatedCardsForSpecialOps
      changedCards.push(lastPlayedCard)
      changedCards = changedCards.concat(kongcards)
      console.log("changeCards: " + changedCards)
      moveToSpecificPlayer(state, action.playerIndex)
      state.phase = "draw"
    }

  }

  else if (state.phase === "draw" && action.action === "draw-card") {
    const cardId = findNextCardToDraw(state.cardsById, state.config)
    if (cardId == null) {
      return []
    }
    const card = state.cardsById[cardId]
    // if player zimo
    if(determineWin(extractPlayerCards(state.cardsById,state.currentTurnPlayerIndex),card) === true){
      state.phase = "game-over"
    } else {
      state.phase = "play"
    }
    moveCardToPlayer(state, card)
    changedCards.push(card)
  }
  
  else if (state.phase === "play" && action.action === "play-card") {
    const card = state.cardsById[action.cardId]
    if (card.playerIndex !== state.currentTurnPlayerIndex || card.locationType !== "player-hand") {
      // not your card
      console.log("PPlay card emptied out!!")
      return []
    }
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if (lastPlayedCard){
      changedCards.push(lastPlayedCard)
    }
    moveCardToLastPlayed(state, card)
    changedCards.push(card)
    state.phase = "draw"
    moveToNextPlayer(state)
  }

  ++state.playCount

  return changedCards
}

/**
 * @returns only those cards that the given player has any "business" seeing
 */
export function filterCardsForPlayerPerspective(cards: Card[], playerIndex: number) {
  return cards.filter(card => card.playerIndex == null || card.playerIndex === playerIndex).sort((a,b)=> {return a.code - b.code})
}

////////////////////////////////////////////////////////////////////////////////////////////
// data model for cards and game state

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
export const SUITS = ["♦️", "♥️", "♣️", "♠️"]

export type CardId = string
export type LocationType = "unused" | "last-card-played" | "player-hand"

export interface Card {
  id: CardId
  rank: typeof RANKS[number]
  suit: typeof SUITS[number]
  locationType: LocationType
  playerIndex: number | null
  positionInLocation: number | null
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
  if (card.rank === 'K' || lastCardPlayed.rank === 'K'){
    return true
  }
  return card.rank === lastCardPlayed.rank || card.suit === lastCardPlayed.suit
}

export type GamePhase = "initial-card-dealing" | "play" | "game-over"

export interface GameState {
  playerNames: string[]
  cardsById: Record<CardId, Card>
  currentTurnPlayerIndex: number
  phase: GamePhase
  playCount: number
  fewerThan2CardsPlayer: number[]
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

/**
 * @returns an array of the players who have 2 or fewer cards in hand
 */
 export function computePlayers2FewerCard({ playerNames, cardsById }: GameState) {
  const counts = playerNames.map(_ => 0)
  Object.values(cardsById).forEach(({ playerIndex }) => {
    if (playerIndex != null) {
      ++counts[playerIndex]
    }
  })
  const fewerPlayers:number[] = []
  counts.forEach( (count, playerIndex) => {
    if (count <= 2) {
      fewerPlayers.push(playerIndex)
    }
  })
  return fewerPlayers
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
  return Object.values(cardsById).filter(({ playerIndex: x }) => x === playerIndex)
}

/**
 * determines if someone has won the game -- i.e., has no cards left in their hand
 */
 export function determineWinner(state: GameState) {
  if (state.phase === "initial-card-dealing") {
    return null
  }
  const playerIndex = computePlayerCardCounts(state).indexOf(0)
  return playerIndex === -1 ? null : playerIndex
}

/**
 * creates an empty GameState in the initial-card-dealing state
 */
 export function createEmptyGame(playerNames: string[], numberOfDecks = 5, rankLimit = Infinity): GameState {
  const cardsById: Record<CardId, Card> = {}
  let cardId = 0

  for (let i = 0; i < numberOfDecks; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS.slice(0, rankLimit)) {
        const card: Card = {
          suit,
          rank,
          id: String(cardId++),
          locationType: "unused",
          playerIndex: null,
          positionInLocation: null,
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
    fewerThan2CardsPlayer: [],
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

export type Action = DrawCardAction | PlayCardAction

function moveToNextPlayer(state: GameState) {
  state.currentTurnPlayerIndex = (state.currentTurnPlayerIndex + 1) % state.playerNames.length
}

function moveCardToPlayer({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // add to end position
  const currentCardPositions = extractPlayerCards(cardsById, currentTurnPlayerIndex).map(x => x.positionInLocation)

  // update state
  card.locationType = "player-hand"
  card.playerIndex = currentTurnPlayerIndex
  card.positionInLocation = Math.max(-1, ...currentCardPositions) + 1
}

function moveCardToLastPlayed({ currentTurnPlayerIndex, cardsById }: GameState, card: Card) {
  // change current last-card-played to unused
  Object.values(cardsById).forEach(c => {
    if (c.locationType === "last-card-played") {
      c.locationType = "unused"
    }
  })

  // update state
  card.locationType = "last-card-played"
  card.playerIndex = null
  card.positionInLocation = null
}

/**
 * updates the game state based on the given action
 * @returns an array of cards that were updated, or an empty array if the action is disallowed
 */
export function doAction(state: GameState, action: Action): Card[] {
  const changedCards: Card[] = []
  if (state.phase === "game-over") {
    // game over already
    return []
  }
  if (action.playerIndex !== state.currentTurnPlayerIndex) {
    // not your turn
    return []
  }

  if (action.action === "draw-card") {
    const cardId = findNextCardToDraw(state.cardsById)
    if (cardId == null) {
      return []
    }
    const card = state.cardsById[cardId]
    moveCardToPlayer(state, card)
    changedCards.push(card)
  }

  if (state.phase === "initial-card-dealing") {
    if (action.action !== "draw-card") {
      return []
    }

    const counts = computePlayerCardCounts(state)
    if (Math.max(...counts) === Math.min(...counts) && counts[0] === 3) {
      // we are done drawing player cards
      // draw one card to be the last card played
      const cardId = findNextCardToDraw(state.cardsById)
      if (cardId == null) {
        return []
      }
      const card = state.cardsById[cardId]
      moveCardToLastPlayed(state, card)
      changedCards.push(card)
      state.phase = "play"
    }
    moveToNextPlayer(state)
  } else if (action.action === "play-card") {
    const card = state.cardsById[action.cardId]
    if (card.playerIndex !== state.currentTurnPlayerIndex) {
      // not your card
      return []
    }
    const lastPlayedCard = getLastPlayedCard(state.cardsById)
    if (lastPlayedCard == null) {
      return []
    }
    if (!areCompatible(lastPlayedCard, card)) {
      return []
    }
    changedCards.push(lastPlayedCard)
    moveCardToLastPlayed(state, card)
    changedCards.push(card)
  }

  if (state.phase === "play" && action.action !== "draw-card") {
    moveToNextPlayer(state)
  }

  if (state.phase === "play"){
    state.fewerThan2CardsPlayer = computePlayers2FewerCard(state)
  }

  if (determineWinner(state) != null) {
    state.phase = "game-over"
  }

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
  return cards.filter(card => card.playerIndex == null || card.playerIndex === playerIndex)
}
import http from "http"
import { Server } from "socket.io"
import { Action, createEmptyGame, createConfig, doAction, filterCardsForPlayerPerspective, Card, Config, getPongUser, getKongUser, canChow, getChowCards } from "./model"

const server = http.createServer()
const io = new Server(server)
const port = 8091

let gameState = createEmptyGame(["player1", "player2", "player3", "player4"])
let currentConfig = createConfig(2,2)

function emitUpdatedCardsForPlayers(cards: Card[], newGame = false) {
  gameState.playerNames.forEach((_, i) => {
    let updatedCardsFromPlayerPerspective = filterCardsForPlayerPerspective(cards, i)
    if (newGame) {
      updatedCardsFromPlayerPerspective = updatedCardsFromPlayerPerspective.filter(card => card.locationType !== "unused")
    }
    console.log("emitting update for player", i, ":", updatedCardsFromPlayerPerspective)
    io.to(String(i)).emit(
      newGame ? "all-cards" : "updated-cards", 
      updatedCardsFromPlayerPerspective,
    )
  })
}

io.on('connection', client => {
  function emitGameState() {
    client.emit(
      "game-state", 
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      // gameState.fewerThan2CardsPlayer
    )
  }
  
  console.log("New client")
  let playerIndex: number | null | "all" = null
  client.on('player-index', n => {
    playerIndex = n
    console.log("playerIndex set", n)
    client.join(String(n))
    if (typeof playerIndex === "number") {
      client.emit(
        "all-cards", 
        filterCardsForPlayerPerspective(Object.values(gameState.cardsById), playerIndex).filter(card => card.locationType !== "unused"),
      )
    } else {
      client.emit(
        "all-cards", 
        Object.values(gameState.cardsById),    
      )
    }
    emitGameState()
  })

  client.on("get-config", () => {
    io.emit(
      "get-config-reply",
      currentConfig,
    )
  })

  client.on("update-config", (config: Config) => {
    if (typeof config.numberOfDecks !== "number" || typeof config.rankLimit !== "number" || Object.keys(config).length !== 2) {
      setTimeout( () => {
        io.emit(
          "update-config-reply",
          false
        )
      }, 2000)
      console.log("update config failed, config is " + JSON.stringify(config))
    } else {
      setTimeout( () => {
        currentConfig = config
        io.emit(
          "update-config-reply",
          true
        )
      }, 2000)
      console.log("update config succeeded" + JSON.stringify(config))
    }
  })

  client.on("action", (action: Action) => {
    let updatedCards: Card[]
    let pongUserId: number = -1
    let kongUserId: number = -1
    let chowCardSets: Card[][] = []
    if (typeof playerIndex === "number") {
      updatedCards = doAction(gameState, { ...action, playerIndex })
      emitUpdatedCardsForPlayers(updatedCards)
      console.log("update card is: " + updatedCards)
      if (action.action === "play-card"){
        pongUserId = getPongUser(gameState)
        kongUserId = getKongUser(gameState)
        chowCardSets = getChowCards(gameState)
      }
    } else {
      // no actions allowed from "all"
    }
    
    io.to("all").emit(
      "updated-cards", 
      Object.values(gameState.cardsById),    
    )
    if (kongUserId !== -1) {
      console.log("user-can-kong, Id"+kongUserId)
      io.to(kongUserId.toString()).emit(
        "user-can-kong",
        updatedCards
      )
    }
    else if (pongUserId !== -1) {
      console.log("user-can-pong, Id"+pongUserId)
      io.to(pongUserId.toString()).emit(
        "user-can-pong",
        updatedCards
      )
    }
    if (chowCardSets.length > 0) {
      console.log("user-can-chow")
      console.log(JSON.stringify(chowCardSets))
      io.to(gameState.currentTurnPlayerIndex.toString()).emit(
        "user-can-chow",
        chowCardSets,
        updatedCards[updatedCards.length-1] // should be the newly played card, in a "play-card" action
      )
    }

    
    io.emit(
      "game-state", 
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      // gameState.fewerThan2CardsPlayer,
    )
  })

  client.on("new-game", () => {
    gameState = createEmptyGame(gameState.playerNames)
    const updatedCards = Object.values(gameState.cardsById)
    emitUpdatedCardsForPlayers(updatedCards, true)
    io.to("all").emit(
      "all-cards", 
      updatedCards,
    )
    emitGameState()
  })
})
server.listen(port)
console.log(`Game server listening on port ${port}`)

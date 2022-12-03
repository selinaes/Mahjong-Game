import { createServer } from "http"
import { Server } from "socket.io"
import { Action, createNewGame, createEmptyGame, createConfig, doAction, filterCardsForPlayerPerspective, Card, Config, getPongUser, getKongUser, canChow, getChowCards, getWinUser } from "./model"
import express, { NextFunction, Request, Response } from 'express'
import bodyParser from 'body-parser'
import pino from 'pino'
import expressPinoLogger from 'express-pino-logger'
import { Collection, Db, MongoClient, ObjectId } from 'mongodb'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { Issuer, Strategy } from 'openid-client'
import passport from 'passport'
import { keycloak } from "./secrets"
import http from "http"


if (process.env.PROXY_KEYCLOAK_TO_LOCALHOST) {
  // NOTE: this is a hack to allow Keycloak to run from the 
  // same development machine as the rest of the app. We have exposed
  // Keycloak to run off port 8081 of localhost, where localhost is the
  // localhost of the underlying laptop, but localhost inside of the
  // server's Docker container is just the container, not the laptop.
  // The following line creates a reverse proxy to the Keycloak Docker
  // container so that localhost:8081 can also be used to access Keycloak.
  require("http-proxy").createProxyServer({ target: "http://keycloak:8080" }).listen(8081)
}

// set up Mongo
const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017'
const client = new MongoClient(mongoUrl)
let db: Db
let mahjong_users: Collection

// set up Express
const app = express()
const server = createServer(app)
const port = parseInt(process.env.PORT) || 8095
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// set up Pino logging
const logger = pino({
  transport: {
    target: 'pino-pretty'
  }
})
app.use(expressPinoLogger({ logger }))

// set up session
const sessionMiddleware = session({
  secret: 'a just so-so secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false },

  // comment out the following to default to a memory-based store, which,
  // of course, will not persist across load balanced servers
  // or survive a restart of the server
  store: MongoStore.create({
    mongoUrl,
    ttl: 14 * 24 * 60 * 60 // 14 days
  })
})
app.use(sessionMiddleware)
app.use(passport.initialize())
app.use(passport.session())
passport.serializeUser((user: any, done: any) => {
  logger.info("serializeUser " + JSON.stringify(user))
  done(null, user)
})
passport.deserializeUser((user: any, done: any) => {
  logger.info("deserializeUser " + JSON.stringify(user))
  done(null, user)
})

// set up Socket.IO
const io = new Server(server)

// convert a connect middleware to a Socket.IO middleware
const wrap = (middleware: any) => (socket: any, next: any) => middleware(socket.request, {}, next)
io.use(wrap(sessionMiddleware))

// hard-coded game configuration
let currentConfig = createConfig(0,0,0,0)

export const playerUserIds = ["dennis", "alice", "kevin", "kate"]
let gameState = createEmptyGame(playerUserIds, currentConfig) //empty game state and wait for new game

//update winner in mongodb
async function updateWinCount(winner: string){
  await mahjong_users.updateOne(
    { _id: winner},
    { $inc: { winCount: 1 } }
  )
}

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

function emitUpdatedCardsForSpecialOps(cards: Card[]) {
  let lastplayed = cards[0]
  cards.splice(0, 1)
  gameState.playerNames.forEach( (_, i) => {
    let updatedCardsFromPlayerPerspective = filterCardsForPlayerPerspective(cards, i)
    updatedCardsFromPlayerPerspective.push(lastplayed)
    console.log("emitting update for player", i, ":", updatedCardsFromPlayerPerspective)
    io.to(String(i)).emit(
      "updated-cards", 
      updatedCardsFromPlayerPerspective,
    )
  })
}

io.on('connection', client => {
  const user = (client.request as any).session?.passport?.user
  logger.info("new socket connection for user " + JSON.stringify(user))
  if (!user) {
    client.disconnect()
    return
  }

  function emitGameState() {
    client.emit(
      "game-state", 
      playerIndex,
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
    )
  }
  
  // console.log("New client")
  // let playerIndex: number | null | "all" = null
  // client.on('player-index', n => {
  //   playerIndex = n
  //   console.log("playerIndex set", n)
  //   client.join(String(n))
  console.log("New client")
  let playerIndex: number | "all" = playerUserIds.indexOf(user.preferred_username)
  if (playerIndex === -1) {
    playerIndex = "all"
  }
  client.join(String(playerIndex))

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

  client.on("get-config", () => {
    io.emit(
      "get-config-reply",
      currentConfig,
    )
  })

  client.on("update-config", (config: Config) => {
    if (typeof config.dealer !== "number" || typeof config.order !== "number" || typeof config.dragonwind !== "number" || typeof config.test !== "number" || Object.keys(config).length !== 4) {
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
    let winUserId: number = -1
    let chowCardSets: Card[][] = []
    if (typeof playerIndex === "number") {
      updatedCards = doAction(gameState, { ...action, playerIndex })
      if ((action.action === "chow" || action.action === "kong" || action.action === "pong") && updatedCards.length > 0) {
        emitUpdatedCardsForSpecialOps(updatedCards)
        updatedCards.splice(0,0) // remove the special 1st place repeated last-played-card
      } else {
        emitUpdatedCardsForPlayers(updatedCards)
      }
      // console.log("update card is: " + JSON.stringify(updatedCards))
      if (action.action === "play-card"){
        pongUserId = getPongUser(gameState)
        kongUserId = getKongUser(gameState)
        chowCardSets = getChowCards(gameState)
        winUserId = getWinUser(gameState)
        updateWinCount(playerUserIds[winUserId])
        console.log(`this play, pong ${pongUserId}, kong ${kongUserId}, chow ${chowCardSets.length}, win ${winUserId} `)
      }

      if (action.action === "draw-card" && gameState.phase === "game-over") {
        winUserId = action.playerIndex
        updateWinCount(playerUserIds[winUserId])
      }
    } else {
      // no actions allowed from "all"
    }
    
    io.to("all").emit(
      "updated-cards", 
      Object.values(gameState.cardsById),    
    )
    if (winUserId !== -1) {
      gameState.phase = "game-over"
      console.log("user-win, Id: "+winUserId)
        io.to(winUserId.toString()).emit(
          "user-win",
          updatedCards
        )
    } else {
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
    }

    
    io.emit(
      "game-state",
      null,
      gameState.currentTurnPlayerIndex,
      gameState.phase,
      gameState.playCount,
      // gameState.fewerThan2CardsPlayer,
    )
  })

  client.on("new-game", async () => {
    gameState = createNewGame(gameState.playerNames, currentConfig)
    playerUserIds.forEach(async (playerUserId) => {
      await mahjong_users.updateOne(
        { _id: playerUserId},
        { $inc: { gameCount: 1 } }
      )
    })
    const updatedCards = Object.values(gameState.cardsById)
    emitUpdatedCardsForPlayers(updatedCards, true)
    io.to("all").emit(
      "all-cards", 
      updatedCards,
    )
    emitGameState()
  })
})
// app routes
app.post(
  "/api/logout", 
  (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err)
      }
      res.redirect("/")
    })
  }
)

app.get("/api/user", (req, res) => {
  res.json(req.user || {})
})

// connect to Mongo
client.connect().then(() => {
  logger.info('connected successfully to MongoDB')
  db = client.db("mahjong_users")
  mahjong_users = db.collection('mahjong_users')
  // let temp_id = ""
  Issuer.discover("http://127.0.0.1:8081/auth/realms/game/.well-known/openid-configuration").then(issuer => {
    const client = new issuer.Client(keycloak)
  
    passport.use("oidc", new Strategy(
      { 
        client,
        params: {
          // this forces a fresh login screen every time
          prompt: "login"
        }
      },
      async (tokenSet: any, userInfo: any, done: any) => {
        logger.info("oidc " + JSON.stringify(userInfo))

        const _id = userInfo.preferred_username
        // temp_id = userInfo.preferred_username
        const user = await mahjong_users.findOne({_id})
        if (user == null && _id != "dennis") {
          mahjong_users.insertOne({
            _id : _id,
            role: "gamer",
            gameCount: 0,
            winCount: 0
          })
        }
        return done(null, userInfo)
      }
    ))

    app.get(
      "/api/login", 
      passport.authenticate("oidc", { failureRedirect: "/api/login" }), 
      (req, res) => res.redirect("/")
    )
    
    app.get(
      "/api/login-callback",
      passport.authenticate("oidc", {
        successRedirect: "/",
        failureRedirect: "/api/login",
      })
    )    

    app.get("/api/all-users", async (req, res) => {
      if (req.user?.preferred_username === "dennis"){
        let all_users = await mahjong_users.find().toArray()
        res.status(200).json(all_users)
      }
      else{
        res.status(403).json({ error: "Forbidden" })
      }
    })

    // start server
    server.listen(port)
    logger.info(`Game server listening on port ${port}`)
  })
})




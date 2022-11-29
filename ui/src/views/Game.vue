<template>
  <div>
    <b-button class="mx-2 my-2" size="sm" @click="socket.emit('new-game')">New Game</b-button>
    <b-badge class="mr-2 mb-2" :variant="myTurn ? 'primary' : 'secondary'">turn: {{ currentTurnPlayerIndex }}</b-badge>
    <b-badge class="mr-2 mb-2">{{ phase }}</b-badge>
    <b-badge class="mr-4 mb-3">{{"Players with 2 or fewer cards on hand: "+list2FewerCardsPlayers }}</b-badge>
    
    <router-link :to="{ path: '/config'}"><b-button class="mx-2 my-2" :disabled="phase!=='game-over'">Config</b-button></router-link>
    <div>
      <b-card no-body class="text-center">
        <div class="bg-secondary text-light">
        Note: White is card in hand; Black is unused card; Blue is last played card.
       </div>
      </b-card>
    </div>
    <div
      v-for="card in cards"
      :key="card.id"
    >
    <AnimatedCard :card="card" :legal="isLegal(card, cards)" @play="playCard(card.id)" />
      <!-- <pre>{{ formatCard(card, true) }}</pre> -->
    </div>
    <b-button class="mx-2 my-2" size="sm" @click="drawCard" :disabled="!canDraw">Draw Card</b-button>
    <b-button class="mx-2 my-2" size="sm" @click="pong" :disabled="!canPong">Pong</b-button>
    <b-button class="mx-2 my-2" size="sm" @click="kong" :disabled="!canKong">Kong</b-button>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Card, GamePhase, Action, formatCard, CardId, areCompatible, Config} from "../../../server/model"
import AnimatedCard from './AnimatedCard.vue';

// props
interface Props {
  playerIndex?: string
}

// default values for props
const props = withDefaults(defineProps<Props>(), {
  playerIndex: "all",
})

const socket = io()
let x = props.playerIndex
let playerIndex: number | "all" = parseInt(x) >= 0 ? parseInt(x) : "all"
console.log("playerIndex", JSON.stringify(playerIndex))
socket.emit("player-index", playerIndex)

const cards: Ref<Card[]> = ref([])
const currentTurnPlayerIndex = ref(-1)
const phase = ref("")
const playCount = ref(-1)
const list2FewerCardsPlayers: Ref<number[]> = ref([])
const canPong = ref(false)
const canKong = ref(false)


const myTurn = computed(() => (currentTurnPlayerIndex.value === playerIndex) && (phase.value !== "game-over"))

socket.on("all-cards", (allCards: Card[]) => {
  cards.value = allCards.sort((a,b)=> {return a.code - b.code})
})

socket.on("updated-cards", (updatedCards: Card[]) => {
  applyUpdatedCards(updatedCards)
})

socket.on("game-state", (newCurrentTurnPlayerIndex: number, newPhase: GamePhase, newPlayCount: number, twoFewerPlayes: number[]) => {
  currentTurnPlayerIndex.value = newCurrentTurnPlayerIndex
  phase.value = newPhase
  playCount.value = newPlayCount
  list2FewerCardsPlayers.value = twoFewerPlayes
})

socket.on("user-can-pong", () => {
  canPong.value = true
})

socket.on("user-can-kong", () => {
  canKong.value = true
})

function doAction(action: Action) {
  return new Promise<Card[]>((resolve, reject) => {
    socket.emit("action", action)
    socket.once("updated-cards", (updatedCards: Card[]) => {
      resolve(updatedCards)
    })
  })
}

function getLastPlayedCard(cards: Card[]) {
  return cards.find(c => c.locationType === "last-card-played")
}

function isLegal(card: Card, cards: Card[]){
  // if (currentTurnPlayerIndex.value !== playerIndex || phase.value === "game-over") {
  //     // not your turn or game finished
  //     return false
  // }
  // const lastPlayedCard = getLastPlayedCard(cards)
  //   if (lastPlayedCard === null) {
  //     return false
  //   }
  //   if (!areCompatible(card, lastPlayedCard)) {
  //     return false
  //   }
  //   if (card.locationType !== 'player-hand'){ 
  //     return false
  //   }
  if (currentTurnPlayerIndex.value !== playerIndex || phase.value !== "play" || card.locationType !== 'player-hand') {
    return false
  }
  return true
}

// the button for draw is clickable
const canDraw = computed(() => (currentTurnPlayerIndex.value === playerIndex) && (phase.value === "initial-card-dealing" || phase.value === "draw"))

// const canPong = computed(()=>(currentTurnPlayerIndex.value === playerIndex))

// function canDraw(){
//   if (phase.value === "initial-card-dealing" && myTurn) {
//     return true
//   }
//   if (!myTurn || phase.value !== "draw"){
//     return false
//   }
//   return true
// }

async function drawCard() {
  if (typeof playerIndex === "number") {
    const updatedCards = await doAction({ action: "draw-card", playerIndex })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function playCard(cardId: CardId) {
  if (typeof playerIndex === "number") {
    const updatedCards = await doAction({ action: "play-card", playerIndex, cardId })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function pong(cardId: CardId){
  if (typeof playerIndex === "number") {
    const updatedCards = await doAction({ action: "pong", playerIndex, cardId })
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canPong.value = false
    }
  }
}

async function kong(cardId: CardId){
  if (typeof playerIndex === "number") {
    const updatedCards = await doAction({ action: "kong", playerIndex, cardId })
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canKong.value = false
    }
  }
}



async function applyUpdatedCards(updatedCards: Card[]) {
  for (const x of updatedCards) {
    const existingCard = cards.value.find(y => x.id === y.id)
    if (existingCard) {
      Object.assign(existingCard, x)
    } else {
      cards.value.push(x)
    }
  }
}


</script>
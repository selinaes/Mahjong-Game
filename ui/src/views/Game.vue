<template>
  <div>
    <div>
        <b-modal id="special-action-modal"  v-model="modalShow" hide-footer no-stacking>
          <template #modal-title>
            You could Pong/Kong/Chow the following card! 
          </template>
          <div class="d-block text-center">
            <p>{{actionableCard}}</p>
          </div>
          <b-button  @click="pong" :disabled="!canPong">Pong</b-button>
          <b-button  @click="kong" :disabled="!canKong">Kong</b-button>
          <b-button  v-b-modal.chow-choices-modal :disabled="!canChow">Chow</b-button>
          <b-button  @click="$bvModal.hide('special-action-modal')">Pass</b-button>
        </b-modal>

        <b-modal id="chow-choices-modal" v-model="choiceShow" title="Chow Choices">
          <p class="my-2">Select one of the following sets</p>
          <div
            v-for="choice in chowChoices"
          >
          <b-button  @click="chow(choice)" :disabled="!choiceShow">{{formatChowSet(choice)}}</b-button>
          </div>
        </b-modal>

        <b-modal id="win-modal" v-model="winShow" hide-footer title="You Won!">
          <p class="my-2">You won by adding this card played by another user: </p>
          <p>{{winCard}}</p>
          <b-button  @click="$bvModal.hide('win-modal')" >Yay! Close this.</b-button>
        </b-modal>
      </div>

    <b-button class="mx-2 my-2" size="sm" @click="socket.emit('new-game')">New Game</b-button>
    <b-badge class="mr-2 mb-2" :variant="myTurn ? 'primary' : 'secondary'">turn: {{ currentTurnPlayerIndex }}</b-badge>
    <b-badge class="mr-2 mb-2">{{ phase }}</b-badge>
    <b-badge class="mr-4 mb-3">{{"Current # of cards: " + cards.length}}</b-badge>
    
    <router-link :to="{ path: '/config'}"><b-button class="mx-2 my-2" :disabled="phase!=='game-over'">Config</b-button></router-link>
    <div>
      <p>Last Played card: {{JSON.stringify(lastPlayed)}}</p>
      <b-card no-body class="text-center">
        <div class="bg-secondary text-light">
        Note: White is card is in hand; Green card is set-aside for chow/pong/gang; Black is unused card; Blue is last played card.
       </div>
      </b-card>
    </div>
    <h1 v-if = "(phase === 'game-over')"> Waiting for New Game to Start ...</h1>
    <h4 v-if = "(phase !== 'game-over')"> Playerhand Tiles: </h4>
    <div v-if = "(phase !== 'game-over')">
    <div>
      <div v-for="card in cards.filter(card => card.locationType === 'player-hand')" :key="card.id" class = "test">
        <AnimatedCard :card="card" :legal="isLegal(card, cards)" @play="playCard(card.id)" />
      </div>
    </div>
    <h4 v-if = "(phase !== 'game-over')"> Player Setaside Tiles(chow pong gang): </h4>
    <div>
      <div v-for="card in cards.filter(card => card.locationType === 'set-aside')" :key="card.id" class = "test">
        <AnimatedCard :card="card" :legal="isLegal(card, cards)" @play="playCard(card.id)" />
      </div>
    </div>
    <h4 v-if = "(phase !== 'game-over')"> Played Tiles & Last-played Tile</h4>
    <div>
      <div v-for="card in cards.filter(card => card.playerIndex === null)" :key="card.id" class = "test">
        <AnimatedCard :card="card" :legal="isLegal(card, cards)" @play="playCard(card.id)" />
      </div>
    </div>

    <b-button class="mx-2 my-2" size="sm" @click="drawCard" :disabled="!canDraw">Draw Card</b-button>
    </div>
  </div>
</template>

<style>
  .test{
    display: inline-block;
  }
</style>

<script setup lang="ts">
import { computed, onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Card, GamePhase, Action, CardId} from "../../../server/model"
import AnimatedCard from './AnimatedCard.vue';

const socket = io()
// let x = props.playerIndex
// let playerIndex: number | "all" = parseInt(x) >= 0 ? parseInt(x) : "all"
const playerIndex: Ref<number | "all"> = ref("all")

const cards: Ref<Card[]> = ref([])

const currentTurnPlayerIndex = ref(-1)
const phase = ref("")
const playCount = ref(-1)
const canPong = ref(false)
const canKong = ref(false)
const canChow = ref(false)
const modalShow = ref(false)
const choiceShow = ref(false)
const winShow = ref(false)
const winCard = ref("")
const actionableCard = ref("")
const chowChoices: Ref<Card[][]> = ref([])

const lastPlayed = computed(() => getLastPlayedCards(cards.value))


const myTurn = computed(() => (currentTurnPlayerIndex.value === playerIndex.value) && (phase.value !== "game-over"))

socket.on("all-cards", (allCards: Card[]) => {
  cards.value = allCards.sort((a,b)=> {return a.code - b.code})
})

socket.on("updated-cards", (updatedCards: Card[]) => {
  applyUpdatedCards(updatedCards)
})

socket.on("game-state", (newPlayerIndex: number, newCurrentTurnPlayerIndex: number, newPhase: GamePhase, newPlayCount: number) => {
  if (newPlayerIndex != null) {
    playerIndex.value = newPlayerIndex
  }
  currentTurnPlayerIndex.value = newCurrentTurnPlayerIndex
  phase.value = newPhase
  playCount.value = newPlayCount
})

socket.on("user-win", (updatedCards: Card[]) => {
  console.log("socket received user-win")
  winCard.value = updatedCards[updatedCards.length-1].rank + updatedCards[updatedCards.length-1].suit
  winShow.value = true
})

// can kong includes the situation for can-pong. User can select if they want to kong or pong
socket.on("user-can-kong", (updatedCards: Card[]) => {
  console.log("socket received user-can-kong")
  console.log("updatedCards: " + updatedCards)
  actionableCard.value = updatedCards[updatedCards.length-1].rank + updatedCards[updatedCards.length-1].suit
  canPong.value = true
  canKong.value = true
  modalShow.value = true
  console.log("modalShow value: " + modalShow.value)
})

socket.on("user-can-pong", (updatedCards: Card[]) => {
  console.log("socket received user-can-pong")
  actionableCard.value = updatedCards[updatedCards.length-1].rank + updatedCards[updatedCards.length-1].suit
  canPong.value = true
  modalShow.value = true
})

socket.on("user-can-chow", (chowCardSets: Card[][], lastPlayedCard: Card) => {
  console.log("socket received user-can-chow")
  chowCardSets = combineChowSets(chowCardSets, lastPlayedCard)
  chowChoices.value = chowCardSets
  actionableCard.value = chowCardSets.reduce((accu, elem, idx) => {
    let padding = ""
    for (let i = 0; i < elem.length-1; i++) {
      padding += (elem[i].rank + elem[i].suit)
      padding += " +"
    }
    padding += elem[elem.length-1].rank + elem[elem.length-1].suit
    accu = accu + "set" + (idx+1).toString() + ": " + padding + "\n"
    
    return accu
  },
  "")
  
  canChow.value = true
  modalShow.value = true
})

function doAction(action: Action) {
  return new Promise<Card[]>((resolve, reject) => {
    socket.emit("action", action)
    socket.once("updated-cards", (updatedCards: Card[]) => {
      resolve(updatedCards)
    })
  })
}

function combineChowSets(chowCardSets: Card[][], lastPlayedCard: Card): Card[][] {
  let result = []
  for (let cardlist of chowCardSets){
    cardlist.push(lastPlayedCard)
    cardlist.sort((a,b)=> {return a.code - b.code})
    result.push(cardlist)
  }
  return result

}

function formatChowSet(chowCardSet: Card[]) {
  return chowCardSet.reduce((accu, card) => {
    accu = accu + card.rank + card.suit + "-"
    return accu
  }, "")
}

function getLastPlayedCards(cards: Card[]) {
  return cards.filter(c => c.locationType === "last-card-played")
}

function isLegal(card: Card, cards: Card[]){
  if (currentTurnPlayerIndex.value !== playerIndex.value || phase.value !== "play" || card.locationType !== 'player-hand') {
    return false
  }
  return true
}

// the button for draw is clickable
const canDraw = computed(() => (currentTurnPlayerIndex.value === playerIndex.value) && (phase.value === "initial-card-dealing" || phase.value === "draw"))

async function drawCard() {
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "draw-card", playerIndex: playerIndex.value })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function playCard(cardId: CardId) {
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "play-card", playerIndex: playerIndex.value, cardId })
    if (updatedCards.length === 0) {
      alert("didn't work")
    }
  }
}

async function pong(){
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "pong", playerIndex: playerIndex.value})
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canPong.value = false
      modalShow.value = false
    }
  }
}

async function kong(){
  if (typeof playerIndex.value === "number") {
    const updatedCards = await doAction({ action: "kong", playerIndex: playerIndex.value})
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canKong.value = false
      modalShow.value = false
    }
  }
}

async function chow(set: Card[]){
  if (typeof playerIndex.value === "number") {
    const cardIds = set.map(card => card.id)
    const updatedCards = await doAction({ action: "chow", playerIndex: playerIndex.value, cardIds})
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canChow.value = false
      choiceShow.value = false
    }
  }
}

async function applyUpdatedCards(updatedCards: Card[]) {
  for (const x of updatedCards) {
    const existingCard = cards.value.find(y => x.id === y.id)
    if (existingCard) {
      if ((typeof x.playerIndex === "number") && (x.playerIndex !== playerIndex.value)){
        // existing card, but now belong to some other player (chowed/ponged/gonged, prev last-played-card)
        const idx = cards.value.indexOf(existingCard)
        cards.value.splice(idx, 1)
      }
      else{
        Object.assign(existingCard, x)
      }
      
    } else {
      cards.value.push(x)
    }
  }
}


</script>
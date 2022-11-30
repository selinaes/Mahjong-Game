<template>
  <div>
    <div>
        <!-- <b-button id="show-btn" @click="modalShow = !modalShow">Open Pong</b-button> -->

        <b-modal id="bv-modal-example"  v-model="modalShow" hide-footer no-stacking>
          <template #modal-title>
            You could Pong/Kong/Chow the following card! 
          </template>
          <div class="d-block text-center">
            <p>{{actionableCard}}</p>
          </div>
          <b-button  @click="pong" :disabled="!canPong">Pong</b-button>
          <b-button  @click="kong" :disabled="!canKong">Kong</b-button>
          <b-button  v-b-modal.modal-multi-2 :disabled="!canChow">Chow</b-button>
          <b-button  @click="$bvModal.hide('bv-modal-example')">Pass</b-button>
        </b-modal>

        <b-modal id="modal-multi-2" title="Chow Choices">
          <p class="my-2">Select one of the following sets</p>
          <div
            v-for="choice in chowChoices"
          >
          <b-button  @click="chow(choice)" >{{formatChowSet(choice)}}</b-button>
          </div>
        </b-modal>
      </div>

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
    <!-- <b-button class="mx-2 my-2" size="sm" @click="pong" :disabled="!canPong">Pong</b-button> -->
    <!-- <b-button class="mx-2 my-2" size="sm" @click="kong" :disabled="!canKong">Kong</b-button> -->

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Card, GamePhase, Action, formatCard, CardId, areCompatible, Config} from "../../../server/model"
import AnimatedCard from './AnimatedCard.vue';

// // props
// interface Props {
//   playerIndex?: string
// }

// // default values for props
// const props = withDefaults(defineProps<Props>(), {
//   playerIndex: "all",
// })

const socket = io()
// let x = props.playerIndex
// let playerIndex: number | "all" = parseInt(x) >= 0 ? parseInt(x) : "all"
const playerIndex: Ref<number | "all"> = ref("all")

// console.log("playerIndex", JSON.stringify(playerIndex))
// socket.emit("player-index", playerIndex)

const cards: Ref<Card[]> = ref([])
const currentTurnPlayerIndex = ref(-1)
const phase = ref("")
const playCount = ref(-1)
const list2FewerCardsPlayers: Ref<number[]> = ref([])
const canPong = ref(false)
const canKong = ref(false)
const canChow = ref(false)
const modalShow = ref(false)
const choiceShow = ref(false)
const actionableCard = ref("")
const chowChoices: Ref<Card[][]> = ref([])


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

// can kong includes the situation for can-pong. User can select if they want to kong or pong
socket.on("user-can-kong", (updatedCards: Card[]) => {
  actionableCard.value = updatedCards[1].rank + updatedCards[1].suit
  canPong.value = true
  canKong.value = true
  modalShow.value = true
})

socket.on("user-can-pong", (updatedCards: Card[]) => {
  actionableCard.value = updatedCards[1].rank + updatedCards[1].suit
  canPong.value = true
  modalShow.value = true
})

socket.on("user-can-chow", (chowCardSets: Card[][], lastPlayedCard: Card) => {
  chowCardSets = combineChowSets(chowCardSets, lastPlayedCard)
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
  chowChoices.value = combineChowSets(chowCardSets, lastPlayedCard)
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
  if (currentTurnPlayerIndex.value !== playerIndex.value || phase.value !== "play" || card.locationType !== 'player-hand') {
    return false
  }
  return true
}

// the button for draw is clickable
const canDraw = computed(() => (currentTurnPlayerIndex.value === playerIndex.value) && (phase.value === "initial-card-dealing" || phase.value === "draw"))

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
    const updatedCards = await doAction({ action: "chow", playerIndex: playerIndex.value, cards: set})
    if (updatedCards.length === 0) {
      alert("didn't work")
    } else { // succeed
      canChow.value = false
      modalShow.value = false
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
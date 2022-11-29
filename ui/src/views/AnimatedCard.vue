<template>
  <div>
  <b-card
    :title="card.rank+ ' '+ card.suit"
    :bg-variant="cardColor(card.locationType)"
    style="max-width: 20rem;"
    class="mb-2"
  >
    <b-card-text>
      [Card-ID: {{card.id}}] {{card.locationType==='player-played'?'(played)':''}} {{legal ? '': 'NOT LEGAL TO PLAY'}}
    </b-card-text>

    <b-button href="#" 
    :variant= "legal ? 'primary':'secondary'" 
    :disabled="!legal"
    @click="play()" >
    {{card.locationType === 'last-card-played'?'Last Played Card':'Play This'}}
    </b-button>
  </b-card>
</div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Card, GamePhase, Action, areCompatible, CardId, LocationType } from "../../../server/model"

// props
interface Props {
  card?: Card
  legal: boolean 
}

// default values for props
const props = withDefaults(defineProps<Props>(), {
  card: undefined,
  legal: false,
})

const emit = defineEmits<{
  (e: 'play'): void
}>()

function play() {
  emit("play")
}

function cardColor(type: LocationType){
  if (type === 'last-card-played'){
    return 'info'
  }
  if (type === 'player-hand' ){
    return 'default'
  }
  if (type === 'player-played'){
    return 'dark'
  }
}
</script>
<!-- <template>
  <div class= "grid-container">
  <b-card
    :title="card.rank+ ' '+ card.suit"
    :bg-variant="cardColor(card.locationType)"
    style="max-width: 20rem;"
    class="mb-2"
  >
    <b-card-text>
      [Card-ID: {{card.id}}] {{card.code}} {{card.locationType}}
    </b-card-text>
    
    <b-button href="#" 
    :variant= "legal ? 'primary':'secondary'" 
    :disabled="!legal"
    @click="play()" >
    {{card.locationType === 'last-card-played'?'Last Played Card':'Play This'}}
    </b-button>
  </b-card>
</div>
</template>  -->




<template>
  <div @click="play()">
    <img :src = "`/${card.code}.png`" width = "70" :class="legal ? 'playable': 'not-playable'"/> 
</div>
</template>

<style>
  .not-playable{
    filter: grayscale(100%);
  }

  .playable{
    filter: grayscale(0%);
    /* border-radius: 20px;
    box-shadow: 0px -10px gray; */
  }
</style>


<script setup lang="ts">
import { Card, LocationType } from "../../../server/model"


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
  if (type === 'set-aside') {
    return 'success'
  }
}
</script>

<style>
  .grid-container{
    display:grid;
    grid-template-columns:repeat(1,200px);
    grid-gap: 3em;
    justify-content: center;
  }
</style>
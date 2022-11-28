<template>
  <div>
  <p class="h1"> Setting Configuration for Next Game</p>
  <b-overlay :show="busy">
    <b-container fluid>
      <b-row class="my-1" >
        <b-col sm="1">
          <label for="sb-num-decks">Number of Decks: [{{currentConfig.numberOfDecks}}]</label>
        </b-col>
        <b-col sm="7">
          <b-form-input v-model="currentConfig.numberOfDecks" type= "number" placeholder="Enter new # of decks" inline number></b-form-input>
        </b-col>
        <b-col sm="2">
          <b-button size="sm" @click="getConfig" >Get Config</b-button>
        </b-col>
      </b-row>
      <b-row class="my-1" >
        <b-col sm="1">
          <label for="sb-rank-limit">Rank Limit: [{{currentConfig.rankLimit}}]</label>
        </b-col>
        <b-col sm="7">
          <b-form-input v-model="currentConfig.rankLimit" type= "number" placeholder="Enter new rank limit" inline number></b-form-input>
        </b-col>
        <b-col sm="2">
          <b-button size="sm" @click="requestUpdateConfig(currentConfig.numberOfDecks, currentConfig.rankLimit)" >Update Config</b-button>
        </b-col>
      </b-row>
    </b-container>
  </b-overlay>
  <b-button size="sm" @click="$router.go(-1)" >Go Back</b-button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Config } from "../../../server/model"


const socket = io()

const currentConfig: Ref<Config> = ref({numberOfDecks:0, rankLimit:0})

const busy = ref(false)

async function getConfig(){
  const curConfig = await new Promise<Config>( (resolve, reject) => {
    socket.emit("get-config")
    busy.value = true
    socket.once("get-config-reply", (givenConfig: Config) => {
      busy.value = false
      resolve(givenConfig)
    })
  })
  currentConfig.value = curConfig
  // alert(JSON.stringify(curConfig))
}

async function requestUpdateConfig(numDecks: number, rankLimit: number) {
  const updatedConfig: Config = {
    numberOfDecks: numDecks,
    rankLimit: rankLimit
  }
  const valid = await updateConfig(updatedConfig)
  if (!valid){
    alert("update failed, please check fields input")
  }
}

function updateConfig(config: Config){
  return new Promise<boolean>( (resolve, reject) => {
    socket.emit("update-config", config)
    busy.value = true
    socket.once("update-config-reply", (valid: boolean) => {
      busy.value = false
      resolve(valid)
    })
  })
}

onMounted(() => {
  getConfig()
 })
</script>
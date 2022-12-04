<template>
  <div>
  <h1> Setting Configuration</h1>
  <p> Changes will take effect starting next game</p>
  <b-overlay :show="busy">
    <b-container fluid>
      <b-row class="my-1" >
        <b-col sm="5">
          <label for="sb-num-decks">Dealer Position(0-3): [{{currentConfig.dealer}}]</label>
        </b-col>
        <b-col sm="5">
          <b-form-input v-model="currentConfig.dealer" type= "number" min="0" max="3" placeholder="Enter config dealer position" inline number></b-form-input>
        </b-col>
      </b-row>
      <b-row class="my-1" >
        <b-col sm="5">
          <label for="sb-rank-limit">Order of Playing(0: clockwise, 1: counterclockwise): [{{currentConfig.order}}]</label>
        </b-col>
        <b-col sm="5">
          <b-form-input v-model="currentConfig.order" type= "number" min="0" max="1" placeholder="Enter order of playing" inline number></b-form-input>
        </b-col>    
      </b-row>
      <b-row class="my-1" >
        <b-col sm="5">
          <label for="sb-num-decks">Enable Dragon and Wind(0: disable, 1: enable): [{{currentConfig.dragonwind}}]</label>
        </b-col>
        <b-col sm="5">
          <b-form-input v-model="currentConfig.dragonwind" type= "number" min="0" max="1" placeholder="Enter if enable dragon and wind" inline number></b-form-input>
        </b-col>
      </b-row>
      <b-row class="my-1" >
        <b-col sm="5">
          <label for="sb-num-decks">Enable Test(0: disable, 1: enable, ***enable test is for E2E testing example with fixed dealing cards***): [{{currentConfig.test}}]</label>
        </b-col>
        <b-col sm="5">
          <b-form-input v-model="currentConfig.test" type= "number" min="0" max="1" placeholder="Enter if enable dragon and wind" inline number></b-form-input>
        </b-col>
      </b-row>
      <b-row class="my-1" >
        <b-col sm="2">
          <b-button size="sm" @click="getConfig" >Get Config</b-button>
        </b-col>
        <b-col sm="2">
          <b-button size="sm" @click="requestUpdateConfig(currentConfig.dealer, currentConfig.order, currentConfig.dragonwind, currentConfig.test)" >Update Config</b-button>
        </b-col>
        <b-col sm="2">
          <b-button size="sm" @click="$router.go(-1)" >Go Back</b-button>
        </b-col>
      </b-row>
        </b-container>
  </b-overlay>

  
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, Ref } from 'vue'
import { io } from "socket.io-client"
import { Config } from "../../../server/model"


const socket = io()

const currentConfig: Ref<Config> = ref({dealer:0, order:0, dragonwind:0, test:0})

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
}

async function requestUpdateConfig(dealer: number, order: number, dragonwind: number, test: number) {
  const updatedConfig: Config = {
    dealer: dealer,
    order: order,
    dragonwind: dragonwind,
    test: test,
  }
  const valid = await updateConfig(updatedConfig)
  if (valid){
    alert("Successfully updated configuration")
  }
  else if (!valid){
    alert("Update failed, please check fields input")
  }
}

function updateConfig(config: Config){
  return new Promise<boolean>( (resolve, reject) => {
    if(config.dealer < 0 || config.dealer > 3 || config.dragonwind < 0 || config.dragonwind > 1 || config.order < 0 || config.order > 1 || config.test < 0 || config.test > 1){
      resolve(false)
    }
    else{
      socket.emit("update-config", config)
      busy.value = true
      socket.once("update-config-reply", (valid: boolean) => {
        busy.value = false
        resolve(valid)
      })
    }
  })
}

onMounted(() => {
  getConfig()
 })
</script>
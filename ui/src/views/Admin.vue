<template>
  <div>
    <b-table :items="all_users" :fields="userfield" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, Ref } from 'vue'
import { user } from  "../../../server/setupMongo"

const userfield = ["_id","role","gameCount","winCount"]
let all_users: Ref<user[]> = ref([])
onMounted(async () => {
  all_users.value = await (await fetch("/api/all-users")).json()
  console.log(all_users.value)
})
</script>


<!-- [{"_id":"dennis","role":"admin","gameCount":0,"winCount":0},{"_id":"kate","role":"gamer","gameCount":0,"winCount":0},{"_id":"alice","role":"gamer","gameCount":0,"winCount":0},{"_id":"kevin","role":"gamer","gameCount":0,"winCount":0}] -->
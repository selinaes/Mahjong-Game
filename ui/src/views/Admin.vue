<template>
  <div v-if = "(all_users.length > 0)">
    <h2>All user information:</h2>
    <b-table :items="all_users" :fields="userfield" />
  </div>
  <div v-else>
    <p> No permission </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, Ref } from 'vue'
import { user } from  "../../../server/setupMongo"

const userfield = ["_id","role","gameCount","winCount"]
let all_users: Ref<user[]> = ref([])

onMounted(async () => {
  all_users.value = await (await fetch("/api/all-users")).json()
})
</script>

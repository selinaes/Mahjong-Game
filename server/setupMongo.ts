import { MongoClient, ObjectId } from 'mongodb'

// Connection URL
const url = 'mongodb://localhost:27017'
const client = new MongoClient(url)

interface user {
    _id: string
    role: "gamer"|"admin"
    gameCount: number
    winCount: number
  }


const users: user[] = [
  {
    _id: "dennis",
    role: "admin",
    gameCount: 0,
    winCount: 0,
  },
]

async function main() {
  await client.connect()
  console.log('Connected successfully to MongoDB')

  const db = client.db("mahjong_users")

  // add data
  console.log("inserting users", await db.collection("mahjong_users").insertMany(users as any))

  process.exit(0)
}

main()

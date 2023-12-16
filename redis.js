import { isValidCron } from 'cron-validator'
import { createClient } from 'redis'


export const client = createClient({
  url: process.env.REDIS_URL
})

await client.connect()
console.log("Connected to redis!")

// Keep-Alive Mechanism
setInterval(async () => {
  try {
    await client.ping()
  } catch (error) {
    console.error('Error pinging Redis:', error)
  }
}, 1000 * 60 * 5)  // Ping Redis every 5 minutes


export async function getI(chatId) {
  return parseInt((await client.get(`${chatId}:i`)) ?? 0)
}

export async function getUsernames(chatId) {
  return JSON.parse(await client.get(`${chatId}:usernames`))
}

export async function getSchedule(chatId) {
  return JSON.parse(await client.get(`${chatId}:schedule`))
}

export async function setI(chatId, i) {
  await client.set(`${chatId}:i`, i)
}

export async function setUsernames(chatId, usernames) {
  await client.set(`${chatId}:usernames`, JSON.stringify(usernames))
}

export async function setSchedule(chatId, schedule) {
  if (!isValidCron(schedule)) {
    throw new Error('Invalid cron schedule')
  }
  
  await client.set(`${chatId}:schedule`, JSON.stringify(schedule))
  return schedule
}

export async function updateAndShuffleUsernames(chatId) {
  const usernames = await bot.telegram.getChatAdministrators(chatId).then(admins => 
    admins.map(({user}) => ({username: user.username, id: user.id})).sort(_ => 0.5 - Math.random())
  )
  await client.set(`${chatId}:usernames`, JSON.stringify(usernames))
  return usernames
}
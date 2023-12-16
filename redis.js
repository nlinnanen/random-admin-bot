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

export async function addToChatIds(chatId) {
  await client.sAdd('chatIds', JSON.stringify(chatId))
}

export async function getChatIds() {
  return (await client.sMembers('chatIds')).map(JSON.parse)
}

export async function removeFromChatIds(chatId) {
  await client.sRem('chatIds', JSON.stringify(chatId))
}
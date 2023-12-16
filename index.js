import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv.js'
import { createClient } from 'redis'

const INTERVAL = 1000*60*60*24*3

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

const client = createClient({
  url: process.env.REDIS_URL
})

// Keep-Alive Mechanism
setInterval(async () => {
  try {
    await client.ping()
  } catch (error) {
    console.error('Error pinging Redis:', error)
  }
}, 1000 * 60 * 5)  // Ping Redis every 5 minutes

client.on('error', err => {
  bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, `Redis Client Error: ${err}`)
  console.error('Redis Client Error', err)
})

await client.connect()
console.log("Connected to redis!")

async function updateAndShuffleUsernames(chatId) {
  const usernames = await bot.telegram.getChatAdministrators(chatId).then(admins => 
    admins.map(({user}) => ({username: user.username, id: user.id})).sort(_ => 0.5 - Math.random())
  )
  await client.set(`${chatId}:usernames`, JSON.stringify(usernames))
  return usernames
}

function newSnapfluencerString(admin){
  return `New snapfluencer is: [@${admin.username}](tg://user?id=${admin.id})\\!`
}

async function getI(chatId) {
  return parseInt((await client.get(`${chatId}:i`)) ?? 0)
}

async function getUsernames(chatId) {
  return JSON.parse(await client.get(`${chatId}:usernames`))
}

async function getAndSendNextSnapfluencer(ctx) {
  const chatId = ctx.chat.id
  const i = await getI(chatId)

  // Fetch the usernames and shuffle them at the start of loop
  if(i === 0) await updateAndShuffleUsernames(chatId)
  const adminUsernames = await getUsernames(chatId) ?? await updateAndShuffleUsernames(chatId)

  // If I is invalid, reset the loop
  if(i >= adminUsernames.length) i = 0

  console.log("usernames: ", adminUsernames)
  console.log("i: ", i)

  await ctx.replyWithMarkdownV2(newSnapfluencerString(adminUsernames[i]))

  // Increment the index
  if(adminUsernames.length - 1 === i) {
    await client.set(`${chatId}:i`, 0)
  } else {
    await client.set(`${chatId}:i`, i + 1)
  }
}

let interval = 0
bot.start(async ctx => {
  await getAndSendNextSnapfluencer(ctx)
  clearInterval(interval)
  interval = setInterval(() => getAndSendNextSnapfluencer(ctx), INTERVAL) 
})

bot.command('chat_id', async ctx => {
  const chatId = ctx.chat.id
  await ctx.reply("Chat id is: " + chatId)
})

/**
 * Sets that the admins have been added previously
 * This enables continuing where the bot last left of
 * for example if the bot crashes and randomizes the order again and sets it at ulkoministeri, isanta, mediakeisari
 * then /set_order mediakeisari ulkoministeri would set it to mediakeisari, ulkoministeri, isanta
 */
bot.command('set_order', async ctx => {

 let input = []
  try {
    input = ctx.message.text.replace("/set_order ", "").split(" ")
  } catch(e) {
    return await ctx.reply("Parsing that message was not successful: " + e.message)
  }

  const chatId = ctx.chat.id
  const usernames = JSON.parse(await client.get(`${chatId}:usernames`))

  // Validate the input
  input.forEach(e => {
    const isValid = usernames.some(u => u.username === e)
    if(!isValid) {
      return ctx.reply(`Username ${e} not found in current order!`)
    }
  })

  const inputWithId = input.map(i => ({username: i, id: usernames.find(u => u.username === i).id}))
  const newUsernames = inputWithId.concat(usernames.filter(u => !input.includes(u.username)))

  await client.set(`${chatId}:usernames`, JSON.stringify(newUsernames))
  await client.set(`${chatId}:i`, input.length)

  await ctx.reply("Order set successfully!")
})

bot.command('stop', _ctx => clearInterval(interval))

launchBotDependingOnNodeEnv(bot)

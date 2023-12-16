import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv.js'
import { client, getUsernames, setI } from './redis.js'

const INTERVAL = 1000*60*60*24*3

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

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
  const usernames = await getUsernames(chatId)

  // Validate the input
  input.forEach(e => {
    const isValid = usernames.some(u => u.username === e)
    if(!isValid) {
      return ctx.reply(`Username ${e} not found in current order!`)
    }
  })

  const inputWithId = input.map(i => ({username: i, id: usernames.find(u => u.username === i).id}))
  const newUsernames = inputWithId.concat(usernames.filter(u => !input.includes(u.username)))

  await setUsernames(chatId, newUsernames)
  await setI(chatId, input.length)

  await ctx.reply("Order set successfully!")
})

bot.command('stop', _ctx => clearInterval(interval))

launchBotDependingOnNodeEnv(bot)

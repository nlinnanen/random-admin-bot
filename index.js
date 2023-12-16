import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'
import { isValidCron } from 'cron-validator'
import cron from 'node-cron'
import cronstrue from 'cronstrue'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv.js'
import { addToChatIds, getChatIds, getI, getSchedule, getUsernames, removeFromChatIds, setI, setSchedule, setUsernames } from './redis.js'
import { newSnapfluencerString } from './utils.js'

const DEFAULT_CRON = "0 9 */3 * *"

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)
const jobs = new Map()

async function updateAndShuffleUsernames(chatId) {
  const admins = await bot.telegram.getChatAdministrators(chatId)
  const shuffled = admins
    .map(({user}) => ({username: user.username, id: user.id}))
    .sort(_ => 0.5 - Math.random())
  await setUsernames(chatId, shuffled)
  return shuffled
}

async function getAndSendNextSnapfluencer(chatId) {
  let i = await getI(chatId)
  // Fetch the usernames and shuffle them at the start of loop
  if(i === 0) await updateAndShuffleUsernames(chatId)
  const adminUsernames = await getUsernames(chatId) ?? await updateAndShuffleUsernames(chatId)
  
  // If I is invalid, reset the loop
  if(i >= adminUsernames.length) i = 0

  try {
    await bot.telegram.sendMessage(chatId, newSnapfluencerString(adminUsernames[i]), {parse_mode: "MarkdownV2"})
  } catch(e) {
    console.log("Error sending message: ", e.message)
  }
  // Increment the index
  if(adminUsernames.length - 1 === i) {
    await setI(chatId, 0)
  } else {
    await setI(chatId, i + 1)
  }
}

bot.start(async ctx => {
  const chatId = ctx.chat.id
  const schedule = (await getSchedule(chatId)) ?? (await setSchedule(chatId, DEFAULT_CRON))
  
  await addToChatIds(chatId)

  if(jobs.has(chatId)) {
    jobs.get(chatId).stop()
    jobs.delete(chatId)
  }
  const job = cron.schedule(schedule, () => getAndSendNextSnapfluencer(chatId))
  jobs.set(chatId, job)
  const readableScedule = cronstrue.toString(schedule)
  await ctx.reply(`Bot started with schedule: ${readableScedule}`)
})

bot.command('schedule', async ctx => {
  let schedule = ctx.message.text.replace(/\/schedule\s*/ , "")
  const chatId = ctx.chat.id

  // If no schedule is given, return the current schedule
  if (schedule === "") {
    const currentSchedule = (await getSchedule(chatId)) ?? DEFAULT_CRON
    return await ctx.reply("Current schedule is: " + currentSchedule)
  } else if (!isValidCron(schedule)) {
    return await ctx.reply("Invalid cron schedule!")
  }

  // If the schedule is valid, set it
  await setSchedule(chatId, schedule)

  // If the bot is running, stop it and start it again with the new schedule
  if(jobs.has(chatId)) {
    jobs.get(chatId).stop()
    const job = cron.schedule(schedule, () => getAndSendNextSnapfluencer(chatId))
    jobs.set(chatId, job)
  }

  const readableSchedule = cronstrue.toString(schedule)
  await ctx.reply(`Schedule set to: ${readableSchedule}`)
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

bot.command('stop', async ctx => {
  const chatId = ctx.chat.id
  if(jobs.has(chatId)) {
    jobs.get(chatId).stop()
    jobs.delete(chatId)
    await removeFromChatIds(chatId)
    await ctx.reply("Bot stopped successfully!")
  } else {
    await ctx.reply("Bot is not running on this chat!")
  }
})

async function main() {
  const chatIds = await getChatIds()

  if(!chatIds || chatIds.length === 0) {
    console.log("No chatIds found!")
    return
  }

  chatIds.forEach(async chatId => {
    const schedule = await getSchedule(chatId)
    if(schedule) {
      console.log("Starting a cron job for chatId: ", chatId)
      const job = cron.schedule(schedule ,() => {
        return getAndSendNextSnapfluencer(chatId)
      })
      jobs.set(chatId, job)
    } else {
      console.log("No schedule found for chatId: ", chatId)
    }
  })
}

main()
launchBotDependingOnNodeEnv(bot)

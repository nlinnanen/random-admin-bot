import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv.js'

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.start(async ctx => {
  const admins = await bot.telegram.getChatAdministrators(ctx.chat.id)
  const adminUsernames = _.shuffle(admins.map(admin => admin.user.username))
  let i = 1
  await ctx.reply(`New snapfluencer is: @${adminUsernames[0]}!`)
  setInterval(async () => {
    const username = adminUsernames[i]
    i = i < (adminUsernames.length - 1) ? i + 1 : 0
    await ctx.reply(`New snapfluencer is: @${username}!`)
  },
    1000*5
  ) 
})

launchBotDependingOnNodeEnv(bot)

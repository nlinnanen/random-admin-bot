import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv.js'

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

function getAdminUsernames(ctx) {
  return bot.telegram.getChatAdministrators(ctx.chat.id).then(admins => 
    admins.map(({user}) => ({username: user.username, id: user.id})).sort(_ => 0.5 - Math.random())
  )
}

function newSnapfluencerString(admin){
  return `New snapfluencer is: [@${admin.username}](tg://user?id=${admin.id})\\!`
}

let interval = 0

bot.start(async ctx => {
  let adminUsernames = await getAdminUsernames(ctx)
  let i = 1
  await ctx.replyWithMarkdownV2(newSnapfluencerString(adminUsernames[0]))
  clearInterval(interval)
  interval = setInterval(async () => {
    await ctx.replyWithMarkdownV2(newSnapfluencerString(adminUsernames[i]))
    if(adminUsernames.length - 1 === i) {
      i = 0
      adminUsernames = await getAdminUsernames(ctx)
    } else {
      i += 1
    }
  },
    1000*60*60*24*3
  ) 
})

bot.command('stop', ctx => clearInterval(interval))

launchBotDependingOnNodeEnv(bot)

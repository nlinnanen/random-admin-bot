import * as dotenv from 'dotenv'
import { Telegraf } from 'telegraf'

import launchBotDependingOnNodeEnv from './launchBotDependingOnNodeEnv'

dotenv.config()

if (!process.env.BOT_TOKEN) {
  throw new Error('Bot token not defined!')
}

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.start(ctx => ctx.reply('Hello there!'))

launchBotDependingOnNodeEnv(bot)

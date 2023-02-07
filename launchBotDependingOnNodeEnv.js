import express from 'express'

/**
 * Launch bot in long polling (development) mode
 */
async function launchLongPollBot(bot) {
  await bot.launch()
}

/**
 * Launch bot in webhook (production) mode
 */
async function launchWebhookBot(bot) {
  const port = parseInt(process?.env?.PORT ?? "3000")

  // Necessary because of Azure App Service health check on startup
  const app = express()

  app.get('/', (_req, res) => {
    res.status(200).send('Kovaa tulee')
  })

  app.get('/health', (_req, res) => {
    res.status(200).send('OK')
  })
  
  // Workaround to avoid issue with TSconfig
  const createWebhookListener = async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    app.use(await bot.createWebhook({ domain: process.env.DOMAIN }))
  }
  await createWebhookListener()

  app.listen(port, () => console.log('Running on port ', port))
}

/**
 * Launches the bot in webhook mode if NODE_ENV is "production", or long polling (development) mode otherwise.
 * If webhook mode is used, the bot is also wrapped in a dummy Express API so it can be run in an Azure App Service.
 */
async function launchBotBasedOnNodeEnv(bot) {
  const useWebhook = process.env.NODE_ENV === 'production'

  if (useWebhook) {
    console.log('Launching bot in webhook mode')
    await launchWebhookBot(bot)
  } else {
    console.log('Launching bot in long polling mode')
    launchLongPollBot(bot)
  }
}


export default launchBotBasedOnNodeEnv
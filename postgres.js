import { isValidCron } from 'cron-validator'
import { Client } from 'pg'


export async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
  await client.connect()
  return client
}


export async function getI(client, chatId) {
  const res = await client.query(
    `SELECT i
       FROM chat_data
      WHERE chat_id = $1`,
    [chatId]
  )
  if (res.rows.length === 0 || res.rows[0].i === null) {
    return 0
  }
  return res.rows[0].i
}

export async function getUsernames(client, chatId) {
  const res = await client.query(
    `SELECT usernames
       FROM chat_data
      WHERE chat_id = $1`,
    [chatId]
  )
  if (res.rows.length === 0) {
    return null
  }
  return res.rows[0].usernames
}

export async function getSchedule(client, chatId) {
  const res = await client.query(
    `SELECT schedule
       FROM chat_data
      WHERE chat_id = $1`,
    [chatId]
  )
  if (res.rows.length === 0) {
    return null
  }
  return res.rows[0].schedule
}

export async function setI(client, chatId, i) {
  await client.query(
    `INSERT INTO chat_data (chat_id, i)
           VALUES ($1, $2)
      ON CONFLICT (chat_id) DO UPDATE
           SET i = EXCLUDED.i`,
    [chatId, i]
  )
}

export async function setUsernames(client, chatId, usernames) {
  await client.query(
    `INSERT INTO chat_data (chat_id, usernames)
           VALUES ($1, $2)
      ON CONFLICT (chat_id) DO UPDATE
           SET usernames = EXCLUDED.usernames`,
    [chatId, JSON.stringify(usernames)]
  )
}

export async function setSchedule(client, chatId, schedule) {
  console.log('Setting schedule for chatId:', chatId, 'to:', schedule)
  if (!isValidCron(schedule)) {
    throw new Error('Invalid cron schedule')
  }

  await client.query(
    `INSERT INTO chat_data (chat_id, schedule)
           VALUES ($1, $2)
      ON CONFLICT (chat_id) DO UPDATE
           SET schedule = EXCLUDED.schedule`,
    [chatId, schedule]
  )
  return schedule
}

export async function addToChatIds(client, chatId) {
  await client.query(
    `INSERT INTO chat_data (chat_id)
           VALUES ($1)
      ON CONFLICT (chat_id) DO NOTHING`,
    [chatId]
  )
}

export async function getChatIds(client, ) {
  const res = await client.query(
    `SELECT chat_id
       FROM chat_data`
  )
  return res.rows.map(row => row.chat_id)
}

export async function removeFromChatIds(client, chatId) {
  await client.query(
    `DELETE
       FROM chat_data
      WHERE chat_id = $1`,
    [chatId]
  )
}

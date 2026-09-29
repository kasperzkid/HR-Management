// A minimal in-process SMTP server used only by scripts/verify-auth.mjs.
//
// It exists so the email path can be proven end to end - a real TCP connection,
// a real SMTP conversation, a real message body - without sending anything to
// a real mailbox. Swapping this for Gmail changes nothing about how the
// application behaves; only the destination changes.
//
// STARTTLS is deliberately not advertised, so nodemailer stays in plain SMTP
// and the capture is readable.

import net from 'node:net'

export async function startSmtpSink({ host = '127.0.0.1', port = 0 } = {}) {
  const messages = []
  const options = { rejectAuth: false, dropConnection: false }

  const server = net.createServer((socket) => {
    // Guards against a capture bug hanging the whole run.
    socket.setTimeout(15000, () => socket.destroy())

    let inData = false
    let dataBuffer = ''
    let envelope = { from: null, to: [] }
    // 0 = expecting username, 1 = expecting password, -1 = not in LOGIN.
    let loginStage = -1
    let plainStage = false

    const reply = (line) => socket.write(`${line}\r\n`)

    reply('220 verify.local ESMTP ready')

    socket.on('data', (chunk) => {
      let text = chunk.toString('utf8')

      if (options.dropConnection) {
        socket.destroy()
        return
      }

      while (text.length > 0) {
        if (inData) {
          const end = text.indexOf('\r\n.\r\n')
          if (end === -1) {
            dataBuffer += text
            return
          }

          dataBuffer += text.slice(0, end)
          text = text.slice(end + 5)
          inData = false

          messages.push({
            from: envelope.from,
            to: [...envelope.to],
            raw: dataBuffer,
          })

          reply('250 2.0.0 Ok: queued as TESTMSG1')
          dataBuffer = ''
          envelope = { from: null, to: [] }
          continue
        }

        const newline = text.indexOf('\r\n')
        if (newline === -1) return

        const line = text.slice(0, newline)
        text = text.slice(newline + 2)
        handle(line)
      }
    })

    function handle(line) {
      const upper = line.toUpperCase()

      // Continue an in-flight AUTH exchange before anything else.
      if (loginStage === 0) {
        loginStage = 1
        reply('334 UGFzc3dvcmQ6') // "Password:"
        return
      }

      if (loginStage === 1) {
        loginStage = -1
        reply(
          options.rejectAuth
            ? '535 5.7.8 Authentication credentials invalid'
            : '235 2.7.0 Authentication successful',
        )
        return
      }

      if (plainStage) {
        plainStage = false
        reply(
          options.rejectAuth
            ? '535 5.7.8 Authentication credentials invalid'
            : '235 2.7.0 Authentication successful',
        )
        return
      }

      if (upper.startsWith('EHLO')) {
        socket.write(
          '250-verify.local\r\n' +
            '250-SIZE 10485760\r\n' +
            '250-8BITMIME\r\n' +
            '250 AUTH PLAIN LOGIN\r\n',
        )
        return
      }

      if (upper.startsWith('HELO')) {
        reply('250 verify.local')
        return
      }

      if (upper.startsWith('AUTH PLAIN')) {
        const argument = line.slice('AUTH PLAIN'.length).trim()

        if (options.rejectAuth) {
          reply('535 5.7.8 Authentication credentials invalid')
          return
        }

        if (!argument) {
          plainStage = true
          reply('334 ')
          return
        }

        reply('235 2.7.0 Authentication successful')
        return
      }

      if (upper.startsWith('AUTH LOGIN')) {
        if (options.rejectAuth) {
          reply('535 5.7.8 Authentication credentials invalid')
          return
        }

        loginStage = 0
        reply('334 VXNlcm5hbWU6') // "Username:"
        return
      }

      if (upper.startsWith('MAIL FROM')) {
        envelope.from = (line.match(/<([^>]*)>/) || [])[1] ?? null
        reply('250 2.1.0 Ok')
        return
      }

      if (upper.startsWith('RCPT TO')) {
        envelope.to.push((line.match(/<([^>]*)>/) || [])[1] ?? null)
        reply('250 2.1.5 Ok')
        return
      }

      if (upper === 'DATA') {
        inData = true
        reply('354 End data with <CR><LF>.<CR><LF>')
        return
      }

      if (upper === 'RSET') {
        envelope = { from: null, to: [] }
        reply('250 2.0.0 Ok')
        return
      }

      if (upper === 'NOOP') {
        reply('250 2.0.0 Ok')
        return
      }

      if (upper === 'QUIT') {
        reply('221 2.0.0 Bye')
        socket.end()
        return
      }

      reply('250 2.0.0 Ok')
    }

    socket.on('error', () => {})
  })

  await new Promise((resolve) => {
    server.listen(port, host, resolve)
  })

  return {
    host,
    port: server.address().port,
    messages,
    options,
    reset() {
      messages.length = 0
    },
    last() {
      return messages[messages.length - 1] ?? null
    },
    close() {
      return new Promise((resolve) => {
        server.close(resolve)
      })
    },
  }
}

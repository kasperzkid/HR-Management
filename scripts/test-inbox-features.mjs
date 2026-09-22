import http from 'node:http'
import app from '../server/app.js'
import prisma from '../server/db.js'
import { initSocket } from '../server/socket.js'

const PORT = 4002
const BASE_URL = `http://localhost:${PORT}`

function addisToday() {
  const now = new Date()
  const addis = new Date(now.getTime() + (3 * 60 + now.getTimezoneOffset()) * 60000)
  return addis.toISOString().slice(0, 10)
}

async function runTests() {
  console.log('Starting test server on port', PORT)
  const server = http.createServer(app)
  initSocket(server)
  await new Promise((resolve) => server.listen(PORT, resolve))

  try {
    console.log('\n--- TEST 1: Login as Employee and HR Manager ---')
    const empLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'employee@yanol.com', password: 'employee123' }),
    })
    const empData = await empLogin.json()
    if (!empLogin.ok) throw new Error(`Emp login failed: ${JSON.stringify(empData)}`)
    const empToken = empData.token

    const hrLogin = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'hr@yanol.com', password: 'hr123' }),
    })
    const hrData = await hrLogin.json()
    if (!hrLogin.ok) throw new Error(`HR login failed: ${JSON.stringify(hrData)}`)
    const hrToken = hrData.token
    const hrUserId = hrData.user.id
    console.log('Logins successful. HR User ID:', hrUserId)

    console.log('\n--- TEST 2: Emergency Check-Out & HR Inbox Notification ---')
    const today = addisToday()
    const employeeRecord = await prisma.employee.findFirst({
      where: { email: 'employee@yanol.com' },
    })

    await prisma.attendance.upsert({
      where: { id: 'test-attendance-today' },
      update: { checkIn: '09:00', checkOut: null, status: 'Present' },
      create: {
        id: 'test-attendance-today',
        employeeId: employeeRecord.id,
        employeeName: employeeRecord.name,
        department: employeeRecord.department,
        date: today,
        status: 'Present',
        checkIn: '09:00',
        checkOut: null,
      },
    })

    // Now perform emergency check-out
    const emergencyRes = await fetch(`${BASE_URL}/api/employer/punch/check-out`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${empToken}`,
      },
      body: JSON.stringify({
        emergency: true,
        remark: 'Family medical emergency at St. Gabriel Hospital',
        latitude: 9.0245,
        longitude: 38.7485,
      }),
    })
    const emergencyResult = await emergencyRes.json()
    if (!emergencyRes.ok) {
      throw new Error(`Emergency check-out failed: ${JSON.stringify(emergencyResult)}`)
    }
    console.log('Emergency check-out successful:', emergencyResult)

    // Check HR inbox/messages to verify emergency message was created
    const hrMessagesRes = await fetch(`${BASE_URL}/api/messages/contacts`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    })
    const hrContactsObj = await hrMessagesRes.json()
    const hrContacts = hrContactsObj.contacts || []
    console.log('HR contacts count:', hrContacts.length)
    const empContact = hrContacts.find((c) => c.email === 'employee@yanol.com')
    if (!empContact) {
      throw new Error('Employee contact not found in HR inbox after emergency check-out')
    }

    const threadRes = await fetch(`${BASE_URL}/api/messages/${empContact.id}`, {
      headers: { Authorization: `Bearer ${hrToken}` },
    })
    const threadData = await threadRes.json()
    const emergencyMsg = threadData.messages?.find((m) => m.text?.includes('EMERGENCY CHECK-OUT'))
    if (!emergencyMsg) {
      throw new Error('Emergency check-out message not found in HR inbox thread')
    }
    console.log('Verified emergency check-out message in HR inbox:', emergencyMsg.text)

    console.log('\n--- TEST 3: Upload Document Attachment in Inbox ---')
    const boundary = '----FormBoundary' + Math.random().toString(36)
    const pdfContent = '%PDF-1.4 mock pdf content'
    const docBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="medical_report.pdf"\r\nContent-Type: application/pdf\r\n\r\n`),
      Buffer.from(pdfContent),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ])

    const uploadPdfRes = await fetch(`${BASE_URL}/api/messages/${empContact.id}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: docBody,
    })
    const uploadPdfData = await uploadPdfRes.json()
    if (!uploadPdfRes.ok) {
      throw new Error(`PDF upload failed: ${JSON.stringify(uploadPdfData)}`)
    }
    console.log('Document (PDF) uploaded successfully in inbox:', uploadPdfData.message?.attachment?.name)

    console.log('\n--- TEST 4: Upload Image Attachment in Inbox ---')
    const imgBoundary = '----FormBoundary' + Math.random().toString(36)
    const imgBuffer = Buffer.concat([
      Buffer.from(`--${imgBoundary}\r\nContent-Disposition: form-data; name="file"; filename="photo.png"\r\nContent-Type: image/png\r\n\r\n`),
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(`\r\n--${imgBoundary}--\r\n`),
    ])

    const uploadImgRes = await fetch(`${BASE_URL}/api/messages/${empContact.id}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': `multipart/form-data; boundary=${imgBoundary}`,
      },
      body: imgBuffer,
    })
    const uploadImgData = await uploadImgRes.json()
    if (!uploadImgRes.ok) {
      throw new Error(`Image upload failed: ${JSON.stringify(uploadImgData)}`)
    }
    console.log('Image uploaded successfully in inbox:', uploadImgData.message?.attachment?.name)

    console.log('\n--- TEST 5: Attempt Uploading Unsupported File Type in Inbox ---')
    const badBoundary = '----FormBoundary' + Math.random().toString(36)
    const badBuffer = Buffer.concat([
      Buffer.from(`--${badBoundary}\r\nContent-Disposition: form-data; name="file"; filename="malware.exe"\r\nContent-Type: application/x-msdownload\r\n\r\n`),
      Buffer.from('MZ9999'),
      Buffer.from(`\r\n--${badBoundary}--\r\n`),
    ])

    const uploadBadRes = await fetch(`${BASE_URL}/api/messages/${empContact.id}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hrToken}`,
        'Content-Type': `multipart/form-data; boundary=${badBoundary}`,
      },
      body: badBuffer,
    })
    const uploadBadData = await uploadBadRes.json()
    if (uploadBadRes.ok) {
      throw new Error('Expected unsupported file upload to fail, but it succeeded.')
    }
    console.log('Unsupported file upload correctly rejected with status:', uploadBadRes.status, uploadBadData)

    console.log('\nALL INBOX & ATTACHMENT TESTS PASSED SUCCESSFULLY! 🚀')
  } catch (err) {
    console.error('INBOX TEST FAILED:', err)
    process.exitCode = 1
  } finally {
    await new Promise((resolve) => server.close(resolve))
    await prisma.$disconnect()
  }
}

runTests()

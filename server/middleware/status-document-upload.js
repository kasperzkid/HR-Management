/**
 * Upload handling for the status document an employee attaches to their
 * personal info.
 *
 * Deliberately the same shape as the resume upload: on-disk storage under
 * storage/status-documents, a random filename so nothing the user typed ever
 * reaches the filesystem, a type filter keyed on the extension *and* the
 * declared MIME type, and a size ceiling.
 *
 * The accepted types are wider than the resume's on purpose. A status document
 * is often a scan or a phone photo of a letter - a PNG or JPEG is as likely as
 * a PDF here - and refusing those would defeat the point of the feature.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

export const STATUS_DOCUMENT_DIRECTORY = path.join(process.cwd(), 'storage', 'status-documents')

fs.mkdirSync(STATUS_DOCUMENT_DIRECTORY, { recursive: true })

const allowedTypes = new Map([
  ['.pdf', ['application/pdf']],
  ['.doc', ['application/msword', 'application/octet-stream']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
])

export const STATUS_DOCUMENT_ACCEPT = 'PDF, DOC, DOCX, PNG or JPG'
export const STATUS_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, STATUS_DOCUMENT_DIRECTORY),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    callback(null, `${crypto.randomUUID()}${extension}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: STATUS_DOCUMENT_MAX_BYTES },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const mimeTypes = allowedTypes.get(extension)
    if (!mimeTypes || !mimeTypes.includes(file.mimetype)) {
      callback(new Error(`Upload a ${STATUS_DOCUMENT_ACCEPT} file.`))
      return
    }
    callback(null, true)
  },
})

export function handleStatusDocumentUpload(req, res, next) {
  upload.single('statusDocument')(req, res, (error) => {
    if (!error) return next()
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return res.status(status).json({
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? `Status documents must be ${STATUS_DOCUMENT_MAX_BYTES / (1024 * 1024)} MB or smaller.`
          : error.message || 'Unable to upload the status document.',
    })
  })
}

/**
 * Resolves a stored filename to a path, or null when the name is unusable.
 *
 * The basename check is the important part: it refuses anything with a path
 * separator or `..` in it, so a value that came out of the database cannot be
 * turned into a read outside the upload directory.
 */
export function getStatusDocumentPath(storageName) {
  if (!storageName || path.basename(storageName) !== storageName) return null
  return path.join(STATUS_DOCUMENT_DIRECTORY, storageName)
}

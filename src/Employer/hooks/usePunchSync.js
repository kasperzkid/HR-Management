import { useCallback, useEffect, useState } from 'react'

import {
  employeeCheckIn,
  employeeCheckOut,
  fetchMyAttendance,
  fetchPunchStatusApi,
} from '../lib/punchApi'

import {
  applyPunchStatus,
} from '../lib/workTime'

function getToday() {
  const now = new Date()

  const addis = new Date(
    now.getTime() +
      (3 * 60 + now.getTimezoneOffset()) *
        60000,
  )

  return addis
    .toISOString()
    .slice(0, 10)
}

function getCurrentTime() {
  const now = new Date()

  const addis = new Date(
    now.getTime() +
      (3 * 60 + now.getTimezoneOffset()) *
        60000,
  )

  return addis.toLocaleTimeString(
    'en-GB',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  )
}

function getTodayRecord(records) {
  const today = getToday()

  if (!Array.isArray(records)) {
    return null
  }

  return (
    records.find(
      (record) =>
        record?.date === today,
    ) || null
  )
}

function updateSharedPunchState(
  status,
) {
  if (!status) {
    return
  }

  applyPunchStatus(status)
}

export default function usePunchSync() {
  const [attendance, setAttendance] =
    useState(null)

  const [loading, setLoading] =
    useState(true)

  const [processing, setProcessing] =
    useState(false)

  const [error, setError] =
    useState('')

  /* =========================================================
     LOAD TODAY'S ATTENDANCE
  ========================================================= */

  const loadAttendance =
    useCallback(async () => {
      try {
        setError('')

        /*
         * Fetch the same status used by the header
         * PunchWidget.
         */
        const status =
          await fetchPunchStatusApi()

        updateSharedPunchState(
          status,
        )

        /*
         * Keep the hook's existing attendance
         * value for components that consume it.
         */
        const response =
          await fetchMyAttendance({
            startDate: getToday(),
            endDate: getToday(),
          })

        const records =
          Array.isArray(response)
            ? response
            : response?.records || []

        const record =
          getTodayRecord(records)

        setAttendance(record)

        /*
         * If the attendance record exists, make sure
         * the shared punch store contains its latest
         * values.
         */
        if (record) {
          updateSharedPunchState({
            ...status,

            checkedIn:
              Boolean(
                record.checkIn,
              ),

            checkIn:
              record.checkIn ||
              null,

            checkedOut:
              Boolean(
                record.checkOut,
              ),

            checkOut:
              record.checkOut ||
              null,

            status:
              record.status ||
              null,

            hrStatus:
              record.reviewStatus ||
              null,

            hrNote:
              record.reviewRemarks ||
              null,

            hrUpdatedAt:
              record.reviewedAt ||
              null,
          })
        }

        return record
      } catch (err) {
        console.error(
          'Load employee attendance error:',
          err,
        )

        setError(
          err?.message ||
            'Unable to load attendance.',
        )

        throw err
      } finally {
        setLoading(false)
      }
    }, [])

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadAttendance()
      .catch(() => {})
  }, [loadAttendance])

  /* =========================================================
     CHECK-IN
  ========================================================= */

  const checkIn =
    useCallback(
      async ({
        latitude,
        longitude,
      } = {}) => {
        setProcessing(true)
        setError('')

        try {
          const response =
            await employeeCheckIn({
              latitude,
              longitude,
              date: getToday(),
              checkIn:
                getCurrentTime(),
            })

          const record =
            response?.attendance ||
            response?.record ||
            null

          if (record) {
            setAttendance(record)
          }

          /*
           * Refresh the complete shared state so
           * Header + Attendance + HR status remain
           * synchronized.
           */
          await loadAttendance()

          return response
        } catch (err) {
          console.error(
            'Employee check-in error:',
            err,
          )

          setError(
            err?.message ||
              'Unable to check in.',
          )

          throw err
        } finally {
          setProcessing(false)
        }
      },
      [loadAttendance],
    )

  /* =========================================================
     CHECK-OUT
  ========================================================= */

  const checkOut =
    useCallback(
      async ({
        latitude,
        longitude,
      } = {}) => {
        setProcessing(true)
        setError('')

        try {
          const response =
            await employeeCheckOut({
              latitude,
              longitude,
              date: getToday(),
              checkOut:
                getCurrentTime(),
            })

          const record =
            response?.attendance ||
            response?.record ||
            null

          if (record) {
            setAttendance(record)
          }

          /*
           * Refresh everything after check-out so the
           * HR attendance record and employee UI are
           * immediately synchronized.
           */
          await loadAttendance()

          return response
        } catch (err) {
          console.error(
            'Employee check-out error:',
            err,
          )

          setError(
            err?.message ||
              'Unable to check out.',
          )

          throw err
        } finally {
          setProcessing(false)
        }
      },
      [loadAttendance],
    )

  return {
    attendance,

    loading,

    processing,

    error,

    checkedIn:
      Boolean(
        attendance?.checkIn,
      ),

    checkedOut:
      Boolean(
        attendance?.checkOut,
      ),

    checkIn,

    checkOut,

    refreshAttendance:
      loadAttendance,
  }
}
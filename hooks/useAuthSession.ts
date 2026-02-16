import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ensureCurrentUserProfile } from '../services/userService'

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        void ensureCurrentUserProfile()
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession?.user) {
        void ensureCurrentUserProfile()
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  return session
}

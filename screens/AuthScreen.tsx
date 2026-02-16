import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View
} from 'react-native'
import { supabase } from '../lib/supabase'
import { ensureUserProfile, getSafeUsername } from '../services/userService'
import { styles } from './auth/styles'

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [username, setUsername] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    setLoading(true)
    const normalizedEmail = identifier.trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          username: username.trim()
        }
      }
    })

    if (error) {
      setLoading(false)
      Alert.alert(error.message)
      return
    }

    if (data.user) {
      await ensureUserProfile(
        data.user.id,
        getSafeUsername(username.trim()),
        normalizedEmail
      )
    }

    setLoading(false)
    onAuth()
  }

  const signIn = async () => {
    setLoading(true)
    const rawIdentifier = identifier.trim()
    const normalizedIdentifier = rawIdentifier.toLowerCase()
    let loginEmail = normalizedIdentifier

    if (!rawIdentifier.includes('@')) {
      const { data: resolvedEmail, error: resolveError } = await supabase.rpc('resolve_login_email', {
        p_identifier: rawIdentifier
      })

      if (resolveError) {
        setLoading(false)
        Alert.alert('Sign in failed', resolveError.message)
        return
      }

      if (!resolvedEmail) {
        setLoading(false)
        Alert.alert('Sign in failed', 'Username not found')
        return
      }

      loginEmail = String(resolvedEmail).toLowerCase()
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password
    })

    if (error) {
      setLoading(false)
      Alert.alert(error.message)
      return
    }

    if (data.user) {
      const profileUsername = getSafeUsername(
        (data.user.user_metadata?.username as string | undefined) ?? undefined
      )
      await ensureUserProfile(data.user.id, profileUsername, data.user.email)
    }

    setLoading(false)
    onAuth()
  }

  const submit = () => {
    if (!identifier || !password) {
      Alert.alert('Enter username/email and password')
      return
    }
    if (mode === 'signup' && !username.trim()) {
      Alert.alert('Enter a username')
      return
    }

    if (mode === 'signup') {
      void signUp()
      return
    }
    void signIn()
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.bgTopOrb} />
      <View style={styles.bgBottomOrb} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          <Text style={styles.brand}>KINBIT</Text>
          <Text style={styles.title}>Share life instantly</Text>
          <Text style={styles.subtitle}>Capture one moment. Send it to your people.</Text>

          <View style={styles.card}>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => setMode('signin')}
                style={[styles.modeButton, mode === 'signin' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('signup')}
                style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
              >
                <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            {mode === 'signup' ? (
              <TextInput
                autoCapitalize="none"
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#8B93AB"
                style={styles.input}
                value={username}
              />
            ) : null}
            <TextInput
              autoCapitalize="none"
              keyboardType={mode === 'signin' ? 'default' : 'email-address'}
              onChangeText={setIdentifier}
              placeholder={mode === 'signin' ? 'Email or Username' : 'Email'}
              placeholderTextColor="#8B93AB"
              style={styles.input}
              value={identifier}
            />
            <TextInput
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8B93AB"
              secureTextEntry
              style={styles.input}
              value={password}
            />

            <Pressable onPress={submit} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]} disabled={loading}>
              <Text style={styles.submitText}>
                {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

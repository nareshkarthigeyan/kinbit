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
import { ensureUserProfile } from '../services/userService'
import { styles } from './auth/styles'

export default function AuthScreen({ onAuth }: { onAuth: () => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signup' | 'signin'>('signin')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
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
      await ensureUserProfile(data.user.id, username.trim())
    }

    setLoading(false)
    onAuth()
  }

  const signIn = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setLoading(false)
      Alert.alert(error.message)
      return
    }

    if (data.user) {
      const profileUsername = (data.user.user_metadata?.username as string | undefined) ?? undefined
      await ensureUserProfile(data.user.id, profileUsername)
    }

    setLoading(false)
    onAuth()
  }

  const submit = () => {
    if (!email || !password) {
      Alert.alert('Enter email and password')
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
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#8B93AB"
              style={styles.input}
              value={email}
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

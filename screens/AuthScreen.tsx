import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { supabase } from '../lib/supabase'
import { ensureUserProfile } from '../services/userService'

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

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#081323',
    flex: 1
  },
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  bgTopOrb: {
    backgroundColor: '#29D3AC',
    borderRadius: 180,
    height: 280,
    opacity: 0.2,
    position: 'absolute',
    right: -90,
    top: -60,
    width: 280
  },
  bgBottomOrb: {
    backgroundColor: '#5BA1FF',
    borderRadius: 210,
    bottom: -110,
    height: 320,
    left: -120,
    opacity: 0.18,
    position: 'absolute',
    width: 320
  },
  brand: {
    color: '#7DE0C9',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 8
  },
  title: {
    color: '#F5F8FF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 8
  },
  subtitle: {
    color: '#B5BED1',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24
  },
  card: {
    backgroundColor: '#121E33',
    borderColor: '#1F2D48',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  modeRow: {
    backgroundColor: '#0C1628',
    borderRadius: 14,
    flexDirection: 'row',
    marginBottom: 6,
    padding: 4
  },
  modeButton: {
    borderRadius: 10,
    flex: 1,
    paddingVertical: 10
  },
  modeButtonActive: {
    backgroundColor: '#1D2940'
  },
  modeText: {
    color: '#99A5C3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  modeTextActive: {
    color: '#EFF4FF'
  },
  input: {
    backgroundColor: '#0D172A',
    borderColor: '#26344F',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F4F7FF',
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  submitButton: {
    backgroundColor: '#2ED4AF',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 14
  },
  submitText: {
    color: '#04231D',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  },
  pressed: {
    opacity: 0.9
  }
})

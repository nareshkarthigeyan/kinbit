import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import { useAuthSession } from './hooks/useAuthSession'

export default function App() {
  const session = useAuthSession()

  if (!session) {
    return <AuthScreen onAuth={() => {}} />
  }

  return <HomeScreen />
}

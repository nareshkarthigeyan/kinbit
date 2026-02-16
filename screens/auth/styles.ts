import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
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

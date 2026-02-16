import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  root: {
    backgroundColor: '#050A12',
    flex: 1
  },
  screen: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 10,
    position: 'relative'
  },
  headerWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%'
  },
  feedTopMeta: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%'
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
  },
  pill: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  pillText: {
    color: '#EAF2FF',
    fontSize: 16,
    fontWeight: '700'
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0
  },
  frame: {
    backgroundColor: '#000000',
    borderColor: 'rgba(226,240,255,0.26)',
    borderRadius: 36,
    borderWidth: 1.25,
    overflow: 'hidden'
  },
  media: {
    flex: 1
  },
  mediaMirrored: {
    transform: [{ scaleX: -1 }]
  },
  mediaAbsolute: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  mediaAbsoluteBack: {
    backgroundColor: '#000000',
    height: '100%',
    left: 0,
    opacity: 1,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  cameraWarmupMask: {
    backgroundColor: '#000',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  stackCard: {
    backgroundColor: '#000000',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14
  },
  stackCardImage: {
    height: '100%',
    width: '100%'
  },
  permissionBox: {
    alignItems: 'center',
    backgroundColor: '#121B2B',
    flex: 1,
    justifyContent: 'center'
  },
  permissionText: {
    color: '#EAF2FF',
    fontSize: 14
  },
  bottomWrap: {
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%'
  },
  captureHintRow: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(10,22,38,0.78)',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  captureHint: {
    color: '#A5B6D1',
    fontSize: 13,
    fontWeight: '600'
  },
  sendPanel: {
    marginBottom: 10
  },
  sendLabel: {
    color: '#EAF2FF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 2
  },
  captionInput: {
    backgroundColor: '#101A2A',
    borderColor: '#263A57',
    borderRadius: 12,
    borderWidth: 1,
    color: '#EAF2FF',
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  circleRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  circleIcon: {
    alignItems: 'center',
    backgroundColor: '#1A2A42',
    borderColor: '#2E476E',
    borderRadius: 26,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  addCircle: {
    backgroundColor: '#142033'
  },
  circleSelected: {
    backgroundColor: '#28C79A',
    borderColor: '#28C79A'
  },
  circleLabel: {
    color: '#EAF2FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 90
  },
  circleLabelSelected: {
    color: '#06241A'
  },
  bottomControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  sideAction: {
    alignItems: 'center',
    backgroundColor: '#17263C',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  shutterOuter: {
    alignItems: 'center',
    backgroundColor: '#0E1C2E',
    borderColor: '#24C69A',
    borderRadius: 50,
    borderWidth: 4,
    height: 96,
    justifyContent: 'center',
    width: 96
  },
  shutterInner: {
    alignItems: 'center',
    backgroundColor: '#F1F6FF',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76
  },
  feedInfo: {
    alignItems: 'center',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 14
  },
  postedPill: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  postedPillText: {
    color: '#EAF2FF',
    fontSize: 13,
    fontWeight: '700'
  },
  feedCircleTitle: {
    color: '#D9E6FA',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8
  },
  feedCirclesPanel: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    width: '100%'
  },
  feedCaption: {
    color: '#EAF2FF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    maxWidth: '92%',
    textAlign: 'center'
  },
  feedCircleRow: {
    alignItems: 'flex-end',
    gap: 14,
    paddingVertical: 6
  },
  feedCircleButton: {
    alignItems: 'center',
    minWidth: 72,
    paddingTop: 24
  },
  feedCircleTag: {
    backgroundColor: '#EFF5FF',
    borderRadius: 12,
    color: '#0D203A',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  feedCircleBack: {
    borderRadius: 18,
    height: 34,
    left: 16,
    opacity: 0.4,
    position: 'absolute',
    top: 30,
    width: 34
  },
  feedCircleFront: {
    alignItems: 'center',
    borderColor: '#EAF2FF',
    borderRadius: 20,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  feedCircleInitial: {
    color: '#0D1B2F',
    fontSize: 14,
    fontWeight: '800'
  },
  feedCircleCaption: {
    color: '#D4E2F8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 7,
    maxWidth: 84
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#101827',
    borderColor: '#2A3A56',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%'
  },
  modalTitle: {
    color: '#EAF2FF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10
  },
  modalHint: {
    color: '#A9BAD4',
    marginBottom: 8
  },
  codeBox: {
    backgroundColor: '#0A1321',
    borderColor: '#2B3D5A',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  codeLabel: {
    color: '#A9BAD4',
    fontSize: 12
  },
  codeValue: {
    color: '#EAF2FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2
  },
  input: {
    backgroundColor: '#0A1321',
    borderColor: '#2B3D5A',
    borderRadius: 10,
    borderWidth: 1,
    color: '#EAF2FF',
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end'
  },
  modalButtonGhost: {
    backgroundColor: '#1A2740',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  modalGhostText: {
    color: '#EAF2FF',
    fontWeight: '700'
  },
  modalButtonPrimary: {
    backgroundColor: '#28C79A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  modalPrimaryText: {
    color: '#06241A',
    fontWeight: '800'
  },
  disabled: {
    opacity: 0.45
  }
})

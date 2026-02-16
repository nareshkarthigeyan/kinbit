import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { memo, type Dispatch, type SetStateAction } from 'react'
import type { CircleMemberRow } from './types'
import { styles } from './styles'
import { getCircleName } from './utils'

type HomeModalsProps = {
  actionBusy: boolean
  circleName: string
  circles: CircleMemberRow[]
  generatedInviteCode: string
  handleCreateCircle: () => void
  handleJoinWithCode: () => void
  handleShareInvite: () => void
  inviteCircleId: string
  inviteLoading: boolean
  joinCode: string
  loadInviteCode: (circleId: string) => void
  setCircleName: Dispatch<SetStateAction<string>>
  setGeneratedInviteCode: Dispatch<SetStateAction<string>>
  setInviteCircleId: Dispatch<SetStateAction<string>>
  setJoinCode: Dispatch<SetStateAction<string>>
  setShowCreateModal: Dispatch<SetStateAction<boolean>>
  setShowInviteModal: Dispatch<SetStateAction<boolean>>
  setShowJoinModal: Dispatch<SetStateAction<boolean>>
  showCreateModal: boolean
  showInviteModal: boolean
  showJoinModal: boolean
}

function HomeModalsImpl({
  actionBusy,
  circleName,
  circles,
  generatedInviteCode,
  handleCreateCircle,
  handleJoinWithCode,
  handleShareInvite,
  inviteCircleId,
  inviteLoading,
  joinCode,
  loadInviteCode,
  setCircleName,
  setGeneratedInviteCode,
  setInviteCircleId,
  setJoinCode,
  setShowCreateModal,
  setShowInviteModal,
  setShowJoinModal,
  showCreateModal,
  showInviteModal,
  showJoinModal
}: HomeModalsProps) {
  return (
    <>
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TextInput
              style={styles.input}
              placeholder="Circle name"
              placeholderTextColor="#8EA0BD"
              value={circleName}
              onChangeText={setCircleName}
              editable={!actionBusy}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButtonGhost, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowCreateModal(false)}
                disabled={actionBusy}
              >
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonPrimary, actionBusy && styles.disabled]}
                onPress={handleCreateCircle}
                disabled={actionBusy}
              >
                <Text style={styles.modalPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Invite</Text>
            <Text style={styles.modalHint}>Select circle</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.circleRow}
            >
              {circles.map((item) => {
                const selected = inviteCircleId === item.circle_id
                return (
                  <Pressable
                    key={item.circle_id}
                    style={[styles.circleIcon, selected && styles.circleSelected, actionBusy && styles.disabled]}
                    onPress={() => {
                      if (actionBusy) return
                      setInviteCircleId(item.circle_id)
                      setGeneratedInviteCode('')
                      loadInviteCode(item.circle_id)
                    }}
                    disabled={actionBusy}
                  >
                    <Text style={[styles.circleLabel, selected && styles.circleLabelSelected]}>
                      {getCircleName(item)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
            {generatedInviteCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Invite Code</Text>
                <Text style={styles.codeValue}>{generatedInviteCode}</Text>
              </View>
            ) : (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>
                  {inviteLoading ? 'Generating invite...' : 'Preparing invite...'}
                </Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButtonGhost, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowInviteModal(false)}
                disabled={actionBusy}
              >
                <Text style={styles.modalGhostText}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonPrimary, (actionBusy || !generatedInviteCode) && styles.disabled]}
                onPress={handleShareInvite}
                disabled={actionBusy || !generatedInviteCode}
              >
                <Text style={styles.modalPrimaryText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showJoinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowJoinModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Circle</Text>
            <TextInput
              style={styles.input}
              placeholder="Invite code"
              placeholderTextColor="#8EA0BD"
              autoCapitalize="characters"
              value={joinCode}
              onChangeText={setJoinCode}
              editable={!actionBusy}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButtonGhost, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowJoinModal(false)}
                disabled={actionBusy}
              >
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonPrimary, actionBusy && styles.disabled]}
                onPress={handleJoinWithCode}
                disabled={actionBusy}
              >
                <Text style={styles.modalPrimaryText}>Join</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

export const HomeModals = memo(HomeModalsImpl)

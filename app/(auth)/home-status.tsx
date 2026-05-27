import FontAwesome from '@expo/vector-icons/FontAwesome';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useAuthStore } from '@/src/store/authStore';
import { useHouseStore } from '@/src/store/houseStore';
import { PALETTE } from '@/src/theme/palette';

const bg = require('@/assets/images/phoneBG.png');

export default function HomeStatusScreen() {
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{
    mode?: string;
    houseName?: string;
    creatorName?: string;
    memberCount?: string;
  }>();
  const house = useHouseStore((s) => s.house);
  const userProfile = useAuthStore((s) => s.userProfile);

  const isCreated = params.mode === 'created';
  const houseName = params.houseName ?? house?.name ?? "Rachel's Home Group";
  const creatorName =
    params.creatorName ??
    (house?.createdBy ? house.memberNames?.[house.createdBy] : undefined) ??
    userProfile?.displayName ??
    'Rachel Lee';
  const memberCount =
    Number(params.memberCount) || house?.memberIds?.length || (isCreated ? 1 : 1);
  const memberLabel = `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;

  return (
    <ImageBackground
      source={bg}
      style={[styles.container, { width, height }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={[styles.main, isCreated ? styles.createdMain : styles.currentMain]}>
            <Text style={styles.title}>
              {isCreated ? 'Your home was created' : 'Your current home'}
            </Text>
            {!isCreated && (
              <Text style={styles.subtitle}>Click continue to proceed</Text>
            )}

            <View style={styles.homeCard}>
              <FontAwesome name="home" size={23} color={PALETTE.ink} />
              <Text style={styles.homeName}>{houseName}</Text>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.createdByBlock}>
                  <Text style={styles.metaLabel}>Created by</Text>
                  <View style={styles.personRow}>
                    <View style={styles.avatarDot} />
                    <Text style={styles.personName}>{creatorName}</Text>
                  </View>
                </View>

                <View style={styles.memberBlock}>
                  <View style={styles.avatarDot} />
                  <Text style={styles.memberText}>{memberLabel}</Text>
                </View>
              </View>
            </View>

            {isCreated ? (
              <View style={styles.confirmArea}>
                <Text style={styles.question}>Is this group accurate?</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() => router.replace('/(tabs)')}
                >
                  <Text style={styles.primaryButtonText}>Yes, create</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.editButton}
                  onPress={() => router.back()}
                >
                  <Text style={styles.editButtonText}>edit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                style={styles.createNewHome}
                onPress={() => router.push('/(auth)/create-house')}
              >
                <FontAwesome name="plus" size={18} color={PALETTE.ink} />
                <Text style={styles.createNewHomeText}>Create new home</Text>
              </Pressable>
            )}
          </View>

          {!isCreated && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.bottomButton}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundImage: {
    height: '100%',
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 22,
  },
  main: {
    alignItems: 'center',
    width: '100%',
  },
  createdMain: {
    marginTop: 216,
  },
  currentMain: {
    marginTop: 204,
  },
  title: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: PALETTE.inkMuted,
    fontSize: 16,
    marginBottom: 26,
    textAlign: 'center',
  },
  homeCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 248, 241, 0.9)',
    borderRadius: 20,
    paddingBottom: 17,
    paddingHorizontal: 26,
    paddingTop: 17,
    width: 235,
  },
  homeName: {
    color: PALETTE.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  divider: {
    backgroundColor: PALETTE.inkHairline,
    height: 1,
    marginTop: 13,
    width: '100%',
  },
  metaRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 11,
    width: '100%',
  },
  createdByBlock: {
    flex: 1,
  },
  metaLabel: {
    color: PALETTE.ink,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 9,
  },
  personRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatarDot: {
    backgroundColor: PALETTE.avatar,
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  personName: {
    color: PALETTE.ink,
    fontSize: 12,
    marginLeft: 9,
  },
  memberBlock: {
    alignItems: 'center',
  },
  memberText: {
    color: PALETTE.ink,
    fontSize: 12,
    marginTop: 8,
  },
  confirmArea: {
    alignItems: 'center',
    marginTop: 37,
  },
  question: {
    color: PALETTE.ink,
    fontSize: 16,
    marginBottom: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: PALETTE.teal,
    borderRadius: 23,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: PALETTE.onAction,
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    alignItems: 'center',
    borderColor: PALETTE.cream,
    borderRadius: 23,
    borderWidth: 1,
    height: 46,
    justifyContent: 'center',
    marginTop: 13,
    width: 59,
  },
  editButtonText: {
    color: PALETTE.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  createNewHome: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    marginTop: 27,
  },
  createNewHomeText: {
    color: PALETTE.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomButton: {
    alignItems: 'center',
    backgroundColor: PALETTE.teal,
    borderRadius: 23,
    bottom: 66,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18,
    position: 'absolute',
  },
});

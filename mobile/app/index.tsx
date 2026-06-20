// Screen 0: Animated Splash Screen
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { loadSession } from '@/lib/auth';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo appears
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
      // Title appears
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Tagline appears
      Animated.timing(tagOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Hold
      Animated.delay(1000),
    ]).start(async () => {
      const session = await loadSession();
      router.replace(session ? '/orders' : '/auth');
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient glow */}
      <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

      {/* Logo icon */}
      <Animated.View style={[styles.iconWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Ionicons name="flame" size={52} color="#F59E0B" />
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.title, { opacity: textOpacity }]}>
        OilTrack Pro
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
        TANKER FLEET MONITORING
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F59E0B',
    opacity: 0,
    // Soft blur effect via shadow
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
    elevation: 0,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#F59E0B40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F1F5F9',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 3,
  },
});

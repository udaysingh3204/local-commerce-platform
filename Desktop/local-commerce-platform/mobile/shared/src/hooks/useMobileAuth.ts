import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as LocalAuthentication from 'expo-local-authentication';
import axios from 'axios';

WebBrowser.maybeCompleteAuthSession();

/**
 * Mobile Authentication Hook
 * Handles OAuth, biometric auth, session persistence, and secure token storage
 */
export function useMobileAuth(userType = 'customer') {
  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);

  // Google OAuth
  const [googleRequest, googleResponse, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirectUrl: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URL || '',
    scopes: ['profile', 'email']
  });

  const apiClient = useRef(null);

  // Initialize
  useEffect(() => {
    initializeAuth();
  }, [userType]);

  /**
   * Initialize authentication on app load
   */
  const initializeAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check biometric availability
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricAvailable(compatible);

      if (compatible) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const typeLabel = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
          ? 'Face ID'
          : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
          ? 'Fingerprint'
          : null;
        setBiometricType(typeLabel);
      }

      // Try to restore session
      const restored = await restoreSession();
      
      if (!restored) {
        setLoading(false);
      }

    } catch (err) {
      console.error('[Auth] Initialization error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  /**
   * Restore session from secure storage
   */
  const restoreSession = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('auth_token');
      const storedUserId = await AsyncStorage.getItem(`${userType}_user_id`);

      if (!storedToken || !storedUserId) {
        setLoading(false);
        return false;
      }

      // Validate token with backend
      const response = await axios.get(
        `${process.env.EXPO_PUBLIC_API_URL}/api/auth/me`,
        {
          headers: { Authorization: `Bearer ${storedToken}` }
        }
      );

      if (response.data && response.data.user) {
        setAuthToken(storedToken);
        setUser(response.data.user);
        setupApiClient(storedToken);
        setLoading(false);
        return true;
      }

      // Token invalid, clear storage
      await clearAuth();
      setLoading(false);
      return false;

    } catch (err) {
      console.error('[Auth] Session restore error:', err);
      await clearAuth();
      setLoading(false);
      return false;
    }
  };

  /**
   * Setup axios client with auth headers
   */
  const setupApiClient = (token) => {
    apiClient.current = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_URL,
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  /**
   * Email/Password login
   */
  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = userType === 'driver'
        ? '/api/driver/login'
        : '/api/auth/login';

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`,
        { email, password }
      );

      if (response.data.token && response.data.user) {
        await storeAuthData(response.data.token, response.data.user);
        setupApiClient(response.data.token);
        setAuthToken(response.data.token);
        setUser(response.data.user);
      }

      return response.data;

    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Google OAuth login
   */
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);

      // Complete Google flow
      const result = await promptAsync();

      if (result.type === 'success') {
        const { authentication } = result;

        // Exchange Google token for app token
        const response = await axios.post(
          `${process.env.EXPO_PUBLIC_API_URL}/api/auth/google`,
          { googleToken: authentication.accessToken }
        );

        if (response.data.token && response.data.user) {
          await storeAuthData(response.data.token, response.data.user);
          setupApiClient(response.data.token);
          setAuthToken(response.data.token);
          setUser(response.data.user);
        }

        return response.data;
      }

      throw new Error('Google login cancelled');

    } catch (err) {
      const message = err.message || 'Google login failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Biometric authentication
   * Works if tokens are stored and biometric is available
   */
  const authenticateWithBiometric = async () => {
    try {
      if (!isBiometricAvailable) {
        throw new Error('Biometric not available');
      }

      const authenticated = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: `Authenticate to access your ${userType} account`,
        fallbackLabel: 'Use passcode to authenticate'
      });

      if (!authenticated.success) {
        throw new Error('Biometric authentication failed');
      }

      // Session already stored, just restore it
      const restored = await restoreSession();
      if (restored) {
        return user;
      }

      throw new Error('Failed to restore session');

    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Sign up with email
   */
  const signupWithEmail = async (email, password, name, phone) => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = userType === 'driver'
        ? '/api/driver/signup'
        : '/api/auth/signup';

      const response = await axios.post(
        `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`,
        { email, password, name, phone }
      );

      if (response.data.token && response.data.user) {
        await storeAuthData(response.data.token, response.data.user);
        setupApiClient(response.data.token);
        setAuthToken(response.data.token);
        setUser(response.data.user);
      }

      return response.data;

    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Store auth data securely
   */
  const storeAuthData = async (token, userData) => {
    try {
      // Store token in secure storage (platform-specific encryption)
      await SecureStore.setItemAsync('auth_token', token);
      
      // Store user ID in regular storage (can expire)
      await AsyncStorage.setItem(`${userType}_user_id`, userData.id);
      
      // Store user metadata
      await AsyncStorage.setItem(
        `${userType}_user_metadata`,
        JSON.stringify({
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          authProvider: userData.provider || 'email'
        })
      );

      // Store token expiry
      const expiryTime = new Date().getTime() + (24 * 60 * 60 * 1000); // 24 hours
      await AsyncStorage.setItem(`${userType}_token_expiry`, expiryTime.toString());

    } catch (err) {
      console.error('[Auth] Storage error:', err);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setLoading(true);

      // Call logout endpoint if needed
      try {
        if (apiClient.current) {
          const endpoint = userType === 'driver'
            ? '/api/driver/logout'
            : '/api/auth/logout';
          
          await apiClient.current.post(endpoint);
        }
      } catch (err) {
        console.warn('[Auth] Backend logout failed:', err.message);
      }

      await clearAuth();

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all authentication data
   */
  const clearAuth = async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await AsyncStorage.multiRemove([
        `${userType}_user_id`,
        `${userType}_user_metadata`,
        `${userType}_token_expiry`
      ]);

      setAuthToken(null);
      setUser(null);
      apiClient.current = null;

    } catch (err) {
      console.error('[Auth] Clear error:', err);
    }
  };

  /**
   * Check if session is valid/expired
   */
  const isSessionValid = async () => {
    try {
      const expiryTimeStr = await AsyncStorage.getItem(`${userType}_token_expiry`);
      if (!expiryTimeStr) return false;

      const expiryTime = parseInt(expiryTimeStr);
      return Date.now() < expiryTime;

    } catch (err) {
      return false;
    }
  };

  /**
   * Refresh token
   */
  const refreshToken = async () => {
    try {
      if (!apiClient.current) {
        throw new Error('Not authenticated');
      }

      const response = await apiClient.current.post('/api/auth/refresh');

      if (response.data.token) {
        await storeAuthData(response.data.token, user);
        setAuthToken(response.data.token);
        setupApiClient(response.data.token);
      }

      return response.data;

    } catch (err) {
      // Token refresh failed, require re-login
      await clearAuth();
      throw err;
    }
  };

  return {
    // State
    user,
    authToken,
    loading,
    error,
    isAuthenticated: !!user && !!authToken,
    isBiometricAvailable,
    biometricType,

    // Methods
    loginWithEmail,
    loginWithGoogle,
    authenticateWithBiometric,
    signupWithEmail,
    logout,
    refreshToken,
    isSessionValid,
    restoreSession,

    // API Client
    apiClient: apiClient.current
  };
}

export default useMobileAuth;

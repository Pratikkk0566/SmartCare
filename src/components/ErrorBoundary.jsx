import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../theme';
import { ErrorIcon, RefreshIcon } from '../assets/icons/Icons';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to crash analytics service
    // analytics.logError(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <ErrorIcon size={64} color={colors.error} />
          </View>
          
          <Text style={styles.title}>Oops! Something went wrong</Text>
          
          <Text style={styles.message}>
            We're sorry for the inconvenience. The app encountered an unexpected error.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorTitle}>Error Details:</Text>
              <Text style={styles.errorText}>{this.state.error.toString()}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            accessibilityHint="Resets the error and attempts to reload">
            <RefreshIcon size={20} color={colors.surface} />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>

          {this.props.onError && (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => this.props.onError(this.state.error)}
              accessibilityRole="button"
              accessibilityLabel="Report this error">
              <Text style={styles.linkText}>Report this error</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    maxWidth: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: colors.error,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  buttonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default ErrorBoundary;

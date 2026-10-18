import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected application error occurred.";
    return { hasError: true, errorMessage: message };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-canvas items-center justify-center px-6">
          <View className="w-16 h-16 rounded-3xl bg-rose-500/10 items-center justify-center mb-4">
            <Feather name="alert-triangle" size={28} color="#EF4444" />
          </View>
          <Text className="text-lg font-extrabold text-ink text-center mb-2">
            Something went wrong
          </Text>
          <Text className="text-xs text-ink-muted text-center mb-6 max-w-xs">
            {this.state.errorMessage || "Unable to render this screen."}
          </Text>
          <Pressable
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            className="px-6 py-3 rounded-2xl bg-primary active:opacity-85 shadow-sm"
          >
            <Text className="text-xs font-bold text-white">
              Try Again
            </Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}


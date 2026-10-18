import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import {
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";

export interface TextFieldProps extends TextInputProps {
  className?: string;
  inputClassName?: string;
  variant?: "filled" | "outlined";
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      className = "",
      inputClassName = "",
      variant = "filled",
      secureTextEntry,
      leftElement,
      rightElement,
      ...props
    },
    ref,
  ) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordToggleable = secureTextEntry !== undefined;
    const isActuallySecure = isPasswordToggleable && !isPasswordVisible;

    const baseContainerStyle =
      variant === "filled"
        ? "bg-surface-muted border border-surface-border"
        : "bg-surface border border-surface-border";

    return (
      <View
        className={`h-14 w-full flex-row items-center px-4 rounded-2xl ${baseContainerStyle} ${className}`}
      >
        {leftElement && <View className="mr-2">{leftElement}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor="#A0A0A3"
          className={`flex-1 text-[15px] font-semibold text-ink h-full ${inputClassName}`}
          secureTextEntry={isActuallySecure}
          {...props}
        />
        {rightElement && <View className="ml-2">{rightElement}</View>}
        {isPasswordToggleable && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="pl-2 h-full justify-center"
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color="#71717A"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

TextField.displayName = "TextField";

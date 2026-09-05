import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
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
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      className = "",
      inputClassName = "",
      variant = "filled",
      secureTextEntry,
      ...props
    },
    ref,
  ) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === "dark";

    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPasswordToggleable = secureTextEntry !== undefined;
    const isActuallySecure = isPasswordToggleable && !isPasswordVisible;

    const baseContainerStyle =
      variant === "filled"
        ? "bg-[#ECECEE] dark:bg-[#1C1C1F] border border-transparent"
        : "bg-white dark:bg-[#141416] border border-slate-200 dark:border-slate-800";

    return (
      <View
        className={`h-[52px] w-full flex-row items-center px-4 rounded-xl ${baseContainerStyle} ${className}`}
      >
        <TextInput
          ref={ref}
          placeholderTextColor={isDark ? "#6B6B70" : "#8E8E93"}
          className={`flex-1 font-body text-[16px] text-slate-900 dark:text-slate-100 h-full ${inputClassName}`}
          secureTextEntry={isActuallySecure}
          {...props}
        />
        {isPasswordToggleable && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="pl-2 h-full justify-center"
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={19}
              color={isDark ? "#6B6B70" : "#8E8E93"}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

TextField.displayName = "TextField";

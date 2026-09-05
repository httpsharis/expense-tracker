import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  className?: string;
}

/**
 * A universal Text component that automatically applies the default `font-body` 
 * and dark mode text colors. Use this instead of React Native's standard <Text>.
 */
export function Text({ className = '', style, ...props }: TextProps) {
  return (
    <RNText 
      className={`font-body text-slate-900 dark:text-slate-100 ${className}`}
      style={style}
      {...props} 
    />
  );
}

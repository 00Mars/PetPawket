import { RiveSprite } from '../core/types/rive';
import { StyleProp, ViewStyle } from 'react-native';

export type PalAvatarProps = {
  sprite: RiveSprite;
  width?: number;
  height?: number;
  frame?: boolean;
  artboard?: string;
  stateMachine?: string;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

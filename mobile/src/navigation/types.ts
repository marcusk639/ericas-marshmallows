import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

/**
 * Root navigation parameter list
 */
export type RootTabParamList = {
  Marshmallows: undefined;
  CheckIn: undefined;
  Memories: undefined;
  Profile: undefined;
};

/**
 * Helper types for type-safe navigation
 */
export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<
  RootTabParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

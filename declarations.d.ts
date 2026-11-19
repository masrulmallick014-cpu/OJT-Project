/**
 * PulseCorp Ambient Type Declarations
 * Ensures zero TypeScript errors across Native, Expo Sensors, Image Picker & Health APIs
 */

declare module 'react' {
  export interface ReactNodeArray extends Array<ReactNode> {}
  export type ReactFragment = Iterable<ReactNode> | ReactNodeArray;
  export type ReactNode =
    | ReactChild
    | ReactFragment
    | boolean
    | null
    | undefined;
  export type ReactChild = ReactElement | string | number;
  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: string | null;
  }
  export type JSXElementConstructor<P> = (props: P) => ReactElement<any, any> | null;
  export type FC<P = {}> = (props: P) => any;
  export type StyleProp<T> = T | Array<T | undefined | null | false> | null | undefined;

  export interface Context<T> {
    Provider: any;
    Consumer: any;
    displayName?: string;
  }

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useRef<T>(initialValue: T): { current: T };
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useContext<T>(context: Context<T>): T;
  export function useContext<T = any>(context: any): T;
  export function createContext<T>(defaultValue: T): Context<T>;

  const React: any;
  export default React;
}

declare namespace JSX {
  interface Element extends any {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    absoluteFillObject: any;
  };
  export const TouchableOpacity: any;
  export const ScrollView: any;
  export const RefreshControl: any;
  export const ActivityIndicator: any;
  export const Modal: any;
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    Version?: number | string;
    select: <T>(specifics: { [platform: string]: T }) => T;
  };
  export const PermissionsAndroid: {
    PERMISSIONS: Record<string, string>;
    RESULTS: {
      GRANTED: string;
      DENIED: string;
      NEVER_ASK_AGAIN: string;
    };
    request: (permission: string, rationale?: any) => Promise<string>;
    check: (permission: string) => Promise<boolean>;
  };
  export const AppState: {
    currentState: 'active' | 'background' | 'inactive';
    addEventListener: (
      type: 'change',
      listener: (nextAppState: 'active' | 'background' | 'inactive') => void
    ) => { remove: () => void };
  };
  export const StatusBar: any;
  export const SafeAreaView: any;
  export const KeyboardAvoidingView: any;
  export const Animated: {
    Value: any;
    timing: (value: any, config: any) => { start: (callback?: (result: { finished: boolean }) => void) => void };
    spring: (value: any, config: any) => { start: (callback?: (result: { finished: boolean }) => void) => void };
    sequence: (animations: any[]) => any;
    parallel: (animations: any[]) => { start: (callback?: (result: { finished: boolean }) => void) => void };
    loop: (animation: any) => { start: () => void; stop: () => void };
    View: any;
    Text: any;
    ScrollView: any;
    [key: string]: any;
  };
  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number; scale: number; fontScale: number };
  };
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[], options?: any) => void;
  };
  export const TextInput: any;
  export const Switch: any;
  export const Image: any;
  export const NativeModules: Record<string, any>;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type StyleProp<T> = any;
}

declare module 'expo-haptics' {
  export enum ImpactFeedbackStyle {
    Light = 'light',
    Medium = 'medium',
    Heavy = 'heavy',
  }
  export enum NotificationFeedbackType {
    Success = 'success',
    Warning = 'warning',
    Error = 'error',
  }
  export function impactAsync(style?: ImpactFeedbackStyle): Promise<void>;
  export function selectionAsync(): Promise<void>;
  export function notificationAsync(type?: NotificationFeedbackType): Promise<void>;
}

declare module 'expo-linear-gradient' {
  export const LinearGradient: any;
}

declare module 'react-native-svg' {
  export const Svg: any;
  export const Path: any;
  export const Circle: any;
  export const Rect: any;
  export const Line: any;
  export const G: any;
  export const Defs: any;
  export const LinearGradient: any;
  export const Stop: any;
  export default Svg;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'expo' {
  export function registerRootComponent(component: any): void;
}

declare module 'expo-sensors' {
  export const Pedometer: {
    isAvailableAsync: () => Promise<boolean>;
    getPermissionsAsync: () => Promise<{ granted: boolean; status: string }>;
    requestPermissionsAsync: () => Promise<{ granted: boolean; status: string }>;
    watchStepCount: (callback: (result: { steps: number }) => void) => { remove: () => void };
    getStepCountAsync: (start: Date, end: Date) => Promise<{ steps: number }>;
  };
  export const Accelerometer: {
    isAvailableAsync: () => Promise<boolean>;
    setUpdateInterval: (intervalMs: number) => void;
    addListener: (
      listener: (data: { x: number; y: number; z: number }) => void
    ) => { remove: () => void };
  };
}

declare module 'expo-image-picker' {
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    fileSize?: number;
    fileName?: string | null;
    mimeType?: string;
  }
  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[] | null;
  }
  export enum MediaTypeOptions {
    All = 'All',
    Videos = 'Videos',
    Images = 'Images',
  }
  export function requestCameraPermissionsAsync(): Promise<{ granted: boolean; status: string }>;
  export function requestMediaLibraryPermissionsAsync(): Promise<{ granted: boolean; status: string }>;
  export function launchCameraAsync(options?: any): Promise<ImagePickerResult>;
  export function launchImageLibraryAsync(options?: any): Promise<ImagePickerResult>;
}

declare module 'react-native-health-connect' {
  export enum SdkAvailabilityStatus {
    SDK_AVAILABLE = 1,
    SDK_UNAVAILABLE = 2,
    SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 3,
  }
  export function initialize(): Promise<boolean>;
  export function getSdkStatus(): Promise<number>;
  export function requestPermission(permissions: any[]): Promise<any[]>;
  export function readRecords(recordType: string, options: any): Promise<{ records: any[] }>;
  export function openHealthConnectSettings(): void;
  export function openHealthConnectDataManagement(): void;
}

declare module 'react-native-health' {
  export interface HealthKitPermissions {
    permissions: {
      read: any[];
      write: any[];
    };
  }
  const AppleHealthKit: {
    Constants: {
      Permissions: {
        StepCount: string;
        HeartRate: string;
        RestingHeartRate?: string;
        ActiveEnergyBurned: string;
        SleepAnalysis: string;
        OxygenSaturation: string;
      };
    };
    initHealthKit(permissions: HealthKitPermissions, callback: (error: string) => void): void;
    getStepCount(options: any, callback: (err: any, result: { value: number }) => void): void;
    getHeartRateSamples(options: any, callback: (err: any, results: Array<{ value: number }>) => void): void;
    getActiveEnergyBurned(options: any, callback: (err: any, results: Array<{ value: number }>) => void): void;
    getSleepSamples(options: any, callback: (err: any, results: Array<{ startDate: string; endDate: string; value: string }>) => void): void;
    getOxygenSaturationSamples(options: any, callback: (err: any, results: Array<{ value: number }>) => void): void;
  };
  export default AppleHealthKit;
}

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

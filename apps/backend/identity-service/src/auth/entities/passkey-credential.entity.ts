export const PasskeyDeviceType = {
  SingleDevice: 'singleDevice',
  MultiDevice: 'multiDevice',
} as const;

export type PasskeyDeviceType = (typeof PasskeyDeviceType)[keyof typeof PasskeyDeviceType];

export const PasskeyTransport = {
  Usb: 'usb',
  Ble: 'ble',
  Nfc: 'nfc',
  Internal: 'internal',
  Hybrid: 'hybrid',
} as const;

export type PasskeyTransport = (typeof PasskeyTransport)[keyof typeof PasskeyTransport];

export interface PasskeyCredential {
  credentialId: string;
  publicKey: string;
  counter: number;
  displayName: string;
  deviceType: PasskeyDeviceType;
  backedUp: boolean;
  transports?: PasskeyTransport[];
  createdAt: Date;
  lastUsedAt?: Date;
}

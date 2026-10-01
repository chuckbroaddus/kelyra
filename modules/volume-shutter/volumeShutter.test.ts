import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const index = readFileSync(join(root, 'modules/volume-shutter/src/index.ts'), 'utf8');
const ios = readFileSync(join(root, 'modules/volume-shutter/ios/VolumeShutterModule.swift'), 'utf8');
const android = readFileSync(
  join(root, 'modules/volume-shutter/android/src/main/java/expo/modules/volumeshutter/VolumeShutterModule.kt'),
  'utf8',
);
const cfg = readFileSync(join(root, 'modules/volume-shutter/expo-module.config.json'), 'utf8');
const pkg = readFileSync(join(root, 'package.json'), 'utf8');

test('volume-shutter is a local Expo module dependency', () => {
  assert.match(pkg, /"volume-shutter":\s*"file:\.\/modules\/volume-shutter"/);
  assert.match(cfg, /VolumeShutterModule/);
});

test('JS wrapper no-ops when native module is missing (Expo Go safe)', () => {
  assert.match(index, /requireNativeModule/);
  assert.match(index, /Expo Go/);
  assert.match(index, /export function startVolumeShutter/);
  assert.match(index, /export function volumeShutterAvailable/);
  assert.match(index, /return \(\) => \{\}/);
});

test('iOS uses AVCaptureEventInteraction so volume does not change', () => {
  assert.match(ios, /AVCaptureEventInteraction/);
  assert.match(ios, /primary:/);
  assert.match(ios, /secondary:/);
  assert.match(ios, /onShutterPress/);
  assert.match(ios, /isAvailable/);
  assert.match(ios, /iOS 17\.2/);
});

test('Android intercepts volume keys while armed', () => {
  assert.match(android, /KEYCODE_VOLUME_UP/);
  assert.match(android, /KEYCODE_VOLUME_DOWN/);
  assert.match(android, /onShutterPress/);
  assert.match(android, /fun arm/);
  assert.match(android, /fun disarm/);
});

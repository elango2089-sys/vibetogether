import { RoomManager } from '../server/room-manager.js';
import { SyncManager } from '../server/sync-manager.js';

console.log('--- STARTING SYNC AUDIO INTEGRATION TESTS ---');

const roomManager = new RoomManager();
const syncManager = new SyncManager();

// Test 1: Room Creation & 6-digit code
console.log('Test 1: Creating room...');
const { room, device: hostDevice } = roomManager.createRoom('socket_host', "Elango's iPhone", 'iOS');

console.assert(room.code.length === 6, 'Room code must be 6 digits');
console.assert(/^\d{6}$/.test(room.code), 'Room code must be numeric');
console.assert(room.hostId === hostDevice.id, 'Host ID must match device ID');
console.assert(hostDevice.isHost === true, 'Host device must have isHost=true');
console.log(`✓ Room created successfully with 6-digit code: ${room.code}`);

// Test 2: Joining devices up to max 8
console.log('Test 2: Joining 7 additional devices...');
for (let i = 2; i <= 8; i++) {
  const { device } = roomManager.joinRoom(`socket_dev_${i}`, room.code, `Device ${i}`, 'Android');
  console.assert(device.isHost === false, `Device ${i} should not be host`);
}

const updatedRoom = roomManager.getRoom(room.id)!;
const connectedCount = Object.values(updatedRoom.devices).filter(d => d.connected).length;
console.assert(connectedCount === 8, `Expected 8 connected devices, got ${connectedCount}`);
console.log(`✓ 8 devices successfully joined room ${room.code}`);

// Test 3: Rejecting 9th device when room is full
console.log('Test 3: Attempting to join 9th device...');
try {
  roomManager.joinRoom('socket_dev_9', room.code, 'Device 9', 'Web');
  console.error('FAIL: 9th device was allowed into room!');
} catch (err: any) {
  console.assert(err.code === 'ROOM_FULL', 'Expected ROOM_FULL error code');
  console.log(`✓ 9th device rejected as expected: "${err.message}"`);
}

// Test 4: NTP Scheduled playback math
console.log('Test 4: Verifying scheduled playback timing...');
const startAt = syncManager.calculateScheduledStart(1500);
const now = Date.now();
console.assert(startAt >= now + 1400, 'Scheduled startAt must be in the future');
console.log(`✓ Playback scheduled for future server timestamp: ${startAt} (lead time: ${startAt - now}ms)`);

// Test 5: Drift Evaluation
console.log('Test 5: Testing drift correction thresholds...');
updatedRoom.playbackState = 'playing';
updatedRoom.startAt = now - 10000; // playing for 10 seconds
updatedRoom.position = 0;

// Client at 10.010s (10ms drift) -> No adjustment needed
const metricsSmall = syncManager.evaluateDrift(updatedRoom, 10.010, Date.now());
console.assert(metricsSmall.recommendation === 'none', 'Small drift should require no correction');

// Client at 9.920s (-80ms drift, behind) -> Speed up rate adjustment (1.004)
const metricsMedium = syncManager.evaluateDrift(updatedRoom, 9.920, Date.now());
console.assert(metricsMedium.recommendation === 'rate_adjust', 'Medium drift should trigger rate adjustment');
console.assert(metricsMedium.suggestedRate > 1.0, 'Client behind should get playbackRate > 1.0');

// Client at 8.500s (-1500ms drift) -> Resync
const metricsLarge = syncManager.evaluateDrift(updatedRoom, 8.500, Date.now());
console.assert(metricsLarge.recommendation === 'resync', 'Large drift should trigger resync');

console.log('✓ All drift evaluation tests passed!');
console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');

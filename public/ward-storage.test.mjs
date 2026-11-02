import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWardStorage } from './ward-storage.js';
const mockStorage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};
test('a new ward never loads previous ward patients, activity, tombstones or pending changes', () => {
  const storage = mockStorage();
  const previous = createWardStorage(storage, 'doctor-1', 'WARD-A');
  const next = createWardStorage(storage, 'doctor-1', 'WARD-B');
  for (const key of ['patients', 'activity', 'tombs', 'pending', 'askai']) previous.write(key, ['private-record']);
  for (const key of ['patients', 'activity', 'tombs', 'pending', 'askai']) assert.deepEqual(next.read(key, []), []);
  assert.deepEqual(createWardStorage(storage, 'doctor-1', 'WARD-A').read('patients', []), ['private-record']);
});
test('another account on the same device cannot load the first account cache', () => {
  const storage = mockStorage();
  createWardStorage(storage, 'doctor-1', 'WARD-A').write('patients', ['private-record']);
  assert.deepEqual(createWardStorage(storage, 'doctor-2', 'WARD-A').read('patients', []), []);
});
test('unscoped legacy patient records are not assigned to a newly created ward', () => {
  const storage = mockStorage();
  storage.setItem('ward_patients_v4', JSON.stringify(['legacy-patient']));
  assert.deepEqual(createWardStorage(storage, 'doctor-1', 'NEW-WARD').read('patients', []), []);
  assert.equal(storage.getItem('ward_patients_v4'), '["legacy-patient"]');
});
test('queued writes retain the originating ward storage even after a switch', () => {
  const storage = mockStorage();
  const origin = createWardStorage(storage, 'doctor-1', 'WARD-A');
  const destination = createWardStorage(storage, 'doctor-1', 'WARD-B');
  origin.write('patients', ['origin-snapshot']);
  destination.write('patients', ['destination-patient']);
  origin.write('patients', ['origin-saved']);
  assert.deepEqual(destination.read('patients', []), ['destination-patient']);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState } from '../lib/model.ts';
import { applyCommand } from '../lib/commands.ts';
import { focusSeconds, potentialWealth } from '../lib/focus-clock.ts';

test('wealth grows before task completion; pause and resume preserve fractional time', () => {
  const start = Date.parse('2026-11-02T10:00:00Z');
  const apply = (s, type, payload, offset = 0) => applyCommand(s, { type, payload }, new Date(start + offset));
  let s = apply(emptyState(), 'task.save', { id: 'focus-tick', task: { title: '听力' } });
  s = apply(s, 'focus.start', { taskId: 'focus-tick' });
  assert.equal(potentialWealth(focusSeconds(s.focus, start + 100), 60), 0.002);
  assert.equal(potentialWealth(focusSeconds(s.focus, start + 1500), 60), 0.025);
  assert.equal(s.tasks[0].progress, 0);
  s = apply(s, 'focus.pause', undefined, 1500);
  assert.equal(s.focus.seconds, 1.5);
  assert.equal(focusSeconds(s.focus, start + 60000), 1.5);
  s = apply(s, 'focus.start', { taskId: 'focus-tick' }, 60000);
  s = JSON.parse(JSON.stringify(s)); // Reload uses the persisted timestamp.
  assert.equal(focusSeconds(s.focus, start + 62500), 4);
  s = apply(s, 'focus.finish', undefined, 62500);
  assert.equal(s.sessions[0].seconds, 4);
  assert.equal(s.sessions[0].growth, 0.067);
  assert.equal(s.tasks[0].progress, 0);
  assert.equal(apply(s, 'focus.finish').sessions.length, 1);
});

test('time beyond target keeps accumulating, zero rate stays zero, cancel does not settle', () => {
  const now = new Date('2026-11-02T10:00:00Z');
  let s = applyCommand(emptyState(), { type: 'task.save', payload: { id: 't', task: { title: '工作' } } }, now);
  s = applyCommand(s, { type: 'focus.start', payload: { taskId: 't' } }, now);
  assert.equal(focusSeconds(s.focus, +now + 3600000), 3600);
  assert.equal(potentialWealth(3600, 60), 60);
  assert.equal(potentialWealth(3600, 0), 0);
  assert.equal(focusSeconds(s.focus, +now - 1000), 0);
  s = applyCommand(s, { type: 'focus.cancel' }, now);
  assert.equal(focusSeconds(s.focus, +now), 0);
  assert.equal(s.sessions.length, 0);
});

import { describe, it, expect } from 'vitest';
import { initialReview, nextReview, isDue, REVIEW_INTERVALS_DAYS } from '../lib/srs';

const NOW = Date.parse('2026-08-01T00:00:00Z');
const DAY = 86_400_000;

describe('间隔重复', () => {
  it('新错题明天复习', () => {
    const r = initialReview(NOW);
    expect(r.stage).toBe(0);
    expect(Date.parse(r.nextReviewAt)).toBe(NOW + DAY);
    expect(r.done).toBe(false);
  });
  it('会了则进入下一阶段并拉长间隔', () => {
    const r = nextReview(0, true, NOW);
    expect(r.stage).toBe(1);
    expect(Date.parse(r.nextReviewAt)).toBe(NOW + REVIEW_INTERVALS_DAYS[1] * DAY);
  });
  it('还不会则退回第 0 阶段、明天再来', () => {
    const r = nextReview(3, false, NOW);
    expect(r.stage).toBe(0);
    expect(Date.parse(r.nextReviewAt)).toBe(NOW + DAY);
    expect(r.done).toBe(false);
  });
  it('通过最后一个阶段后完成', () => {
    const r = nextReview(REVIEW_INTERVALS_DAYS.length - 1, true, NOW);
    expect(r.done).toBe(true);
  });
  it('isDue 判断到期', () => {
    expect(isDue(new Date(NOW - 1).toISOString(), NOW)).toBe(true);
    expect(isDue(new Date(NOW + 1).toISOString(), NOW)).toBe(false);
    expect(isDue('garbage', NOW)).toBe(false);
  });
});

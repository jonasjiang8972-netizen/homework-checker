/**
 * 间隔重复（错题复习计划）
 *
 * 每道错题在 1、3、7、14、30 天后各复习一次：
 * - 会了：进入下一阶段，全部完成后 done
 * - 还不会：退回第 0 阶段，明天再复习
 */

export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30] as const;

const DAY_MS = 86_400_000;

export interface ReviewState {
  stage: number;
  nextReviewAt: string; // ISO
  done: boolean;
}

/** 新错题的首次复习安排：明天 */
export function initialReview(now: number = Date.now()): ReviewState {
  return {
    stage: 0,
    nextReviewAt: new Date(now + REVIEW_INTERVALS_DAYS[0] * DAY_MS).toISOString(),
    done: false,
  };
}

/** 完成一次复习后的下一个状态 */
export function nextReview(stage: number, remembered: boolean, now: number = Date.now()): ReviewState {
  if (!remembered) {
    return {
      stage: 0,
      nextReviewAt: new Date(now + REVIEW_INTERVALS_DAYS[0] * DAY_MS).toISOString(),
      done: false,
    };
  }
  const next = stage + 1;
  if (next >= REVIEW_INTERVALS_DAYS.length) {
    return { stage: REVIEW_INTERVALS_DAYS.length, nextReviewAt: new Date(now).toISOString(), done: true };
  }
  return {
    stage: next,
    nextReviewAt: new Date(now + REVIEW_INTERVALS_DAYS[next] * DAY_MS).toISOString(),
    done: false,
  };
}

export function isDue(nextReviewAt: string, now: number = Date.now()): boolean {
  const t = Date.parse(nextReviewAt);
  return !Number.isNaN(t) && t <= now;
}

export type MoodRange = 'sad' | 'neutral' | 'happy';

export interface MoodState {
  value: number;
  range: MoodRange;
}

const MOOD_SAD_MAX = 3;
const MOOD_HAPPY_MIN = 7;

export function getMoodRange(value: number): MoodRange {
  if (value <= MOOD_SAD_MAX) return 'sad';
  if (value >= MOOD_HAPPY_MIN) return 'happy';
  return 'neutral';
}

export function computeNextMood(current: number, reply: string): number {
  let delta = 0;

  if (/开心|高兴|喜欢|好开心|嘻嘻|哈哈|嘿嘿|笑死|太好|棒|不错|爱|想你/.test(reply)) delta += 1;
  if (/悲伤|难受|伤心|哭|哭了|孤独|寂寞|😭|💔|🥺/.test(reply)) delta -= 1;
  if (/生气|愤怒|气死|😡|混蛋|讨厌|烦/.test(reply)) delta -= 2;
  if (/亲|抱|爱|想你|好想|乖|宝宝|宝贝|可爱/.test(reply)) delta += 2;
  if (/对不起|抱歉|错了|原谅/.test(reply)) delta += 1;
  if (/滚|走开|别理|不想理|烦死了|够了/.test(reply)) delta -= 2;

  return Math.max(0, Math.min(10, current + delta));
}

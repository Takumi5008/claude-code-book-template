import webpush from 'web-push';
import { getMembersWithSubscription, getUnsubmittedMembers, getDeadline } from '../db.js';

webpush.setVapidDetails(
  process.env.VAPID_MAILTO,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const notifiedKeys = new Set();

const checkAndNotify = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const deadline = await getDeadline(year, month);
  if (!deadline?.deadline_at) return;

  const deadlineTime = new Date(deadline.deadline_at);
  const diffMin = (deadlineTime - now) / 1000 / 60;
  if (diffMin < 55 || diffMin > 65) return;

  const notifyKey = `${year}-${month}-${deadlineTime.toISOString()}`;
  if (notifiedKeys.has(notifyKey)) return;
  notifiedKeys.add(notifyKey);

  const unsubmitted = await getUnsubmittedMembers(year, month);
  const unsubmittedIds = new Set(unsubmitted.map(m => m.id));
  const members = await getMembersWithSubscription();

  for (const member of members) {
    if (!unsubmittedIds.has(member.id)) continue;
    const subscription = JSON.parse(member.push_subscription);
    const payload = JSON.stringify({
      title: 'シフト提出のお知らせ',
      body: `${month}月のシフト締切まであと1時間です。未提出の方は提出してください。`,
      url: '/',
    });
    webpush.sendNotification(subscription, payload).catch((err) => {
      console.error(`Push failed for ${member.name}:`, err.statusCode);
    });
  }
};

export const startScheduler = () => {
  setInterval(checkAndNotify, 60 * 1000);
  console.log('Push scheduler started (checks every 1 minute)');
};

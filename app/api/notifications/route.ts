import { NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';

import { dbConnect } from '@/connections/db';
import { whisper } from '@/lib/whisper';
import { ISubscriber, useSubscriptionModel } from '@/models/subscription';

import { IProfiles } from '@/interfaces';

const DB_NAME = process.env.MONGO_DB_NAME as string;

function filterNonEmptyNotifications(profiles: IProfiles): Partial<IProfiles> {
    const filtered: Partial<IProfiles> = {};

    for (const key in profiles) {
        const value = profiles[key as keyof IProfiles];
        if (Array.isArray(value) && value.length > 0) {
            filtered[key as keyof IProfiles] = value;
        }
    }

    return filtered;
}

export async function GET() {

    try {

        const now = formatInTimeZone(new Date(), 'Asia/Kolkata', 'dd MMMM yyyy HH:mm');

        await dbConnect(DB_NAME);

        const Subscription = await useSubscriptionModel(DB_NAME);

        const subscriptions = await Subscription.find({
            region: "India/Bombay",
            'subscribers.subsequentNotification': now
        });

        const dueNotifications: Array<{
            symbol: string;
            name: string;
            type: string;
            region: string;
            currency: string;
            subscribers: Array<{
                subscriber: string;
                notifications: Partial<IProfiles>;
            }>;
        }> = [];

        for (const subscription of subscriptions) {
            const { symbol, name, type, region, currency, subscribers } = subscription;

            const subs = subscribers
                .filter((subscriber: ISubscriber) => subscriber.subsequentNotification === now)
                .map((subscriber: ISubscriber) => ({
                    subscriber: subscriber.subscriberId || "",
                    notifications: filterNonEmptyNotifications(subscriber.notifications)
                }));

            if (subs.length > 0) {
                dueNotifications.push({
                    symbol,
                    name,
                    type,
                    region,
                    currency,
                    subscribers: subs
                });
            }
        }

        return NextResponse.json({ dueNotifications }, { status: 200 });

    } catch (error) {

        whisper("Execution Error:", error);

        return NextResponse.json(
            { message: "Oops! Something went wrong on our end. Please try again later or contact support if the issue persists." },
            { status: 500 }
        );

    }

}

import { NextResponse } from 'next/server';
import { formatInTimeZone } from 'date-fns-tz';
import axios from 'axios';

import { dbConnect } from '@/connections/db';
import { whisper } from '@/lib/whisper';
import { ISubscriber, useSubscriptionModel } from '@/models/subscription';

import { IProfiles } from '@/interfaces';

const DB_NAME = process.env.SECONDARY_MONGO_DB_NAME as string;
// const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY as string;

const API_KEYS = [
    "WON204SDOKH0GH9S",
    "J72FJF0LCVRXCNES",
    "1I1U8E7RTL1N8ZA6",
    "8WUZMCJ3RX96YFS6",
    "L1139CTRS9B930RY",
    "KG61YGMTLCS305M8",
    "RQLGA5PQJ4K94U4X",
    "E3JEZLZOU423J27F",
    "VLHTMAYXWAC6CLQ1",
    "OUODHRRP4KBWE4D4",
    "2LFSCXT8SCVBALA1",
    "DXEB8P2BHOKKX181",
    "GKUWASBQ8M9UYWRV",
    "6ESAWLPIU1NUDMC7",
    "SYNALJXYA5Z2AAVE",
    "VPVW6T7CKXSV8AE5",
    "0FMR77A3RHPL9BON",
    "5RCIY701HK987IMR",
    "KPXUKZDCCFTDGQO1",
    "8J52C318NETW0KZ9",
    "HJG8JHS0H92KSNLD"
];

const ALPHA_VANTAGE_API_KEY = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

// Define the structure of the Alpha Vantage Global Quote response
interface AlphaVantageGlobalQuote {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
}

interface SubscriberNotification {
    subscriber: string;
    notifications: Partial<IProfiles>;
}

interface NotificationEntry {
    symbol: string;
    name: string;
    type: string;
    region: string;
    currency: string;
    globalQuote: AlphaVantageGlobalQuote | null;
    subscribers: SubscriberNotification[];
}

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

async function getGlobalQuote(symbol: string): Promise<AlphaVantageGlobalQuote | null> {
    try {
        const response = await axios.get<{ 'Global Quote': AlphaVantageGlobalQuote }>(
            'https://www.alphavantage.co/query',
            {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol,
                    apikey: ALPHA_VANTAGE_API_KEY,
                },
            }
        );

        const globalQuote = response.data['Global Quote'];

        // Validate presence of required field
        return globalQuote && globalQuote['01. symbol'] ? globalQuote : null;
    } catch (error) {
        whisper(`Failed to fetch global quote for ${symbol}`, error);
        return null;
    }
}

export async function GET() {
    try {
        const now = formatInTimeZone(new Date(), 'Asia/Kolkata', 'dd MMMM yyyy HH:mm');

        await dbConnect(DB_NAME);

        const Subscription = await useSubscriptionModel(DB_NAME);

        const subscriptions = await Subscription.find({
            region: 'India/Bombay',
            'subscribers.subsequentNotification': now,
        });

        const dueNotifications: NotificationEntry[] = [];

        for (const subscription of subscriptions) {
            const { symbol, name, type, region, currency, subscribers } = subscription;

            const subs: SubscriberNotification[] = subscribers
                .filter((subscriber: ISubscriber) => subscriber.subsequentNotification === now)
                .map((subscriber: ISubscriber) => ({
                    subscriber: subscriber.subscriberId || '',
                    notifications: filterNonEmptyNotifications(subscriber.notifications),
                }));

            if (subs.length > 0) {
                const globalQuote = await getGlobalQuote(symbol);

                dueNotifications.push({
                    symbol,
                    name,
                    type,
                    region,
                    currency,
                    globalQuote,
                    subscribers: subs,
                });
            }
        }

        return NextResponse.json({ dueNotifications }, { status: 200 });

    } catch (error) {
        whisper('Execution Error:', error);

        return NextResponse.json(
            {
                message:
                    'Oops! Something went wrong on our end. Please try again later or contact support if the issue persists.',
            },
            { status: 500 }
        );
    }
}

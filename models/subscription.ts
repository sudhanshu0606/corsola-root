import { Connection, Schema } from "mongoose";
import { v4 as uuidv4 } from 'uuid';

import { dbConnect } from "@/connections/db";

import { IProfiles } from "@/interfaces";

interface ISubscriber extends Document {
    _id: string;
    subscriberId: string;
    interval: number;
    status: "paused" | "playing";
    notifications: IProfiles;
    initialNotification: string;
    subsequentNotification: string;
}

interface ISubscription {
    _id: string;
    uuid: string;
    symbol: string;
    name: string;
    type: string;
    region: string
    currency: string;
    subscribers: ISubscriber[];
}

const SubscriberSchema = new Schema<ISubscriber>({

    subscriberId: {
        type: String,
        required: true
    },

    interval: {
        type: Number,
        required: true,
        min: 10
    },

    status: {
        type: String,
        enum: ["paused", "playing"],
        default: "playing"
    },

    notifications: {
        type: Object,
        default: () => ({
            email: [],
            sms: [],
            call: [],
            voicemail: [],
            whatsapp: [],
            telegram: [],
            signal: [],
            viber: [],
            messenger: [],
            wechat: [],
            line: [],
            slack: [],
            microsoftTeams: [],
            discord: [],
            facebook: [],
            instagram: [],
            twitter: [],
            linkedin: [],
            threads: [],
        }),
    },

    initialNotification: {
        type: String,
        required: true
    },

    subsequentNotification: {
        type: String,
        required: true
    }

});

const SubscriptionSchema = new Schema<ISubscription>({

    uuid: {
        type: String,
        default: uuidv4,
        required: true,
        unique: true
    },

    symbol: {
        type: String,
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: true,
        unique: true
    },

    type: {
        type: String,
        required: true
    },

    region: {
        type: String,
        required: true
    },

    currency: {
        type: String,
        required: true
    },

    subscribers: {
        type: [SubscriberSchema],
        default: []
    }

});

const useSubscriptionModel = async (dbName: string) => {
    const connection: Connection = await dbConnect(dbName);
    return connection.model<ISubscription>("subscription", SubscriptionSchema);
};

export type { ISubscriber, ISubscription };
export { SubscriberSchema, SubscriptionSchema, useSubscriptionModel };

import mongoose, { Schema, Document, Types } from "mongoose";

export type BookingStatus =
  | "requested"
  | "awaiting_payment"
  | "confirmed"
  | "started"
  | "completed"
  | "cancelled"
  | "rejected"
  | "expired";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "cash"
  | "failed";

export interface IBooking extends Document {
  user: Types.ObjectId;
  driver: Types.ObjectId;
  vehicle: Types.ObjectId;

  pickupAddress: string;
  dropAddress: string;

  pickupLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  dropLocation: {
    type: "Point";
    coordinates: [number, number];
  };

  fare: number;

  status: BookingStatus;
  paymentStatus: PaymentStatus;

  paymentDeadline?: Date;

  userMobileNumber: string;
  driverMobileNumber: string;
  adminCommission: number
partnerAmount: number
    pickupOtp: string

pickupOtpExpires: Date
 dropOtp: string

dropOtpExpires: Date
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    driver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },

    pickupAddress: { type: String, required: true },
    dropAddress: { type: String, required: true },

    pickupLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },

    dropLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    

    fare: { type: Number, required: true },

    status: {
      type: String,
      default: "requested",
      index: true,
    },
adminCommission: {
  type: Number,
  default: 0,
},

partnerAmount: {
  type: Number,
  default: 0,
},
    paymentStatus: {
      type: String,
      default: "pending",
    },

    paymentDeadline: Date,

    pickupOtp: {
  type: String,
},

pickupOtpExpires: {
  type: Date,
},
   dropOtp: {
  type: String,
},

dropOtpExpires: {
  type: Date,
},

    userMobileNumber: { 
      type: String, 
      required: true,
      trim: true,
    },

    driverMobileNumber: { 
      type: String, 
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const activeStatuses = ["requested", "awaiting_payment", "confirmed", "started"];

BookingSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: { $in: activeStatuses } } }
);

BookingSchema.index(
  { driver: 1 },
  { unique: true, partialFilterExpression: { status: { $in: activeStatuses } } }
);

const Booking = mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);
export default Booking;
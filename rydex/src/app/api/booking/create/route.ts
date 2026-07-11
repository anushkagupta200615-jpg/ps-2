import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import Booking from "@/models/booking.model";
import User from "@/models/user.model";
import { auth } from "@/auth";
import axios from "axios";

export async function POST(req: Request) {
  await connectDb();

  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const {
    driverId,
    vehicleId,
    pickupAddress,
    dropAddress,
    pickupLocation,
    dropLocation,
    fare,
    mobileNumber, // This is user's mobile number from frontend
  } = body;

  if (
    !driverId ||
    !vehicleId ||
    !pickupLocation?.coordinates ||
    !dropLocation?.coordinates
  ) {
    return NextResponse.json(
      { message: "Missing required fields" },
      { status: 400 }
    );
  }

  // Get driver's mobile number from database
  const driver = await User.findById(driverId).select("mobileNumber");
  
  if (!driver) {
    return NextResponse.json(
      { message: "Driver not found" },
      { status: 404 }
    );
  }

  let booking;
  try {
    booking = await Booking.create({
      user: session.user.id,
      driver: driverId,
      vehicle: vehicleId,
      pickupAddress,
      dropAddress,
      pickupLocation,
      dropLocation,
      fare,
      userMobileNumber: mobileNumber,
      driverMobileNumber: driver.mobileNumber,
      status: "requested",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      const existingUserBooking = await Booking.findOne({
        user: session.user.id,
        status: {
          $in: ["requested", "awaiting_payment", "confirmed", "started"],
        },
      });

      if (existingUserBooking) {
        return NextResponse.json({ success: true, booking: existingUserBooking });
      }

      return NextResponse.json(
        { message: "Driver is currently unavailable" },
        { status: 409 }
      );
    }
    
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
  
  await axios.post(
    `${process.env.NEXT_PUBLIC_SOCKET_SERVER}/emit`,
    {
      userId: driverId,
      event: "new-booking",
      data: booking,
    }
  );

  return NextResponse.json({ success: true, booking });
}
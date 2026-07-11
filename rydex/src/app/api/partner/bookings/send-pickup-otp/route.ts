import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Booking from "@/models/booking.model";
import { sendMail } from "@/lib/mailer";
import { auth } from "@/auth";


export async function POST(req: Request) {

  await connectDB();

  try {

    const { bookingId } = await req.json();

    const booking = await Booking
      .findById(bookingId)
      .populate("user");

    if (!booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    const session = await auth();

    if (!session?.user?.id || booking.driver?.toString() !== session.user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    if (booking.pickupOtpExpires && booking.pickupOtpExpires > new Date(Date.now() + 4 * 60 * 1000)) {
      return NextResponse.json(
        { message: "Please wait 60 seconds before requesting a new OTP" },
        { status: 429 }
      );
    }

    /* Generate OTP */
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.pickupOtp = otp;
    booking.pickupOtpExpires = new Date(Date.now() + 5 * 60 * 1000);

    await booking.save();

    /* Send Mail */

    if (booking.user?.email) {

      await sendMail(
        booking.user.email,
        "Your Pickup OTP - RYDEX",
        `
        <div style="font-family:sans-serif;padding:20px">
          <h2>Ride OTP</h2>

          <p>Your pickup OTP is:</p>

          <h1 style="letter-spacing:6px">${otp}</h1>

          <p>This OTP is valid for 5 minutes.</p>

          <p>Share this OTP with your driver to start the ride.</p>

          <br/>

          <b>RYDEX</b>
        </div>
        `
      );

    }

    return NextResponse.json({
      success: true,
      message: "Pickup OTP sent",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      { message: "OTP send failed" },
      { status: 500 }
    );

  }

}
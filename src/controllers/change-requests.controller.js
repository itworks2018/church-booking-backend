import { db } from "../config/supabase.js";
import { sendChangeRequestStatusEmail } from "../utils/mailer.js";

// ✅ Create a new change request
export const createChangeRequest = async (req, res) => {
  try {
    const { booking_id, description } = req.body;
    const user_id = req.user?.id;

    if (!booking_id || !description) {
      return res.status(400).json({ message: "Booking ID and description are required" });
    }

    if (!user_id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get booking details to include in the request
    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("event_name, booking_id")
      .eq("booking_id", booking_id)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Create the change request
    const { data: changeRequest, error } = await db
      .from("change_requests")
      .insert([
        {
          booking_id,
          user_id,
          event_name: booking.event_name,
          description,
          status: "Pending"
        }
      ])
      .select();

    if (error) {
      console.error("Change request creation error:", error);
      return res.status(500).json({ message: "Failed to create change request" });
    }

    // TODO: Send email to admin notifying them of the new change request
    // await sendChangeRequestEmailToAdmin(booking.event_name, description, user_email);

    res.status(201).json({
      message: "Change request submitted successfully",
      changeRequest: changeRequest[0]
    });
  } catch (err) {
    console.error("Create change request error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get user's change requests
export const getUserChangeRequests = async (req, res) => {
  try {
    const user_id = req.user?.id;

    if (!user_id) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const { data: changeRequests, error } = await db
      .from("change_requests")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch user change requests error:", error);
      return res.status(500).json({ message: "Failed to fetch change requests" });
    }

    res.status(200).json(changeRequests || []);
  } catch (err) {
    console.error("Get user change requests error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get all change requests (admin only)
export const getAllChangeRequests = async (req, res) => {
  try {
    const user_role = req.user?.role;

    if (user_role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { data: changeRequests, error } = await db
      .from("change_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch all change requests error:", error);
      return res.status(500).json({ message: "Failed to fetch change requests" });
    }

    res.status(200).json(changeRequests || []);
  } catch (err) {
    console.error("Get all change requests error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Update change request status (admin only)
export const updateChangeRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_notes } = req.body;
    const user_role = req.user?.role;

    if (user_role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    if (!status || !["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'Pending', 'Approved', or 'Rejected'" });
    }

    // Update the change request
    const { data: updatedRequest, error } = await db
      .from("change_requests")
      .update({
        status,
        admin_notes: admin_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Update change request error:", error);
      return res.status(500).json({ message: "Failed to update change request" });
    }

    if (!updatedRequest || updatedRequest.length === 0) {
      return res.status(404).json({ message: "Change request not found" });
    }

    // Send email to user notifying them of the status update (only for Approved/Rejected)
    if (status !== "Pending") {
      try {
        const changeRequest = updatedRequest[0];
        
        // Fetch user details to get email and name
        const { data: user, error: userError } = await db
          .from("users")
          .select("email, full_name")
          .eq("user_id", changeRequest.user_id)
          .single();
        
        // Only send email if user exists and has valid email
        if (!userError && user && user.email) {
          await sendChangeRequestStatusEmail({
            userEmail: user.email,
            userName: user.full_name || "User",
            eventName: changeRequest.event_name,
            status: status,
            adminNotes: admin_notes || "No additional notes provided."
          });
        } else {
          console.warn("Cannot send email notification - missing user or email address:", { userError, hasUser: !!user, hasEmail: user?.email });
        }
      } catch (emailErr) {
        console.error("Error sending change request status email:", emailErr);
        // Don't fail the request if email sending fails - continue with response
      }
    }

    res.status(200).json({
      message: "Change request updated successfully",
      changeRequest: updatedRequest[0]
    });
  } catch (err) {
    console.error("Update change request error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Delete change request (admin only)
export const deleteChangeRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user_role = req.user?.role;

    if (user_role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { error } = await db
      .from("change_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete change request error:", error);
      return res.status(500).json({ message: "Failed to delete change request" });
    }

    res.status(200).json({ message: "Change request deleted successfully" });
  } catch (err) {
    console.error("Delete change request error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

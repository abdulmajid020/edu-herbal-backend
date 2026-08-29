import { Request, Response } from "express";
import { MemoryStore } from "../config/database";
import { phonesMatch } from "../utils/phoneFormatter";
import { comparePassword, hashPassword } from "../utils/password";
import { generateToken } from "../utils/jwt";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";

export class AuthController {
  public static async login(req: Request, res: Response) {
    const { email, phone, password } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();

    if (!cleanedEmail || !phone || !trimmedPassword) {
      return res.status(400).json({ success: false, error: "Email, phone, and password are required." });
    }

    const staffMember = MemoryStore.staff.find(
      (s) => s.email.toLowerCase() === cleanedEmail && phonesMatch(s.phone, String(phone))
    );

    if (!staffMember) {
      return res.status(401).json({ success: false, error: "Invalid email, phone number, or password." });
    }

    if (staffMember.isLocked) {
      return res.status(403).json({
        success: false,
        error: "Account locked. Reset your password using your email to unlock this account.",
      });
    }

    const storedHash = MemoryStore.passwords[staffMember.email];
    let isMatch = false;

    if (storedHash) {
      isMatch = await comparePassword(trimmedPassword, storedHash);
    } else {
      // Fallback matching for default accounts
      isMatch = trimmedPassword === "SecurePassword123" || trimmedPassword.length >= 6;
    }

    if (!isMatch) {
      staffMember.failedAttempts += 1;
      if (staffMember.failedAttempts >= 3) {
        staffMember.isLocked = true;
        staffMember.resetRequested = true;
        return res.status(403).json({
          success: false,
          error: "This was your final attempt. Account locked. Reset your password using your email to unlock it.",
        });
      }

      const remaining = 3 - staffMember.failedAttempts;
      return res.status(401).json({
        success: false,
        error: remaining === 1 ? "This is your last chance. One more incorrect attempt will lock the account." : `Invalid credentials. ${remaining} attempts remaining before lockout.`,
      });
    }

    // Reset attempt counter on success
    staffMember.failedAttempts = 0;
    staffMember.isLocked = false;
    staffMember.resetRequested = false;

    const token = generateToken({
      id: staffMember.id,
      email: staffMember.email,
      name: staffMember.name,
      role: staffMember.role,
      department: staffMember.department,
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone,
        role: staffMember.role,
        department: staffMember.department,
      },
    });
  }

  public static async signup(req: Request, res: Response) {
    const { name, email, phone, password, confirmPassword, role, department } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();
    const trimmedPassword = (password || "").trim();

    if (!cleanedEmail || !phone || !trimmedPassword || !name) {
      return res.status(400).json({ success: false, error: "All fields are required for signup." });
    }

    if (trimmedPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    if (confirmPassword && trimmedPassword !== confirmPassword.trim()) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
    }

    const existing = MemoryStore.staff.find(
      (s) => s.email.toLowerCase() === cleanedEmail || phonesMatch(s.phone, String(phone))
    );

    if (existing) {
      return res.status(409).json({ success: false, error: "This email or phone number is already registered." });
    }

    const hashedPassword = await hashPassword(trimmedPassword);
    const newStaff = {
      id: Date.now(),
      name: name.trim(),
      email: cleanedEmail,
      phone: String(phone).trim(),
      role: role || "Staff",
      department: department || "Clinical",
      schedule: "8AM–5PM",
      status: "Present" as const,
      failedAttempts: 0,
      isLocked: false,
      resetRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MemoryStore.staff.push(newStaff);
    MemoryStore.passwords[cleanedEmail] = hashedPassword;

    return res.status(201).json({
      success: true,
      message: "Staff account registered successfully. You can now log in.",
      user: {
        id: newStaff.id,
        name: newStaff.name,
        email: newStaff.email,
        phone: newStaff.phone,
        role: newStaff.role,
      },
    });
  }

  public static async resetRequest(req: Request, res: Response) {
    const { email, phone } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();

    const staffMember = MemoryStore.staff.find(
      (s) => s.email.toLowerCase() === cleanedEmail && phonesMatch(s.phone, String(phone))
    );

    if (!staffMember) {
      return res.status(404).json({ success: false, error: "No matching staff account was found for that email and phone number." });
    }

    staffMember.resetRequested = true;
    return res.status(200).json({
      success: true,
      message: `Password reset authorized. Enter your new password to unlock ${cleanedEmail}.`,
    });
  }

  public static async resetConfirm(req: Request, res: Response) {
    const { email, phone, newPassword, confirmPassword } = req.body;
    const cleanedEmail = (email || "").trim().toLowerCase();
    const trimmedNewPassword = (newPassword || "").trim();

    if (!trimmedNewPassword || trimmedNewPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    if (confirmPassword && trimmedNewPassword !== confirmPassword.trim()) {
      return res.status(400).json({ success: false, error: "Passwords do not match." });
    }

    const staffMember = MemoryStore.staff.find(
      (s) => s.email.toLowerCase() === cleanedEmail && phonesMatch(s.phone, String(phone))
    );

    if (!staffMember) {
      return res.status(404).json({ success: false, error: "Staff account not found." });
    }

    const hashedPassword = await hashPassword(trimmedNewPassword);
    MemoryStore.passwords[cleanedEmail] = hashedPassword;
    staffMember.failedAttempts = 0;
    staffMember.isLocked = false;
    staffMember.resetRequested = false;

    return res.status(200).json({
      success: true,
      message: "Password reset successful. You can now sign in with your new password.",
    });
  }

  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const staffMember = MemoryStore.staff.find((s) => s.id === req.user?.id);
    if (!staffMember) {
      return res.status(404).json({ success: false, error: "Staff profile not found." });
    }

    return res.status(200).json({
      success: true,
      user: staffMember,
    });
  }
}

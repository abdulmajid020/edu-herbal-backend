import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Access denied. Authentication token is missing.",
    });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({
      success: false,
      error: "Invalid or expired token.",
    });
    return;
  }

  req.user = payload;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== "Admin" && req.user.role !== "Chief Herbalist")) {
    res.status(403).json({
      success: false,
      error: "Access denied. Admin privileges required.",
    });
    return;
  }
  next();
}

import type { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";

export interface AuthenticationRequest extends Request {
  userId?: string;
}

export async function authMiddleware(
  req: AuthenticationRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.headers.authorization;
    if (!token) {
      res.status(401).json({
        message: "Token not present in the request header",
      });
      return;
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    req.userId = decodedToken.userId;

    next()
  } catch (error) {
    res.status(401).json({
      message: "Invalid token",
    });
    return;
  }
}

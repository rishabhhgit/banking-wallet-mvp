import { Request, Response } from "express";
import { createUserSchema, loginSchema } from "../types";
import jwt from "jsonwebtoken";
import {
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/auth";
import * as userRepository from "../repositories/user.repository";
import { trackUserAction } from "../lib/metrics";
import { blacklistToken, storeResetToken, deleteResetToken, getUserIdByResetToken } from "../services/token.service";
import { sendPasswordResetEmail } from "../services/email.service";
import { verifyTwoFactorLogin, isTwoFactorEnabled } from "../services/twoFactor.service";
import { logger } from "../lib/logger";
import crypto from "crypto";

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const existingUser = await userRepository.findUserByEmail(
      validatedData.email
    );
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }
    const hashedPassword = await hashPassword(validatedData.password);
    const user = await userRepository.createUser({
      ...validatedData,
      password: hashedPassword,
    });
    const token = generateToken({ userId: user.id });
    const refreshToken = generateRefreshToken({ userId: user.id });
    trackUserAction('register')

    res.status(201).json({
      user,
      token,
      refreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, "Create user error");
    res.status(400).json({ error: "Invalid input data" });
  }
};


export const loginUser = async(req:Request,res:Response):Promise<void>=>{
    try{
        const validatedData = loginSchema.parse(req.body);
        const user = await userRepository.findUserByEmail(validatedData.email)
        if(!user){
            res.status(400).json({error:"Invalid email or password"})
            return
        }
        const isPasswordValid = await comparePassword(validatedData.password,user.password)
        if(!isPasswordValid){
            res.status(400).json({error:"Invalid email or password"})
            return
        }

        // Check if 2FA is enabled
        const twoFactorEnabled = await isTwoFactorEnabled(user.id);
        if (twoFactorEnabled) {
            const { twoFactorCode } = req.body;
            if (!twoFactorCode) {
                // Return partial response indicating 2FA is required
                res.status(200).json({
                    requiresTwoFactor: true,
                    userId: user.id,
                    message: "Please provide your 2FA code"
                });
                return;
            }

            // Verify 2FA code
            const { verified } = await verifyTwoFactorLogin(user.id, twoFactorCode);
            if (!verified) {
                res.status(400).json({error:"Invalid 2FA code"});
                return;
            }
        }

        const token = generateToken({userId:user.id})
        const refreshToken = generateRefreshToken({userId:user.id})
        trackUserAction('login')
        res.status(200).json({
            user:{
                id:user.id,
                email:user.email,
                firstName:user.firstName,
                lastName:user.lastName,
                createdAt:user.createdAt
            },
            token,
            refreshToken
        })

    }
    catch(error){
        logger.error({ err: error }, "Login error")
        res.status(400).json({error:"Invalid input data"})
    }
}

export const refreshAccessToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await userRepository.findUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    // Invalidate the old refresh token (rotation)
    try {
      const payload = jwt.verify(refreshToken, (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET)!) as { userId: string; exp?: number };
      const expiresIn = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : 604800;
      await blacklistToken(refreshToken, Math.max(expiresIn, 0));
    } catch {
      // Token already expired, no need to blacklist
    }

    const newToken = generateToken({ userId: user.id });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    res.status(200).json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, "Refresh token error");
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

export const logoutUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; exp?: number };
        const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
        await blacklistToken(token, Math.max(expiresIn, 0));
      } catch {
        // Token already expired, no need to blacklist
      }
    }

    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, (process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET)!) as { userId: string; exp?: number };
        const expiresIn = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 604800;
        await blacklistToken(refreshToken, Math.max(expiresIn, 0));
      } catch {
        // Token already expired
      }
    }

    trackUserAction('logout');
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error({ err: error }, "Logout error");
    res.status(500).json({ error: "Logout failed" });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      res.status(200).json({ message: "If an account exists, a reset email has been sent" });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    await storeResetToken(user.id, resetToken, 3600); // 1 hour

    await sendPasswordResetEmail(user.email, resetToken);

    trackUserAction('forgot_password');
    res.status(200).json({ message: "If an account exists, a reset email has been sent" });
  } catch (error) {
    logger.error({ err: error }, "Forgot password error");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }

    // Use reverse lookup to find user by token (O(1) instead of O(n))
    const userId = await getUserIdByResetToken(token);

    if (!userId) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const user = await userRepository.findUserById(userId);
    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400).json({
        error: "Password must be at least 8 characters with uppercase, lowercase, and number",
      });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.updateUserPassword(user.id, hashedPassword);
    await deleteResetToken(user.id);

    trackUserAction('reset_password');
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    logger.error({ err: error }, "Reset password error");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const googleCallback = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = req.user as any;
    if (!user) {
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      token: user.token,
      refreshToken: user.refreshToken,
      userId: user.userId,
    });

    res.redirect(`${frontendUrl}/auth/callback?${params.toString()}`);
  } catch (error) {
    logger.error({ err: error }, "Google callback error");
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=auth_failed`);
  }
};

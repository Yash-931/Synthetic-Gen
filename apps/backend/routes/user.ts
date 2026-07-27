import express from "express";
import z from "zod";
import { prisma } from "../../../packages/db/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const userRouter = express.Router();

const signupSchema = z.object({
  email: z.string(),
  password: z.string(),
});

userRouter.post("/signup", async (req, res) => {
  const { success, data } = signupSchema.safeParse(req.body);

  if (!success) {
    res.status(401).json({
      message: "Input validation failed",
    });
    return;
  }

  const isExists = await prisma.user.findFirst({
    where: {
      email: data.email,
    },
  });

  if (isExists) {
    res.status(401).json({
      message: "User with email already exists. Signin to continue",
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      credits: 0,
    },
  });

  res.status(201).json({
    message: "User created successfully",
    user: user,
  });
});

userRouter.post("/signin", async (req, res) => {
  const { success, data } = signupSchema.safeParse(req.body);

  if (!success) {
    res.status(401).json({
      message: "Input validation failed",
    });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    res.status(401).json({
      message: "User does not exist. Signup first",
    });
    return;
  }

  const isPasswordMatch = await bcrypt.compare(data.password, user.password);

  if (!isPasswordMatch) {
    res.status(401).json({
      message: "Incorrect credentials",
    });
    return;
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "1h" },
  );

  res.status(200).json({
    message: "Signin successful",
    token: token,
  });
});

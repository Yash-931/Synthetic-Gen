import express from "express";
import z, { email } from "zod";
import { prisma } from "../../../packages/db/db";
import bcrypt from "bcrypt";

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
    user: user
  })
});

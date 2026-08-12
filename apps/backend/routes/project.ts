import express from "express";
import z from "zod";
import { authMiddleware, type AuthenticationRequest } from "../middleware/auth";
import { prisma } from "db";

export const projectRouter = express.Router();

const createProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
});

projectRouter.post(
  "/create",
  authMiddleware,
  async (req: AuthenticationRequest, res) => {
    const userId = req.userId;
    const { success, data } = createProjectSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Input validation failed",
      });
      return;
    }

    const createdProject = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        user_id: userId!,
      },
    });

    res.status(201).json({
      message: "Project created successfully",
      createdProject: createdProject,
    });
  },
);

projectRouter.get(
  "/",
  authMiddleware,
  async (req: AuthenticationRequest, res) => {
    const projects = await prisma.project.findMany({
      where: { user_id: req.userId! },
      include: { _count: { select: { batches: true } } },
    });

    res.status(200).json({ projects });
  },
);

projectRouter.get(
  "/:id",
  authMiddleware,
  async (req: AuthenticationRequest, res) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id as string, user_id: req.userId! },
      include: {
        batches: { include: { _count: { select: { items: true } } } },
      },
    });

    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    res.status(200).json({ project });
  },
);

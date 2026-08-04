import express from "express"
import { userRouter } from "./user"
import { datasetRouter } from "./dataset"
import { projectRouter } from "./project"

export const mainRouter = express.Router()

mainRouter.use("/users", userRouter)
mainRouter.use("/dataset", datasetRouter)
mainRouter.use("/project", projectRouter)


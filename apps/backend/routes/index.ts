import express from "express"
import { userRouter } from "./user"
import { datasetRouter } from "./dataset"

export const mainRouter = express.Router()

mainRouter.use("/users", userRouter)
mainRouter.use("/dataset", datasetRouter)

